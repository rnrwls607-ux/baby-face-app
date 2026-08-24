// 인스타 게시물 공장 — insta/raw/{slug} → insta/out/{slug} (4:5 세로 1080×1350 PNG 시리즈 + 캡션/DM)
//
// 왜 별도 스크립트인가: ba-prep(768×960 앱 자산)·store-assets(플레이 콘솔 규격)와 목적이 다르다.
// 여기 산출물은 앱에도 스토어에도 안 들어가고 인스타 업로드 폼에만 들어간다.
// ★그래서 insta/ 전체가 .gitignore다 — 원료 사진도 산출 카드도 리포에 안 들어간다.
//
// [입력] insta/raw/{slug}/
//   before.jpg           1장   (jpg·jpeg·png·webp 모두 허용 — 리포 안 webp 자산을 그대로 쓰려고 넓혔다)
//   after-1.jpg ~ after-N.jpg  (2~8장)
//   kit.json { episode, titleLine1, titleLine2, conceptLabel, keyword?, tagsExtra?, dmPrompt }
//
// [출력] insta/out/{slug}/ — 업로드 순서대로 번호가 붙는다(01부터 그대로 올리면 된다)
//   01-cover / 02-ba / 03…-gallery(애프터 장수만큼) / …-cta / …-follow / caption.txt / dm.txt
//
// [사용법] 리포 루트에서
//   node scripts/insta-kit.mjs            # insta/raw 아래 모든 slug
//   node scripts/insta-kit.mjs voxel      # 특정 slug만
//
// ─── 이 스크립트가 지키는 규칙 4가지 ────────────────────────────────────────
// ① 안전영역: 인스타 그리드 썸네일은 4:5를 가운데 1:1로 자른다 → y 135~1215 밖으로
//    커버의 제목·배지가 나가면 프로필 그리드에서 잘린다. 그래서 '재서' 넣는다(아래 ②).
// ② 글자는 추정하지 않고 실측한다: librsvg에는 텍스트 메트릭 API가 없다.
//    그래서 넓은 캔버스에 한 번 그려 잉크 상자를 재고(measure), 그 값으로 자리를 잡고
//    크기를 줄인다(fitSize). 제목 길이가 컨셉마다 달라도 잘리지 않는 이유가 이것이다.
// ③ 흰 글자에는 헤일로를 깐다: 밝은 사진 위에서 흰 글자는 그냥 사라진다.
//    특히 "Made with MOSPIC AI"는 장식이 아니라 AI 고지다 — 안 보이면 안 된다.
//    librsvg의 feDropShadow는 버전에 따라 무시될 수 있어 필터 대신 '여러 번 그리기'로 만든다.
// ④ 금지어가 있으면 아무것도 만들지 않는다: 캡션·DM을 먼저 조립해 검사하고,
//    한 slug라도 걸리면 이미지 생성 전에 통째로 멈춘다(반쯤 만들어진 폴더를 남기지 않는다).
//
// ─── "N px 상당"의 환산 근거 ──────────────────────────────────────────────
// 캔버스는 1080px, 폰에서 게시물은 표시 폭 약 400px → 약 2.7배.
//   워터마크 "12px 상당" → 캔버스 32px (표시 기준 약 12px)
//   CTA "글자 하한 44px 상당" → ★캔버스 44px를 절대 하한으로 못박았다.
//   자리표시가 아니라 게이트다 — 44px에서도 안 들어가면 줄이지 않고 실패로 보고한다.
import sharp from "sharp";
import { mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "insta", "raw");
const OUT = path.join(ROOT, "insta", "out");

const W = 1080, H = 1350;                 // 4:5 세로
const SAFE_TOP = (H - W) / 2;             // 135 — 그리드 1:1 크롭의 윗선
const SAFE_BOT = SAFE_TOP + W;            // 1215 — 아랫선
const PAD = 64;                           // 좌우 안쪽 여백
const MAX_TEXT_W = W - PAD * 2;           // 952

const PINK = "#FF4B7C";                   // 배지 바탕
const YELLOW = "#FFD84D";                 // 제목 2줄째 강조 / CTA 행동 줄
const CTA_BG = "#1A1A1A";
const KR_FONTS = "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif";
const TAGLINE = "사진관 안 가도, 사진관보다";   // store-assets.mjs와 같은 문구(브랜드 일관)
const AI_MARK = "Made with MOSPIC AI";     // 워터마크 겸 AI 고지
const WATERMARK_PX = 32;                   // "12px 상당"
const CTA_MIN_PX = 44;                     // "글자 하한 44px 상당"
const BANNED = ["무료", "0원", "공짜", "지브리", "픽사"];
const EXT = /\.(jpe?g|png|webp)$/i;

const fails = [];                          // 게이트 위반 — 마지막에 모아 보고하고 exit 1
const notes = [];

