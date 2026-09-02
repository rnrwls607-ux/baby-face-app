// scripts/lib/prompt.mjs — route.ts에서 실제 프롬프트 문자열을 뽑는 VM 평가기.
//
// 왜 정규식이 아니라 VM인가
//   프롬프트는 템플릿 리터럴이고, 안에 ${}(보간)·변형 Record·함수 호출이 섞인다.
//   문자열을 눈으로 오려 붙이면 그 순간 "기억 재구성"이 되어 앱과 다른 것을 검증하게 된다.
//   그래서 TS를 트랜스파일해 샌드박스에서 실제로 평가하고, 나온 문자열의 md5를 대조한다.
//
// ★harvest.mjs 안에도 같은 로직이 들어 있다(1호를 만들 때 스크래치 의존을 끊느라 내장했다).
//   이번 라운드는 harvest.mjs가 수정 허용 범위 밖이라 합치지 못했다 — 사본 2개가 존재한다.
//   다음에 harvest를 손댈 때 이 모듈을 import 하도록 합칠 것(백로그).

import vm from "node:vm";
import { need, readText } from "./repo.mjs";

const ts = need("typescript", "devDependencies에 있어야 한다 — npm install 을 먼저 돌릴 것");

export const routeSrc = (key) => readText(`app/api/${key}/route.ts`);

// 백틱·괄호 중첩을 세면서 최상위 ; 까지 잘라낸다
export function sliceFrom(src, start) {
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
export function sliceInitializer(src, declRe) {
  const m = src.match(declRe);
  return m ? sliceFrom(src, m.index + m[0].length) : null;
}

// 한 route에 생성 호출이 여럿일 수 있다(2단 route 전례) — 후보를 전부 모은다.
export function promptExprs(src) {
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

export function evalRoute(src, expr, extraBindings = {}) {
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
export function evalRouteResolving(src, expr, seed = {}) {
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

// route에서 프롬프트 하나를 뽑는다. duo면 성별 조합마다 하나씩.
export function extractPrompt(key, { duoGenders = null } = {}) {
  const src = routeSrc(key);
  if (duoGenders) {
    return duoGenders.map(([g1, g2]) => ({
      label: `${g1}+${g2}`,
      text: evalRouteResolving(src, `buildPrompt(${JSON.stringify(g1)}, ${JSON.stringify(g2)})`),
    }));
  }
  const exprs = promptExprs(src);
  if (exprs.length !== 1) throw new Error(`${key}: 프롬프트 표현식이 ${exprs.length}개 — 수동 지정 필요`);
  return [{ label: "route", text: evalRouteResolving(src, exprs[0]) }];
}

// CONCEPTS 같은 최상위 상수를 값으로 꺼낸다(게이트의 "직조회"용)
export function evalConst(fileText, name) {
  return evalRoute(fileText, name);
}
