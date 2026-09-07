// scripts/lib/pool.mjs — 인물 비포 풀. 새 컨셉 검증에서 비포를 다시 만들지 않기 위한 것이다.
//
// 왜 필요한가
//   비포는 컨셉과 무관한 "평범한 셀카"다. 컨셉마다 새로 생성하면 장당 ₩150이 계속 나가는데,
//   이미 examples/ba/*/ 에 200장 넘게 쌓여 있었다. 그걸 성별·안경으로 정리해 재사용한다.
//
// 파일명 규약: {female|male}_{번호 3자리}_{glasses|noglasses}.png
//   ★분류는 파일명이 아니라 이미지 판독으로 정했다(examples/ba/_pool/POOL.md 참고).

import fs from "node:fs";
import path from "node:path";
import { ROOT, abs, exists } from "./repo.mjs";

export const POOL_DIR = "examples/ba/_pool";

// ★두 겹 풀 (2026-09-06)
//   kit  = 킷·BA 소재용. 얼굴이 크고 밝고 정면인 상위분 + MJ 검증 모델 비포. 명단은 아래 파일.
//   test = 나머지. 검증 수확(애프터가 잘 나오는지 보는 용도)은 여기서 뽑는다.
//   왜: 검증과 소재는 요구가 다르다. 역광·전신·야간 컷도 검증에는 쓸모가 있지만
//       고객이 보는 전후 비교에 실리면 "전"이 안 읽힌다.
//   ★명단 파일은 scripts/lib 에 둔다 — examples/ 는 통째로 gitignore라 버전 관리가 안 된다.
export const KIT_FILE = "scripts/lib/pool-kit.txt";

let _kit = null;
export function kitSet() {
  if (_kit) return _kit;
  _kit = new Set();
  if (!exists(KIT_FILE)) return _kit;
  for (const line of fs.readFileSync(abs(KIT_FILE), "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (t && !t.startsWith("#")) _kit.add(t);
  }
  return _kit;
}
// grade: "kit" | "test" | "all"(등급 무시)
export function inGrade(file, grade) {
  if (!grade || grade === "all") return true;
  const k = kitSet().has(file);
  return grade === "kit" ? k : !k;
}

// 힌트 문자열 → {gender, glasses}. "custom"은 풀에서 안 뽑는다(MJ가 직접 만든다).
export function parseHint(h) {
  if (!h || h === "custom") return null;
  // ★"kit-"·"test-" 접두는 겹 지정 표시(B 출력 규약, 2026-09-07) — 벗기고 성별·안경만 읽는다.
  //   안 벗기면 "kit-male"이 startsWith("male")에 걸리지 않아 여성으로 배정된다.
  const s = String(h).toLowerCase().replace(/^(kit|test)-/, "");
  const gender = s.startsWith("male") ? "male" : "female";
  const glasses = s.includes("glass") ? "glasses" : "noglasses";
  return { gender, glasses };
}

// inputType이 person이고 힌트가 없을 때의 기본 3장
export const DEFAULT_HINTS = ["female", "female-glasses", "male"];

// 풀에서 조건에 맞는 파일 목록 (이름순). grade로 킷/테스트 겹을 가른다.
export function candidates({ gender, glasses }, grade = "all") {
  if (!exists(POOL_DIR)) return [];
  return fs.readdirSync(abs(POOL_DIR))
    .filter((f) => f.endsWith(".png") && f.startsWith(`${gender}_`) && f.endsWith(`_${glasses}.png`) && inGrade(f, grade))
    .sort();
}

// 이미 다른 컨셉에 배정된 풀 파일 — examples/ba/*/USED_POOL.txt 를 모아 본다.
export function usedSet() {
  const used = new Set();
  const base = abs("examples/ba");
  if (!fs.existsSync(base)) return used;
  for (const d of fs.readdirSync(base, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith("_")) continue;
    const p = path.join(base, d.name, "USED_POOL.txt");
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (t) used.add(t);
    }
  }
  return used;
}

/**
 * 힌트 목록대로 풀에서 고른다. ★미사용 우선 — 컨셉마다 다른 얼굴이 나오게.
 * 같은 실행 안에서 중복 배정되지 않도록 taken으로 막는다.
 */
export function pick(hints, { used = usedSet(), grade = "test" } = {}) {
  const taken = new Set();
  return hints.map((h) => {
    const spec = parseHint(h);
    if (!spec) return { hint: h, file: null, reason: "custom — MJ가 직접 생성" };
    let list = candidates(spec, grade);
    if (!list.length) {
      // 안경 조건을 못 맞추면 같은 성별의 아무거나로 물러난다(없는 것보단 낫다)
      list = candidates({ gender: spec.gender, glasses: "noglasses" }, grade);
      if (!list.length) return { hint: h, file: null, reason: `풀 ${grade} 겹에 ${spec.gender} 없음` };
    }
    const fresh = list.filter((f) => !used.has(f) && !taken.has(f));
    const use = (fresh.length ? fresh : list.filter((f) => !taken.has(f)))[0];
    if (!use) return { hint: h, file: null, reason: "풀 소진" };
    taken.add(use);
    return { hint: h, file: use, reused: !fresh.length };
  });
}

export function stats(grade = "all") {
  if (!exists(POOL_DIR)) return null;
  const all = fs.readdirSync(abs(POOL_DIR)).filter((f) => f.endsWith(".png") && inGrade(f, grade));
  const c = (g, gl) => all.filter((f) => f.startsWith(`${g}_`) && f.endsWith(`_${gl}.png`)).length;
  return {
    total: all.length,
    grade,
    female: { noglasses: c("female", "noglasses"), glasses: c("female", "glasses") },
    male: { noglasses: c("male", "noglasses"), glasses: c("male", "glasses") },
  };
}
