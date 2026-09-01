// 인스타 게시물 공장 v2 — insta/raw/{slug} → insta/out/{slug} (4:5 세로 1080×1350 PNG 7장 + 텍스트)
//
// ★v1과 무엇이 다른가 (2026-08-31, 인스타 4계정 정밀 분석 결과)
//   반응 좋은 계정은 예외 없이 ①결과물 사진 전면 ②원본 셀카 노출 ③커버 타이포 슬롯 고정
//   ④마지막 장 CTA를 사진 위에 얹음 ⑤댓글→DM. v1(A안: 노랑 스티커 배지·회차 칩·하이라이트
//   바·툴 칩)은 이 문법과 다르다. v1은 scripts/insta-kit.v1.mjs로 보존했고 이 파일이 v2다.
//   가장 큰 변화: 단색·그라데이션 카드를 전부 없앴다. 7장 모두 배경이 결과물 사진이다.
//
// [입력] insta/raw/ep{NN}-{slug}/
//   before-1.jpg ~ before-4.jpg · after-1.jpg ~ after-4.jpg (쌍으로 최대 4개, 최소 2쌍)
//   kit.json (v2 스키마 — 아래 KIT_FIXTURE가 그 형태 그대로다)
//
// [출력] insta/out/ep{NN}-{slug}/ — 업로드 순서대로 번호가 붙는다
//   01-cover / 02~05-body / 06-cta / 07-follow / caption.txt / firstcomment.txt / dm.txt / contact.png
//
// [사용법]
//   node scripts/insta-kit.mjs ep03-deskfigure
//   node scripts/insta-kit.mjs ep03-deskfigure --fixture   # 원료 없이 회색 자리표시로 레이아웃 검증
//
// ★폰트 — 파일을 리포에 넣지 않는다. 실측(2026-08-31)으로 시스템의 Noto Sans KR 가변폰트가
//   w400/500/700/900을 각각 다른 잉크량으로 렌더하는 것을 확인했다(10530/12998/16214/19559).
//   Malgun Gothic은 2단계뿐(400=500, 700=900)이라 Black·Medium을 표현하지 못한다.
//   그래서 Noto를 1순위로 두고, 시작 시 웨이트가 실제로 먹는지 프로브해서 안 먹으면 멈춘다.
import sharp from "sharp";
import { mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// ★경로에 공백이 있으면(이 PC: "Hello G.BOX") import.meta.url이 %20으로 인코딩된다.
//   fileURLToPath로 반드시 디코딩할 것 — 안 하면 mkdir이 EPERM으로 죽는다.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, "insta", "raw");
const OUT = path.join(ROOT, "insta", "out");

const W = 1080, H = 1350;
// 1:1 중앙 크롭선은 y135~1215. 핵심 요소는 그보다 안쪽(y140~1210 · x40~1040)에 둔다.
const SAFE = { top: 140, bot: 1210, left: 40, right: 1040 };
const FONTS = "Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif";
const DEFAULT_ACCENT = "#FF4F8B";
const INK = "#1E1C1A";
const TAGLINE = "사진관 안 가도, 사진관보다";   // ★v1 08-follow 자산 재사용(새로 만들지 않는다)
const WORDMARK = "MOSPIC";
const HANDLE = "@mospic_ai";
const BANNED = ["무료", "0원", "공짜", "지브리", "픽사", "디즈니", "마블", "닌텐도", "포켓몬", "레고"];

const fails = [];
const fail = (m) => { fails.push(m); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const svgBuf = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`);
const png = (svg) => sharp(svgBuf(svg)).png().toBuffer();

// ── 텍스트 측정: 실제 잉크 바운딩 박스를 픽셀로 잰다(게이트의 진실원) ──────────
async function inkBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function textSvg(o) {
  const anchor = o.anchor ?? "start";
  const fill = o.fill ?? "#fff";
  const op = o.opacity === undefined ? "" : ` fill-opacity="${o.opacity}"`;
  const sp = o.spacing ? ` letter-spacing="${o.spacing}"` : "";
  return `<text x="${o.x}" y="${o.y}" font-family="${FONTS}" font-size="${o.size}" font-weight="${o.weight ?? 400}"` +
    ` fill="${fill}"${op} text-anchor="${anchor}"${sp}>${esc(o.text)}</text>`;
}
const textLayer = (o) => png(textSvg(o));

// 제목 2줄 중 accent 단어 1개만 색을 바꾼다 — tspan으로 한 줄 안에서 나눈다
function accentLineSvg(o) {
  const i = o.text.indexOf(o.accentWord);
  if (i < 0) return textSvg(o);
  const a = esc(o.text.slice(0, i)), b = esc(o.accentWord), c = esc(o.text.slice(i + o.accentWord.length));
  return `<text x="${o.x}" y="${o.y}" font-family="${FONTS}" font-size="${o.size}" font-weight="${o.weight}" fill="${o.fill}">` +
    `${a}<tspan fill="${o.accent}">${b}</tspan>${c}</text>`;
}

// ── 사진: 비율 유지 cover + 중앙 크롭 ────────────────────────────────────────
const coverCrop = (src, w, h) => sharp(src).flatten({ background: "#111" })
  .resize(w, h, { fit: "cover", position: "centre" }).png().toBuffer();

// 하단 검정 세로 그라데이션 (y760→1350, 최대 알파 200/255)
const bottomGrad = () => png(
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${(200 / 255).toFixed(3)}"/>` +
  `</linearGradient></defs><rect x="0" y="760" width="${W}" height="${H - 760}" fill="url(#g)"/>`);

const dim = (alpha) => png(`<rect width="${W}" height="${H}" fill="#000" fill-opacity="${(alpha / 255).toFixed(3)}"/>`);

// ── 원본 셀카 폴라로이드 ─────────────────────────────────────────────────────
// 흰 프레임 250×300, 내부 여백 12, 하단 라벨 영역 70. 회전은 sharp가 알파와 함께 처리.
const POLA = { w: 250, h: 300, pad: 12, label: 70 };
async function polaroid(src, deg) {
  const innerW = POLA.w - POLA.pad * 2;
  const innerH = POLA.h - POLA.pad - POLA.label;
  const photo = await sharp(src).flatten({ background: "#ddd" })
    .resize(innerW, innerH, { fit: "cover", position: "centre" }).png().toBuffer();
  const frame = await sharp({ create: { width: POLA.w, height: POLA.h, channels: 4, background: "#ffffff" } })
    .composite([
      { input: photo, left: POLA.pad, top: POLA.pad },
      {
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${POLA.w}" height="${POLA.h}">` +
          `<text x="${POLA.w / 2}" y="${POLA.h - 26}" font-family="${FONTS}" font-size="22" font-weight="500" fill="${INK}" text-anchor="middle">원본 셀카</text></svg>`),
        left: 0, top: 0,
      },
    ]).png().toBuffer();
  // 그림자: 살짝 키운 검정 판을 blur해서 뒤에 깔고, 그 위에 회전한 프레임을 얹는다
  const rot = await sharp(frame).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const m = await sharp(rot).metadata();
  const shadow = await sharp({ create: { width: m.width, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(rot).extractChannel("alpha").toColourspace("b-w").png().toBuffer(), blend: "over" }])
    .blur(10).png().toBuffer();
  const out = await sharp({ create: { width: m.width + 16, height: m.height + 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(shadow).linear(0.45, 0).png().toBuffer(), left: 8, top: 12 },
      { input: rot, left: 0, top: 0 },
    ]).png().toBuffer();
  return { buf: out, w: m.width + 16, h: m.height + 16 };
}

