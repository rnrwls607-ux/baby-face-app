// scripts/lib/worklog.mjs — WORKLOG.md 최상단에 스테이지 기록을 넣는다.
// ★기존 줄은 한 글자도 안 건드린다(추가만). 넣은 뒤 원문 보존을 바이트로 확인한다.

import fs from "node:fs";
import { abs, fail } from "./repo.mjs";

export function prepend(title, lines) {
  const p = abs("WORKLOG.md");
  const raw = fs.readFileSync(p);
  const crlf = raw.includes("\r\n");
  const before = raw.toString("utf8").replace(/\r\n/g, "\n");

  const block = `## ${title}\n${lines.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n")}\n\n`;
  const next = block + before;
  fs.writeFileSync(p, crlf ? next.replace(/\n/g, "\r\n") : next, "utf8");

  const after = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  if (after.slice(block.length) !== before) {
    fs.writeFileSync(p, raw); // 되돌린다
    fail("WORKLOG 기존 본문이 바뀌었다 — 원상복구하고 중단");
  }
  return { lines: block.split("\n").length - 1, crlf };
}
