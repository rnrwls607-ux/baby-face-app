// 스토어 등록 소재 생산 — store-assets/raw → store-assets/out
//
// 왜 별도 스크립트인가: ba-prep(4:5 인물)·hero-prep(16:9 배너)과 목적이 다르다.
// 여기 산출물은 앱 안에서 안 쓰이고 구글 플레이 콘솔 업로드 폼에만 들어간다.
// ★그래서 store-assets/ 전체가 .gitignore다 — 원본 캡처도 산출물도 리포에 안 들어간다.
//
// 산출 3종 (플레이 콘솔 규격):
//   A. icon-512.png        512×512 · 1MB 이하   — 앱 아이콘
//   B. feature-1024x500.png 1024×500 · 15MB 이하 — 피처 그래픽
//   C. shot-NN.png         1080×1920 · 8MB 이하 — 스크린샷 (raw 캡처 1장당 1장)
//
// ★스크린샷은 크롭하지 않는다. 캡처 비율이 9:16이 아니어도 축소해서 넣고 남는 자리는
//   브랜드 배경색으로 채운다 — 잘라내면 UI가 잘려 심사에서 "화면과 다르다"가 된다.
//
// 사용법 (리포 루트에서):
//   node scripts/store-assets.mjs
//   raw 폴더에 캡처를 넣어두면 파일명 오름차순으로 shot-01, shot-02… 로 나간다.
import sharp from "sharp";
import { mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "store-assets", "raw");
const OUT = path.join(ROOT, "store-assets", "out");
const BG = "#FAFAF8"; // 홈 배경과 같은 톤 — 패딩이 앱의 일부처럼 보인다

// 소재 (리포 안 기존 자산 재사용 — 새로 만들지 않는다)
const SRC_ICON = path.join(ROOT, "public", "icon-512.png"); // M 모노그램, 512×512가 최대 해상도
const SRC_WORDMARK = path.join(ROOT, "public", "logo.png"); // "MOSPIC" 워드마크(투명 배경)
// 피처 그래픽 우측 카드 — 증명·비즈·글램 한 장씩(밝고 선명한 정면 인물 순으로 골랐다)
const SRC_CARDS = [
  "public/examples/ba/idtweed-after-1.webp",
  "public/examples/ba/bizpinkjacket-after-1.webp",
  "public/examples/ba/cheerglam-after-1.webp",
].map((p) => path.join(ROOT, p));

const TAGLINE = "사진관 안 가도, 사진관보다";
// ★한글 폰트가 없는 환경에서는 글자가 통째로 사라진다 → 렌더 후 픽셀로 검사하고,
//   실패하면 로고만 키운 판으로 자동 폴백한다(빈 자리에 글자 대신 여백이 남는 사고 방지).
const KR_FONTS = "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif";

