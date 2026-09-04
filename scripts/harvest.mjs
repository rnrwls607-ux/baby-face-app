#!/usr/bin/env node
// scripts/harvest.mjs — 컨셉 자동화 1호: 비포 생성 + 애프터 생성 + 컨택트 시트
//
// 무엇을 없애려고 만들었나
//   컨셉 하나를 검증하려면 지금까지 사람이 (1) 비포 사진 3장을 어딘가에서 만들고
//   (2) 앱에 한 장씩 올려 애프터 4장을 뽑고 (3) 폴더에 규격대로 이름 붙여 넣었다.
//   이 스크립트는 그 왕복을 클릭 0으로 만든다. 산출물은 검증·킷·BA의 공통 원료다.
//
// ★애프터가 "앱과 같은 그림"인 근거 — 세 겹으로 못박는다
//   1. 프롬프트: 손으로 옮기지 않는다. app/api/{키}/route.ts를 TS 트랜스파일 →
//      VM 평가로 실제 문자열을 뽑는다(템플릿 보간·변형 Record 포함). md5를 찍어 대조한다.
//   2. 재시도·오류 분류: app/lib/gemini.ts를 문자 복제하지 않고 그대로 import 한다.
//      (gemini.ts는 import 0줄인 순수 fetch 모듈이고 Node 24는 .ts 타입 스트리핑이
//       기본이라 그냥 읽힌다 — 실측으로 확인함. 복제본이 없으니 드리프트도 없다.)
//   3. 전송 형식: 엔드포인트·모델명·body·응답 파싱을 route와 같은 모양으로 맞춘다.
//      (아래 callGemini / callGptEdit 주석에 근거 route 줄을 적어둔다.)
//
// ★route와 일부러 다르게 한 것 — 여기는 서버가 아니다
//   - stampAiMetadata(AI 비가시 도장)를 찍지 않는다. 크롭도 안 한다.
//     원료는 원본 그대로 보존하고, 규격화는 ba-prep.mjs 몫이다.
//   - withCoin·withDailyFree 같은 과금/게이트를 타지 않는다. 대신 --max-cost로 막는다.
//
// ★기본이 dry-run이다. --run 을 붙이지 않으면 외부 호출이 정확히 0건이다.
//
// 사용법
//   node scripts/harvest.mjs --spec specs/schoolsnap.json                 ★수동(호출 0)
//   node scripts/harvest.mjs --spec specs/schoolsnap.json --dry-run       API 계획만
//   node scripts/harvest.mjs --spec specs/schoolsnap.json --run
//   node scripts/harvest.mjs --spec specs/schoolsnap.json --befores --run
//   node scripts/harvest.mjs --spec specs/schoolsnap.json --run --only 1 --out examples/ba/_pilot
//   플래그: --befores/--afters(둘 다 없으면 둘 다) · --force(이미 있는 파일 재생성)
//           --only 1,3(해당 번호만) · --out DIR(산출 루트 우회) · --max-cost 3000
//           --sheet-only(호출 없이 시트만 다시 만듦)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import * as pool from "./lib/pool.mjs";
import { engineRanking, STUDIO, STUDIO_SHORT } from "./lib/engines.mjs";
import { glamCheck, glamLabel } from "./lib/glam-check.mjs";

// ★경로에 공백이 있으면(이 PC: "Hello G.BOX") import.meta.url이 %20으로 인코딩된다.
//   fileURLToPath로 반드시 디코딩할 것 — 안 하면 mkdir·readFileSync가 통째로 죽는다.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(path.join(ROOT, "package.json"));
// ★sharp는 package.json에 없다 — next의 전이 의존으로 깔려 있는 것을 쓴다
//   (ba-prep.mjs·insta-kit.mjs도 같은 전제). next가 언젠가 sharp를 떼면 여기서 죽으므로
//   원인을 알아볼 수 있게 문구를 남긴다. typescript는 devDependencies에 선언돼 있다.
function need(name, hint) {
  try { return require_(name); }
  catch { console.error(`\n★${name} 를 못 찾았다 — ${hint}\n`); process.exit(1); }
}
const sharp = need("sharp", "npm i -D sharp 로 직접 설치할 것(지금은 next 전이 의존에 얹혀 있다)");
const ts = need("typescript", "devDependencies에 있어야 한다 — npm install 을 먼저 돌릴 것");