// ─── 기본 도구 ────────────────────────────────────────────────────────────
const svgBuf = (s) => Buffer.from(s);
const png = (svg) => sharp(svgBuf(svg)).png().toBuffer();
// ★XML 이스케이프: 제목에 & 나 < 가 하나만 들어가도 SVG 전체가 파싱 실패한다.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// 투명 배경 위 '잉크'(알파가 있는 픽셀)의 경계 상자.
// ★luminance가 아니라 alpha로 재는 이유: 흰 글자를 재야 한다(어두운 잉크 가정이 안 통한다).
async function alphaBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      n++;
    }
  }
  return n ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, n } : null;
}

const attrs = (o) =>
  `font-family="${KR_FONTS}" font-size="${o.size}" font-weight="${o.weight ?? 400}"` +
  ` letter-spacing="${o.spacing ?? 0}" text-anchor="${o.anchor ?? "start"}"`;

// 글자 한 줄의 실측 치수. 넓은 별도 캔버스에 그린다.
// ★1080 캔버스에서 재면 안 된다: 긴 제목이 캔버스에 잘려 폭이 1080으로 '측정'되고,
//   그러면 fitSize가 "들어간다"고 착각한다 — 잘린 제목이 그대로 나가는 경로다.
// 반환 dTop/dBot = 베이스라인 기준 잉크 위/아래 오프셋 → 베이스라인이 아니라 잉크로 배치한다.
const MEASURE_W = 3400;
async function measure(text, o) {
  if (!String(text).length) return { w: 0, h: 0, dTop: 0, dBot: 0 };
  const h = Math.ceil(o.size * 3), base = Math.round(o.size * 2);
  // ★재는 동안은 anchor를 무조건 start로 눕힌다. anchor="middle"/"end"를 그대로 재면
  //   글자가 x=20에서 왼쪽으로 뻗어 캔버스 밖에서 잘리고 폭이 실제의 절반으로 측정된다
  //   — 그러면 fitSize가 "들어간다"고 착각해 잘린 글자가 그대로 나간다(CTA에서 실제로 겪었다).
  //   폭·높이는 anchor와 무관하니 눕혀서 재고, 배치할 때만 원래 anchor를 쓴다.
  const box = await alphaBox(await png(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MEASURE_W}" height="${h}">` +
    `<text x="20" y="${base}" ${attrs({ ...o, anchor: "start" })} fill="#fff">${esc(text)}</text></svg>`));
  if (!box) return { w: 0, h: 0, dTop: 0, dBot: 0 };
  // 측정 캔버스마저 넘겼다면 그 측정값 자체가 거짓이다 — 조용히 쓰지 않고 올려보낸다
  if (box.x + box.w >= MEASURE_W - 20) fails.push(`측정 캔버스(${MEASURE_W}px) 초과 — "${String(text).slice(0, 20)}…" ${o.size}px`);
  return { w: box.w, h: box.h, dTop: box.y - base, dBot: box.y + box.h - 1 - base };
}

// maxW 안에 들어가는 최대 글자 크기를 '실제로 그려서' 찾는다(비율 축소 후 재측정, 보통 2~3회 수렴).
// min에서도 넘치면 줄이지 않고 overflow를 켜서 올려보낸다 — 조용히 잘리는 것보다 실패가 낫다.
async function fitSize(text, maxW, start, min, o = {}) {
  let size = start, m = await measure(text, { ...o, size });
  for (let i = 0; i < 5 && m.w > maxW && size > min; i++) {
    size = Math.max(min, Math.floor(size * (maxW / m.w)));
    m = await measure(text, { ...o, size });
  }
  return { size, m, overflow: m.w > maxW, shrunk: size < start };
}

// 캔버스 전체 크기의 투명 레이어에 글자만 그린다.
// ★composite의 left/top을 0으로 고정하면 잉크 상자 좌표가 곧 캔버스 절대 좌표다
//   — 안전영역 검사를 좌표 변환 없이 그대로 할 수 있다.
function textLayer(o) {
  const t = esc(o.text), a = attrs(o), op = o.opacity ?? 1;
  let halo = "";
  if (o.halo) {
    const d = o.halo;
    for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, -d], [-d, d], [d, d]])
      halo += `<text x="${o.x + dx}" y="${o.y + dy}" ${a} fill="#000" fill-opacity="0.30">${t}</text>`;
  }
  return svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${halo}` +
    `<text x="${o.x}" y="${o.y}" ${a} fill="${o.fill ?? "#fff"}" fill-opacity="${op}">${t}</text></svg>`);
}

const coverCrop = (src, w, h) => sharp(src)
  .flatten({ background: "#ffffff" })                       // 투명 PNG → 흰 배경(ba-prep과 같은 관례)
  .resize(w, h, { fit: "cover", position: sharp.strategy.attention })
  .png().toBuffer();

