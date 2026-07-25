// 업로드 가이드 예시 사진 생성 — 3:4 세로 600×800 webp q85 → public/guide/
//
// 왜 "비포(입력용) 사진"을 쓰나: 이 가이드는 "이런 사진을 올려주세요"를 알려준다.
// 완성된 결과물(애프터)을 보여주면 "저런 사진이 있어야 하나?"로 오해한다 → 반드시 입력 원본.
//
// 타입당 3장을 한 원본에서 만든다 (생성 API 호출 없음 — 순수 이미지 가공):
//   1) 좋은 예   : 3:4 크롭만
//   2) 너무 어두움: 밝기를 크게 낮춘다 ★"무드 있는 사진"이 아니라 "안 보인다"로 읽혀야 함
//   3) 흐릿·저화질: 아주 작게 줄였다 되돌린 뒤 블러 ★"소프트포커스"가 아니라 "화질 나쁨"
//
// 사용법 (리포 루트에서):
//   node scripts/guide-prep.mjs
//   node scripts/guide-prep.mjs --dark 0.28 --small 64   ← 열화 강도를 더 세게
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "guide");
const W = 600, H = 800;

// CLI로 강도 조절 (검수 시트를 보고 약하면 올린다)
const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? Number(argv[i + 1]) : d; };
const DARK = argOf("--dark", 0.34);   // 밝기 배수 (낮을수록 어둡다)
const SMALL = argOf("--small", 72);   // 이 폭까지 줄였다 되돌린다 (작을수록 뭉갠다)
const BLUR = argOf("--blur", 1.6);

// type → 원본 경로 + 크롭 전략
const SRC = {
  solo_face: { file: "examples/ba/idblack/id_model_woman_2.png", pos: "attention" },
  generic:   { file: "examples/ba/음식 사진/비포2.jpg",            pos: "centre" },
  pet:       { file: "examples/ba/petstudio/petstudio_before_shiba.png", pos: "attention" },
  family:    { file: "examples/ba/couple/couple_비포1b.png",       pos: "attention" },
};

mkdirSync(OUT, { recursive: true });

for (const [type, { file, pos }] of Object.entries(SRC)) {
  const position = pos === "centre" ? "centre" : sharp.strategy.attention;
  // 1) 좋은 예 — 크롭만
  const base = await sharp(file).flatten({ background: "#ffffff" }).resize(W, H, { fit: "cover", position }).toBuffer();
  await sharp(base).webp({ quality: 85 }).toFile(path.join(OUT, `${type}-1.webp`));

  // 2) 너무 어두움 — 밝기를 크게 낮추고 대비도 살짝 죽인다(흐린 어둠 = 진짜 실패 사진)
  await sharp(base)
    .modulate({ brightness: DARK, saturation: 0.75 })
    .linear(0.86, 6) // 대비 저하 — 검게 뭉개지지 않고 "안 보이는" 느낌
    .webp({ quality: 85 })
    .toFile(path.join(OUT, `${type}-2.webp`));

  // 3) 흐릿·저화질 — 작게 줄였다 되돌리면 디테일이 실제로 사라진다(블러만 쓰면 예쁘게 나온다)
  const tiny = await sharp(base).resize(SMALL).jpeg({ quality: 32 }).toBuffer();
  await sharp(tiny).resize(W, H, { kernel: "nearest" }).blur(BLUR).webp({ quality: 85 })
    .toFile(path.join(OUT, `${type}-3.webp`));

  console.log(`${type}: 3장 (원본 ${file})`);
}
console.log(`완료 — 밝기 ${DARK} / 축소폭 ${SMALL}px / 블러 ${BLUR}`);