// app/lib/gemini.ts 를 복제하지 않고 그대로 쓴다(위 근거 2).
const gemini = await import(pathToFileURL(path.join(ROOT, "app/lib/gemini.ts")).href);

const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");
const rd = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function fail(msg) {
  console.error(`\n★중단 — ${msg}\n`);
  process.exit(1);
}

// ── 단가표 ──────────────────────────────────────────────────────────────────
// ★가정치다. 실측(콘솔 청구액 / 호출 수) 뒤에 이 표만 고치면 된다.
//   dry-run 상한(--max-cost)의 기준이라 과소평가보다 과대평가가 안전하다.
const PRICE = {
  pro: 300,        // gemini-3-pro-image 1회
  flash: 50,       // gemini-3.1-flash-image 1회
  gpt: 150,        // gpt-image-2 (generations·edits 동일 가정)
};
const MODEL = {
  pro: "gemini-3-pro-image",
  flash: "gemini-3.1-flash-image",
};

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  // ★기본은 manual(비용 0). --run 을 붙였을 때만 API를 부른다.
  const a = { spec: null, befores: false, afters: false, run: false, manual: true, force: false,
              only: null, out: "examples/ba", maxCost: 3000, sheetOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--spec") a.spec = argv[++i];
    else if (t === "--befores") a.befores = true;
    else if (t === "--afters") a.afters = true;
    else if (t === "--run") { a.run = true; a.manual = false; }
    else if (t === "--dry-run") { a.run = false; a.manual = false; }   // API 계획만 출력
    else if (t === "--manual") a.manual = true;
    else if (t === "--force") a.force = true;
    else if (t === "--sheet-only") { a.sheetOnly = true; a.manual = false; }
    else if (t === "--only") a.only = argv[++i].split(",").map((x) => Number(x.trim())).filter(Boolean);
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--max-cost") a.maxCost = Number(argv[++i]);
    else fail(`모르는 플래그: ${t}`);
  }
  if (!a.spec) fail("--spec specs/{키}.json 이 필요하다");
  if (!a.befores && !a.afters) { a.befores = true; a.afters = true; }  // 둘 다 안 주면 둘 다
  return a;
}

// ── .env.local ──────────────────────────────────────────────────────────────
// ★값은 어디에도 출력하지 않는다. 있음/없음만 보고한다.
function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) fail(".env.local 이 없다");
  for (const line of rd(p).split("\n")) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