// 상하 분할 패널용 크롭 — 세로 원본에서 가로로 긴 띠를 '위로 치우쳐' 잘라낸다.
// ★여기서 attention을 쓰지 않는 이유(실측): 비포 셀카에서 attention이 얼굴을 버리고
//   티셔츠·창틀을 골라 '머리 없는 상반신'이 나왔다. 게다가 비포와 애프터가 서로 다른 자리를
//   고르면 비교 카드로서 공정하지도 않다 — 같은 규칙으로 자르는 쪽이 맞다.
//   0.08 = 세로 4%~54% 구간 → 잘 잡힌 세로 인물 사진의 머리·어깨가 들어오는 자리.
const BAND_BIAS = 0.08;
async function bandCrop(src, w, h) {
  const scaled = await sharp(src).flatten({ background: "#ffffff" }).resize({ width: w }).png().toBuffer();
  const { height: sh } = await sharp(scaled).metadata();
  if (sh <= h) return sharp(scaled).resize(w, h, { fit: "cover", position: "centre" }).png().toBuffer();
  return sharp(scaled).extract({ left: 0, top: Math.round((sh - h) * BAND_BIAS), width: w, height: h }).png().toBuffer();
}

// 산출물 검수 — 치수를 실제 파일에서 다시 읽는다(믿지 말고 재측정)
const shots = [];
async function verify(file) {
  const m = await sharp(file).metadata();
  const ok = m.width === W && m.height === H;
  shots.push({ file: path.basename(file), w: m.width, h: m.height, kb: (statSync(file).size / 1024).toFixed(0), ok });
  if (!ok) fails.push(`${path.basename(file)} 치수 ${m.width}×${m.height} (기대 ${W}×${H})`);
}

// 잉크가 안전영역(가운데 1:1) 안에 있는지 — 커버의 제목·배지에만 적용되는 게이트
function safeCheck(label, box) {
  const ok = box && box.y >= SAFE_TOP && box.y + box.h - 1 <= SAFE_BOT && box.x >= 0 && box.x + box.w - 1 <= W - 1;
  if (!ok) fails.push(`${label} 안전영역 이탈 — 잉크 y ${box ? `${box.y}~${box.y + box.h - 1}` : "없음"} (허용 ${SAFE_TOP}~${SAFE_BOT})`);
  return ok;
}

