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
  // ★person:flash 는 예전에 age 템플릿이었다 — age는 PROMPT_OLD/PROMPT_BABY 두 상수를 mode로
  //   분기하는 특수형이라 단일 프롬프트 신규를 얹을 수 없었다(2026-09-06 filmcampus). 구조가 같은
  //   cheerglam으로 옮기고, Pro 전용 상수는 아래 ENGINE_SUBS 가 조립할 때 flash 값으로 바꾼다.
  "person:flash": { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "solo_face",      camera: "user",        faceCheck: true,  uploadLabel: "사진" },
  "product:gpt":  { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "product_obj",    camera: "environment", faceCheck: false, uploadLabel: "제품 사진" },
  "product:pro":  { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "product_obj",    camera: "environment", faceCheck: false, uploadLabel: "제품 사진" },
  "food:gpt":     { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "food_drink",     camera: "environment", faceCheck: false, uploadLabel: "음식 사진" },
  "food:pro":     { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "food_drink",     camera: "environment", faceCheck: false, uploadLabel: "음식 사진" },
  "pet:gpt":      { tpl: "gyaru",     tplFn: "Gyaru",     promptStyle: "const",  guide: "portrait_multi", camera: "environment", faceCheck: false, uploadLabel: "사진" },
  "pet:pro":      { tpl: "cheerglam", tplFn: "Cheerglam", promptStyle: "inline", guide: "portrait_multi", camera: "environment", faceCheck: false, uploadLabel: "사진" },
  "duo:pro":      { tpl: "friend",    tplFn: "Friend",    promptStyle: "duo",    guide: "family",         camera: null,          faceCheck: false, uploadLabel: null, duo: true },
};

// ── 엔진 전용 상수 치환 ──────────────────────────────────────────────────────
// 템플릿 route는 자기 엔진 값을 하드코딩한다(cheerglam:8 `const GEMINI_MODEL = "gemini-3-pro-image"`).
// spec.engine이 템플릿의 native 엔진과 다르면 조립 단계에서 아래를 통째로 바꾼다 —
// 모델명뿐 아니라 ★시간 예산(maxDuration·abort 타이머·문구)까지 같이 옮겨야 한다.
// 안 그러면 60초에 죽는 함수가 230초를 기다리는 route가 나온다.
export const TEMPLATE_ENGINE = { cheerglam: "pro", gyaru: "gpt", age: "flash", friend: "pro" };
export const ENGINE_SUBS = {
  "pro>flash": [
    ["export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제",
     "export const maxDuration = 60; // flash — 짧은 예산(age 라이브 실측값과 동일)"],
    ["// 글램 라인 1차 — 나노바나나 Pro (Pro 단일입력 route 구조 복제, 크롭 없음 = 원본 비율 유지)",
     "// flash 라인 — Pro 글램 템플릿 구조 복제 + 엔진 상수만 flash로 치환(크롭 없음 = 원본 비율 유지)"],
    [`const GEMINI_MODEL = "gemini-3-pro-image";`, `const GEMINI_MODEL = "gemini-3.1-flash-image";`],
    ["ctrl.abort(), 230000", "ctrl.abort(), 50000"],
    ["Pro 예산(230초)", "시간 예산(50초)"],
    ["230초", "50초"],
    ["· gemini-3-pro-image", "· gemini-3.1-flash-image"],
  ],
};

// 조립본에 엔진 치환을 적용한다. 남으면 안 되는 값이 남았는지 끝에서 확인한다.
export function applyEngineSubs(text, tpl, spec, key, what) {
  const native = TEMPLATE_ENGINE[tpl.tpl];
  if (!native) fail(`TEMPLATE_ENGINE에 ${tpl.tpl} 이 없다 — 새 템플릿을 추가했으면 여기도 채울 것`);
  if (!spec.engine || spec.engine === native) return text;
  const rules = ENGINE_SUBS[`${native}>${spec.engine}`];
  if (!rules) fail(`${key}: 엔진 치환 규칙이 없다(${native}>${spec.engine}) — ENGINE_SUBS에 추가할 것`);
  let out = text;
  for (const [from, to] of rules) {
    if (!out.includes(from)) fail(`${key} ${what}: 엔진 치환 앵커가 없다 — "${from.slice(0, 50)}"`);
    out = out.split(from).join(to);
  }
  // ★사후 검사 — 다른 엔진 값이 한 조각도 남으면 안 된다
  const banned = { pro: ["gemini-3-pro-image", "maxDuration = 240", "230000", "230초"], flash: ["gemini-3.1-flash-image"], gpt: [] }[native] || [];
  const left = banned.filter((b) => out.includes(b));
  if (left.length) fail(`${key} ${what}: ${native} 전용 값 잔재 ${left.join(", ")}`);
  return out;
}

