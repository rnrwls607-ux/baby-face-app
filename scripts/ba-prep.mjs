// 비포/애프터 자산 규격화 — 768×960(4:5 = BeforeAfterHero 16:10 카드의 반쪽 패널 실효 비율) 피사체 가중 크롭, webp q85 → public/examples/ba/
//
// 사용법 (리포 루트에서):
//   node scripts/ba-prep.mjs nukki-before-1="C:/원본/셀카.jpg" nukki-after-1="C:/원본/결과1.png"
//   경로 뒤 @center 를 붙이면 중앙 크롭 강제 (사물 사진에서 attention이 엉뚱하게 잘릴 때 폴백):
//   node scripts/ba-prep.mjs nukki-after-2="C:/원본/스니커즈.png@center"
//
// 파일명 규칙(다쌍): {컨셉키}-before-N / {컨셉키}-after-N (쌍별 before) — 단쌍 하위호환: {컨셉키}-before 1장.
// 투명 PNG는 흰색으로 flatten 후 크롭. 크롭: 기본 attention(피사체 가중), @center로 중앙 폴백.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "examples", "ba");
const W = 768, H = 960;

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
  let src = arg.slice(eq + 1).trim().replace(/^"|"$/g, "");
  let position = sharp.strategy.attention;
  if (src.endsWith("@center")) { src = src.slice(0, -"@center".length); position = "centre"; }
  const dst = path.join(OUT_DIR, `${name}.webp`);
  await sharp(src)
    .flatten({ background: "#ffffff" }) // 투명 PNG(누끼 컷) → 흰 배경
    .resize(W, H, { fit: "cover", position })
    .webp({ quality: 85 })
    .toFile(dst);
  console.log(`${name}.webp OK ← ${src}${position === "centre" ? " (중앙 크롭)" : ""}`);
}
console.log("완료 — BA_LIVE(app/lib/concepts.ts)에 컨셉 키를 추가하면 상세 화면에 노출됩니다.");
