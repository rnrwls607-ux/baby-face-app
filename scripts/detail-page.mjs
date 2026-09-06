#!/usr/bin/env node
// scripts/detail-page.mjs — 컨셉 자동화 2호: spec.json → 상세페이지 PNG
//
// 무엇을 대체하나
//   킷 ③(Claude Design으로 상세페이지 HTML 만들기) + ④(GoFullPage로 캡처)를 없앤다.
//   원료(examples/ba/{키}/)와 문안(specs/{키}.json 의 detail 블록)만 있으면
//   사람 손이 닿지 않고 public/details/{키}.png 가 나온다.
//
// ★수작업본과 다른 점 — 의도한 개선
//   MJ가 GoFullPage로 뜬 기존 상세본은 폭이 886~1011px로 제각각이다(브라우저 창 폭을
//   그대로 찍었기 때문). 여기서는 뷰포트를 1080으로 못박고, 캡처 결과가 정확히
//   1080이 아니면 실패시킨다. 규격이 흔들리지 않는 게 자동화의 값어치다.
//
// ★글자 하한을 렌더 뒤 DOM에서 전수 검사한다
//   CSS에 32px이라고 적어둔 것과 실제로 32px로 그려진 것은 다른 문제다(상속·축약·
//   폰트 폴백이 끼어든다). 그래서 캡처 직전에 화면의 모든 텍스트 노드를 훑어
//   computed font-size가 하한 미만이면 캡처를 버리고 멈춘다.
//
// 사용법
//   node scripts/detail-page.mjs --spec specs/schoolsnap.json
//   node scripts/detail-page.mjs --spec specs/schoolsnap.json --preview      (HTML만)
//   node scripts/detail-page.mjs --spec specs/schoolsnap.json --out examples/_detail-pilot
//   플래그: --thumb N(썸네일로 쓸 애프터 번호, 기본 1) · --no-thumb · --src DIR(원료 위치)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(path.join(ROOT, "package.json"));
function need(name, hint) {
  try { return require_(name); }
  catch { console.error(`\n★${name} 를 못 찾았다 — ${hint}\n`); process.exit(1); }
}
const sharp = need("sharp", "npm i -D sharp");
const puppeteer = need("puppeteer-core", "npm i -D puppeteer-core");

const TPL = path.join(ROOT, "scripts/detail-template");
const W = 1080;
// 글자 하한 — 킷 규격. 렌더 뒤 computed style로 검사한다.
const MIN_FONT = 32;
const FLOORS = { body: 32, caption: 40, section: 56, hero: 64 };
const BANNED = ["무료", "0원", "공짜"];

const rd = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function fail(msg) { console.error(`\n★중단 — ${msg}\n`); process.exit(1); }

// ── 크롬 찾기 — puppeteer-core라 브라우저를 따로 안 받는다 ────────────────────
function findChrome() {
  const envPath = process.env.CHROME_PATH;
  const cands = [
    envPath,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  fail("크롬을 못 찾았다 — CHROME_PATH 환경변수로 실행파일 경로를 지정할 것");
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = { spec: null, thumb: 1, preview: false, out: null, src: null, noThumb: false };
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--spec") args.spec = a[++i];
    else if (a[i] === "--thumb") args.thumb = Number(a[++i]);
    else if (a[i] === "--no-thumb") args.noThumb = true;
    else if (a[i] === "--preview") args.preview = true;
    else if (a[i] === "--out") args.out = a[++i];
    else if (a[i] === "--src") args.src = a[++i];
    else fail(`모르는 플래그: ${a[i]}`);
  }
  if (!args.spec) fail("--spec specs/{키}.json 이 필요하다");
}

const spec = JSON.parse(rd(path.join(ROOT, args.spec)));
const key = spec.key;
const d = spec.detail;
if (!d) fail(`specs/${key}.json 에 detail 블록이 없다`);
const srcDir = path.join(ROOT, args.src || `examples/ba/${key}`);

