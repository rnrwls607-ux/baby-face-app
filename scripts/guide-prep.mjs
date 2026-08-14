// 업로드 가이드 예시 사진 변환기 — 입력 폴더의 원본을 3:4 600×800 webp q85로만 바꾼다.
//
// ★2026-07-25 전면 교체: 예전엔 좋은 사진 한 장을 어둡게·흐리게 "훼손"해서 피할 예를 만들었다.
//   그 방식은 실제 사용자가 겪는 실패(역광·플래시 반사·너무 멀리·차가 잘림)를 못 보여준다.
//   이제 좋은 예도 피할 예도 ★실제로 그렇게 찍힌 사진을 넣는다. 이 스크립트는 변환만 한다.
//
// 사용법:
//   node scripts/guide-prep.mjs <입력폴더>
//
// 입력 파일명 = 출력 파일명과 같은 규칙을 요구한다: {type}-{n}.png|jpg|jpeg|webp
//   예) solo_face-1.jpg  portrait_multi-3.png  vehicle-2.jpeg
//   1 = 좋은 예 / 2·3 = 피할 예 (UploadGuide의 카드 순서와 같다)
// 규칙에 안 맞는 파일은 건너뛰고 목록으로 알려준다.
import sharp from "sharp";
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "guide");
const W = 600, H = 800;               // 3:4 — UploadGuide 카드 규격(표시 132px, 최소 400×533)
const TYPES = [
  "solo_face", "portrait_multi", "family", "pet",
  "food_drink", "product_obj", "space", "vehicle", "old_photo",
  "daily_snap", "any_photo", // 2026-08-14 신설 — 일상 사진 구제 / 화질만 올리기
];
// ★generic은 제거했다(UploadGuide에서 별칭이 사라져 변환해봐야 쓰이지 않는다).

const inDir = process.argv[2];
if (!inDir) {
  console.log("사용법: node scripts/guide-prep.mjs <입력폴더>");
  console.log("  파일명 규칙: {type}-{n}.png|jpg|jpeg|webp  (n = 1 좋은 예 / 2·3 피할 예)");
  console.log("  type: " + TYPES.join(" · "));
  process.exit(1);
}
if (!existsSync(inDir)) {
  console.error(`입력 폴더가 없습니다: ${inDir}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const RULE = /^([a-z_]+)-([123])\.(png|jpg|jpeg|webp)$/i;
const done = [];
const skipped = [];

for (const name of readdirSync(inDir)) {
  const m = name.match(RULE);
  if (!m) { skipped.push(`${name} — 파일명 규칙 불일치`); continue; }
  const [, type, n] = m;
  if (!TYPES.includes(type)) { skipped.push(`${name} — 알 수 없는 type "${type}"`); continue; }

  const src = path.join(inDir, name);
  const dst = path.join(OUT, `${type}-${n}.webp`);
  // 크롭 전략: 사람·동물은 피사체 가중, 사물·공간은 중앙(구도 전체가 정보라 잘리면 안 된다)
  const subjectWeighted = ["solo_face", "portrait_multi", "family", "pet"].includes(type);
  await sharp(src)
    .flatten({ background: "#ffffff" })
    .resize(W, H, { fit: "cover", position: subjectWeighted ? sharp.strategy.attention : "centre" })
    .webp({ quality: 85 })
    .toFile(dst);
  done.push(`${type}-${n}.webp ← ${name}`);
}

console.log(`변환 ${done.length}장 → public/guide/`);
for (const d of done) console.log("  " + d);
if (skipped.length) {
  console.log(`\n건너뜀 ${skipped.length}개:`);
  for (const s of skipped) console.log("  " + s);
}
