#!/usr/bin/env node
// scripts/smoke.mjs — 배포 후 프로덕션이 살아 있는지 확인하는 게이트.
//
// 왜 필요한가 (2026-09-03 사고에서 나왔다)
//   `npm run build`의 "Compiled successfully"는 ★런타임을 보증하지 않는다. sharp를
//   0.35.4로 올렸을 때 빌드는 통과했지만, Vercel linux-x64에서 libvips 8.18.6이
//   dlopen에 실패해 sharp를 import하는 라우트가 전부 HTML 500이 됐다. 생성·업스케일·
//   코인·★로그인 콜백까지 23시간 죽어 있었고, 빌드 게이트는 그걸 한 번도 못 잡았다.
//
// ★GET 405가 핵심 신호다
//   생성 라우트에는 GET 핸들러가 없다. 모듈이 정상 로드되면 Next가 405를 준다.
//   모듈 로드가 깨지면 500 + text/html이 온다. POST로는 이걸 못 가른다 —
//   정상적인 입력 검증 실패도 4xx/5xx라서 신호가 섞인다.
//
// 사용법
//   node scripts/smoke.mjs            (기본 600초까지 15초 간격 폴링)
//   node scripts/smoke.mjs --wait 120
//   종료 코드 0 = PASS, 1 = FAIL

const BASE = "https://mospic.com";
const INTERVAL_MS = 15000;

// 각 항목: 무엇을 확인하는가 = why
const CHECKS = [
  // ★1번이 핵심이다 — /api/health는 sharp를 import만 하지 않고 실제로 8×8 PNG를 인코딩해
  //   libvips까지 태운다. 나머지 4건은 "모듈이 로드되는가"만 보지만 이건 "동작하는가"를 본다.
  { path: "/api/health", status: 200, contentType: "application/json", json: true, why: "sharp 실인코딩·redis ping·blob·env 실검사" },
  { path: "/api/usage", status: 200, contentType: "application/json", why: "sharp 무관 라우트 — 앱 자체가 살아 있는지(대조군)" },
  { path: "/api/schoolsnap", status: 405, why: "aiMark→sharp 경유 생성 라우트 모듈 로드" },
  { path: "/api/idstyle", status: 405, why: "sharp 직접 import 라우트 모듈 로드" },
  { path: "/api/auth/kakao", status: 307, why: "historyStore→sharp 경유 로그인 콜백" },
];

const args = process.argv.slice(2);
let waitSec = 600;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wait") waitSec = Number(args[++i]);
  else { console.error(`모르는 플래그: ${args[i]}`); process.exit(1); }
}
if (!Number.isFinite(waitSec) || waitSec < 0) { console.error("--wait 은 0 이상의 초"); process.exit(1); }

async function probe(c) {
  try {
    // ★리다이렉트를 따라가지 않는다 — auth/kakao의 307 자체가 확인 대상이다.
    const res = await fetch(BASE + c.path, { method: "GET", redirect: "manual", cache: "no-store" });
    const ct = res.headers.get("content-type") || "";
    const okStatus = res.status === c.status;
    const okCt = !c.contentType || ct.includes(c.contentType);
    // health는 200이어도 안에서 무엇이 false인지 봐야 한다 — 실패한 검사 이름을 그대로 인용한다.
    let body = null, okBody = true;
    if (c.json) {
      try {
        body = await res.json();
        okBody = body?.ok === true;
        if (!okBody) {
          const bad = Object.entries(body?.checks || {}).filter(([, v]) => !v?.ok)
            .map(([k, v]) => `${k}: ${v?.detail ?? "실패"}`);
          return { ...c, got: res.status, ct, ok: false, note: bad.join(" / ") || "ok:false", body };
        }
      } catch (e) {
        return { ...c, got: res.status, ct, ok: false, note: `JSON 파싱 실패: ${String(e.message).slice(0, 80)}` };
      }
    }
    return { ...c, got: res.status, ct, ok: okStatus && okCt && okBody, body };
  } catch (e) {
    return { ...c, got: "네트워크 실패", ct: String(e.message).slice(0, 60), ok: false };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);

console.log(`\n■ 프로덕션 스모크 — ${BASE}  (최대 ${waitSec}초, ${INTERVAL_MS / 1000}초 간격)`);
const t0 = Date.now();
let last = [];
let round = 0;
for (;;) {
  round++;
  last = await Promise.all(CHECKS.map(probe));
  const pass = last.filter((r) => r.ok).length;
  console.log(`  [${stamp()}] ${round}회 — ${pass}/${CHECKS.length} 통과${pass === CHECKS.length ? "" : "  (" + last.filter((r) => !r.ok).map((r) => r.path + "=" + r.got).join(" · ") + ")"}`);
  if (pass === CHECKS.length) break;
  if (Date.now() - t0 + INTERVAL_MS > waitSec * 1000) break;
  await sleep(INTERVAL_MS);
}

console.log(`\n  ── 실측 (${((Date.now() - t0) / 1000).toFixed(0)}초 경과)`);
for (const r of last) {
  const want = `${r.status}${r.contentType ? " " + r.contentType : ""}`;
  const got = `${r.got}${r.ct ? "  " + r.ct : ""}`;
  console.log(`     ${r.ok ? "PASS" : "★FAIL"}  GET ${r.path.padEnd(18)} 기대 ${want.padEnd(24)} 실측 ${got}`);
  if (!r.ok) console.log(`             ↳ ${r.why}${r.note ? " — " + r.note : ""}`);
  if (r.ok && r.json && r.body) console.log(`             ↳ commit=${r.body.commit} · ${Object.entries(r.body.checks || {}).map(([k, v]) => k + "=" + (v.ok ? "ok" : "FAIL")).join(" · ")}`);
  if (r.ok && r.json && r.body?.checks?.sharp) console.log(`             ↳ ${r.body.checks.sharp.detail}`);
}

const allPass = last.every((r) => r.ok);
console.log(allPass ? `\n■ 스모크 PASS — 프로덕션 정상\n` : `\n★스모크 FAIL — 배포가 아직 안 됐거나 런타임이 깨졌다. Vercel 함수 로그의 에러 원문을 확인할 것.\n`);
process.exit(allPass ? 0 : 1);