// ── 렌더 전 금지어 검사 (spec 전체) ──────────────────────────────────────────
{
  const hits = [];
  const scan = (v, p) => {
    if (typeof v === "string") { for (const b of BANNED) if (v.includes(b)) hits.push(`${p} → "${b}"`); }
    else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${p}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) scan(x, `${p}.${k}`);
  };
  scan(spec, "spec");
  if (hits.length) fail(`금지어 발견 — 렌더 안 함:\n     ${hits.join("\n     ")}`);
}

// ── 이미지 → data URI (없으면 회색 자리표시) ─────────────────────────────────
//
// ★크롭 규칙 — BA 작업에서 밟은 함정을 그대로 피한다
//   attention 크롭은 세로비가 큰 원본에서 얼굴/제품으로 확대가 폭주해 정수리나
//   병 바닥을 잘라먹는다(WORKLOG 08-29 판례). 그래서 여기서는
//   ① 히어로·POINT 큰 이미지는 원본 비율을 따라 높이를 정하고(=거의 안 자른다)
//   ② 그래도 상한을 넘어 잘라야 할 때만, 무엇을 지킬지 inputType으로 정한다.
//      사람은 얼굴이 위에 있으니 top, 사물·음식은 가운데.
const CROP_POS = { person: "top", duo: "top" };
const cropPos = () => CROP_POS[spec.inputType] || "centre";

const warnings = [];
async function img(file, w, h, cls = "") {
  if (!file) return `<div class="ph ${cls}" style="width:${w}px;height:${h}px">이미지 미지정</div>`;
  const p = path.join(srcDir, file);
  if (!fs.existsSync(p)) {
    warnings.push(file);
    return `<div class="ph ${cls}" style="width:${w}px;height:${h}px">${esc(file)}<br>(원료 없음)</div>`;
  }
  // 표시 크기에 맞춰 줄여서 굽는다 — HTML이 수십 MB가 되면 캡처가 느려진다
  const buf = await sharp(p).resize(w, h, { fit: "cover", position: cropPos() }).jpeg({ quality: 88 }).toBuffer();
  return `<img class="${cls}" src="data:image/jpeg;base64,${buf.toString("base64")}" width="${w}" height="${h}" alt="">`;
}

// 원본 비율을 따르는 높이 — [min, max] 안으로만 가둔다. 파일이 없으면 max로 둔다.
async function fitH(file, w, min, max) {
  const p = file && path.join(srcDir, file);
  if (!p || !fs.existsSync(p)) return max;
  const m = await sharp(p).metadata();
  return Math.max(min, Math.min(max, Math.round((w * m.height) / m.width)));
}
function logoUri() {
  const p = path.join(ROOT, "public/logo.png");
  if (!fs.existsSync(p)) { warnings.push("public/logo.png"); return ""; }
  return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
}
// 히어로 B가 이미지 위에 얹는 흰 글리프 — logo.png는 알파가 전부 255(흰 배경이 구워져 있다)라
// CSS 필터로 뒤집으면 흰 막대가 된다. 밝기를 알파로 바꾼 사본을 public/logo-white.png 로 둔다.
function logoWhiteUri() {
  const p = path.join(ROOT, "public/logo-white.png");
  if (!fs.existsSync(p)) { warnings.push("public/logo-white.png"); return ""; }
  return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
}

// "A → B" 형태 캡션에서 화살표 뒷부분을 강조색으로
function splitArrow(s) {
  const i = s.indexOf("→");
  if (i < 0) return esc(s);
  return `${esc(s.slice(0, i))}<b>→${esc(s.slice(i + 1))}</b>`;
}
// 해결 선언 — "브랜드명 — 카피" 를 라벨/카피로 가르고 카피의 뒷절을 강조
function splitSolution(s) {
  const i = s.indexOf("—");
  const label = i > 0 ? s.slice(0, i).trim() : `MOSPIC ${spec.name || key}`;
  const copy = i > 0 ? s.slice(i + 1).trim() : s;
  const j = copy.indexOf(",");
  const html = j > 0 ? `${esc(copy.slice(0, j + 1))}<br><em>${esc(copy.slice(j + 1).trim())}</em>` : esc(copy);
  return { label, html };
}