// ── 프롬프트 추출기 (지난 배치의 VM 평가기를 그대로 내장) ────────────────────
// 스크래치가 아니라 리포에 둔다 — 이후 detail-page·new-concept 스크립트도 이걸 쓴다.
function sliceFrom(src, start) {
  let i = start, depth = 0, tick = 0, out = "";
  while (i < src.length) {
    const c = src[i], p = src[i - 1];
    if (c === "`" && p !== "\\") tick ^= 1;
    if (!tick) {
      if ("([{".includes(c)) depth++;
      if (")]}".includes(c)) depth--;
      if (c === ";" && depth === 0) break;
    }
    out += c; i++;
  }
  return out.trim();
}
function sliceInitializer(src, declRe) {
  const m = src.match(declRe);
  return m ? sliceFrom(src, m.index + m[0].length) : null;
}
// 한 route에 생성 호출이 여럿일 수 있다(2단 route 전례) — 후보를 전부 모은다.
function promptExprs(src) {
  const toks = [];
  for (const m of src.matchAll(/\{\s*text:\s*([A-Za-z_$][\w$]*(?:\([^)]*\))?)\s*\}/g)) toks.push(m[1]);
  for (const m of src.matchAll(/append\("prompt",\s*([A-Za-z_$][\w$]*(?:\([^)]*\))?)\s*\)/g)) toks.push(m[1]);
  const seen = new Set(), out = [];
  for (const tok of toks) {
    if (seen.has(tok)) continue;
    seen.add(tok);
    if (!/^prompt$/.test(tok)) { out.push(tok); continue; }
    for (const m of src.matchAll(/const prompt(?:\s*:\s*string)?\s*=\s*/g)) {
      const e = sliceFrom(src, m.index + m[0].length);
      if (e && !out.includes(e)) out.push(e);
    }
  }
  return out;
}
const stubTarget = function () {};
const stub = new Proxy(stubTarget, { get: (t, k) => (k === "then" ? undefined : stub), apply: () => stub, construct: () => stub });
function evalRoute(src, expr, extraBindings = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const bindLines = Object.entries(extraBindings)
    .map(([k, v]) => `var ${k} = ${typeof v === "string" && v.startsWith("@@") ? v.slice(2) : JSON.stringify(v)};`)
    .join("\n");
  // export const 는 CJS 에미션에서 exports.X 로만 남아 자유변수로 안 잡힌다 → 전역에 되살린다
  const code = `${js}\n;(function(){\nObject.assign(globalThis, module.exports || {});\n${bindLines}\nglobalThis.__OUT = (${expr});\n})();`;
  const sandbox = {
    require: () => stub, module: { exports: {} }, exports: null, console: { log() {}, warn() {}, error() {} },
    process: { env: {} }, Buffer, URL, TextDecoder, TextEncoder, setTimeout, clearTimeout, fetch: stub,
    JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, Promise, Map, Set,
    __OUT: null, globalThis: null,
  };
  sandbox.exports = sandbox.module.exports;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  new vm.Script(code, { filename: "route.js" }).runInContext(sandbox, { timeout: 10000 });
  return sandbox.__OUT;
}
// 미정의 식별자를 소스의 const 선언에서 자동 해소하며 재시도
function evalRouteResolving(src, expr, seed = {}) {
  const bind = { ...seed };
  const tried = new Set();
  for (let i = 0; i < 15; i++) {
    try { return evalRoute(src, expr, bind); }
    catch (e) {
      const m = String(e.message).match(/^(\w+) is not defined$/);
      if (!m || tried.has(m[1])) throw e;
      const id = m[1];
      tried.add(id);
      const init = sliceInitializer(src, new RegExp("(?:const|let)\\s+" + id + "\\s*(?::[^=]+)?=\\s*"));
      if (!init) throw new Error(`${e.message} — 소스에 const ${id} 선언 없음`);
      bind[id] = "@@" + init;
    }
  }
  throw new Error("해소 반복 초과");
}

// spec.prompt 를 실제 문자열(들)로 바꾼다. duo면 genders 조합마다 하나씩.
function resolvePrompts(spec) {
  if (spec.prompt?.source === "file") {
    const p = path.join(ROOT, spec.prompt.path);
    if (!fs.existsSync(p)) fail(`prompt.path 파일이 없다: ${spec.prompt.path}`);
    return [{ label: "file", text: rd(p) }];
  }
  const rp = path.join(ROOT, "app/api", spec.key, "route.ts");
  if (!fs.existsSync(rp)) fail(`route가 없다: app/api/${spec.key}/route.ts`);
  const src = rd(rp);
  if (spec.duo?.genders?.length) {
    return spec.duo.genders.map(([g1, g2]) => ({
      label: `${g1}+${g2}`,
      text: evalRouteResolving(src, `buildPrompt(${JSON.stringify(g1)}, ${JSON.stringify(g2)})`),
    }));
  }
  const exprs = promptExprs(src);
  if (exprs.length !== 1) fail(`프롬프트 표현식이 ${exprs.length}개다 — spec.prompt를 source:"file"로 고정할 것`);
  return [{ label: "route", text: evalRouteResolving(src, exprs[0]) }];
}

// ── 호출부 ──────────────────────────────────────────────────────────────────
const parseDataUrl = (b64, mime = "image/png") => ({ mimeType: mime, data: b64 });

// 비포 — OpenAI /v1/images/generations (리포에 전례가 없는 유일한 신규 형식)
// gpt-image-2는 1024x1536(2:3) 프리셋과, 두 변이 16의 배수이면 커스텀 크기도 받는다.
// ★기본값은 1088x1456(3:4) — 실호출로 수용 확인함. BA 카드가 3:4라 여기서 맞춰 두면
//   ba-prep 크롭이 거의 손을 안 대도 된다(2:3으로 뽑으면 위아래를 크게 잘라내야 한다).
async function callGptGenerate(prompt, size) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality: "medium", n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI generations ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("generations 응답에 b64_json 없음");
  return b64;
}

