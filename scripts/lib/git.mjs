// scripts/lib/git.mjs — 스테이지가 쓰는 git 동작만. 콕집기 add 외에는 제공하지 않는다.
//
// ★규칙
//   - `git add .` 은 이 모듈에 없다. 파일 목록을 받아서만 스테이징한다.
//   - 이미지(png/jpg/webp)는 스테이징 직전에 걸러 낸다 — 보관분 원본이 섞여 들어간 적이 있다.
//   - 게이트가 하나라도 FAIL이면 커밋하지 않고 rollback()으로 되돌린다.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, fail } from "./repo.mjs";

const git = (args, opts = {}) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });

export function status() {
  return git(["status", "--porcelain"]).split("\n").filter(Boolean);
}
export function trackedChanges() {
  return status().filter((l) => !l.startsWith("??"));
}
export function requireClean() {
  const dirty = trackedChanges();
  if (dirty.length) {
    fail(`작업 트리가 더럽다 — 스테이지를 시작할 수 없다:\n     ${dirty.join("\n     ")}\n   먼저 커밋하거나 되돌릴 것.`);
  }
}

export function diffStat(paths = []) {
  return git(["diff", "--numstat", "--", ...paths]).split("\n").filter(Boolean)
    .map((l) => { const [a, d, f] = l.split("\t"); return { add: +a, del: +d, file: f }; });
}

// 변경을 되돌린다 — 추적 파일은 checkout, 새로 만든 파일은 지운다.
export function rollback(newFiles = []) {
  const changed = trackedChanges().map((l) => l.slice(3).replace(/^"|"$/g, ""));
  if (changed.length) git(["checkout", "--", ...changed]);
  const removed = [];
  for (const f of newFiles) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    fs.rmSync(p, { recursive: true, force: true });
    removed.push(f);
    // ★파일만 지우면 빈 디렉터리가 남는다. git은 빈 디렉터리를 안 보므로 status는
    //   깨끗해 보이지만 app/ 밑에 껍데기 폴더가 쌓인다 — 그래서 위로 올라가며 치운다.
    for (let d = path.dirname(p); d.startsWith(ROOT) && d !== ROOT; d = path.dirname(d)) {
      try { if (fs.readdirSync(d).length === 0) fs.rmdirSync(d); else break; } catch { break; }
    }
  }
  return { restored: changed, removed };
}

export const IMG_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

export function add(files) {
  const imgs = files.filter((f) => IMG_RE.test(f));
  if (imgs.length) fail(`이미지를 스테이징하려 한다 — 보관분 오염 방지로 중단:\n     ${imgs.join(", ")}`);
  git(["add", "--", ...files]);
  return git(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
}

/**
 * 이미지가 반드시 들어가야 하는 스테이지(launch의 webp 2장, ba의 패널)용.
 * ★허용 목록은 "이번 실행이 방금 만든 파일"만이다 — 그 밖의 이미지는 여전히 막는다.
 *   보관분 PNG 수백 장이 untracked로 널려 있어서, 실수 한 번이면 통째로 딸려 들어간다.
 */
export function addWithImages(files, allowedImages) {
  const allowed = new Set(allowedImages);
  const bad = files.filter((f) => IMG_RE.test(f) && !allowed.has(f));
  if (bad.length) fail(`허용 목록 밖의 이미지: ${bad.join(", ")}`);
  for (const img of allowedImages) {
    if (!IMG_RE.test(img)) fail(`허용 목록에 이미지가 아닌 것: ${img}`);
    if (/^public\/(cards|details|examples)\//.test(img) === false) fail(`허용 목록의 이미지 경로가 산출 위치가 아니다: ${img}`);
  }
  git(["add", "--", ...files, ...allowedImages]);
  const staged = git(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  const sneaked = staged.filter((f) => IMG_RE.test(f) && !allowed.has(f));
  if (sneaked.length) fail(`스테이징에 예상 밖 이미지가 섞였다: ${sneaked.join(", ")}`);
  return staged;
}

export function commit(message) {
  git(["commit", "-F", "-"], { input: `${message}\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>\n` });
  return git(["rev-parse", "--short", "HEAD"]).trim();
}

export function push(branch = "main") {
  git(["push", "origin", branch], { stdio: ["ignore", "pipe", "pipe"] });
  return git(["rev-parse", "--short", "HEAD"]).trim();
}
