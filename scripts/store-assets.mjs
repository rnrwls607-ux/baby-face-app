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
// ★스크린샷은 세로 중앙 크롭이다(2026-08-11 개정). 이전의 좌우 패딩 방식은
//   1080×2410 캡처를 823×1920으로 줄여 좌우에 빈 띠를 만들었다 — 스토어에서
//   화면이 작아 보이는 손해가 커서, 위아래를 잘라 폭을 꽉 채우는 쪽으로 바꿨다.
//   상태바·제스처바가 위아래에서 함께 잘려나가는 것이 덤이다.
//   ★파일별로 크롭 앵커를 옮길 수 있다(SHOT_OFFSET) — 중앙 크롭이 핵심 UI를
//   자르는 캡처만 위/아래로 밀어 구한다.
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

// 소재 (리포 안 기존 자산 재사용 — 새로 만들지 않는다)
const SRC_ICON = path.join(ROOT, "public", "icon-512.png");    // M 모노그램, 512×512가 최대 해상도
const SRC_WORDMARK = path.join(ROOT, "public", "logo.png");    // "MOSPIC" 워드마크
// 피처 그래픽 우측 카드 — 증명·비즈·글램 한 장씩(밝고 선명한 정면 인물 순으로 골랐다)
const SRC_CARDS = [
  "public/examples/ba/idtweed-after-1.webp",
  "public/examples/ba/bizpinkjacket-after-1.webp",
  "public/examples/ba/cheerglam-after-1.webp",
].map((p) => path.join(ROOT, p));

// ★파일별 크롭 오프셋(px). 양수 = 아래쪽을 더 남긴다(위를 더 자름), 음수 = 반대.
//   키는 산출 파일명(shot-05.png). 없으면 0 = 세로 정중앙.
const SHOT_OFFSET = {};

const TAGLINE = "사진관 안 가도, 사진관보다";
const KR_FONTS = "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif";

const KB = (n) => (n / 1024).toFixed(0) + "KB";
const results = [];
const fail = [];
const svgBuf = (s) => Buffer.from(s);

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────
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

// ★워드마크의 흰 판 제거: logo.png는 알파 채널이 있어도 배경이 불투명 흰색이라
//   그냥 얹으면 밝은 사각형이 그대로 보인다(그라데이션 배경에서 특히 눈에 띈다).
//   밝기를 뒤집어 알파로 삼으면 검은 글자만 남고 흰 바탕은 완전히 투명해진다.
const inkOnly = async (src, height) => {
  const rgb = await sharp(src).resize({ height }).flatten({ background: "#ffffff" }).removeAlpha().toBuffer();
  const alpha = await sharp(rgb).greyscale().negate().toBuffer();
  return await sharp(rgb).joinChannel(alpha).png().toBuffer();
};

// 잉크(배경보다 어두운 픽셀)의 경계 상자 — 렌더 검수용
async function inkBox(buf, thresh = 225) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;
      if (data[i + 3] < 16) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < thresh) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        count++;
      }
    }
  }
  return count ? { minX, maxX, minY, maxY, count } : null;
}

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
// 좌: 워드마크 + 태그라인 2줄(수직 중앙) / 우: 애프터 3장이 겹친 카드 스트립(우측 bleed)
// 배경은 아주 옅은 대각 그라데이션으로 500px 전체를 채운다 — 단색일 때의 '떠 있는 여백' 인상 제거.
const F = {
  W: 1024, H: 500, PAD: 56,
  MARK_H: 52, GAP: 18, TAG: 20,          // 좌측 2줄
  CARD_H: 410, CARD_W: 328,              // 500의 82%, 4:5
  RADIUS: 22, RING: 5, BLEED: 24,        // 맨 오른쪽 카드가 캔버스 밖으로 24px
  MIN_TAIL: 24,                          // 태그라인 끝 ~ 카드 사이 최소 여백
};

