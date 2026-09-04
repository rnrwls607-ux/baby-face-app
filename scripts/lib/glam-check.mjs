// scripts/lib/glam-check.mjs — 외모(글램) 코어 잠금 검사기.
//
// 왜 있는가
//   티어1 표준 블록은 "마스터에서 문자 그대로"가 헌법(플레이북 §1-4)인데, 컨셉을 하나씩 만들 때마다
//   조금씩 의역·재배치가 섞이면 외모 품질이 소리 없이 미끄러진다(드리프트). 승인본을 정본으로 잠그고,
//   프롬프트가 파이프라인에 들어오는 두 입구(harvest·new-concept route)에서 문자 일치를 검사한다.
//
// 정본: scripts/lib/glam-core/{v1,v2,v3}-core.txt — route에서 VM으로 추출한 승인 프롬프트에서
//   슬롯만 마커로 바꾼 것(손으로 옮긴 글자 0). 마커:
//     {{컨셉명}}  도입 8줄째·Output 안의 컨셉 이름
//     {{헤어꼬리}} 헤어 줄 괄호 안 꼬리(", and moving naturally as they walk" 등)
//     {{SCENE}} {{POSE}}  장면·포즈 전체
//     {{*}}      장면 전용 SELF-CHECK/AVOID 문항이 끼어들 수 있는 자리(0줄 이상)
//   마커 사이의 모든 구간은 공백 정규화 후 "순서대로 부분 문자열"로 존재해야 한다. 구간 안에
//   글자 하나라도 끼어들면 그 구간이 안 잡혀 실패한다 — 삽입은 마커 자리에서만 허용된다.
//
// 외모 5단계(플레이북 §5 5단계표): 1 자연(코어 검사 없음) · 2=v1(10%) · 3=v2(15%) · 4=v3(18%) · 5=v3+조명·씬 교체 후보(검사는 v3)
//
// 사용
//   import { glamCheck, GLAM } from "./lib/glam-check.mjs";
//   const r = glamCheck(promptText, { glam: 4, inputType: "person" });   // r.ok / r.failures[] / r.report()

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CORE_DIR = path.join(HERE, "glam-core");

export const GLAM = {
  1: { core: null, label: "자연", note: "보정 없음·톤 변환 계열 — 코어 검사 없음" },
  2: { core: "v1", label: "v1", note: "마스터 원판 10%, INTENSITY 없음 (digicam 승인본)" },
  3: { core: "v2", label: "v2", note: "+RETOUCH INTENSITY, 15%, AIM HIGH(top-tier celebrity) (cinesnap 승인본)" },
  4: { core: "v3", label: "v3", note: "18%, AIM HIGH(top idol group visual center) (snowsnap 승인본)" },
  5: { core: "v3", label: "v3+", note: "v3에 조명·씬 교체 후보 — 승인본 없음, 검사는 v3 코어" },
};
export const glamLabel = (g) => (GLAM[g] ? `외모 ${g}단계(${GLAM[g].label})` : `외모 ?단계(${g})`);

// ★Light 줄 뷰티 절 — v3 필수 문자열(MJ 등록본). 따뜻한 광 격리 처방은 이 절 "뒤에 덧붙이는" 형태만 허용.
export const LIGHT_BEAUTY_V3 =
  "flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, clearly BEAUTIFYING, idol-grade luminous, the face glowing noticeably brighter and prettier than everything around it, every feature crisp";
// 원형 snowsnap 계열(라이브 v3 8종 실사용)의 변형 — 승인 변형으로 함께 받는다. MJ가 한쪽으로 모으면 여기서 뺀다.
export const LIGHT_BEAUTY_V3_SNOW =
  "flawless beauty lighting on the person — a bright, CLEAN, neutral-toned soft key light with delicate catchlights, gentle fill, and a crisp rim light, clearly BEAUTIFYING, idol-grade luminous";
