// scripts/lib/repo.mjs — 리포 접근 공통. 파일을 열고 닫는 규칙을 여기 한 곳에 모은다.
//
// ★EOL 규칙 — 이 리포의 가장 잦은 사고 원인이다
//   concepts.ts·page.tsx는 CRLF, route.ts·대부분의 page.tsx는 LF다. 섞어 쓰면 diff가
//   파일 전체로 부풀어 "무엇을 바꿨는지"를 못 읽는다. 그래서 읽을 때 CRLF를 LF로 눕히고,
//   쓸 때 원래 형태로 되돌린다. load()/save()를 거치지 않고 fs를 직접 쓰지 말 것.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// ★경로에 공백이 있으면(이 PC: "Hello G.BOX") import.meta.url이 %20으로 인코딩된다.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(path.join(ROOT, "package.json"));

export function need(name, hint) {
  try { return require_(name); }
  catch { console.error(`\n★${name} 를 못 찾았다 — ${hint}\n`); process.exit(1); }
}

export const abs = (rel) => path.join(ROOT, rel);
export const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
export const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");
export const exists = (r) => fs.existsSync(abs(r));

export function fail(msg) {
  console.error(`\n★중단 — ${msg}\n`);
  process.exit(1);
}

// EOL을 기억하는 파일 핸들
export function load(r) {
  const raw = fs.readFileSync(abs(r));
  return { rel: r, crlf: raw.includes("\r\n"), t: raw.toString("utf8").replace(/\r\n/g, "\n") };
}
export function save(f) {
  fs.writeFileSync(abs(f.rel), f.crlf ? f.t.replace(/\n/g, "\r\n") : f.t, "utf8");
}
export const readText = (r) => fs.readFileSync(abs(r), "utf8").replace(/\r\n/g, "\n");

// ── 앵커 계획기 ──────────────────────────────────────────────────────────────
// ★부분 적용 방지 장치. plan()으로 전부 모아 두고, 앵커가 하나라도 정확히 1회가
//   아니면 apply() 전에 멈춘다 — 파일은 한 글자도 안 건드린 상태로 남는다.
//   (배치 2-A에서 부분 적용된 채 발견돼 수리했던 사고의 재발 방지책이다.)
export function planner() {
  const jobs = [], errs = [], touched = new Set();
  return {
    plan(file, label, from, to) {
      const n = file.t.split(from).length - 1;
      if (n !== 1) { errs.push(`${file.rel} :: ${label} — 앵커 ${n}회(1회여야 함)`); return; }
      jobs.push({ file, label, from, to });
      touched.add(file);
    },
    note(msg) { errs.push(msg); },
    get errors() { return errs; },
    get count() { return jobs.length; },
    get labels() { return jobs.map((j) => `${j.file.rel.split("/").pop()}:${j.label}`); },
    apply({ dry = false } = {}) {
      if (errs.length) fail(`사전검증 실패 — 아무 파일도 쓰지 않았다:\n     ${errs.join("\n     ")}`);
      if (dry) return { files: [...touched].map((f) => f.rel), jobs: jobs.length };
      for (const j of jobs) j.file.t = j.file.t.replace(j.from, j.to);
      for (const f of touched) save(f);
      return { files: [...touched].map((f) => f.rel), jobs: jobs.length };
    },
  };
}
