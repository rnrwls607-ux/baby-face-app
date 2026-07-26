// 히어로 "무료 도구" 스플릿 슬라이드 소재 합성 — public/hero/hero_freetools.webp
//
// 한 장에 두 도구를 반씩 담는다. 코드에서 좌/우 탭존이 각각 nukki·upscale 상세로 간다.
//   좌 480×540  배경 제거 — 체커보드(투명 표현) 위에 알파 누끼 피사체
//   우 480×540  4배 고화질 — 업스케일 애프터를 cover + 가벼운 샤픈
//
// 규격은 기존 히어로와 동일: 960×540(표시 480×270의 2배수), webp q88.
//
// ★안전영역: 390px 폰에서 가운데 81%만 보여 좌우가 잘린다(전체 960 기준 좌우 약 111px).
//   스플릿은 바깥쪽 가장자리가 먼저 잘리므로, 각 반쪽의 핵심 피사체를
//   그 반쪽 중앙 60%(좌 96~384 / 우 576~864) 안에 넣는다.
// ★하단 90px은 라벨 칩·무료 필이 앉는 자리라 피사체를 올리지 않는다.
//
// 사용법: node scripts/hero-freetools.mjs
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const W = 960, H = 540;
const HALF = W / 2;              // 480
const LABEL_H = 90;              // 하단 라벨 영역 — 피사체 금지
const SAFE = 0.6;                // 각 반쪽에서 피사체가 들어갈 중앙 비율
const CELL = 28;                 // 체커보드 셀
const LIGHT = "#FFFFFF", DARK = "#E8E8E8";

const NUKKI_SRC = "examples/ba/누끼 사진/cut_dog.png";        // ★알파 보유(768×1024)
// ★2026-07-26 교체: 눈 클로즈업(up_detail)은 확대 인체 사진이라 거부감 리스크가 있어
//   풍경으로 바꿨다. 산 능선·침엽수림·수면 반영이 "4배 고화질"의 디테일을 인물 없이 보여준다.
const UPSCALE_SRC = "examples/ba/업스케일 사진/up_scene.png"; // 산·호수 풍경(1448×1086)
const OUT = path.join(process.cwd(), "public", "hero", "hero_freetools.webp");

// 체커보드 SVG — 셀 단위로 사각형을 깔면 문자열이 길어져 pattern 하나로 반복시킨다
function checkerSvg(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="c" width="${CELL * 2}" height="${CELL * 2}" patternUnits="userSpaceOnUse">
      <rect width="${CELL * 2}" height="${CELL * 2}" fill="${LIGHT}"/>
      <rect width="${CELL}" height="${CELL}" fill="${DARK}"/>
      <rect x="${CELL}" y="${CELL}" width="${CELL}" height="${CELL}" fill="${DARK}"/>
    </pattern></defs>
    <rect width="${w}" height="${h}" fill="url(#c)"/>
  </svg>`;
}

const run = async () => {
  for (const p of [NUKKI_SRC, UPSCALE_SRC]) {
    if (!existsSync(p)) { console.error(`소재가 없습니다: ${p}`); process.exit(1); }
  }
  const meta = await sharp(NUKKI_SRC).metadata();
  if (!meta.hasAlpha) {
    console.error(`★${NUKKI_SRC} 에 알파 채널이 없습니다 — 체커보드 위에 올릴 수 없습니다.`);
    process.exit(1);
  }
  mkdirSync(path.dirname(OUT), { recursive: true });

  // ── 좌: 체커보드 + 누끼 피사체 ──
  const zoneW = Math.round(HALF * SAFE);          // 288
  const zoneH = H - LABEL_H;                      // 450
  const subject = await sharp(NUKKI_SRC)
    .resize(zoneW, zoneH - 40, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const sMeta = await sharp(subject).metadata();
  const left = await sharp(Buffer.from(checkerSvg(HALF, H)))
    .composite([{
      input: subject,
      left: Math.round((HALF - sMeta.width) / 2),          // 반쪽 가로 중앙 = 안전영역 한가운데
      top: Math.round((zoneH - sMeta.height) / 2),         // 라벨 영역 위쪽에서 세로 중앙
    }])
    .png()
    .toBuffer();

  // ── 우: 업스케일 애프터 cover + 가벼운 샤픈 ──
  const right = await sharp(UPSCALE_SRC)
    .resize(HALF, H, { fit: "cover", position: "centre" })
    .sharpen()
    .png()
    .toBuffer();

  // ── 합성 + 중앙 흰 구분선 3px ──
  const divider = Buffer.from(
    `<svg width="3" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="${H}" fill="#FFFFFF"/></svg>`
  );
  await sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: HALF, top: 0 },
      { input: divider, left: HALF - 2, top: 0 },
    ])
    .webp({ quality: 88 })
    .toFile(OUT);

  const out = await sharp(OUT).metadata();
  console.log(`생성: public/hero/hero_freetools.webp  ${out.width}×${out.height}  webp q88`);
  console.log(`  좌 배경 제거 — ${NUKKI_SRC} (알파 ✓, 피사체 ${sMeta.width}×${sMeta.height})`);
  console.log(`  우 4배 고화질 — ${UPSCALE_SRC} (cover + sharpen)`);
  console.log(`  안전영역: 좌 96~384 / 우 576~864, 하단 ${LABEL_H}px 라벨 영역 비움`);
};

run();