// ── 템플릿별 "컨셉 고유 한글 문구·이모지" 목록 ────────────────────────────────
// ★왜 필요한가: 잔재 검사는 키 어간(cheerglam/Cheerglam/CHEERGLAM)만 잡는다. 한글 문구는
//   한 글자도 안 걸리고 조용히 통과해 라이브까지 간다. 실제로 droneview가
//   "여성 스타일링 전용 컨셉이에요"를 달고 배포됐다(2026-09-03). 그래서 템플릿마다
//   그 컨셉에서만 참인 문구를 여기 적어두고, 조립 뒤에 남아 있으면 실패시킨다.
//   spec의 route.tplName / route.replace 로 지우거나 바꾸면 통과한다.
export const TEMPLATE_PHRASES = {
  cheerglam: ["치어리더", "여성 스타일링 전용 컨셉이에요", "📣"],
  gyaru: ["갸루", "갸루 메이크오버"],
  // ★age는 빈 배열이었다 — 가드가 아예 안 돌아 "노년·베이비 변환" 같은 문구가 신규 컨셉에
  //   그대로 실릴 뻔했다(2026-09-06 filmcampus에서 발견). 긴 형태를 앞에 둔다.
  age: ["노년·베이비 변환", "노년 변환", "베이비 변환", "노년의 나", "노년 모습 보기"],
  friend: ["베프", "친구"],
};