const LIGHT_FORMS = {
  v3: [LIGHT_BEAUTY_V3, LIGHT_BEAUTY_V3_SNOW],
  v2: [LIGHT_BEAUTY_V3],
  v1: null, // v1은 토큰 검사(플래시·역광 등 변형이 많다)
};
const LIGHT_TOKENS = ["flawless beauty lighting on the person", "delicate catchlights", "gentle fill", "idol-grade luminous", "every feature crisp"];
// 따뜻한 광 격리 처방(부록 A 조명 역전판)의 표지 — 뷰티 절보다 앞에 오면 "대체"로 본다
const ISOLATION_RE = /stay(s)? in the BACKGROUND|must NEVER tint the face|falls into darker ambient/i;

// 모순 3축 + 금지어 (harvest·new-concept 생성기와 같은 규칙)
const CONTRA = [
  [/do not retouch|no retouching|keep it natural and unedited/i, "모순: 보정 금지 문구"],
  [/add a mole|paint a freckle|keep every mole/i, "모순: 점 보존 문구"],
  [/look older|mature them|aged look is fine/i, "모순: 나이 상향 문구"],
];
const BANNED = ["무료", "0원", "공짜"];

const norm = (s) => s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
const normCI = (s) => norm(s).toLowerCase();

export function loadCore(v) {
  const p = path.join(CORE_DIR, `${v}-core.txt`);
  if (!fs.existsSync(p)) throw new Error(`코어 정본이 없다: ${p}`);
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
}

// 코어 → 마커 사이 구간 목록 [{seg, after(마커명)}]
export function coreSegments(core) {
  const parts = core.split(/(\{\{[^}]+\}\})/);
  const segs = [];
  let marker = null;
  for (const p of parts) {
    if (/^\{\{[^}]+\}\}$/.test(p)) { marker = p.slice(2, -2); continue; }
    const seg = norm(p);
    if (seg) segs.push({ seg, after: marker });
    marker = null;
  }
  return segs;
}

// 줄 단위 diff (기대 vs 실물 근처) — 실패 원인을 사람이 보게
function nearDiff(expect, text) {
  const head = expect.slice(0, 28);
  const i = text.indexOf(head);
  if (i < 0) return [`    - ${expect.slice(0, 110)}`, `    + (근처를 못 찾음 — 문장 자체가 없거나 첫 28자부터 다름)`];
  const got = text.slice(i, i + expect.length + 40);
  const E = expect.split(/(?<=[.?:;])\s/), G = got.split(/(?<=[.?:;])\s/);
  const out = [];
  for (let k = 0; k < Math.max(E.length, G.length); k++) {
    if (E[k] === G[k]) continue;
    if (E[k] !== undefined) out.push(`    - ${E[k]}`);
    if (G[k] !== undefined) out.push(`    + ${G[k]}`);
    if (out.length >= 6) break;
  }
  return out.length ? out : [`    - ${expect.slice(0, 110)}`, `    + ${got.slice(0, 110)}`];
}

/**
 * @param {string} text  프롬프트 전문
 * @param {{glam:number, inputType?:string, level?:string}} opt  glam 1~5 (또는 level "v1"|"v2"|"v3" 직접)
 * @returns {{ok:boolean, level:string|null, failures:string[], detail:string[], report:()=>string}}
 */