// ── 알약(pill) ───────────────────────────────────────────────────────────────
// ★교훈(v1 스티커 배지 사건과 같은 유형): "잉크를 쟀다"가 "배치가 맞다"를 보증하지 않는다.
//   프로브를 (40,200) 베이스라인으로 그린 뒤, 잉크 top(ib.y)을 padY로 옮기는 이동량만큼만
//   베이스라인을 움직여야 한다 → y = 200 + (padY - ib.y). 여기에 ib.h를 더하면 글자가
//   제 높이만큼 아래로 밀려 알약 밖으로 나간다(첫 렌더에서 실제로 그렇게 잘렸다).
//   그래서 만든 뒤 알약 안 텍스트 잉크가 사각형 안에 있는지 되재서 게이트로 올린다.
async function pill(text, o) {
  const size = o.size, padX = o.padX ?? 30, padY = o.padY ?? 16;
  const PX = 40, PY = 200;
  const probe = await textLayer({ text, size, weight: o.weight ?? 500, x: PX, y: PY, fill: "#fff" });
  const ib = await inkBox(probe);
  const w = ib.w + padX * 2, h = ib.h + padY * 2;
  const r = Math.round(h / 2);
  const bg = o.bg ?? "#ffffff";
  const bgOp = o.bgOpacity === undefined ? 1 : o.bgOpacity;
  const bx = PX + (padX - ib.x), by = PY + (padY - ib.y);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${bg}" fill-opacity="${bgOp}"/>` +
    `<text x="${bx}" y="${by}" font-family="${FONTS}" font-size="${size}" font-weight="${o.weight ?? 500}" fill="${o.fill ?? INK}">${esc(text)}</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();

  // 되재기 — 글자만 따로 같은 좌표로 그려 잉크가 알약 안에 완전히 들어갔는지 확인
  const only = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="${bx}" y="${by}" font-family="${FONTS}" font-size="${size}" font-weight="${o.weight ?? 500}" fill="#000">${esc(text)}</text></svg>`)).png().toBuffer();
  const tb = await inkBox(only);
  if (!tb || tb.x < 1 || tb.y < 1 || tb.x + tb.w > w - 1 || tb.y + tb.h > h - 1) {
    fail(`알약 글자 잘림 — "${text}" 글자 x${tb?.x}~${tb ? tb.x + tb.w - 1 : "?"} y${tb?.y}~${tb ? tb.y + tb.h - 1 : "?"} vs 알약 ${w}×${h}`);
  }
  return { buf, w, h };
}