// 애프터(GPT) — app/api/gravityad/route.ts:48~84 와 같은 형식
async function callGptEdit(prompt, imgs) {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", prompt);
  form.append("size", "auto");        // ★원본 비율 보존 — route와 동일
  form.append("quality", "medium");
  form.append("n", "1");
  for (const img of imgs) {
    const bytes = new Uint8Array(Buffer.from(img.data, "base64"));
    form.append("image[]", new Blob([bytes], { type: img.mimeType }), "photo.png");
  }
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
    body: form,
  });
  if (!res.ok) {
    const t = (await res.text()).slice(0, 300);
    const e = new Error(`OpenAI edits ${res.status}: ${t}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("edits 응답에 b64_json 없음");
  return b64;
}

// 애프터(Gemini) — app/api/schoolsnap/route.ts:155~197 과 같은 형식.
// 재시도는 복제하지 않고 gemini.ts의 fetchGeminiWithRetry를 그대로 쓴다.
async function callGemini(prompt, imgs, engine, label) {
  const model = MODEL[engine];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  let res;
  try {
    res = await gemini.fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            ...imgs.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.data } })),
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      label,
      1,
      engine === "pro"   // fastOnly — Pro만 엄격 모드(route와 동일)
    );
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const e = new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const cand = data?.candidates?.[0];
    const txt = respParts.find((p) => p.text)?.text;
    throw new Error(`이미지 없음 — finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} text=${(txt || "").slice(0, 200)}`);
  }
  return b64;
}

// 429/503 1회 재시도. Gemini는 gemini.ts가 이미 재시도하므로 여기선 GPT만 실질 재시도한다.
async function withRetry(label, fn) {
  try { return await fn(); }
  catch (e) {
    if (e.status === 429 || e.status === 503) {
      console.log(`      ↻ ${e.status} — 3초 후 1회 재시도`);
      await new Promise((r) => setTimeout(r, 3000));
      return await fn();
    }
    throw e;
  }
}

// ── 컨택트 시트 ─────────────────────────────────────────────────────────────
const CELL_W = 768, CELL_H = 1024, GAP = 16, BAR = 64;
async function buildSheet(dir, key, rows, label) {
  const usable = rows.filter((r) => r.before && r.after && fs.existsSync(r.before) && fs.existsSync(r.after));
  if (!usable.length) return null;
  const W = GAP + CELL_W * 2 + GAP * 2;
  const H = BAR + usable.length * (CELL_H + GAP) + GAP;
  const layers = [];
  for (const [i, r] of usable.entries()) {
    const y = BAR + i * (CELL_H + GAP);
    for (const [j, src] of [r.before, r.after].entries()) {
      const buf = await sharp(src)
        .resize(CELL_W, CELL_H, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png().toBuffer();
      layers.push({ input: buf, left: GAP + j * (CELL_W + GAP), top: y });
    }
  }
  // 라벨은 내부용이라 글자를 허용한다. 폰트가 없는 환경이면 시트만 글자 없이 낸다.
  try {
    const svg = `<svg width="${W}" height="${BAR}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${BAR}" fill="#141210"/>
<text x="${GAP}" y="42" font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
    layers.unshift({ input: Buffer.from(svg), left: 0, top: 0 });
  } catch { /* 폰트 문제 — 라벨 생략 */ }
  const out = path.join(dir, `${key}_시트.png`);
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 244, g: 243, b: 241 } } })
    .composite(layers).png().toFile(out);
  return out;
}