export function glamCheck(text, opt = {}) {
  const failures = [], detail = [];
  const glam = opt.glam;
  let level = opt.level || null;
  if (!level) {
    if (!GLAM[glam]) return done(false, null, [`spec.glam 이 1~5가 아니다: ${JSON.stringify(glam)}`]);
    level = GLAM[glam].core;
  }
  if (opt.inputType && !["person", "duo"].includes(opt.inputType)) {
    detail.push(`inputType=${opt.inputType} — 인물 코어 검사 대상 아님(모순·금지어만)`);
    level = null;
  }
  if (opt.inputType === "duo" && level) {
    detail.push("duo — 2인 코어(마스터 부록 B)는 정본 미등록: 코어·Light 검사 건너뜀(모순·금지어만)");
  }
  const T = norm(text);
  const Tci = T.toLowerCase();

  // (a) 코어 블록 문자 일치(슬롯 제외)
  if (level && opt.inputType !== "duo") {
    const segs = coreSegments(loadCore(level));
    let pos = 0, miss = 0;
    for (const { seg, after } of segs) {
      const i = T.indexOf(seg, pos);
      if (i < 0) {
        miss++;
        failures.push(`코어(${level}) 구간 불일치${after ? ` [{{${after}}} 다음]` : ""}: "${seg.slice(0, 60)}…"`);
        detail.push(...nearDiff(seg, T));
        if (miss >= 8) { failures.push("(불일치 8개 이상 — 이하 생략)"); break; }
        continue;
      }
      pos = i + seg.length;
    }
    if (!miss) detail.push(`코어 ${level}: ${segs.length}구간 전부 순서대로 일치`);
  }

  // (b) Light 줄 뷰티 절
  if (level && opt.inputType !== "duo") {   // duo는 조명 문장이 사람별로 갈라진다(부록 B) — 정본 등록 전까지 건너뜀
    const forms = LIGHT_FORMS[level];
    let li = -1, formName = "";
    if (forms) {
      for (const f of forms) { const i = Tci.indexOf(normCI(f)); if (i >= 0) { li = i; formName = f === LIGHT_BEAUTY_V3 ? "MJ 등록본" : "snowsnap 변형"; break; } }
      if (li < 0) { failures.push(`Light 뷰티 절 없음(${level} 필수 문자열 ${forms.length}형 모두 불일치)`); detail.push(...nearDiff(norm(forms[0]).slice(0, 120), T)); }
    } else {
      const lack = LIGHT_TOKENS.filter((t) => !Tci.includes(t));
      li = Tci.indexOf(LIGHT_TOKENS[0]);
      if (lack.length) failures.push(`Light 뷰티 토큰 누락(${level}): ${lack.join(" / ")}`);
      formName = "토큰형";
    }
    if (li >= 0) {
      const iso = T.search(ISOLATION_RE);
      if (iso >= 0 && iso < li) failures.push("따뜻한 광 격리 처방이 뷰티 절보다 앞에 있다 — 덧붙이기만 허용(대체 금지)");
      else detail.push(`Light 뷰티 절: ${formName}${iso >= 0 ? " + 격리 처방(뒤에 덧붙임)" : ""}`);
    }
  }

  // (c) 모순 3축
  for (const [re, msg] of CONTRA) if (re.test(text)) failures.push(msg);
  // (d) 금지어·구조
  for (const w of BANNED) if (text.includes(w)) failures.push(`금지어 "${w}"`);
  if (text.includes("`")) failures.push("백틱");
  if (text.includes("${")) failures.push("보간 ${");

  return done(failures.length === 0, level, failures, detail);

  function done(ok, lv, f, d = []) {
    const r = { ok, level: lv, glam, failures: f, detail: d };
    r.report = () => [
      `  glam-check ${ok ? "PASS" : "★FAIL"} — ${glam ? glamLabel(glam) : ""}${lv ? ` · 코어 ${lv}` : " · 코어 검사 없음"}`,
      ...d.map((l) => (l.startsWith("    ") ? l : `    ${l}`)),
      ...f.map((l) => `    ✘ ${l}`),
    ].join("\n");
    return r;
  }
}

// 프롬프트 본문에서 층을 추정(라이브 전수 스캔용) — "about N%"로.
export function inferLevel(text) {
  const m = text.match(/about (\d+)% smaller/);
  if (!m) return null;
  return { 18: "v3", 15: "v2", 10: "v1" }[m[1]] || null;
}
export const levelToGlam = (lv) => ({ v1: 2, v2: 3, v3: 4 }[lv] ?? null);