// ── 안전영역 게이트 ──────────────────────────────────────────────────────────
const boxes = [];
function safeCheck(name, box) {
  boxes.push({ name, box });
  const bad = box.x < SAFE.left || box.y < SAFE.top || box.x + box.w - 1 > SAFE.right || box.y + box.h - 1 > SAFE.bot;
  if (bad) fail(`안전영역 위반 — ${name}: x${box.x}~${box.x + box.w - 1} y${box.y}~${box.y + box.h - 1} (허용 x${SAFE.left}~${SAFE.right} y${SAFE.top}~${SAFE.bot})`);
  return !bad;
}

// ── 자리표시 이미지(fixture) ─────────────────────────────────────────────────
async function placeholder(label, light) {
  const bg = light ? "#c9c9c9" : "#4a4a4a";
  const fg = light ? "#4a4a4a" : "#d8d8d8";
  return sharp({ create: { width: 1080, height: 1350, channels: 4, background: bg } })
    .composite([{
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">` +
        `<text x="540" y="675" font-family="${FONTS}" font-size="64" font-weight="700" fill="${fg}" text-anchor="middle">${esc(label)}</text></svg>`),
      left: 0, top: 0,
    }]).png().toBuffer();
}

// ── kit.json v2 기본값(fixture용) ────────────────────────────────────────────
const KIT_FIXTURE = {
  version: 2, episode: "03", slug: "deskfigure", conceptKey: "deskfigure", conceptLabel: "데스크 피규어",
  accent: DEFAULT_ACCENT,
  pill: "데스크 피규어 · 셀카 1장으로",
  title: { line1: "셀카 한 장이", line2: "피규어가 됐다", accent: "피규어" },
  meta: "4 CUTS · 셀카 1장",
  cta: {
    question: "이 컨셉, 마음에 드세요?",
    fact: ["MOSPIC 안 179개 컨셉 중 하나예요.", "셀카 1장, 1분이면 이 피규어가 나와요."],
    keyword: "모스픽",
    action: "댓글에 모스픽 → 레시피 + 링크 DM",
  },
  caption: {
    hook: "책상 위에 내 피규어가 서 있으면, 볼 때마다 웃음이 날까요?",
    body: [
      "셀카 한 장을 올리면 1/7 스케일 PVC 피규어처럼 만들어 줍니다. 개봉한 박스와 모니터의 3D 원형까지 한 컷에 담겨요.",
      "얼굴은 그대로 두고 재질만 바뀌는 게 핵심이라, 아는 사람이 보면 바로 누군지 알아봅니다.",
    ],
    question: "여러분은 어떤 포즈로 세워두고 싶어요?",
    saveLine: "나중에 만들어보려면 저장해두세요",
    hashtags: ["#피규어", "#AI사진", "#모스픽"],
  },
  firstComment: "결과 자랑 스레드 열어둡니다 — 만드신 분들 여기에 올려주세요!",
  dm: {
    recipe: "Turn this selfie into a hyper-realistic photo of a 1/7 scale collectible PVC figure of the person, displayed on a work desk with its opened retail box and a monitor showing the 3D sculpt.",
    deeplink: "auto",
    closing: "결과 나오면 첫 댓글에 자랑해 주세요 — 하이라이트에 올려드려요.",
  },
};