// ─── 01-cover ─────────────────────────────────────────────────────────────
// 애프터1 풀블리드 + 하단 그라데이션 + 좌상단 배지 + 하단 좌측 2줄 제목 + 우상단 워드마크.
// ★제목·배지는 안전영역(y 135~1215) 안에 앉힌다 — 그래서 제목 블록 아래로 여백이 남는데,
//   그건 낭비가 아니라 그리드 썸네일에서 제목이 살아남는 값이다.
async function buildCover(dst, afterSrc, kit) {
  const base = await coverCrop(afterSrc, W, H);
  const grad = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.45" stop-color="#000" stop-opacity="0.42"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0.90"/></linearGradient></defs>` +
    `<rect x="0" y="500" width="${W}" height="${H - 500}" fill="url(#g)"/></svg>`);

  // 배지 — "픽레시피 {episode}"
  const badgeText = `픽레시피 ${kit.episode}`;
  const bo = { size: 44, weight: 900, spacing: 1 };
  const bm = await measure(badgeText, bo);
  const bPadX = 30, bPadY = 20;
  const pillW = bm.w + bPadX * 2, pillH = (bm.dBot - bm.dTop + 1) + bPadY * 2;
  const pillX = PAD, pillY = SAFE_TOP + 16;
  const badgePill = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="${PINK}"/></svg>`);
  const badgeLayer = textLayer({ ...bo, text: badgeText, x: pillX + bPadX, y: pillY + bPadY - bm.dTop, fill: "#fff" });

  // 워드마크 — 배지와 같은 높이 중앙에 맞춘다
  const wo = { size: 40, weight: 900, spacing: 5, anchor: "end" };
  const wm = await measure("MOSPIC", wo);
  const wordLayer = textLayer({ ...wo, text: "MOSPIC", x: W - PAD, fill: "#fff", opacity: 0.8, halo: 2,
    y: Math.round(pillY + pillH / 2 - (wm.dTop + wm.dBot) / 2) });

  // 제목 2줄 — 두 줄 다 들어가는 크기로 맞춰 같은 크기를 쓴다(한 덩어리로 읽히게)
  const to = { weight: 900, spacing: -1 };
  const f1 = await fitSize(kit.titleLine1, MAX_TEXT_W, 88, 44, to);
  const f2 = await fitSize(kit.titleLine2, MAX_TEXT_W, 88, 44, to);
  const tSize = Math.min(f1.size, f2.size);
  const m1 = await measure(kit.titleLine1, { ...to, size: tSize });
  const m2 = await measure(kit.titleLine2, { ...to, size: tSize });
  if (f1.overflow || f2.overflow) fails.push(`${path.basename(dst)} 제목이 44px에서도 ${MAX_TEXT_W}px를 넘음`);

  const line2Base = Math.round(SAFE_BOT - 28 - m2.dBot);       // 2줄째 잉크 아랫변을 안전영역 안쪽에
  const line1Base = Math.round(line2Base - tSize * 1.26);
  const t1 = textLayer({ ...to, size: tSize, text: kit.titleLine1, x: PAD, y: line1Base, fill: "#fff", halo: 2 });
  const t2 = textLayer({ ...to, size: tSize, text: kit.titleLine2, x: PAD, y: line2Base, fill: YELLOW, halo: 2 });

  await sharp(base).composite([
    { input: grad, left: 0, top: 0 },
    { input: badgePill, left: 0, top: 0 }, { input: badgeLayer, left: 0, top: 0 },
    { input: wordLayer, left: 0, top: 0 },
    { input: t1, left: 0, top: 0 }, { input: t2, left: 0, top: 0 },
  ]).png({ compressionLevel: 9 }).toFile(dst);

  // ★게이트: 제목·배지 잉크가 정말 안전영역 안인지 레이어를 다시 재서 확인한다
  const okBadge = safeCheck("커버 배지", { x: pillX, y: pillY, w: pillW, h: pillH });
  const b1 = await alphaBox(await png(t1.toString()));
  const b2 = await alphaBox(await png(t2.toString()));
  const okT = safeCheck("커버 제목 1줄", b1) && safeCheck("커버 제목 2줄", b2);
  return {
    line: `제목 ${tSize}px(요청 88 → ${f1.shrunk || f2.shrunk ? "자동 축소" : "그대로"}) 폭 ${Math.max(m1.w, m2.w)}/${MAX_TEXT_W}px · ` +
      `잉크 y ${b1.y}~${b2.y + b2.h - 1} (안전 ${SAFE_TOP}~${SAFE_BOT}) ${okT && okBadge ? "OK" : "★NG"} · 배지 ${pillW}×${pillH}@(${pillX},${pillY})`,
  };
}

// ─── 02-ba ────────────────────────────────────────────────────────────────
// 상하 분할(각 1080×675) + 좌상단 "전"/"후" 칩 + 중앙 화살표.
// ★conceptLabel은 여기 화살표 아래에 넣는다: 커버는 안전영역 계산이 빡빡하고 캡션 템플릿은
//   고정이다. 화살표 옆이 이 카드에서 유일하게 비어 있는 자리이고, 무엇이 무엇으로 바뀌는지
//   말해주기에도 제일 맞는 자리다.
async function buildBA(dst, beforeSrc, afterSrc, kit) {
  const half = H / 2;                                          // 675
  const top = await bandCrop(beforeSrc, W, half);
  const bot = await bandCrop(afterSrc, W, half);

  const chip = async (label, absY) => {
    const o = { size: 40, weight: 900, spacing: 1 };
    const m = await measure(label, o);
    const px = 26, py = 15;
    const w = m.w + px * 2, h = (m.dBot - m.dTop + 1) + py * 2;
    return {
      pill: svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
        `<rect x="${PAD}" y="${absY}" width="${w}" height="${h}" rx="${Math.round(h / 2)}" fill="#000" fill-opacity="0.55"/></svg>`),
      text: textLayer({ ...o, text: label, x: PAD + px, y: absY + py - m.dTop, fill: "#fff" }),
      box: `${w}×${h}@(${PAD},${absY})`,
    };
  };
  const cBefore = await chip("전", 36);
  const cAfter = await chip("후", half + 36);

  // 화살표 — 분할선 위에 흰 원 + 아래쪽 셰브론
  const cx = W / 2, cy = half, r = 54;
  const arrow = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>` +
    `<path d="M ${cx - 23} ${cy - 11} L ${cx} ${cy + 13} L ${cx + 23} ${cy - 11}" fill="none" ` +
    `stroke="${CTA_BG}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

  // conceptLabel 알약 — 원 바로 아래 가운데
  const lo = { size: 36, weight: 700, anchor: "middle" };
  const lf = await fitSize(kit.conceptLabel, MAX_TEXT_W - 80, 36, 24, lo);
  const lm = await measure(kit.conceptLabel, { ...lo, size: lf.size });
  const lPadX = 28, lPadY = 14;
  const lw = lm.w + lPadX * 2, lh = (lm.dBot - lm.dTop + 1) + lPadY * 2;
  const ly = cy + r + 26;
  const labelPill = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect x="${Math.round(cx - lw / 2)}" y="${ly}" width="${lw}" height="${lh}" rx="${Math.round(lh / 2)}" fill="#000" fill-opacity="0.72"/></svg>`);
  const labelText = textLayer({ ...lo, size: lf.size, text: kit.conceptLabel, x: cx, y: ly + lPadY - lm.dTop, fill: "#fff" });

  await sharp({ create: { width: W, height: H, channels: 3, background: "#000" } }).composite([
    { input: top, left: 0, top: 0 }, { input: bot, left: 0, top: half },
    { input: cBefore.pill, left: 0, top: 0 }, { input: cBefore.text, left: 0, top: 0 },
    { input: cAfter.pill, left: 0, top: 0 }, { input: cAfter.text, left: 0, top: 0 },
    { input: arrow, left: 0, top: 0 },
    { input: labelPill, left: 0, top: 0 }, { input: labelText, left: 0, top: 0 },
  ]).png({ compressionLevel: 9 }).toFile(dst);

  return { line: `분할 ${W}×${half} ×2 · 칩 전 ${cBefore.box} / 후 ${cAfter.box} · 화살표 r${r}@(${cx},${cy}) · 라벨 ${lf.size}px ${lw}×${lh}@y${ly}` };
}