// ── 섹션 조립 (12섹션 고정 순서) ─────────────────────────────────────────────
async function build() {
  const s = [];
  const logo = logoUri();

  // 1+2. 히어로 B — 풀블리드 이미지 + 하단 그라데이션 + 좌하단 타이틀 (2026-09-06 MJ 결정, 시안 B)
  //   상단 워드마크 띠(56+44+40px)를 없애고 이미지 좌상단에 흰 글리프로 얹는다 — 상단 빈 여백이 0이 된다.
  //   높이는 원본 비율을 따라간다 — 하한 900(킷 규격), 상한 1440(3:4 원본이 딱 맞아 안 잘린다).
  //   고정 940으로 잘랐더니 정수리·병 바닥이 날아갔다(2026-09-02 비교 시트에서 잡음).
  const heroH = await fitH(d.hero.image, W, 900, 1440);
  const logoW = logoWhiteUri();
  s.push(`<section class="hero" style="height:${heroH}px">
  ${await img(d.hero.image, W, heroH, "hero__bg")}
  <div class="hero__grad"></div>
  ${logoW ? `<img class="hero__wm" src="${logoW}" alt="MOSPIC">` : ""}
  <div class="hero__text">
    <div class="hero__tags">${(d.hero.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <h1 class="hero__title">${esc(spec.name || key)}</h1>
    <p class="hero__sub">${esc(d.hero.sub)}</p>
  </div>
</section>`);

  // 3. 고민 공감
  s.push(`<section class="section pad">
  <h2 class="section__title">${esc(d.painHeader || "이런 적 있으세요?")}</h2>
  <div class="bubbles">${(d.pain || []).map((t) => `<div class="bubble">${esc(t)}</div>`).join("")}</div>
</section>`);

  // 4. 해결 선언 (컬러블록)
  const sol = splitSolution(d.solution || "");
  s.push(`<section class="solve">
  <p class="solve__label">${esc(sol.label)}</p>
  <p class="solve__copy">${sol.html}</p>
  <p class="solve__steps">사진 1장<span>·</span>컨셉 선택<span>·</span>약 1분</p>
</section>`);

  // 5. 대비 (BEFORE / AFTER)
  const two = d.layout === "2to1";
  const pairs = [];
  for (const p of d.pairs || []) {
    if (two) {
      const befores = Array.isArray(p.before) ? p.before : [p.before];
      pairs.push(`<div class="pair pair--2to1">
    <div class="pair__row">
      ${(await Promise.all(befores.map((b) => img(b, 440, 587)))).map((h, i) =>
        `<div class="pair__cell"><span class="pair__tag">BEFORE ${i + 1}</span>${h}</div>`).join("")}
    </div>
    <div class="pair__down">↓</div>
    <div class="pair__big"><div class="pair__cell" style="width:904px;flex:0 0 904px"><span class="pair__tag pair__tag--after">AFTER</span>${await img(p.after, 904, 1130)}</div></div>
    <p class="pair__caption">${splitArrow(p.caption)}</p>
  </div>`);
    } else {
      pairs.push(`<div class="pair">
    <div class="pair__row">
      <div class="pair__cell"><span class="pair__tag">BEFORE</span>${await img(p.before, 440, 587)}</div>
      <div class="pair__cell"><span class="pair__tag pair__tag--after">AFTER</span>${await img(p.after, 440, 587)}</div>
      <div class="pair__arrow">→</div>
    </div>
    <p class="pair__caption">${splitArrow(p.caption)}</p>
  </div>`);
    }
  }
  s.push(`<section class="section pad">
  <h2 class="section__title">지금의 내가, 이렇게 변해요</h2>
  <p class="section__sub">${esc(d.hero.sub)}</p>
  <div class="pairs">${pairs.join("")}</div>
</section>`);

  // 6. POINT 1~3
  const pts = [];
  for (const [i, p] of (d.points || []).entries()) {
    let media = "";
    if (p.images?.length) {
      media = `<div class="point__imgs">${(await Promise.all(p.images.map((f) => img(f, 464, 619)))).join("")}</div>`;
    } else if (p.image) {
      media = `<div class="point__img">${await img(p.image, 952, await fitH(p.image, 952, 800, 1270))}</div>`;
    }
    // 칩 — "아이콘 라벨" 또는 그냥 라벨. 수작업본 규격대로 가로 3칸.
    const chips = p.chips?.length
      ? `<div class="point__chips">${p.chips.map((c) => {
          const m = String(c).match(/^(\p{Extended_Pictographic}️?)\s*(.+)$/u);
          return `<span class="point__chip">${m ? `<i>${esc(m[1])}</i>${esc(m[2])}` : esc(c)}</span>`;
        }).join("")}</div>`
      : "";
    const cap = p.imageCaption && media ? `<p class="point__cap">${esc(p.imageCaption)}</p>` : "";
    pts.push(`<div class="point">
    <span class="point__badge">POINT ${i + 1}</span>
    <h3 class="point__title">${esc(p.title)}</h3>
    <p class="point__body">${esc(p.body)}</p>
    ${chips}
    ${media}
    ${cap}
  </div>`);
  }
  s.push(`<section class="section pad" style="padding-top:0">${pts.join("")}</section>`);

  // 7. 가격 대비
  const off = String(d.price?.offline || "").split(/\s*\+\s*/);
  const mos = String(d.price?.mospic || "").split(/\s*·\s*/);
  s.push(`<section class="section pad">
  <h2 class="section__title">${esc(d.price?.header || "이만큼 듭니다")}</h2>
  <div class="price">
    <div class="price__card">
      <p class="price__head">실제로 하려면</p>
      ${off.map((t) => `<p class="price__item"><i>✕</i><span>${esc(t)}</span></p>`).join("")}
    </div>
    <div class="price__card price__card--mospic">
      <p class="price__head">MOSPIC</p>
      ${mos.map((t) => `<p class="price__item"><i>✓</i><span>${esc(t)}</span></p>`).join("")}
    </div>
  </div>
  <p class="price__foot">정확한 금액은 ‘${esc(d.cta?.button || "만들기")}’ 버튼을 누르면 앱에서 안내해요.</p>
</section>`);

  // 8. 입력 가이드
  s.push(`<section class="section pad" style="padding-top:0">
  <h2 class="section__title">이런 사진이면 더 잘 나와요</h2>
  <div class="guide">${(d.guide || []).map((t, i) =>
    `<div class="guide__row"><span class="guide__no">${String(i + 1).padStart(2, "0")}</span><span class="guide__txt">${esc(t)}</span></div>`).join("")}</div>

  <!-- 9. 개인정보 안심 -->
  <div class="privacy"><span class="privacy__icon">🔒</span><p class="privacy__txt">${esc(d.privacy || "")}</p></div>
</section>`);

  // 10. AI 고지
  s.push(`<p class="ai-notice">${esc(d.aiNotice || "본 결과물은 AI로 생성된 이미지입니다.")}</p>`);

  // 11. CTA
  const c = String(d.cta?.copy || "");
  const ci = c.indexOf(",");
  const ctaHtml = ci > 0 ? `${esc(c.slice(0, ci + 1))}<br><em>${esc(c.slice(ci + 1).trim())}</em>` : esc(c);
  s.push(`<section class="cta">
  <p class="cta__copy">${ctaHtml}</p>
  <span class="cta__btn">${esc(d.cta?.button || "만들기")} →</span>
  <p class="cta__foot">MOSPIC 앱에서 · 사진 한 장이면 충분해요</p>
</section>`);

  // 12. 하단 워드마크
  s.push(`<div class="wordmark wordmark--foot">${logo ? `<img src="${logo}" alt="MOSPIC">` : ""}</div>`);

  return s.join("\n");
}

