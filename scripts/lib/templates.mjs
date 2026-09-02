// scripts/lib/templates.mjs — inputType × engine → 복제 원본 매핑 + route/page 생성기.
// 지난 배치의 gen-routes.mjs / gen-pages.mjs / gen-profileduo.mjs 를 표로 묶은 것이다.
//
// ★매핑은 실측으로 확정했다(2026-09-02, 각 페이지를 직접 읽어 확인).
//   guide·cameraFacing·faceCheck·uploadLabel은 "템플릿이 그렇게 생겼다"가 아니라
//   "새 컨셉이 그래야 한다"를 적은 것이다 — 아래 CAMERA 주석 참고.

import fs from "node:fs";
import { ROOT, abs, readText, fail } from "./repo.mjs";

const BT = String.fromCharCode(96);

// ── 매핑표 ──────────────────────────────────────────────────────────────────
// ★cameraFacing 주의: person×pro 템플릿인 cheerglam은 실측상 "environment"다(후면 카메라).
//   사람 컨셉인데 셀카 카메라가 안 열린다 — 이 값이 복제로 8종에 그대로 번졌다
//   (schoolsnap·poolside·snowsnap·cinesnap·personalcolor·monoactor·fortunecard).
//   그래서 여기서는 템플릿을 그대로 따르지 않고 person은 "user"로 못박는다.
export const TEMPLATES = {
  "person:pro":   { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "solo_face",      camera: "user",        faceCheck: true,  uploadLabel: "사진" },
  "person:gpt":   { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "solo_face",      camera: "user",        faceCheck: true,  uploadLabel: "사진" },
  "person:flash": { tpl: "age",       tplFn: "Age",       promptStyle: "inline", guide: "solo_face",      camera: "user",        faceCheck: true,  uploadLabel: "사진" },
  "product:gpt":  { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "product_obj",    camera: "environment", faceCheck: false, uploadLabel: "제품 사진" },
  "product:pro":  { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "product_obj",    camera: "environment", faceCheck: false, uploadLabel: "제품 사진" },
  "food:gpt":     { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "food_drink",     camera: "environment", faceCheck: false, uploadLabel: "음식 사진" },
  "food:pro":     { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "food_drink",     camera: "environment", faceCheck: false, uploadLabel: "음식 사진" },
  "pet:gpt":      { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "portrait_multi", camera: "environment", faceCheck: false, uploadLabel: "사진" },
  "pet:pro":      { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "portrait_multi", camera: "environment", faceCheck: false, uploadLabel: "사진" },
  "duo:pro":      { tpl: "friend",    tplFn: "Friend",    promptStyle: "duo",    guide: "family",         camera: null,          faceCheck: false, uploadLabel: null, duo: true },
};

export function pickTemplate(spec) {
  const k = `${spec.inputType}:${spec.engine}`;
  const t = TEMPLATES[k];
  if (!t) fail(`템플릿 매핑에 없는 조합: ${k}\n   지원: ${Object.keys(TEMPLATES).join(" · ")}`);
  return { combo: k, ...t };
}

// ── 프롬프트 안전 검사 ───────────────────────────────────────────────────────
// 템플릿 리터럴 안에 그대로 꽂으므로, 리터럴을 깨뜨릴 문자가 있으면 즉시 중단한다.
export function checkPromptText(text, key) {
  const bad = [];
  if (text.includes(BT)) bad.push("백틱");
  if (text.includes("${")) bad.push("${ 보간");
  if (text.includes("\\")) bad.push("역슬래시");
  if (text.includes("\r")) bad.push("CR(줄끝)");
  for (const w of ["무료", "0원", "공짜"]) if (text.includes(w)) bad.push(`금지어 "${w}"`);
  if (bad.length) fail(`${key} 프롬프트에 위험/금지 요소: ${bad.join(", ")}`);
  return text;
}