// ── 수동 모드 ────────────────────────────────────────────────────────────────
// 검증 비용 0 경로. 비포는 풀에서 복사하고, 애프터는 MJ가 스튜디오(웹 UI)에서 만든다.
// 이 스크립트는 ①비포를 깔아주고 ②무엇을 어디서 어떻게 만들지 체크리스트로 적어주고
// ③파일이 다 들어오면 시트를 만들어 준다. 외부 호출은 한 건도 하지 않는다.
async function runManual() {
  fs.mkdirSync(outDir, { recursive: true });
  const st = pool.stats();
  console.log(`\n  ── 수동 모드 (외부 호출 0)`);
  console.log(`     풀: ${st ? `${st.total}장 (female ${st.female.noglasses}+안경 ${st.female.glasses} · male ${st.male.noglasses}+안경 ${st.male.glasses})` : "★없음 — examples/ba/_pool 을 먼저 만들 것"}`);

  // ① 비포 — 힌트대로 풀에서 고른다. 사물·음식·펫·특수 장면은 MJ 몫.
  const person = ["person", "duo"].includes(spec.inputType);
  const hints = spec.befores.map((b, i) => b.pool ?? (person ? (pool.DEFAULT_HINTS[i] ?? "female") : "custom"));
  const picked = pool.pick(hints);
  const usedNames = [];
  console.log(`\n  ── 비포`);
  for (const [i, b] of spec.befores.entries()) {
    const dst = path.join(outDir, b.file);
    const p = picked[i];
    if (!p.file) { console.log(`     비포${i + 1}  ${b.file}  ← ★${p.reason} (힌트 ${p.hint})`); continue; }
    if (fs.existsSync(dst) && !args.force) { console.log(`     비포${i + 1}  ${b.file}  이미 있음 — 건너뜀`); usedNames.push(p.file); continue; }
    fs.copyFileSync(path.join(ROOT, pool.POOL_DIR, p.file), dst);
    usedNames.push(p.file);
    console.log(`     비포${i + 1}  ${b.file}  ← 풀 ${p.file}${p.reused ? " (재사용 — 미사용분 소진)" : ""}`);
  }
  if (usedNames.length) fs.writeFileSync(path.join(outDir, "USED_POOL.txt"), usedNames.join("\n") + "\n", "utf8");

  // ② 체크리스트
  const md = buildChecklist(picked);
  const clPath = path.join(outDir, `${spec.key}_수확체크리스트.md`);
  fs.writeFileSync(clPath, md, "utf8");
  console.log(`\n  체크리스트: ${path.relative(ROOT, clPath).split(path.sep).join("/")} (${md.split("\n").length}줄)`);
  const memoPath = path.join(outDir, `${spec.key}_프롬프트.txt`);
  fs.writeFileSync(memoPath, buildPromptMemo(), "utf8");
  console.log(`  복붙 메모장: ${path.relative(ROOT, memoPath).split(path.sep).join("/")}`);

  // ③ 애프터 감지
  const missing = [];
  for (let n = 1; n <= spec.afters.count; n++) {
    if (!fs.existsSync(path.join(outDir, `${spec.key}_애프터${n}.png`))) missing.push(n);
  }
  if (missing.length) {
    console.log(`\n  ── 남은 애프터 ${missing.length}장`);
    for (const n of missing) console.log(`     ${spec.key}_애프터${n}.png  — 체크리스트의 "애프터 ${n}" 항목 참고`);
    console.log(`\n  다 만들어서 위 이름으로 ${path.relative(ROOT, outDir).split(path.sep).join("/")} 에 넣고 이 명령을 다시 돌리면 시트가 나온다.\n`);
    return;
  }

  const rows = [];
  for (let n = 1; n <= spec.afters.count; n++) {
    const m = (spec.afters.map || [])[n - 1];
    const bi = (Array.isArray(m) ? m[0] : m) - 1;
    rows.push({
      before: spec.befores[bi] ? path.join(outDir, spec.befores[bi].file) : null,
      after: path.join(outDir, `${spec.key}_애프터${n}.png`),
    });
  }
  const sheet = await buildSheet(outDir, spec.key, rows,
    `${spec.key} · ${spec.engine} · prompt md5 ${md5(prompts[0].text).slice(0, 8)} · ${new Date().toISOString().slice(0, 10)}`);
  console.log(`\n  애프터 ${spec.afters.count}장 전부 확인 · 시트: ${path.relative(ROOT, sheet).split(path.sep).join("/")}`);

  console.log(`\n  ── 판정표 골격 (G2에 채워 넣을 것)`);
  console.log(`     | 컷 | ${(spec.verdicts || []).join(" | ")} |`);
  console.log(`     |---|${(spec.verdicts || []).map(() => "---").join("|")}|`);
  for (let n = 1; n <= spec.afters.count; n++) console.log(`     | 애프터${n} |${(spec.verdicts || []).map(() => "  ").join("|")}|`);
  console.log("");
}