// ─── 03…-gallery ──────────────────────────────────────────────────────────
// 애프터 한 장을 꽉 채우고 우하단에 작게 AI 고지.
// ★헤일로를 반드시 깐다: 밝은 배경(하늘·흰 벽) 위에서 흰 70% 글자는 그냥 사라진다.
//   이건 워터마크이자 AI 고지라 "안 보이는 경우"가 있으면 안 된다.
async function buildGallery(dst, src) {
  const base = await coverCrop(src, W, H);
  const o = { size: WATERMARK_PX, weight: 700, anchor: "end" };
  const m = await measure(AI_MARK, o);
  const layer = textLayer({ ...o, text: AI_MARK, x: W - PAD, y: Math.round(H - 56 - m.dBot),
    fill: "#fff", opacity: 0.7, halo: 2 });
  await sharp(base).composite([{ input: layer, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(dst);

  // ★워터마크 위치 게이트: 우하단 사분면 안에 있고 가장자리에 붙어 잘리지 않는가
  const box = await alphaBox(await png(layer.toString()));
  const ok = box && box.x > W / 2 && box.y > H / 2 && box.x + box.w - 1 <= W - PAD + 4 && box.y + box.h - 1 <= H - 24;
  if (!ok) fails.push(`${path.basename(dst)} 워터마크 위치 이상 — ${JSON.stringify(box)}`);
  return { line: `워터마크 ${WATERMARK_PX}px 잉크 (${box.x},${box.y}) ${box.w}×${box.h} · 우여백 ${W - (box.x + box.w)}px · 하여백 ${H - (box.y + box.h)}px ${ok ? "OK" : "★NG"}` };
}

// ─── …-cta ────────────────────────────────────────────────────────────────
// 어두운 단색 + 가운데 정렬 3줄 + 하단 안내 한 줄.
// ★행동 줄(①②)만 노란색이다: 이 카드에서 사람이 실제로 해야 하는 일은 그 한 줄뿐이라
//   색을 거기 하나에만 쓴다. 강조를 두 군데 이상 주면 강조가 아니게 된다.
async function buildCTA(dst, kit) {
  const L = [
    { text: `'${kit.titleLine2}' 레시피 받는 법`, start: 64, weight: 900, fill: "#fff", op: 1 },
    { text: `① 팔로우  ② 댓글에 '${kit.keyword}'`, start: 58, weight: 900, fill: YELLOW, op: 1 },
    { text: "정리된 레시피를 DM으로 보내드려요", start: 52, weight: 400, fill: "#fff", op: 0.86 },
  ];
  const fitted = [];
  for (const l of L) {
    const o = { weight: l.weight, anchor: "middle" };
    const f = await fitSize(l.text, MAX_TEXT_W, l.start, CTA_MIN_PX, o);
    // ★하한에서도 안 들어가면 더 줄이지 않고 실패로 올린다(44px 하한이 곧 게이트다)
    if (f.overflow) fails.push(`${path.basename(dst)} "${l.text}" 가 ${CTA_MIN_PX}px에서도 ${MAX_TEXT_W}px를 넘음`);
    fitted.push({ ...l, o, size: f.size, m: f.m });
  }
  // ★크기 서열을 지킨다: 제목이 길어 1줄이 줄면 아래 줄도 같이 내린다.
  //   안 하면 제목 54px 아래 행동 줄 58px 이 되어 위계가 뒤집힌다(실측으로 봤다).
  for (let i = 1; i < fitted.length; i++) {
    const capped = Math.max(CTA_MIN_PX, Math.min(fitted[i].size, fitted[i - 1].size - 4));
    if (capped === fitted[i].size) continue;
    fitted[i].size = capped;
    fitted[i].m = await measure(fitted[i].text, { ...fitted[i].o, size: capped });
  }

  // 잉크 높이 + 고정 간격으로 3줄 블록을 쌓고, 블록 중심을 y=620에 맞춘다
  const gaps = [Math.round(fitted[0].size * 0.95), Math.round(fitted[1].size * 1.0)];
  const inkH = fitted.map((f) => f.m.dBot - f.m.dTop + 1);
  const blockH = inkH.reduce((a, b) => a + b, 0) + gaps[0] + gaps[1];
  let inkTop = Math.round(620 - blockH / 2);

  const layers = [];
  const report = [];
  for (let i = 0; i < fitted.length; i++) {
    const f = fitted[i];
    layers.push(textLayer({ ...f.o, size: f.size, text: f.text, x: W / 2, y: inkTop - f.m.dTop, fill: f.fill, opacity: f.op }));
    report.push(`${f.size}px`);
    inkTop += inkH[i] + (gaps[i] ?? 0);
  }

  const note = "업로드 5분 뒤부터 자동 발송돼요";
  const no = { size: CTA_MIN_PX, weight: 400, anchor: "middle" };
  const nm = await measure(note, no);
  layers.push(textLayer({ ...no, text: note, x: W / 2, y: Math.round(SAFE_BOT - 40 - nm.dBot), fill: "#fff", opacity: 0.55 }));

  await sharp({ create: { width: W, height: H, channels: 3, background: CTA_BG } })
    .composite(layers.map((input) => ({ input, left: 0, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(dst);

  const minPx = Math.min(...fitted.map((f) => f.size), CTA_MIN_PX);
  if (minPx < CTA_MIN_PX) fails.push(`${path.basename(dst)} 글자 ${minPx}px < 하한 ${CTA_MIN_PX}px`);
  return { line: `3줄 ${report.join(" / ")} + 안내 ${CTA_MIN_PX}px · 최소 ${minPx}px ≥ 하한 ${CTA_MIN_PX}px ${minPx >= CTA_MIN_PX ? "OK" : "★NG"}` };
}

// ─── …-follow ─────────────────────────────────────────────────────────────
// 애프터 한 장 풀블리드 + 하단 60% 어두운 그라데이션 + 대형 워드마크 + 태그라인 + 팔로우 유도.
// ★쓰는 사진은 '마지막 애프터'다: 커버가 애프터1이라, 캐러셀이 시작과 끝에 다른 얼굴로
//   열리고 닫힌다(같은 장이면 마지막 장이 커버의 재탕처럼 보인다).
async function buildFollow(dst, src) {
  const base = await coverCrop(src, W, H);
  const gTop = Math.round(H * 0.4);                             // 아래 60%
  const grad = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="#000" stop-opacity="0.55"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0.92"/></linearGradient></defs>` +
    `<rect x="0" y="${gTop}" width="${W}" height="${H - gTop}" fill="url(#g)"/></svg>`);

  // 아래에서 위로 쌓는다 — 맨 아래 안내 → 태그라인 → 워드마크
  const noteO = { size: 36, weight: 400, anchor: "middle" };
  const noteText = "다음 픽레시피가 궁금하다면 팔로우";
  const nm = await measure(noteText, noteO);
  const noteInkBot = SAFE_BOT - 24;

  const tagO = { size: 46, weight: 400, anchor: "middle" };
  const tm = await measure(TAGLINE, tagO);
  const tagInkBot = noteInkBot - (nm.dBot - nm.dTop + 1) - 34;

  const markF = await fitSize("MOSPIC", MAX_TEXT_W, 128, 64, { weight: 900, spacing: 8, anchor: "middle" });
  const markO = { size: markF.size, weight: 900, spacing: 8, anchor: "middle" };
  const mm = markF.m;
  const markInkBot = tagInkBot - (tm.dBot - tm.dTop + 1) - 40;

  await sharp(base).composite([
    { input: grad, left: 0, top: 0 },
    { input: textLayer({ ...markO, text: "MOSPIC", x: W / 2, y: Math.round(markInkBot - mm.dBot), fill: "#fff", halo: 3 }), left: 0, top: 0 },
    { input: textLayer({ ...tagO, text: TAGLINE, x: W / 2, y: Math.round(tagInkBot - tm.dBot), fill: "#fff", opacity: 0.7, halo: 2 }), left: 0, top: 0 },
    { input: textLayer({ ...noteO, text: noteText, x: W / 2, y: Math.round(noteInkBot - nm.dBot), fill: "#fff", opacity: 0.55, halo: 2 }), left: 0, top: 0 },
  ]).png({ compressionLevel: 9 }).toFile(dst);

  return { line: `워드마크 ${markF.size}px 잉크바닥 y${markInkBot} · 태그라인 46px y${tagInkBot} · 안내 36px y${noteInkBot} · 그라데이션 y${gTop}~${H}(하단 60%)` };
}

// ─── caption.txt / dm.txt ─────────────────────────────────────────────────
// ✅ 3줄은 자리표시다 — MJ가 컨셉마다 손으로 고치는 자리. 그럴듯한 문장을 지어 넣으면
// 안 고치고 그대로 올라간다. 그래서 일부러 "(수정)" 표시를 남겨둔다.
function buildCaption(kit) {
  const tags = ["#AI사진", "#프롬프트", "#aiart", "#aiphoto", ...kit.tagsExtra];
  return [
    "일단 저장부터 해두세요 📌",
    "",
    `[픽레시피 ${kit.episode} — ${kit.titleLine2}]`,
    "",
    "✅ (수정) 이 컨셉의 핵심 한 줄",
    "✅ (수정) 사진 고를 때 챙길 것 한 줄",
    "✅ (수정) 결과가 잘 나온 조건 한 줄",
    "",
    "✔ 같은 프롬프트라도 쓰는 모델·버전에 따라 결과가 달라져요",
    "✔ 주인공이 크게 나온 사진일수록 얼굴이 또렷하게 살아요",
    "",
    `팔로우하고 댓글에 '${kit.keyword}' 남겨주시면 정리된 레시피를 DM으로 보내드려요`,
    "(업로드 5분 뒤부터 자동 발송돼요)",
    "",
    tags.join(" "),
    "",
  ].join("\n");
}

function buildDM(kit) {
  const rule = "──────────────────────────────";
  return [
    `안녕하세요! 픽레시피 ${kit.episode} '${kit.titleLine2}' 레시피 보내드려요 🙌`,
    "",
    rule,
    kit.dmPrompt.trim(),
    rule,
    "",
    "💡 팁: 주인공이 크게 나온 사진일수록 얼굴이 또렷하게 살아요.",
    "",
    "증명사진·프로필처럼 내 얼굴 그대로여야 하는 사진은 프롬프트로 하면 얼굴이 자꾸 달라지죠? " +
    "그게 MOSPIC 앱이 하는 일이에요. 사진 1장, 30초. 가입하면 웰컴 코인 3개 → mospic.com",
    "",
  ].join("\n");
}

// 금지어 린트 — 걸린 단어와 그 단어가 있는 줄을 그대로 돌려준다(어디를 고쳐야 하는지 바로 보이게)
function lint(slug, file, text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const w of BANNED) if (line.includes(w)) hits.push(`${slug}/${file}:${i + 1} "${w}" — ${line.trim()}`);
  });
  return hits;
}

// ─── slug 읽기 ────────────────────────────────────────────────────────────
function readSlug(slug) {
  const dir = path.join(RAW, slug);
  const kitPath = path.join(dir, "kit.json");
  if (!existsSync(kitPath)) throw new Error(`${slug}: kit.json 이 없습니다 (${path.relative(ROOT, kitPath)})`);
  let raw;
  try { raw = JSON.parse(readFileSync(kitPath, "utf8")); }
  catch (e) { throw new Error(`${slug}: kit.json 파싱 실패 — ${e.message}`); }

  for (const k of ["episode", "titleLine1", "titleLine2", "conceptLabel", "dmPrompt"])
    if (!raw[k] || !String(raw[k]).trim()) throw new Error(`${slug}: kit.json 에 ${k} 가 비어 있습니다`);

  const kit = {
    episode: String(raw.episode).trim(),
    titleLine1: String(raw.titleLine1).trim(),
    titleLine2: String(raw.titleLine2).trim(),
    conceptLabel: String(raw.conceptLabel).trim(),
    keyword: String(raw.keyword ?? "모스픽").trim(),          // 기본 키워드
    tagsExtra: (Array.isArray(raw.tagsExtra) ? raw.tagsExtra : []).map((t) => {
      const s = String(t).trim();
      return s.startsWith("#") ? s : `#${s}`;                   // # 를 빼먹어도 붙여준다
    }),
    dmPrompt: String(raw.dmPrompt),
  };

  const files = readdirSync(dir).filter((f) => EXT.test(f));
  const before = files.find((f) => /^before\./i.test(f));
  if (!before) throw new Error(`${slug}: before.(jpg|jpeg|png|webp) 가 없습니다`);
  const afters = files
    .map((f) => ({ f, n: (f.match(/^after-(\d+)\./i) || [])[1] }))
    .filter((x) => x.n !== undefined)
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map((x) => x.f);
  // ★2~8장을 강제한다: 1장이면 커버·BA·갤러리·팔로우가 전부 같은 사진이 되어
  //   캐러셀로서 의미가 없고, 8장을 넘기면 슬라이드가 12장을 넘어 앞부분만 보게 된다.
  if (afters.length < 2 || afters.length > 8)
    throw new Error(`${slug}: after 사진이 ${afters.length}장 — 2~8장이어야 합니다 (after-1 … after-N)`);

  return { slug, dir, kit, before: path.join(dir, before), afters: afters.map((f) => path.join(dir, f)), afterNames: afters };
}

// ─── main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(RAW)) {
    console.error(`원료 폴더가 없습니다: ${path.relative(ROOT, RAW)}`);
    console.error("  insta/raw/{slug}/ 에 before.jpg · after-1.jpg… · kit.json 을 넣어주세요.");
    process.exit(1);
  }
  const asked = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const slugs = asked.length ? asked
    : readdirSync(RAW).filter((d) => statSync(path.join(RAW, d)).isDirectory());
  if (!slugs.length) { console.error(`${path.relative(ROOT, RAW)} 아래에 slug 폴더가 없습니다`); process.exit(1); }

  // ★한글 렌더 게이트: 폰트를 못 찾으면 글자 없는 카드가 조용히 나간다. 만들기 전에 막는다.
  const probe = await alphaBox(await png(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="120">` +
    `<text x="10" y="90" font-family="${KR_FONTS}" font-size="60" fill="#fff">${esc(TAGLINE)}</text></svg>`));
  if (!probe || probe.n < 100) {
    console.error("★한글이 렌더되지 않습니다 — 한글 폰트(맑은 고딕/Noto Sans KR)를 설치한 뒤 다시 실행하세요.");
    process.exit(1);
  }

  // 1단계: 전 slug를 읽고 캡션·DM을 먼저 조립해 금지어를 본다.
  // ★이미지보다 글을 먼저 검사하는 이유: 한 slug라도 걸리면 통째로 멈춰서
  //   반쯤 만들어진 out 폴더를 남기지 않는다("생성 중단"의 뜻이 그거다).
  const jobs = [], violations = [];
  for (const slug of slugs) {
    let job;
    try { job = readSlug(slug); }
    catch (e) { console.error(`★ ${e.message}`); process.exit(1); }
    job.caption = buildCaption(job.kit);
    job.dm = buildDM(job.kit);
    violations.push(...lint(slug, "caption.txt", job.caption), ...lint(slug, "dm.txt", job.dm));
    jobs.push(job);
  }
  if (violations.length) {
    console.error(`\n★금지어 발견 — 생성을 중단합니다 (${violations.length}건). 아무 파일도 만들지 않았습니다.`);
    console.error(`  금지어: ${BANNED.join(" · ")}`);
    for (const v of violations) console.error(`  · ${v}`);
    console.error("\n  kit.json 의 해당 문구를 고친 뒤 다시 실행하세요.");
    process.exit(1);
  }

  // 2단계: 생성
  for (const job of jobs) {
    const { slug, kit, afters } = job;
    const outDir = path.join(OUT, slug);
    if (!path.resolve(outDir).startsWith(path.resolve(OUT) + path.sep)) throw new Error(`출력 경로 이상: ${outDir}`);
    // ★매번 비우고 시작한다: 애프터가 5장에서 3장으로 줄면 지난 회차의 06·07 카드가
    //   남아 있다가 그대로 업로드된다. 실제로 사고 나는 자리다.
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const N = afters.length;
    let no = 0;
    const pad = (n) => String(n).padStart(2, "0");
    const p = (name) => path.join(outDir, `${pad(++no)}-${name}.png`);
    console.log(`\n■ ${slug} — 애프터 ${N}장 · 카드 ${N + 4}장`);
    console.log(`  입력: ${path.basename(job.before)} + ${job.afterNames.join(", ")}`);

    let f = p("cover");     console.log(`  01-cover   ${(await buildCover(f, afters[0], kit)).line}`); await verify(f);
    f = p("ba");            console.log(`  02-ba      ${(await buildBA(f, job.before, afters[0], kit)).line}`); await verify(f);
    for (let i = 0; i < N; i++) {
      f = p("gallery");     console.log(`  ${pad(no)}-gallery ${(await buildGallery(f, afters[i])).line}`); await verify(f);
    }
    f = p("cta");           console.log(`  ${pad(no)}-cta     ${(await buildCTA(f, kit)).line}`); await verify(f);
    f = p("follow");        console.log(`  ${pad(no)}-follow  ${(await buildFollow(f, afters[N - 1])).line}`); await verify(f);

    writeFileSync(path.join(outDir, "caption.txt"), job.caption, "utf8");
    writeFileSync(path.join(outDir, "dm.txt"), job.dm, "utf8");
    console.log(`  caption.txt · dm.txt — 금지어 0건 (검사: ${BANNED.join(" · ")})`);
    notes.push(`${slug}: ${N + 4}장 + caption/dm → ${path.relative(ROOT, outDir)}`);
  }

  // ─── 최종 보고 ──────────────────────────────────────────────────────────
  const bad = shots.filter((s) => !s.ok);
  console.log(`\n[검수] 산출 ${shots.length}장 · 규격 ${W}×${H} ${bad.length ? `★NG ${bad.length}장` : "전량 OK"}`);
  console.log(`       용량 ${Math.min(...shots.map((s) => +s.kb))}~${Math.max(...shots.map((s) => +s.kb))}KB`);
  for (const n of notes) console.log(`       ${n}`);
  if (fails.length) {
    console.error(`\n★게이트 실패 ${fails.length}건`);
    for (const x of fails) console.error(`  · ${x}`);
    process.exit(1);
  }
  console.log("\n완료 — insta/out/{slug} 를 번호 순서대로 인스타에 올리면 됩니다. (insta/ 는 전체가 gitignore)");
}

main().catch((e) => { console.error("★실패:", e.message); process.exit(1); });