// ── route 생성 ──────────────────────────────────────────────────────────────
export function buildRoute(key, spec, tpl, promptText) {
  const src = readText(`app/api/${tpl.tpl}/route.ts`);
  if (fs.readFileSync(abs(`app/api/${tpl.tpl}/route.ts`)).includes("\r\n"))
    fail(`템플릿 ${tpl.tpl} route가 CRLF — 관례(LF)와 불일치`);
  let out = src;

  if (tpl.promptStyle === "inline") {
    const head = "  const prompt = " + BT;
    const start = out.indexOf(head);
    const end = out.indexOf(BT + ";\n  const ctrl", start);
    if (start < 0 || end < 0) fail(`${key}: inline 프롬프트 구간 앵커 실패(${tpl.tpl})`);
    out = out.slice(0, start) + head + promptText + out.slice(end);
  } else if (tpl.promptStyle === "const") {
    const marker = `const ${tpl.tpl.toUpperCase()}_PROMPT = ` + BT;
    const start = out.indexOf(marker);
    const end = out.indexOf(BT + `;\n\nasync function generate${tpl.tplFn}`, start);
    if (start < 0 || end < 0) fail(`${key}: const 프롬프트 구간 앵커 실패(${tpl.tpl})`);
    const CONST = key.toUpperCase() + "_PROMPT";
    out = out.slice(0, start) + `const ${CONST} = ` + BT + promptText + out.slice(end);
    out = out.split(`${tpl.tpl.toUpperCase()}_PROMPT`).join(CONST);
  } else if (tpl.promptStyle === "duo") {
    // ★2인은 성별을 하드코딩하면 남성 입력이 여자화된다(profileduo 사고).
    //   프롬프트 안의 "Person 1 is X. Person 2 is Y." 2곳만 파라미터로 바꾼다.
    const marker = "const DUO_PROMPT = (G1: string, G2: string) => " + BT;
    const start = out.indexOf(marker);
    const end = out.indexOf(BT + ";\n", start);
    if (start < 0 || end < 0) fail(`${key}: duo 프롬프트 구간 앵커 실패(${tpl.tpl})`);
    const parameterized = parameterizeDuo(promptText, key);
    out = out.slice(0, start) + marker + parameterized + out.slice(end);
  }

  out = applySubs(out, tpl, key);

  // ★잔재 검사는 헤더 주석을 붙이기 "전"에 한다 — 주석에 템플릿 이름(출처)을 적기 때문에
  //   순서가 바뀌면 내가 써넣은 그 이름을 잔재로 잡아 항상 실패한다(실제로 밟았다).
  assertNoLeftover(out, tpl.tpl, key, "route");

  // 헤더 주석 한 줄 — 어느 템플릿에서 왔는지 남긴다(첫 // 줄 교체)
  out = out.replace(/^\/\/ .*$/m, `// ${spec.name} — ${tpl.combo} (${tpl.tpl} 템플릿 복제, new-concept.mjs 생성)`);
  if (!out.includes(tpl.promptStyle === "duo" ? promptText.split("Person 1 is ")[0].slice(0, 80) : promptText))
    fail(`${key}: 프롬프트 본문이 산출 route에 없다`);
  return out;
}

// "Person 1 is a woman. Person 2 is a woman." → ${G1} / ${G2}
function parameterizeDuo(text, key) {
  const re = /Person 1 is ([^.]+)\. Person 2 is ([^.]+)\./;
  if (!re.test(text)) fail(`${key}: duo 프롬프트에서 "Person 1 is …. Person 2 is …." 문장을 못 찾았다`);
  return text.replace(re, "Person 1 is ${G1}. Person 2 is ${G2}.");
}