// ── 딥링크 해석 — CONCEPTS 직접 조회 + onClick 체인. soon 폴백은 쓰지 않는다 ──
function resolveDeeplink(conceptKey) {
  const con = readFileSync(path.join(ROOT, "app/lib/concepts.ts"), "utf8").replace(/\r\n/g, "\n");
  const blk = con.slice(con.indexOf("export const CONCEPTS"), con.indexOf("\n};\n", con.indexOf("export const CONCEPTS")));
  const entry = blk.match(new RegExp(`\\n  ${conceptKey}:\\s*\\{[\\s\\S]*?\\n  \\},`));
  if (!entry) return { ok: false, why: `CONCEPTS에 "${conceptKey}" 없음` };
  const start = (entry[0].match(/start:\s*"([^"]*)"/) || [])[1];
  if (!start || start === "soon") return { ok: false, why: `start가 없거나 soon 폴백("${start}")` };
  const home = readFileSync(path.join(ROOT, "app/page.tsx"), "utf8").replace(/\r\n/g, "\n");
  const click = home.match(new RegExp(`detail\\.start === "${start}"\\) \\{ window\\.location\\.replace\\("([^"]+)"\\); \\}`));
  if (!click) return { ok: false, why: `page.tsx onClick 체인에 start="${start}" 분기 없음` };
  const route = click[1];
  if (!existsSync(path.join(ROOT, "app", route.replace(/^\//, ""), "page.tsx"))) return { ok: false, why: `페이지 폴더 app${route} 없음` };
  return { ok: true, url: `https://mospic.com${route}`, route, start };
}

// ── 카드 빌더 ────────────────────────────────────────────────────────────────
const WM = { text: HANDLE, size: 28, weight: 500, spacing: 3, anchor: "middle", fill: "#fff", opacity: 170 / 255 };

async function watermark() {
  const probe = await textLayer({ ...WM, x: W / 2, y: 84 });
  return { layer: probe, box: await inkBox(probe) };
}

// ── 커버 알약 스타일 (v2.1) ─────────────────────────────────────────────────
// accent(기본) = 강조색 배경 + 흰 Bold / dark = 어두운 배경 + accent 글자 / white = v2 방식
function pillStyleOpts(style, accent) {
  if (style === "dark") return { size: 36, weight: 700, padX: 32, padY: 16, bg: "#141210", bgOpacity: 230 / 255, fill: accent };
  if (style === "white") return { size: 30, weight: 500, padX: 30, padY: 16, bg: "#ffffff", bgOpacity: 215 / 255, fill: INK };
  return { size: 36, weight: 700, padX: 32, padY: 16, bg: accent, bgOpacity: 1, fill: "#ffffff" };
}

async function buildCover(dst, afterSrc, beforeSrc, kit, accent, styleOverride) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: await bottomGrad(), left: 0, top: 0 }];

  const wm = await watermark();
  layers.push({ input: wm.layer, left: 0, top: 0 });

  // ★v2.1 — 커버 폴라로이드는 옵션이다(기본 false). 커버는 결과물 한 장으로 승부하고,
  //   원본 대비는 02장부터 보여준다. kit.coverPolaroid=true면 예전처럼 우상단에 넣는다.
  let polaNote = "폴라로이드 없음";
  if (kit.coverPolaroid === true) {
    const pola = await polaroid(beforeSrc, 6);
    const at = { x: 720, y: 150 };
    layers.push({ input: pola.buf, left: at.x, top: at.y });
    safeCheck("커버 폴라로이드", { x: at.x, y: at.y, w: pola.w, h: pola.h });
    polaNote = `폴라로이드 ${pola.w}×${pola.h} @(${at.x},${at.y})`;
  }

  const style = styleOverride || kit.pillStyle || "accent";
  const pl = await pill(kit.pill, pillStyleOpts(style, accent));
  layers.push({ input: pl.buf, left: 72, top: 880 });
  safeCheck("커버 알약", { x: 72, y: 880, w: pl.w, h: pl.h });

  // 제목 2줄 96px Black, 줄간격 18 — 잉크 기준으로 배치해 안전영역을 정확히 잰다
  const T = { size: 96, weight: 900, fill: "#fff" };
  const l1 = await png(textSvg({ ...T, x: 72, y: 980 + 96, text: kit.title.line1 }));
  const b1 = await inkBox(l1);
  const y2 = b1.y + b1.h + 18;
  const l2 = await png(accentLineSvg({ ...T, x: 72, y: y2 + 96, text: kit.title.line2, accentWord: kit.title.accent, accent }));
  const b2 = await inkBox(l2);
  layers.push({ input: l1, left: 0, top: 0 }, { input: l2, left: 0, top: 0 });
  safeCheck("커버 제목1", b1);
  safeCheck("커버 제목2", b2);

  // ★v2.1 — meta가 비었거나 없으면 아예 렌더하지 않는다(빈 문자열이 투명 레이어로 남지 않게)
  let metaNote = "메타 없음";
  if (kit.meta && String(kit.meta).trim()) {
    const meta = await textLayer({ text: kit.meta, size: 26, weight: 500, x: W - 72, y: 1198, anchor: "end", fill: "#fff", opacity: 200 / 255 });
    layers.push({ input: meta, left: 0, top: 0 });
    metaNote = `메타 "${kit.meta}"`;
  }

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  return `커버[${style}] — ${polaNote} · 알약 ${pl.w}×${pl.h} · 제목 y${b1.y}~${b2.y + b2.h - 1} · ${metaNote}`;
}

async function buildBody(dst, afterSrc, beforeSrc, n, kit2) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: await bottomGrad(), left: 0, top: 0 }];

  // 대형 번호 — 안전영역 예외(의도)
  layers.push({ input: await textLayer({ text: String(n).padStart(2, "0"), size: 260, weight: 900, x: W - 60, y: 40 + 200, anchor: "end", fill: "#fff", opacity: 40 / 255 }), left: 0, top: 0 });

  // ★좌표 조정(스펙 y880 → 870): 폴라로이드는 250×300이지만 -6° 회전 + 그림자 여백으로
  //   실제 296×340이 된다. y880에 두면 바닥이 y1219로 안전영역(1210)을 9px 넘는다.
  //   안전영역이 우선이라는 지시에 따라 10px 올렸다 — 바닥 y1209.
  const POLA_Y = 870;
  const pola = await polaroid(beforeSrc, -6);
  layers.push({ input: pola.buf, left: 60, top: POLA_Y });
  safeCheck(`본문${n} 폴라로이드`, { x: 60, y: POLA_Y, w: pola.w, h: pola.h });

  // ★v2.1 — 본문 알약은 기본으로 넣지 않는다. 같은 문구가 4장 반복되면 소음이 된다.
  //   kit.bodyPill에 문자열이 있을 때만 예전 자리(372,1126)에 렌더한다.
  let pillNote = "알약 없음";
  if (kit2.bodyPill && String(kit2.bodyPill).trim()) {
    const pl = await pill(kit2.bodyPill, { size: 26, weight: 500, bg: "#ffffff", bgOpacity: 215 / 255, fill: INK });
    layers.push({ input: pl.buf, left: 372, top: 1126 });
    safeCheck(`본문${n} 알약`, { x: 372, y: 1126, w: pl.w, h: pl.h });
    pillNote = `알약 ${pl.w}×${pl.h} "${kit2.bodyPill}"`;
  }

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  return `본문${n} — 번호 260px(알파40) · 폴라로이드 ${pola.w}×${pola.h} @(60,${POLA_Y}) 바닥y${POLA_Y + pola.h - 1} · ${pillNote}`;
}