// 복붙 전용 메모장 — {키}_프롬프트.txt
// ★이 파일에는 설명·표·md 기호·판정 포인트를 넣지 않는다. MJ가 윈도우 메모장으로 열어
//   구분선 아래를 그대로 긁어 스튜디오에 붙이는 용도라, 군더더기가 한 줄이라도 있으면
//   잘못 복사된다. 순위·이유는 체크리스트에 있으니 여기엔 스튜디오 이름만.
// ★인코딩 UTF-8(BOM 없음) · 줄끝 CRLF — 윈도우 메모장이 그대로 읽게.
function buildPromptMemo() {
  const RULE = "────────────────────────";
  const L = [];
  L.push(`${spec.name || spec.key} (${spec.key})`);
  L.push("");
  for (const r of engineRanking(spec)) L.push(`${r.rank}순위: ${STUDIO_SHORT[r.engine] || r.engine}`);
  L.push("");
  // duo는 성별 조합별 프롬프트를 구분선으로 나눠 순서대로 — 단일 컨셉은 프롬프트 1개
  for (const [i, pr] of prompts.entries()) {
    L.push(RULE);
    if (prompts.length > 1) L.push(`[${pr.label}]`);
    L.push("");
    L.push(pr.text.trim());
    if (i < prompts.length - 1) L.push("");
  }
  L.push("");
  // ★프롬프트 본문 안의 \n도 전부 CRLF로 — 헤더만 CRLF고 본문은 LF로 섞이면 메모장에서
  //   한 줄로 붙어 보인다(첫 생성에서 실제로 그렇게 나왔다).
  return L.join("\n").replace(/\r?\n/g, "\r\n");
}

function buildChecklist(picked) {
  const L = [];
  L.push(`# ${spec.key} 수확 체크리스트 — ${spec.name || ""}`);
  L.push("");
  L.push(`- 엔진: **${spec.engine}** → 스튜디오 **${STUDIO[spec.engine]}**`);
  L.push("");
  L.push("## 엔진 순위 — 1순위부터 찍어보고, 별로면 다음으로");
  L.push("");
  for (const r of engineRanking(spec)) L.push(`${r.rank}순위 **${r.engine}** (${r.studio}): ${r.why}`);
  L.push(`- 입력 종류: ${spec.inputType}`);
  L.push(`- ${glamLabel(spec.glam)} · glam-check PASS(코어 정본 문자 일치)`);
  L.push(`- 저장 위치: \`${path.relative(ROOT, outDir).split(path.sep).join("/")}\``);
  L.push(`- 프롬프트 출처: ${spec.prompt?.source === "file" ? spec.prompt.path : `app/api/${spec.key}/route.ts (VM 재추출)`} · md5 \`${md5(prompts[0].text).slice(0, 8)}\``);
  L.push("");
  L.push("## 비포");
  L.push("");
  L.push("| # | 파일 | 출처 |");
  L.push("|---|---|---|");
  for (const [i, b] of spec.befores.entries()) {
    const p = picked[i];
    L.push(`| ${i + 1} | \`${b.file}\` | ${p.file ? `풀 \`${p.file}\`` : `**★MJ가 ChatGPT에서 생성** — 아래 프롬프트 사용`} |`);
  }
  for (const [i, b] of spec.befores.entries()) {
    if (picked[i].file) continue;
    L.push("");
    L.push(`### 비포 ${i + 1} 생성 프롬프트 (\`${b.file}\`)`);
    L.push("");
    L.push("```");
    L.push(b.prompt || "(spec에 프롬프트 없음)");
    L.push("```");
  }
  L.push("");
  L.push("## 애프터");
  for (let n = 1; n <= spec.afters.count; n++) {
    const m = (spec.afters.map || [])[n - 1];
    const idx = Array.isArray(m) ? m : [m];
    const inputs = idx.map((k) => spec.befores[k - 1]?.file || `★비포${k} 없음`);
    const pi = spec.duo ? Math.min(n - 1, prompts.length - 1) : 0;
    const pr = prompts[pi];
    L.push("");
    L.push(`### 애프터 ${n}`);
    L.push("");
    L.push(`- **입력 비포**: ${inputs.map((f) => `\`${f}\``).join(" + ")}${spec.duo ? "  (순서 = Person 1, 2)" : ""}`);
    L.push(`- **스튜디오**: ${STUDIO[spec.engine]}`);
    if (spec.duo) L.push(`- **성별 조합**: ${pr.label}`);
    L.push(`- **저장 파일명**: \`${spec.key}_애프터${n}.png\``);
    L.push(`- **판정 포인트**: ${(spec.verdicts || [])[n - 1] || "(spec에 verdicts 없음)"}`);
    L.push("");
    L.push(`- **프롬프트 전문** (${pr.text.length}자 · md5 \`${md5(pr.text).slice(0, 8)}\`) — 아래를 통째로 복사해서 넣을 것:`);
    L.push("");
    L.push("```");
    L.push(pr.text);
    L.push("```");
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push(`애프터 ${spec.afters.count}장을 위 이름으로 저장한 뒤 다시 실행하면 컨택트 시트와 판정표 골격이 나온다:`);
  L.push("");
  L.push("```");
  L.push(`node scripts/harvest.mjs --spec ${args.spec}`);
  L.push("```");
  L.push("");
  return L.join("\n");
}