// 템플릿에만 참인 "대상 고지" 줄 — 새 컨셉의 audience가 다르면 통째로 뺀다.
// (문구 목록으로 잡아 실패시키기만 하면 person×pro 신규가 매번 replace 보일러플레이트를
//  써야 한다. 조건이 명확하니 자동으로 떼는 게 맞다.)
const AUDIENCE_NOTICE = {
  cheerglam: {
    audience: "female",
    block: `            {/* 컨셉 범위 고지 — 앱의 보조문 톤(작은 회색). 결과가 기대와 다른 사고를 앞단에서 막는다 */}\n            <p style={{ fontSize: 12, color: "#9B9B9B", margin: "10px 2px 0", lineHeight: 1.6 }}>여성 스타일링 전용 컨셉이에요.</p>\n`,
  },
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
  // ★템플릿 줄끝은 묻지 않는다 — readText가 CRLF를 LF로 정규화해 조립한다(age 템플릿이 CRLF다).
  //   "관례(LF) 불일치" 거부는 ★신설 파일을 쓰는 단계(writeRoute/writePage)에만 남겼다.
  //   예전엔 여기서 막아 person×flash(=age 템플릿) 신규가 통째로 조립 불가였다(2026-09-06 filmcampus).
  const src = readText(`app/api/${tpl.tpl}/route.ts`);
  // ★엔진 상수 먼저 — applySubs가 컨셉 키를 바꾸기 전에 원문 앵커로 잡는다
  let out = applyEngineSubs(src, tpl, spec, key, "route");

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
  // ★buildRoute와 같은 이유로 템플릿 줄끝을 묻지 않는다(위 주석 참고).
  const src = readText(`app/${tpl.tpl}/page.tsx`);
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

  // 대상 고지 줄 — 템플릿의 audience와 다르면 통째로 뺀다
  const notice = AUDIENCE_NOTICE[tpl.tpl];
  if (notice && (r.audience || "all") !== notice.audience) {
    const n = out.split(notice.block).length - 1;
    if (n === 1) out = out.replace(notice.block, "");
    else if (n > 1) fail(`${key}: 대상 고지 줄 앵커 ${n}회`);
  }

  // 한글 문구 — spec이 준 것만 바꾼다. 안 주면 템플릿 문구가 그대로 남으므로 아래에서 잡는다.
  if (r.tplName) out = out.split(r.tplName).join(spec.name);
  for (const [from, to] of r.replace || []) out = out.split(from).join(to);

  assertNoLeftover(out, tpl.tpl, key, "page");
  assertNoPhrases(out, tpl.tpl, key, "page");
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
    // ★정적 자산 경로 — 템플릿 페이지가 자기 이미지를 하드코딩한다. 실사로 찾은 두 형태:
    //   age: /details/age.webp (PreviewCard) · friend: /examples/friend_a.webp 등
    [`/details/${T}.webp`, `/details/${key}.webp`],
    [`/examples/${T}_`, `/examples/${key}_`],
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
//   단 ★단어 경계를 본다. 예전엔 단순 부분문자열이라 3글자 키 "age"가 image·message·Page 안의
//   "age"를 32건 오탐해 person×flash 신규가 아예 통과할 수 없었다(2026-09-06 filmcampus).
//   진짜 잔재("/api/age"·"age.webp"·"generateAge"·"AGE_PROMPT")는 그대로 잡힌다.
// 템플릿 키는 소문자+숫자뿐이다(cheerglam·gyaru·age·friend) — 정규식 특수문자가 없어 이스케이프가 필요없다.
const KEY_OK = /^[a-z][a-z0-9]*$/;
export function leftoverProbes(tplKey) {
  const lower = tplKey.toLowerCase();
  if (!KEY_OK.test(lower)) fail(`템플릿 키 "${tplKey}" 가 소문자+숫자가 아니다 — 잔재 검사 정규식을 손볼 것`);
  const pascal = lower[0].toUpperCase() + lower.slice(1);
  const upper = lower.toUpperCase();
  return [
    // 소문자: 앞뒤에 영숫자·_ 가 붙으면 남의 단어다(im[age]·mess[age]·P[age])
    [lower, new RegExp(`(?<![A-Za-z0-9_])${lower}(?![A-Za-z0-9_])`, "g")],
    // PascalCase: 뒤가 대문자이거나 토큰 끝일 때만(generateAge·AgePage). Image·Message엔 대문자 A가 없다
    [pascal, new RegExp(`${pascal}(?![a-z0-9])`, "g")],
    // UPPERCASE 상수: _ 는 붙어도 잔재다(AGE_PROMPT). 영숫자로 이어지면 남의 단어(IMAGE)
    [upper, new RegExp(`(?<![A-Za-z0-9])${upper}(?![A-Za-z0-9])`, "g")],
  ];
}
export function assertNoLeftover(text, tplKey, key, what) {
  const hits = [];
  for (const [label, re] of leftoverProbes(tplKey)) {
    const n = (text.match(re) || []).length;
    if (n) hits.push(`${label}×${n}`);
  }
  if (hits.length) fail(`${key} ${what}: 템플릿 키 잔재 ${hits.join(", ")} — 치환 규칙을 보완할 것`);
}

// ★한글 문구 잔재 검사 — 어간 검사가 못 잡는 것을 여기서 잡는다(위 TEMPLATE_PHRASES 주석 참고).
export function assertNoPhrases(text, tplKey, key, what) {
  const hits = [];
  for (const ph of TEMPLATE_PHRASES[tplKey] || []) {
    const n = text.split(ph).length - 1;
    if (n) hits.push(`"${ph}"×${n}`);
  }
  if (hits.length) {
    fail(`${key} ${what}: 템플릿 고유 문구 잔재 ${hits.join(", ")}\n` +
         `   → spec의 route.tplName(이름 치환) 또는 route.replace(["from","to"])로 처리할 것.`);
  }
}

export const fnName = (key) => key.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());

// ★신설 파일은 관례(LF)로만 쓴다 — 줄끝 검사는 이제 여기 한 곳뿐이다.
//   템플릿이 CRLF든 아니든 readText가 정규화하므로, 여기까지 CRLF가 오면 조립 쪽 회귀다.
function assertLF(rel, text) {
  if (text.includes("\r\n")) fail(`${rel}: 신설 파일에 CRLF가 섞였다 — 관례(LF)와 불일치`);
}
export function writeRoute(key, text) {
  const rel = `app/api/${key}/route.ts`;
  assertLF(rel, text);
  fs.mkdirSync(abs(`app/api/${key}`), { recursive: true });
  fs.writeFileSync(abs(rel), text, "utf8");
  return rel;
}
export function writePage(key, text) {
  const rel = `app/${key}/page.tsx`;
  assertLF(rel, text);
  fs.mkdirSync(abs(`app/${key}`), { recursive: true });
  fs.writeFileSync(abs(rel), text, "utf8");
  return rel;
}