const KB = (n) => (n / 1024).toFixed(0) + "KB";
const results = [];
const fail = [];

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────
const svgBuf = (s) => Buffer.from(s);
const roundedRect = (w, h, r, fill) =>
  svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/></svg>`);

// 사진을 카드 크기로 채운 뒤 모서리를 둥글게 깎는다(dest-in 알파 마스크)
const roundedCard = async (src, w, h, r) => {
  const filled = await sharp(src)
    .resize(w, h, { fit: "cover", position: sharp.strategy.attention })
    .png()
    .toBuffer();
  return await sharp(filled)
    .composite([{ input: roundedRect(w, h, r, "#fff"), blend: "dest-in" }])
    .png()
    .toBuffer();
};

// 산출물 검수 — 치수·용량을 실제 파일에서 다시 읽어 확인한다(믿지 말고 재측정)
const verify = async (file, expW, expH, maxBytes) => {
  const m = await sharp(file).metadata();
  const bytes = statSync(file).size;
  const okDim = m.width === expW && m.height === expH;
  const okSize = bytes <= maxBytes;
  results.push({ file: path.basename(file), w: m.width, h: m.height, bytes, okDim, okSize });
  if (!okDim) fail.push(`${path.basename(file)} 치수 ${m.width}×${m.height} (기대 ${expW}×${expH})`);
  if (!okSize) fail.push(`${path.basename(file)} 용량 ${KB(bytes)} 초과`);
};

// ─── A. 앱 아이콘 ─────────────────────────────────────────────────────────
async function buildIcon() {
  const dst = path.join(OUT, "icon-512.png");
  await sharp(SRC_ICON).resize(512, 512, { fit: "cover" }).png({ compressionLevel: 9 }).toFile(dst);
  await verify(dst, 512, 512, 1024 * 1024);
  console.log(`A. icon-512.png ← ${path.relative(ROOT, SRC_ICON)}`);
}

// ─── B. 피처 그래픽 ───────────────────────────────────────────────────────
// 좌: 브랜드 블록(모노그램 → 워드마크 → 태그라인) / 우: 애프터 3장이 살짝 겹친 카드 스트립
const FEAT = { W: 1024, H: 500, PAD: 64, ICON: 100, MARK_H: 42, TAG: 26,
               CARD_W: 220, CARD_H: 275, RADIUS: 18, OVERLAP: 66, RING: 4, RIGHT: 40 };

async function buildFeature() {
  const F = FEAT;
  const xs = [];
  const strip = F.CARD_W * 3 - F.OVERLAP * 2;
  const startX = F.W - F.RIGHT - strip;
  for (let i = 0; i < 3; i++) xs.push(startX + i * (F.CARD_W - F.OVERLAP));
  const cardY = Math.round((F.H - F.CARD_H) / 2);

  const icon = await sharp(SRC_ICON).resize(F.ICON, F.ICON).png().toBuffer();
  const mark = await sharp(SRC_WORDMARK).resize({ height: F.MARK_H }).png().toBuffer();
  const iconY = 140, markY = 266, tagBaseline = 352;

  const layers = [
    { input: icon, left: F.PAD, top: iconY },
    { input: mark, left: F.PAD, top: markY },
  ];
  // 카드: 겹치는 자리에 배경색 링을 먼저 깔아 카드끼리 붙어 보이지 않게 한다
  for (let i = 0; i < 3; i++) {
    layers.push({
      input: roundedRect(F.CARD_W + F.RING * 2, F.CARD_H + F.RING * 2, F.RADIUS + F.RING, BG),
      left: xs[i] - F.RING, top: cardY - F.RING,
    });
    layers.push({ input: await roundedCard(SRC_CARDS[i], F.CARD_W, F.CARD_H, F.RADIUS), left: xs[i], top: cardY });
  }

  const base = () => sharp({ create: { width: F.W, height: F.H, channels: 4, background: BG } });
  const tagSvg = svgBuf(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${F.W}" height="${F.H}">` +
    `<text x="${F.PAD}" y="${tagBaseline}" font-family="${KR_FONTS}" font-size="${F.TAG}" fill="#5A5F66">${TAGLINE}</text></svg>`
  );

  // ★한글 렌더 검사: 태그라인만 따로 그려 잉크가 실제로 찍혔는지 본다
  let krOK = false;
  try {
    const probe = await sharp(svgBuf(
      `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60">` +
      `<text x="0" y="40" font-family="${KR_FONTS}" font-size="${F.TAG}" fill="#000">${TAGLINE}</text></svg>`
    )).png().toBuffer();
    const stats = await sharp(probe).stats();
    krOK = stats.channels[3].max > 0 && stats.channels[3].mean > 0.2; // 알파에 실제 획이 있는가
  } catch { krOK = false; }

  const dst = path.join(OUT, "feature-1024x500.png");
  if (krOK) {
    await base().composite([...layers, { input: tagSvg, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(dst);
  } else {
    // 폴백: 글자를 못 그리면 빈자리를 남기지 않고 모노그램·워드마크를 키워 균형을 맞춘다
    const bigIcon = await sharp(SRC_ICON).resize(140, 140).png().toBuffer();
    const bigMark = await sharp(SRC_WORDMARK).resize({ height: 58 }).png().toBuffer();
    const rest = layers.slice(2);
    await base().composite([
      { input: bigIcon, left: F.PAD, top: 132 },
      { input: bigMark, left: F.PAD, top: 300 },
      ...rest,
    ]).png({ compressionLevel: 9 }).toFile(dst);
  }
  await verify(dst, F.W, F.H, 15 * 1024 * 1024);
  console.log(`B. feature-1024x500.png — 한글 태그라인 ${krOK ? "렌더 OK" : "★렌더 실패 → 로고 확대 폴백"}`);
  console.log(`   카드 x=[${xs.join(", ")}] y=${cardY} (${F.CARD_W}×${F.CARD_H}, r${F.RADIUS}, 겹침 ${F.OVERLAP}px)`);
  return krOK;
}

// ─── C. 스크린샷 ──────────────────────────────────────────────────────────
async function buildShots() {
  if (!existsSync(RAW)) { console.log("C. raw 폴더가 없어 스크린샷은 건너뜀"); return; }
  const files = readdirSync(RAW).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  if (!files.length) { console.log("C. raw에 캡처가 없어 건너뜀"); return; }
  console.log(`C. 스크린샷 ${files.length}장`);
  let n = 0;
  for (const f of files) {
    const src = path.join(RAW, f);
    const m = await sharp(src).metadata();
    const dst = path.join(OUT, `shot-${String(++n).padStart(2, "0")}.png`);
    await sharp(src)
      .resize(1080, 1920, { fit: "contain", background: BG, withoutEnlargement: true })
      .flatten({ background: BG })
      .png({ compressionLevel: 9 })
      .toFile(dst);
    await verify(dst, 1080, 1920, 8 * 1024 * 1024);
    const scale = Math.min(1080 / m.width, 1920 / m.height);
    const fw = Math.round(m.width * scale), fh = Math.round(m.height * scale);
    const padPct = (100 - (fw * fh * 100) / (1080 * 1920)).toFixed(1);
    const warn = m.width > m.height ? "  ★가로 소재 — 위아래 여백이 지배적" : "";
    console.log(`   shot-${String(n).padStart(2, "0")}.png ← ${f}  ${m.width}×${m.height} → 내용 ${fw}×${fh} · 패딩 ${padPct}%${warn}`);
  }
}

// ─── 실행 ────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
console.log(`출력 → ${path.relative(ROOT, OUT)}\n`);
await buildIcon();
await buildFeature();
await buildShots();

console.log("\n═══ 게이트 (산출물 재측정) ═══");
for (const r of results) {
  console.log(`  ${r.file.padEnd(24)} ${String(r.w).padStart(4)}×${String(r.h).toString().padEnd(4)} ${KB(r.bytes).padStart(8)}  치수=${r.okDim ? "OK" : "★NG"} 용량=${r.okSize ? "OK" : "★NG"}`);
}
if (fail.length) {
  console.log("\n★게이트 실패:");
  for (const f of fail) console.log("  " + f);
  process.exit(1);
}
console.log(`\n전 항목 통과 — 파일 ${results.length}개. store-assets/ 는 .gitignore이므로 커밋되지 않습니다.`);