// 쉼표 기준 2줄 나눔(없으면 길이 기준 자동)
function splitTwo(s) {
  const i = s.indexOf(",");
  if (i > 0 && i < s.length - 1) return [s.slice(0, i + 1).trim(), s.slice(i + 1).trim()];
  const mid = Math.ceil(s.length / 2);
  const sp = s.lastIndexOf(" ", mid);
  return sp > 0 ? [s.slice(0, sp).trim(), s.slice(sp + 1).trim()] : [s, ""];
}

async function buildCta(dst, afterSrc, kit, accent) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: await dim(120), left: 0, top: 0 }];
  const wm = await watermark();
  layers.push({ input: wm.layer, left: 0, top: 0 });

  const [q1, q2] = splitTwo(kit.cta.question);
  const Q = { size: 72, weight: 900, fill: "#fff", x: 72 };
  const qa = await png(textSvg({ ...Q, y: 430 + 72, text: q1 }));
  const ba = await inkBox(qa);
  layers.push({ input: qa, left: 0, top: 0 });
  safeCheck("CTA 질문1", ba);
  if (q2) {
    const qb = await png(textSvg({ ...Q, y: ba.y + ba.h + 18 + 72, text: q2 }));
    const bb = await inkBox(qb);
    layers.push({ input: qb, left: 0, top: 0 });
    safeCheck("CTA 질문2", bb);
  }

  for (const [i, line] of (kit.cta.fact || []).slice(0, 2).entries()) {
    const y = i === 0 ? 660 : 712;
    const l = await png(textSvg({ text: line, size: 36, weight: 500, x: 72, y: y + 36, fill: "#fff", opacity: 215 / 255 }));
    layers.push({ input: l, left: 0, top: 0 });
    safeCheck(`CTA 사실${i + 1}`, await inkBox(l));
  }

  // ★v2.1 행동 영역 — 알약(무엇을) + 보조문(그러면 무슨 일이) + 안내. 아래로 흘러가며 쌓는다.
  const ACT_Y = 830;
  const act = await pill(kit.cta.action, { size: 38, weight: 700, padX: 34, padY: 18, bg: accent, fill: "#ffffff" });
  layers.push({ input: act.buf, left: 72, top: ACT_Y });
  safeCheck("CTA 액션 알약", { x: 72, y: ACT_Y, w: act.w, h: act.h });

  let flowY = ACT_Y + act.h;           // 알약 바닥
  let subNote = "보조문 없음";
  if (kit.cta.actionSub && String(kit.cta.actionSub).trim()) {
    const sub = await png(textSvg({ text: kit.cta.actionSub, size: 34, weight: 500, x: 72, y: flowY + 22 + 34, fill: "#fff", opacity: 230 / 255 }));
    const sb = await inkBox(sub);
    layers.push({ input: sub, left: 0, top: 0 });
    safeCheck("CTA 보조문", sb);
    flowY = sb.y + sb.h;
    subNote = `보조문 34px y${sb.y}`;
  }

  const dmLine = await png(textSvg({ text: "DM 요청 폴더도 확인해 주세요", size: 26, weight: 400, x: 72, y: flowY + 64 + 26, fill: "#fff", opacity: 170 / 255 }));
  const db = await inkBox(dmLine);
  layers.push({ input: dmLine, left: 0, top: 0 });
  safeCheck("CTA 안내", db);

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  return `CTA — 질문 ${q2 ? 2 : 1}줄 72px · 사실 2줄 · 액션 알약 ${act.w}×${act.h}(accent 38px Bold) · ${subNote} · 안내 y${db.y}`;
}

