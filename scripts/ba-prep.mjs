// 비포/애프터 자산 규격화 — 768×1024(3:4) 인물 가중 크롭, webp q85 → public/examples/ba/
//
// 사용법 (리포 루트에서):
//   node scripts/ba-prep.mjs travel-before="C:/원본/셀카.jpg" travel-after-1="C:/원본/결과1.png" travel-after-2="C:/원본/결과2.png"
// → public/examples/ba/travel-before.webp, travel-after-1.webp, travel-after-2.webp 생성
//
// 파일명 규칙: {컨셉키}-before / {컨셉키}-after-1 (-2, -3…) — BeforeAfterHero가 이 규칙으로 조립한다.
// 크롭: sharp position "attention"(피사체 가중 — 인물 상단이 살아남음), 확대 없이 cover.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "examples", "ba");
const W = 768, H = 1024;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('사용법: node scripts/ba-prep.mjs <출력이름>=<입력경로> ...  (예: travel-before="C:/a.jpg")');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const arg of args) {
  const eq = arg.indexOf("=");
  if (eq < 0) { console.error("무시(형식 오류):", arg); continue; }
  const name = arg.slice(0, eq).trim();
  const src = arg.slice(eq + 1).trim().replace(/^"|"$/g, "");
  const dst = path.join(OUT_DIR, `${name}.webp`);
  await sharp(src)
    .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 85 })
    .toFile(dst);
  console.log(`${name}.webp OK ← ${src}`);
}
console.log("완료 — BA_LIVE(app/lib/concepts.ts)에 컨셉 키를 추가하면 상세 화면에 노출됩니다.");