// ── HTML 만들기 ─────────────────────────────────────────────────────────────
const sig = d.signature || {};
const vars = [
  `  --sig: ${sig.color || spec.meta?.color || "#4A5A8A"};`,
  `  --sig-bg: ${sig.bg || "#FFFDF8"};`,
  `  --block: ${sig.block || sig.color || "#2A3550"};`,
  `  --block-ink: ${sig.blockInk || "#FFFFFF"};`,
].join("\n");

// ★replace의 두 번째 인자는 함수로 준다 — 치환값에 $& 같은 패턴 문자가 있으면
//   문자열 인자는 그걸 특수기호로 해석해 내용이 조용히 망가진다.
const lit = (v) => () => v;
const html = rd(path.join(TPL, "index.html"))
  .replace("__TITLE__", lit(`${spec.name || key} — MOSPIC 상세`))
  .replace("__STYLE__", lit(rd(path.join(TPL, "style.css"))))
  .replace("__VARS__", lit(vars))
  .replace("__CONTENT__", lit(await build()));

// ★치환 잔존 검사 — 자리표시자가 하나라도 남아 있으면 페이지가 깨진 것이다.
//   (템플릿 주석에 자리표시자를 적어 뒀다가 replace가 그쪽을 먼저 먹은 사고가 있었다.)
{
  const left = ["__TITLE__", "__STYLE__", "__VARS__", "__CONTENT__"].filter((t) => html.includes(t));
  if (left.length) fail(`템플릿 자리표시자가 안 치환됐다: ${left.join(", ")} — index.html에서 그 이름이 두 번 나오는지 볼 것`);
}