async function buildFollow(dst, afterSrc) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: await dim(140), left: 0, top: 0 }];

  // ★v1 08-follow 자산 그대로 — 워드마크 + 태그라인. 새 자산을 만들지 않는다.
  const mark = await png(textSvg({ text: WORDMARK, size: 128, weight: 900, spacing: 8, x: W / 2, y: 620, anchor: "middle", fill: "#fff" }));
  const mb = await inkBox(mark);
  layers.push({ input: mark, left: 0, top: 0 });
  safeCheck("팔로우 워드마크", mb);

  const tag = await png(textSvg({ text: TAGLINE, size: 46, weight: 400, x: W / 2, y: mb.y + mb.h + 46 + 46, anchor: "middle", fill: "#fff", opacity: 0.75 }));
  const tb = await inkBox(tag);
  layers.push({ input: tag, left: 0, top: 0 });
  safeCheck("팔로우 태그라인", tb);

  const pl = await pill(`${HANDLE} 팔로우`, { size: 32, weight: 500, bg: "#ffffff", bgOpacity: 215 / 255, fill: INK });
  const px = Math.round((W - pl.w) / 2), py = 1080;
  layers.push({ input: pl.buf, left: px, top: py });
  safeCheck("팔로우 알약", { x: px, y: py, w: pl.w, h: pl.h });

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  return `팔로우 — 워드마크 128px y${mb.y} · 태그라인 46px y${tb.y} · 알약 ${pl.w}×${pl.h}`;
}

// ── 텍스트 산출물 ────────────────────────────────────────────────────────────
function buildCaption(kit) {
  const c = kit.caption;
  const ctaLine = `댓글에 "${kit.cta.keyword}" 남겨주시면 레시피와 바로 가는 링크를 DM으로 보내드려요.`;
  const parts = [c.hook, "", ...c.body.flatMap((b) => [b, ""]), c.question, ctaLine];
  if (c.saveLine) parts.push(c.saveLine);
  parts.push("", (c.hashtags || []).join(" "));
  let text = parts.join("\n");
  if (text.length > 900) {
    // 900자 초과 — CTA를 훅 바로 아래에도 한 번 더
    const p2 = [c.hook, "", ctaLine, "", ...c.body.flatMap((b) => [b, ""]), c.question, ctaLine];
    if (c.saveLine) p2.push(c.saveLine);
    p2.push("", (c.hashtags || []).join(" "));
    text = p2.join("\n");
  }
  return text;
}
const buildDm = (kit, url) => [
  "안녕하세요! 요청 주신 레시피 보내드려요 🙌",
  "",
  kit.dm.recipe,
  "",
  `앱에서 바로 만들기: ${url} (셀카 1장, 1분)`,
  "",
  kit.dm.closing,
].join("\n");