async function buildFeature() {
  const cardY = Math.round((F.H - F.CARD_H) / 2);
  const x2 = F.W + F.BLEED - F.CARD_W;                 // 맨 오른쪽 카드 좌표
  const x0 = 344;                                       // 좌측 텍스트 블록과의 균형에서 정한 값
  const step = Math.round((x2 - x0) / 2);
  const xs = [x0, x0 + step, x2];

  const bg = svgBuf(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${F.W}" height="${F.H}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F3F1EC"/>` +
    `</linearGradient></defs><rect width="${F.W}" height="${F.H}" fill="url(#g)"/></svg>`
  );

  const mark = await inkOnly(SRC_WORDMARK, F.MARK_H);
  const markW = (await sharp(mark).metadata()).width;

  // 2줄 블록을 수직 중앙에 앉힌다
  const blockH = F.MARK_H + F.GAP + F.TAG + 6;
  const top = Math.round((F.H - blockH) / 2);
  const tagBaseline = top + F.MARK_H + F.GAP + F.TAG;

  const layers = [{ input: mark, left: F.PAD, top }];
  for (let i = 0; i < 3; i++) {
    // 겹치는 자리에 흰 테를 먼저 깔아 카드끼리 붙어 보이지 않게 한다(사진 마운트처럼 읽힌다)
    layers.push({
      input: roundedRect(F.CARD_W + F.RING * 2, F.CARD_H + F.RING * 2, F.RADIUS + F.RING, "#FFFFFF"),
      left: xs[i] - F.RING, top: cardY - F.RING,
    });
    layers.push({ input: await roundedCard(SRC_CARDS[i], F.CARD_W, F.CARD_H, F.RADIUS), left: xs[i], top: cardY });
  }

  const tagSvg = svgBuf(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${F.W}" height="${F.H}">` +
    `<text x="${F.PAD}" y="${tagBaseline}" font-family="${KR_FONTS}" font-size="${F.TAG}" fill="#5A5F66">${TAGLINE}</text></svg>`
  );

  // ★한글 렌더 검사: 태그라인만 따로 그려 잉크가 실제로 찍혔는지 본다
  let krOK = false;
  let tagInk = null;
  try {
    const probe = await sharp(svgBuf(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${F.W}" height="60">` +
      `<text x="0" y="40" font-family="${KR_FONTS}" font-size="${F.TAG}" fill="#000">${TAGLINE}</text></svg>`
    )).png().toBuffer();
    tagInk = await inkBox(probe);
    krOK = !!tagInk && tagInk.count > 100;
  } catch { krOK = false; }

  const dst = path.join(OUT, "feature-1024x500.png");
  if (krOK) {
    await sharp(bg).composite([...layers, { input: tagSvg, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(dst);
  } else {
    // 폴백: 글자를 못 그리면 빈자리를 남기지 않고 워드마크를 키워 균형을 맞춘다
    const bigMark = await inkOnly(SRC_WORDMARK, 76);
    await sharp(bg).composite([
      { input: bigMark, left: F.PAD, top: Math.round((F.H - 76) / 2) },
      ...layers.slice(1),
    ]).png({ compressionLevel: 9 }).toFile(dst);
  }
  await verify(dst, F.W, F.H, 15 * 1024 * 1024);

  console.log(`B. feature-1024x500.png — 한글 태그라인 ${krOK ? "렌더 OK" : "★렌더 실패 → 워드마크 확대 폴백"}`);
  console.log(`   좌측 2줄: 워드마크 ${markW}×${F.MARK_H} @(${F.PAD},${top}) · 태그라인 ${F.TAG}px baseline ${tagBaseline}`);
  console.log(`   카드 ${F.CARD_W}×${F.CARD_H}(높이 ${(F.CARD_H / F.H * 100).toFixed(0)}%) x=[${xs.join(", ")}] y=${cardY} · 겹침 ${F.CARD_W - step}px · 우측 bleed ${F.BLEED}px`);

  // ── 픽셀 검수 3종 ──
  const tagEnd = F.PAD + (tagInk ? tagInk.maxX : 0);
  const tail = xs[0] - F.RING - tagEnd;
  const okTail = tail >= F.MIN_TAIL;
  if (!okTail) fail.push(`feature 태그라인 뒤 여백 ${tail}px (최소 ${F.MIN_TAIL})`);

  // ★"빈 띠 0"의 뜻: 배경이 상하로 꽉 찼는가(단색 판이 떠 보이지 않는가)이지,
  //   카드가 위아래에 닿아야 한다는 뜻이 아니다(카드는 82% 높이가 설계값).
  //   네 모서리를 찍어 그라데이션이 캔버스 끝까지 칠해졌는지, 투명 구멍이 없는지 본다.
  const px = async (x, y) => [...(await sharp(dst).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer())];
  const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  const corners = { 좌상: await px(0, 0), 우상: await px(F.W - 1, 0), 좌하: await px(0, F.H - 1), 우하: await px(F.W - 1, F.H - 1) };
  const st = await sharp(dst).stats();
  const opaque = st.channels.length < 4 || st.channels[3].min === 255;
  const spans = Object.values(corners).every((c) => lum(c) >= 225);   // 네 끝이 모두 배경색으로 칠해짐
  const gradient = lum(corners.좌상) - lum(corners.우하) >= 3;        // 대각 그라데이션이 실제로 걸림
  const okBand = opaque && spans && gradient;
  if (!okBand) fail.push(`feature 배경 미충전 — 불투명 ${opaque} · 네끝칠함 ${spans} · 그라데이션 ${gradient}`);
  const contentTop = cardY, contentBot = F.H - (cardY + F.CARD_H);

  // 맨 오른쪽 카드: 잘려나가는 것이 가장자리뿐인가 — 중앙 절반이 캔버스 안에 온전한지
  const cx1 = xs[2] + Math.round(F.CARD_W * 0.25), cx2 = xs[2] + Math.round(F.CARD_W * 0.75);
  const okFace = cx2 <= F.W - 1;
  if (!okFace) fail.push(`feature 우측 카드의 중앙 절반이 캔버스를 벗어남(${cx1}~${cx2})`);

  console.log(`   [검수] 글자 완전: 잉크 끝 ${tagEnd}px → 카드까지 ${tail}px ${okTail ? "OK" : "★NG"}`);
  console.log(`   [검수] 배경 꽉 참: 불투명=${opaque} · 네 끝 칠함=${spans} · 대각 그라데이션=${gradient} ${okBand ? "OK" : "★NG"}`);
  console.log(`          (카드 위 여백 ${contentTop}px · 아래 ${contentBot}px — 82% 높이의 설계값, 배경으로 채워짐)`);
  console.log(`   [검수] 우측 카드 중앙 절반 ${cx1}~${cx2} (캔버스 0~${F.W - 1}) ${okFace ? "OK" : "★NG"}`);
}

// ─── C. 스크린샷 ──────────────────────────────────────────────────────────
const SHOT_W = 1080, SHOT_H = 1920;

// ★크롭 앵커 자동 탐색: 잘리는 두 경계선이 '민민한 가로 띠'(여백·단색 배경)에 놓이도록 고른다.
//   무작정 정중앙을 자르면 상단 탭 글자나 얼굴 이마를 반으로 가른다 — 실제로 그렇게 잘렸다.
//   각 행의 명암 편차를 재서, 위·아래 절단선이 모두 평평한 곳을 최고점으로 잡는다.
//   중앙에서 너무 멀어지지 않도록 약한 중앙 가중치를 준다.
async function findAnchor(scaledBuf, srcH) {
  const W = 120;
  const { data, info } = await sharp(scaledBuf).resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rows = info.height;
  const flat = new Float64Array(rows);
  for (let y = 0; y < rows; y++) {
    let sum = 0, sum2 = 0;
    for (let x = 0; x < W; x++) { const v = data[y * W + x]; sum += v; sum2 += v * v; }
    const mean = sum / W;
    flat[y] = 1 / (1 + Math.sqrt(Math.max(0, sum2 / W - mean * mean)));  // 편차가 작을수록 1에 가깝다
  }
  const scale = rows / srcH;
  const maxTop = srcH - SHOT_H;
  if (maxTop <= 0) return 0;
  const center = maxTop / 2;
  let best = Math.round(center), bestScore = -1;
  for (let t = 0; t <= maxTop; t += 2) {
    const a = flat[Math.min(rows - 1, Math.round(t * scale))];
    const b = flat[Math.min(rows - 1, Math.round((t + SHOT_H) * scale))];
    const bias = 1 - 0.35 * Math.abs(t - center) / Math.max(1, center);   // 중앙 선호(약하게)
    const score = Math.min(a, b) * bias;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

async function buildShots() {
  if (!existsSync(RAW)) { console.log("C. raw 폴더가 없어 스크린샷은 건너뜀"); return; }
  const files = readdirSync(RAW).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  if (!files.length) { console.log("C. raw에 캡처가 없어 건너뜀"); return; }
  console.log(`C. 스크린샷 ${files.length}장 — 세로 중앙 크롭(패딩 0)`);

  let n = 0;
  for (const f of files) {
    const src = path.join(RAW, f);
    const m = await sharp(src).metadata();
    const name = `shot-${String(++n).padStart(2, "0")}.png`;
    const dst = path.join(OUT, name);

    // 1) 폭을 1080으로 맞춘다 (비율 유지)
    const scaled = await sharp(src).resize({ width: SHOT_W }).png().toBuffer();
    const sm = await sharp(scaled).metadata();

    if (sm.height >= SHOT_H) {
      // 2) 잘라낼 위치를 정한다 — 수동 오프셋이 있으면 그것, 없으면 자동 앵커 탐색
      const center = Math.round((sm.height - SHOT_H) / 2);
      const manual = SHOT_OFFSET[name];
      const top = manual !== undefined
        ? Math.max(0, Math.min(sm.height - SHOT_H, center + manual))
        : await findAnchor(scaled, sm.height);
      const off = top - center;
      await sharp(scaled).extract({ left: 0, top, width: SHOT_W, height: SHOT_H }).png({ compressionLevel: 9 }).toFile(dst);
      console.log(`   ${name} ← ${f}  ${m.width}×${m.height} → 잘림 위 ${top}px/아래 ${sm.height - SHOT_H - top}px · 중앙대비 ${off >= 0 ? "+" : ""}${off}px ${manual !== undefined ? "(수동)" : "(자동 앵커)"}`);
    } else {
      // 원본이 목표보다 짧으면 잘라낼 것이 없다 — 이때만 위아래 여백으로 채운다
      await sharp(scaled)
        .resize(SHOT_W, SHOT_H, { fit: "contain", background: "#FAFAF8" })
        .flatten({ background: "#FAFAF8" })
        .png({ compressionLevel: 9 })
        .toFile(dst);
      console.log(`   ${name} ← ${f}  ${m.width}×${m.height} → ★세로 부족(${sm.height}) — 위아래 여백으로 채움`);
    }
    await verify(dst, SHOT_W, SHOT_H, 8 * 1024 * 1024);
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