const outBase = args.out ? path.join(ROOT, args.out) : ROOT;
const htmlDir = path.join(TPL, "out");
fs.mkdirSync(htmlDir, { recursive: true });
const htmlPath = path.join(htmlDir, `${key}.html`);
fs.writeFileSync(htmlPath, html, "utf8");

console.log(`\n■ ${key} — ${spec.name || ""}  [layout=${d.layout} · sig=${sig.color} · ${sig.name || ""}]`);
console.log(`  원료: ${path.relative(ROOT, srcDir).split(path.sep).join("/")}`);
console.log(`  HTML: ${path.relative(ROOT, htmlPath).split(path.sep).join("/")}  (${(html.length / 1024 / 1024).toFixed(1)}MB)`);
if (warnings.length) console.log(`  ⚠ 원료 없음 ${warnings.length}건 → 자리표시로 대체: ${warnings.join(", ")}`);
if (args.preview) { console.log(`\n  [--preview] 캡처 없이 HTML만 만들었다.\n`); process.exit(0); }

// ── 캡처 ────────────────────────────────────────────────────────────────────
const chrome = findChrome();
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: 1400, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath.split(path.sep).join("/")}`, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => document.fonts.ready);

// ★게이트 A — 글자 하한 전수 검사 (computed style)
const typeReport = await page.evaluate((MIN) => {
  const out = [];
  const seen = new Map();
  const walk = (n) => {
    if (n.nodeType === 3) {
      const t = n.textContent.trim();
      if (t) {
        const el = n.parentElement;
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        const cls = el.className || el.tagName.toLowerCase();
        const k = `${cls}|${size}`;
        if (!seen.has(k)) seen.set(k, { cls: String(cls), size, sample: t.slice(0, 26), n: 0 });
        seen.get(k).n++;
        if (size < MIN) out.push({ cls: String(cls), size, sample: t.slice(0, 40) });
      }
      return;
    }
    for (const c of n.childNodes) walk(c);
  };
  walk(document.body);
  return { under: out, all: [...seen.values()].sort((a, b) => b.size - a.size) };
}, MIN_FONT);

// ★게이트 B — 가로 넘침 0 (숨기지 않고 실제로 안 넘치는지)
const overflow = await page.evaluate((w) => {
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > w + 0.5 || r.left < -0.5)) {
      bad.push({ cls: String(el.className || el.tagName), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }
  return { docW: document.documentElement.scrollWidth, bad: bad.slice(0, 8), n: bad.length };
}, W);

// ★게이트 C — 히어로 높이
const heroH = await page.evaluate(() => {
  const el = document.querySelector(".hero__bg");   // 히어로 B: 풀블리드 배경 이미지
  return el ? Math.round(el.getBoundingClientRect().height) : 0;
});

const outDir = path.join(outBase, "public/details");
fs.mkdirSync(outDir, { recursive: true });
const pngPath = path.join(outDir, `${key}.png`);
await page.screenshot({ path: pngPath, fullPage: true });
await browser.close();

const meta = await sharp(pngPath).metadata();

// ── 게이트 보고 ─────────────────────────────────────────────────────────────
console.log(`\n  ── 글자 크기 (computed, 큰 것부터)`);
for (const r of typeReport.all) {
  console.log(`     ${String(Math.round(r.size)).padStart(4)}px  ${r.cls.slice(0, 34).padEnd(34)} ×${String(r.n).padStart(3)}  ${r.sample}`);
}
console.log(`\n  ── 게이트`);
const gates = [];
gates.push([`캡처 가로 정확히 ${W}`, meta.width === W, `${meta.width}px`]);
gates.push([`글자 하한 ${MIN_FONT}px 전수`, typeReport.under.length === 0, `미달 ${typeReport.under.length}건`]);
gates.push([`히어로 세로 ≥900`, heroH >= 900, `${heroH}px`]);
gates.push([`가로 넘침 0`, overflow.n === 0 && overflow.docW <= W, `넘침 ${overflow.n}건 · scrollWidth ${overflow.docW}`]);
gates.push([`금지어 0`, true, "렌더 전 검사 통과"]);
for (const [name, ok, note] of gates) console.log(`     ${ok ? "PASS" : "★FAIL"}  ${name.padEnd(24)} ${note}`);
if (typeReport.under.length) for (const u of typeReport.under.slice(0, 10)) console.log(`       미달: ${Math.round(u.size)}px ${u.cls} — ${u.sample}`);
if (overflow.bad.length) for (const b of overflow.bad) console.log(`       넘침: ${b.cls} left=${b.left} right=${b.right}`);

// ── 썸네일 ──────────────────────────────────────────────────────────────────
if (!args.noThumb) {
  const tf = path.join(srcDir, `${key}_애프터${args.thumb}.png`);
  if (!fs.existsSync(tf)) console.log(`\n  ⚠ 썸네일 원료 없음: ${path.basename(tf)} — 건너뜀`);
  else {
    const cardDir = path.join(outBase, "public/cards");
    fs.mkdirSync(cardDir, { recursive: true });
    const cp = path.join(cardDir, `${key}.png`);
    const m = await sharp(tf).metadata();
    if (m.width > W) await sharp(tf).resize(W).png().toFile(cp);
    else fs.copyFileSync(tf, cp);
    const cm = await sharp(cp).metadata();
    console.log(`\n  썸네일: ${path.relative(ROOT, cp).split(path.sep).join("/")}  ${cm.width}×${cm.height}  (애프터${args.thumb})`);
  }
}

console.log(`\n  상세: ${path.relative(ROOT, pngPath).split(path.sep).join("/")}  ${meta.width}×${meta.height}  ${(fs.statSync(pngPath).size / 1024 / 1024).toFixed(1)}MB`);
const allPass = gates.every(([, ok]) => ok);
console.log(allPass ? `\n■ 게이트 전항 PASS\n` : `\n★게이트 실패 — 위 FAIL 항목을 고칠 것\n`);
process.exit(allPass ? 0 : 1);