function lint(where, text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const w of BANNED) if (line.includes(w)) hits.push(`${where}:${i + 1} "${w}" — ${line.trim()}`);
  });
  return hits;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function fontProbe() {
  const ink = async (w) => {
    const b = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="140"><text x="10" y="100" font-family="${FONTS}" font-size="80" font-weight="${w}" fill="#fff">셀카 한 장</text></svg>`)).greyscale().raw().toBuffer();
    let n = 0; for (const v of b) if (v > 128) n++; return n;
  };
  const [r, m, bk] = [await ink(400), await ink(500), await ink(900)];
  if (r === 0) { console.error("★한글이 렌더되지 않습니다 — Noto Sans KR 또는 맑은 고딕을 설치한 뒤 다시 실행하세요."); process.exit(1); }
  if (!(bk > m && m > r)) { console.error(`★폰트 웨이트가 반영되지 않습니다(400=${r} 500=${m} 900=${bk}) — Noto Sans KR(가변)이 필요합니다.`); process.exit(1); }
  return `폰트 OK — 잉크 400=${r} 500=${m} 900=${bk} (Black·Medium 구분됨)`;
}

async function run(slug, fixture) {
  const rawDir = path.join(RAW, slug);
  const outDir = path.join(OUT, slug);
  mkdirSync(outDir, { recursive: true });
  for (const f of existsSync(outDir) ? readdirSync(outDir) : []) rmSync(path.join(outDir, f), { force: true });

  // kit.json
  let kit = KIT_FIXTURE;
  const kitPath = path.join(rawDir, "kit.json");
  if (existsSync(kitPath)) kit = JSON.parse(readFileSync(kitPath, "utf8"));
  else if (!fixture) { console.error(`★kit.json 없음: ${kitPath}`); process.exit(1); }
  else console.log("  kit.json 없음 → fixture 기본값 사용");
  const accent = kit.accent || DEFAULT_ACCENT;

  // 쌍 수집
  const pairs = [];
  for (let n = 1; n <= 4; n++) {
    const a = ["jpg", "jpeg", "png", "webp"].map((e) => path.join(rawDir, `after-${n}.${e}`)).find(existsSync);
    const b = ["jpg", "jpeg", "png", "webp"].map((e) => path.join(rawDir, `before-${n}.${e}`)).find(existsSync);
    if (a && b) pairs.push({ n, after: a, before: b });
    else if (fixture) pairs.push({ n, after: await placeholder(`after-${n}.jpg`, false), before: await placeholder(`before-${n}.jpg`, true) });
  }
  if (pairs.length < 2) { console.error(`★쌍이 ${pairs.length}개 — 최소 2쌍 필요`); process.exit(1); }
  console.log(`  쌍 ${pairs.length}개${fixture ? " (fixture 자리표시)" : ""}`);

  // 딥링크
  const dl = resolveDeeplink(kit.conceptKey);
  if (!dl.ok) { fail(`딥링크 해석 실패 — ${dl.why}`); }

  // 카드
  const lines = [];
  lines.push(await buildCover(path.join(outDir, "01-cover.png"), pairs[0].after, pairs[0].before, kit, accent));
  // ★선택 비교용 — dark 알약판을 한 장 더 낸다. 컨택트시트에는 넣지 않는다(기본만 보여준다).
  lines.push(await buildCover(path.join(outDir, "01-cover-pill-dark.png"), pairs[0].after, pairs[0].before, kit, accent, "dark"));
  for (const [i, p] of pairs.entries()) {
    lines.push(await buildBody(path.join(outDir, `${String(i + 2).padStart(2, "0")}-body.png`), p.after, p.before, i + 1, kit));
  }
  const ctaNo = String(pairs.length + 2).padStart(2, "0");
  const folNo = String(pairs.length + 3).padStart(2, "0");
  lines.push(await buildCta(path.join(outDir, `${ctaNo}-cta.png`), pairs[0].after, kit, accent));
  lines.push(await buildFollow(path.join(outDir, `${folNo}-follow.png`), (pairs[2] || pairs[pairs.length - 1]).after));

  // 텍스트
  const caption = buildCaption(kit);
  const dmUrl = dl.ok ? (kit.dm.deeplink === "auto" ? dl.url : kit.dm.deeplink) : "(해석 실패)";
  const dmText = buildDm(kit, dmUrl);
  writeFileSync(path.join(outDir, "caption.txt"), caption, "utf8");
  writeFileSync(path.join(outDir, "firstcomment.txt"), kit.firstComment, "utf8");
  writeFileSync(path.join(outDir, "dm.txt"), dmText, "utf8");

  // ── 게이트 ──
  const files = readdirSync(outDir).filter((f) => f.endsWith(".png") && f !== "contact.png").sort();
  // 컨택트시트에는 기본 커버만 — dark 비교판은 규격·게이트 대상이되 시트에서는 뺀다
  const sheetFiles = files.filter((f) => f !== "01-cover-pill-dark.png");
  const specBad = [];
  for (const f of files) {
    const m = await sharp(path.join(outDir, f)).metadata();
    if (m.width !== W || m.height !== H) specBad.push(`${f} ${m.width}×${m.height}`);
  }
  if (specBad.length) fail(`규격 위반: ${specBad.join(", ")}`);

  const lintHits = [
    ...lint("caption.txt", caption), ...lint("dm.txt", dmText), ...lint("firstcomment.txt", kit.firstComment),
    ...lint("kit.json", JSON.stringify(kit, null, 1)),
  ];
  if (lintHits.length) fail(`금지어 ${lintHits.length}건:\n      ${lintHits.join("\n      ")}`);

  const acc = kit.title.accent;
  const accN = acc ? kit.title.line2.split(acc).length - 1 : 0;
  if (accN !== 1) fail(`accent 단어 "${acc}"가 line2에 ${accN}회 (정확히 1회여야 함)`);

  // 컨택트시트 (가로 4열)
  const CW = 270, CH = Math.round(CW * H / W), LB = 22, G = 8;
  const cols = 4, rows = Math.ceil(files.length / cols);
  const comp = [];
  for (const [i, f] of sheetFiles.entries()) {
    const x = G + (i % cols) * (CW + G), y = G + Math.floor(i / cols) * (CH + LB + G);
    comp.push({ input: await sharp(path.join(outDir, f)).resize(CW, CH).png().toBuffer(), left: x, top: y });
    comp.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LB}"><text x="2" y="16" font-family="${FONTS}" font-size="14" font-weight="500" fill="#111">${esc(f)}</text></svg>`),
      left: x, top: y + CH,
    });
  }
  const contact = path.join(outDir, "contact.png");
  await sharp({ create: { width: cols * (CW + G) + G, height: rows * (CH + LB + G) + G, channels: 3, background: "#F2F4F7" } })
    .composite(comp).png().toFile(contact);

  return { lines, files, caption, dmText, dl, contact, outDir, kit };
}