// ── page 생성 ───────────────────────────────────────────────────────────────
export function buildPage(key, spec, tpl) {
  const src = readText(`app/${tpl.tpl}/page.tsx`);
  if (fs.readFileSync(abs(`app/${tpl.tpl}/page.tsx`)).includes("\r\n"))
    fail(`템플릿 ${tpl.tpl} page가 CRLF — 관례(LF)와 불일치`);
  let out = src;
  const r = spec.route || {};

  const cut = (needle, label) => {
    const n = out.split(needle).length - 1;
    if (n !== 1) fail(`${key}: ${label} 앵커 ${n}회(1회여야 함)`);
    out = out.replace(needle, "");
  };

  // 얼굴검사 제거 — 얼굴 없는 입력이 정상 사용례인 컨셉(사물·음식·펫)
  if (!tpl.faceCheck && src.includes("useFaceCheck")) {
    cut('import FaceCheckNote from "../components/FaceCheckNote";\n', "import FaceCheckNote");
    cut('import { useFaceCheckSingle } from "../lib/useFaceCheck";\n', "import useFaceCheckSingle");
    cut('  const faceCheck = useFaceCheckSingle(); // 얼굴 사전 검사 (inputRule "solo_face")\n', "faceCheck 선언");
    const oldUp = `    setImage(b64);\n    // hard_fail이면 담지 않는다 — 이유는 업로드 카드 아래 FaceCheckNote가 말한다\n    if (!(await faceCheck.check(b64))) setImage("");\n`;
    if (out.split(oldUp).length - 1 !== 1) fail(`${key}: handleUpload 앵커 실패`);
    out = out.replace(oldUp, `    setImage(b64);\n`);
    out = out.replace(`onRemove={() => { setImage(""); faceCheck.clear(); }}`, `onRemove={() => setImage("")}`);
    const noteBlock = `            <FaceCheckNote\n              notes={faceCheck.notes}\n              onReplace={(_i, files) => handleUpload(files[0])}\n              onPick={(files) => handleUpload(files[0])}\n              single\n            />\n`;
    cut(noteBlock, "FaceCheckNote 블록");
  }

  // 가이드 타입
  const gRe = /<UploadGuide type="[a-z_]+" \/>/;
  if (!gRe.test(out)) fail(`${key}: UploadGuide 앵커 실패`);
  out = out.replace(gRe, `<UploadGuide type="${tpl.guide}" />`);

  // 카메라 — UploadZone 기본값이 "user"라, 후면이 필요하면 반드시 명시해야 한다
  if (tpl.camera) {
    if (/cameraFacing="[a-z]+"/.test(out)) out = out.replace(/cameraFacing="[a-z]+"/, `cameraFacing="${tpl.camera}"`);
    else out = out.replace(`              onRemove={() => setImage("")}\n            />`,
      `              onRemove={() => setImage("")}\n              cameraFacing="${tpl.camera}"\n            />`);
  }

  // 업로드 라벨 · 팁칩
  if (tpl.uploadLabel && tpl.uploadLabel !== "사진") out = out.replace(`label="사진"`, `label="${tpl.uploadLabel}"`);
  if (r.tips?.length) {
    const tipRe = /<TipChips tips=\{\[[^\]]*\]\} \/>/;
    if (!tipRe.test(out)) fail(`${key}: TipChips 앵커 실패`);
    out = out.replace(tipRe, `<TipChips tips={[${r.tips.map(([i, l]) => `{ icon: "${i}", label: "${l}" }`).join(", ")}]} />`);
  }

  // 식별자·경로 치환
  out = applySubs(out, tpl, key);

  // 한글 문구 — spec이 준 것만 바꾼다. 안 주면 템플릿 문구가 그대로 남으므로 아래에서 경고한다.
  if (r.tplName) out = out.split(r.tplName).join(spec.name);
  for (const [from, to] of r.replace || []) out = out.split(from).join(to);

  assertNoLeftover(out, tpl.tpl, key, "page");
  return { text: out, koLeft: r.tplName ? (out.split(r.tplName).length - 1) : null };
}

// ── 공용 치환 목록 ──────────────────────────────────────────────────────────
// ★순서가 중요하다. 긴 형태를 먼저 바꾸지 않으면 짧은 규칙이 먼저 먹어 조각이 남는다.
//   (page에서 CheerglamPage·CONCEPTS.cheerglam·"cheerglam.png"·/examples/ba/cheerglam-
//    네 형태를 놓쳐 잔재 8건이 잡혔다 — 그래서 목록으로 뽑아 route/page가 같이 쓴다.)
export function applySubs(text, tpl, key) {
  const Fn = fnName(key), T = tpl.tpl, TF = tpl.tplFn;
  const subs = [
    [`generate${TF}`, `generate${Fn}`],
    [`${TF}Page`, `${Fn}Page`],
    [`CONCEPTS.${T}`, `CONCEPTS.${key}`],
    [`/api/${T}`, `/api/${key}`],
    [`/examples/ba/${T}-`, `/examples/ba/${key}-`],
    [`"${T}.png"`, `"${key}.png"`],
    [`[${T}]`, `[${key}]`],
    [`${T} error:`, `${key} error:`],
    [`"${T}"`, `"${key}"`],
    [`'${T}'`, `'${key}'`],
  ];
  let out = text;
  for (const [from, to] of subs) out = out.split(from).join(to);
  return out;
}

// ★어간까지 검사한다 — "cheerglam"뿐 아니라 "Cheerglam"·"CHEERGLAM"도 잔재다.
export function assertNoLeftover(text, tplKey, key, what) {
  const stems = [tplKey, tplKey[0].toUpperCase() + tplKey.slice(1), tplKey.toUpperCase()];
  const hits = [];
  for (const s of stems) {
    const n = text.split(s).length - 1;
    if (n) hits.push(`${s}×${n}`);
  }
  if (hits.length) fail(`${key} ${what}: 템플릿 키 잔재 ${hits.join(", ")} — 치환 규칙을 보완할 것`);
}

export const fnName = (key) => key.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());

export function writeRoute(key, text) {
  fs.mkdirSync(abs(`app/api/${key}`), { recursive: true });
  fs.writeFileSync(abs(`app/api/${key}/route.ts`), text, "utf8");
  return `app/api/${key}/route.ts`;
}
export function writePage(key, text) {
  fs.mkdirSync(abs(`app/${key}`), { recursive: true });
  fs.writeFileSync(abs(`app/${key}/page.tsx`), text, "utf8");
  return `app/${key}/page.tsx`;
}
