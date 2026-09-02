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

// 힌트 문자열 → {gender, glasses}. "custom"은 풀에서 안 뽑는다(MJ가 직접 만든다).
export function parseHint(h) {
  if (!h || h === "custom") return null;
  const s = String(h).toLowerCase();
  const gender = s.startsWith("male") ? "male" : "female";
  const glasses = s.includes("glass") ? "glasses" : "noglasses";
  return { gender, glasses };
}

// inputType이 person이고 힌트가 없을 때의 기본 3장
export const DEFAULT_HINTS = ["female", "female-glasses", "male"];

// 풀에서 조건에 맞는 파일 목록 (이름순)
export function candidates({ gender, glasses }) {
  if (!exists(POOL_DIR)) return [];
  return fs.readdirSync(abs(POOL_DIR))
    .filter((f) => f.endsWith(".png") && f.startsWith(`${gender}_`) && f.endsWith(`_${glasses}.png`))
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
export function pick(hints, { used = usedSet() } = {}) {
  const taken = new Set();
  return hints.map((h) => {
    const spec = parseHint(h);
    if (!spec) return { hint: h, file: null, reason: "custom — MJ가 직접 생성" };
    let list = candidates(spec);
    if (!list.length) {
      // 안경 조건을 못 맞추면 같은 성별의 아무거나로 물러난다(없는 것보단 낫다)
      list = candidates({ gender: spec.gender, glasses: "noglasses" });
      if (!list.length) return { hint: h, file: null, reason: `풀에 ${spec.gender} 없음` };
    }
    const fresh = list.filter((f) => !used.has(f) && !taken.has(f));
    const use = (fresh.length ? fresh : list.filter((f) => !taken.has(f)))[0];
    if (!use) return { hint: h, file: null, reason: "풀 소진" };
    taken.add(use);
    return { hint: h, file: use, reused: !fresh.length };
  });
}

export function stats() {
  if (!exists(POOL_DIR)) return null;
  const all = fs.readdirSync(abs(POOL_DIR)).filter((f) => f.endsWith(".png"));
  const c = (g, gl) => all.filter((f) => f.startsWith(`${g}_`) && f.endsWith(`_${gl}.png`)).length;
  return {
    total: all.length,
    female: { noglasses: c("female", "noglasses"), glasses: c("female", "glasses") },
    male: { noglasses: c("male", "noglasses"), glasses: c("male", "glasses") },
  };
}
