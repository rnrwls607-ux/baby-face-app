// 히어로 소재 규격화 — 960×540(16:9) webp q88 → public/hero/
//
// 왜 별도 스크립트인가: ba-prep.mjs는 768×960(4:5) 세로 규격이라 히어로(가로 16:9)와
// 목적이 정반대다. 같은 파일에 두 규격을 섞으면 실수로 잘못된 비율을 뽑기 쉬워 분리했다.
//
// 규격 근거(실측): 홈 히어로는 폭 최대 480px · 높이 270px 고정.
//   → 표시 비율 16:9, 2배수로 960×540 제작.
//   ★좁은 폰(390px)에서는 좌우 각 9%가 잘린다 → 주 피사체는 가운데 81% 안에 있어야 한다.
//
// 사용법 (리포 루트에서):
//   node scripts/hero-prep.mjs luxe="examples/ba/luxe/luxe_애프터3.png"
//   경로 뒤 @center 를 붙이면 중앙 크롭 (음식·사물처럼 피사체가 가운데인 소재)
//   기본은 attention(피사체 가중) — 인물·동물 얼굴을 살린다.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "hero");
const W = 960, H = 540;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('사용법: node scripts/hero-prep.mjs <출력이름>=<입력경로>[@center] ...');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const arg of args) {
  const eq = arg.indexOf("=");
  if (eq < 0) { console.error("무시(형식 오류):", arg); continue; }
  const name = arg.slice(0, eq).trim();
  let src = arg.slice(eq + 1).trim().replace(/^"|"$/g, "");
  let position = sharp.strategy.attention;
  if (src.endsWith("@center")) { src = src.slice(0, -"@center".length); position = "centre"; }
  const dst = path.join(OUT_DIR, `${name}.webp`);
  await sharp(src)
    .flatten({ background: "#ffffff" })
    .resize(W, H, { fit: "cover", position })
    .webp({ quality: 88 })
    .toFile(dst);
  console.log(`${name}.webp OK (${W}x${H}) ← ${src}${position === "centre" ? " [중앙]" : " [피사체 가중]"}`);
}
console.log("완료 — HERO_SLIDES 배열에 { image: \"/hero/{이름}.webp\" } 로 등록하세요.");