// ── main ────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));
const spec = JSON.parse(rd(path.join(ROOT, args.spec)));
for (const f of ["key", "engine", "inputType", "glam", "befores", "afters"]) {
  if (spec[f] === undefined) fail(`spec에 "${f}"가 없다`);
}
if (!PRICE[spec.engine]) fail(`모르는 engine: ${spec.engine} (pro|flash|gpt)`);
loadEnv();

const outDir = path.join(ROOT, args.out, spec.key);
const pick = (n) => !args.only || args.only.includes(n);

console.log(`\n■ ${spec.key} — ${spec.name || ""}  [engine=${spec.engine} · inputType=${spec.inputType} · ${glamLabel(spec.glam)}]`);
console.log(`  산출 위치: ${path.relative(ROOT, outDir).split(path.sep).join("/")}`);

// 1) 프롬프트 확보 — 손으로 옮긴 구간 0
const prompts = resolvePrompts(spec);
// ★외모 코어 잠금 — 수동·API 모두, 어떤 파일도 쓰기 전에. 실패면 진행 금지(플레이북 §1-4·§5 5단계표).
for (const p of prompts) {
  const gc = glamCheck(p.text, { glam: spec.glam, inputType: spec.inputType });
  console.log(gc.report());
  if (!gc.ok) fail(`glam-check 실패(${p.label}) — 코어 정본(scripts/lib/glam-core)과 문자 일치시킬 것`);
}
if (args.manual) { await runManual(); process.exit(0); }
console.log(`\n  ── 프롬프트 (${spec.prompt?.source === "file" ? "파일" : "route 재추출"})`);
for (const p of prompts) console.log(`     ${p.label.padEnd(16)} ${String(p.text.length).padStart(5)}자 · md5 ${md5(p.text).slice(0, 8)}`);

// 2) 계획 세우기
const plan = [];
if (args.befores) {
  for (const [i, b] of spec.befores.entries()) {
    const n = i + 1;
    if (!pick(n)) continue;
    const dst = path.join(outDir, b.file);
    const skip = fs.existsSync(dst) && !args.force;
    plan.push({ kind: "before", n, dst, skip, cost: PRICE.gpt, model: "gpt-image-2 (generations)",
                prompt: b.prompt, size: b.size || spec.beforeSize || "1088x1456" });
  }
}
if (args.afters) {
  const map = spec.afters.map || [];
  for (let n = 1; n <= spec.afters.count; n++) {
    if (!pick(n)) continue;
    const m = map[n - 1];
    const srcIdx = Array.isArray(m) ? m : [m];
    const srcFiles = srcIdx.map((k) => {
      const b = spec.befores[k - 1];
      if (!b) fail(`afters.map[${n - 1}]가 비포 ${k}를 가리키는데 befores에 없다`);
      return path.join(outDir, b.file);
    });
    const pi = spec.duo ? Math.min(n - 1, prompts.length - 1) : 0;
    const dst = path.join(outDir, `${spec.key}_애프터${n}.png`);
    const skip = fs.existsSync(dst) && !args.force;
    plan.push({ kind: "after", n, dst, skip, cost: PRICE[spec.engine],
                model: spec.engine === "gpt" ? "gpt-image-2 (edits)" : MODEL[spec.engine],
                prompt: prompts[pi].text, promptLabel: prompts[pi].label, srcFiles });
  }
}