// ── 진입점 ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const fixture = args.includes("--fixture");
const slugs = args.filter((a) => !a.startsWith("--"));
if (!slugs.length) { console.error("사용법: node scripts/insta-kit.mjs ep03-deskfigure [--fixture]"); process.exit(1); }

console.log(await fontProbe());
for (const slug of slugs) {
  console.log(`\n■ ${slug}${fixture ? "  [fixture]" : ""}`);
  const r = await run(slug, fixture);
  for (const l of r.lines) console.log(`  ${l}`);
  console.log(`\n  ── 게이트 ──`);
  console.log(`  ① 규격 1080×1350 ${r.files.length}장 : ${fails.some((f) => f.startsWith("규격")) ? "FAIL" : "PASS"}`);
  console.log(`  ② 안전영역 (검사 ${boxes.length}건)   : ${fails.some((f) => f.startsWith("안전영역")) ? "FAIL" : "PASS"}`);
  console.log(`  ③ 금지어 린트                : ${fails.some((f) => f.startsWith("금지어")) ? "FAIL" : "PASS"}`);
  console.log(`  ④ accent 단어 1회            : ${fails.some((f) => f.startsWith("accent")) ? "FAIL" : "PASS"}`);
  // ⑤ 이미지가 git 추적 변경에 올라오지 않았는지 — insta/는 gitignore라 원래 0이어야 한다
  const imgTracked = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" })
    .split("\n").filter((l) => l && !l.startsWith("??") && /\.(jpg|jpeg|png|webp)$/i.test(l.trim()));
  if (imgTracked.length) fail(`이미지 추적 변경 ${imgTracked.length}건:\n      ${imgTracked.join("\n      ")}`);
  console.log(`  ⑤ 이미지 추적 변경 0건       : ${imgTracked.length ? "FAIL — " + imgTracked.length + "건" : "PASS"}`);
  console.log(`  ＋ 알약 글자 잘림 없음        : ${fails.some((f) => f.startsWith("알약")) ? "FAIL" : "PASS"}`);
  console.log(`  ⑥ 딥링크 해석                : ${r.dl.ok ? `PASS — ${r.dl.url}` : "FAIL — " + r.dl.why}`);
  console.log(`\n  캡션 ${r.caption.length}자 · DM ${r.dmText.length}자`);
  console.log(`  출력: ${r.outDir}`);
  console.log(`  컨택트시트: ${r.contact}`);
}
if (fails.length) {
  console.log(`\n★FAIL ${fails.length}건`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\n■ 게이트 전항 PASS");