const live = plan.filter((p) => !p.skip);
const est = live.reduce((s, p) => s + p.cost, 0);
console.log(`\n  ── 호출 계획 (${plan.length}건 중 실행 ${live.length}건 · 스킵 ${plan.length - live.length}건)`);
for (const p of plan) {
  const tag = p.skip ? "스킵(이미 있음)" : `₩${p.cost}`;
  const src = p.kind === "after" ? ` ← ${p.srcFiles.map((f) => path.basename(f)).join(" + ")}` : ` size=${p.size}`;
  console.log(`     ${p.kind === "before" ? "비포" : "애프터"}${p.n}  ${p.model.padEnd(26)} ${tag.padEnd(16)} ${path.basename(p.dst)}${src}`);
}
console.log(`  예상 비용: ₩${est}  (상한 ₩${args.maxCost})`);
if (est > args.maxCost) fail(`예상 비용 ₩${est} > 상한 ₩${args.maxCost} — --max-cost 를 올리거나 --only 로 줄일 것`);

if (!args.run && !args.sheetOnly) {
  console.log(`\n  [dry-run] 외부 호출 0건. 실행하려면 --run 을 붙일 것.\n`);
  process.exit(0);
}

// 3) 실행
fs.mkdirSync(outDir, { recursive: true });
const failed = [];
let calls = 0;
const T0 = Date.now();

if (!args.sheetOnly) {
  for (const p of plan) {
    if (p.skip) continue;
    const t0 = Date.now();
    try {
      let b64;
      if (p.kind === "before") {
        b64 = await withRetry(`${spec.key}-비포${p.n}`, () => callGptGenerate(p.prompt, p.size));
      } else {
        const missing = p.srcFiles.filter((f) => !fs.existsSync(f));
        if (missing.length) throw new Error(`입력 비포가 없다: ${missing.map((f) => path.basename(f)).join(", ")} (먼저 --befores 로 만들 것)`);
        const imgs = p.srcFiles.map((f) => parseDataUrl(fs.readFileSync(f).toString("base64")));
        b64 = spec.engine === "gpt"
          ? await withRetry(`${spec.key}-애프터${p.n}`, () => callGptEdit(p.prompt, imgs))
          : await withRetry(`${spec.key}-애프터${p.n}`, () => callGemini(p.prompt, imgs, spec.engine, `${spec.key}-애프터${p.n}`));
      }
      calls++;
      fs.writeFileSync(p.dst, Buffer.from(b64, "base64"));
      const meta = await sharp(p.dst).metadata();
      console.log(`     ✔ ${path.basename(p.dst)}  ${meta.width}×${meta.height}  ${((Date.now() - t0) / 1000).toFixed(1)}초`);
    } catch (e) {
      calls++;
      failed.push({ what: `${p.kind}${p.n}`, why: String(e.message).slice(0, 220) });
      console.log(`     ✘ ${path.basename(p.dst)}  ${((Date.now() - t0) / 1000).toFixed(1)}초 — ${String(e.message).slice(0, 160)}`);
    }
  }
}

// 4) 컨택트 시트 — 부분 성공이어도 있는 것만으로 만든다
const rows = [];
for (let n = 1; n <= spec.afters.count; n++) {
  const m = (spec.afters.map || [])[n - 1];
  const bi = (Array.isArray(m) ? m[0] : m) - 1;
  rows.push({
    before: spec.befores[bi] ? path.join(outDir, spec.befores[bi].file) : null,
    after: path.join(outDir, `${spec.key}_애프터${n}.png`),
  });
}
const sheet = await buildSheet(outDir, spec.key, rows,
  `${spec.key} · ${spec.engine} · prompt md5 ${md5(prompts[0].text).slice(0, 8)} · ${new Date().toISOString().slice(0, 10)}`);

// 5) 보고
console.log(`\n  ── 결과`);
console.log(`     호출 ${calls}건 · 실비용(가정단가) ₩${live.reduce((s, p) => s + p.cost, 0)} · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
const made = fs.existsSync(outDir) ? fs.readdirSync(outDir).sort() : [];
for (const f of made) console.log(`     ${f}`);
if (sheet) console.log(`     시트: ${path.relative(ROOT, sheet).split(path.sep).join("/")}`);
if (failed.length) {
  console.log(`\n  ★실패 ${failed.length}건`);
  for (const f of failed) console.log(`     ${f.what} — ${f.why}`);
  process.exit(1);
}
console.log(`\n■ 완료\n`);
