// 인스타 게시물 공장 — insta/raw/{slug} → insta/out/{slug} (4:5 세로 1080×1350 PNG 시리즈 + 캡션/DM)
//
// 왜 별도 스크립트인가: ba-prep(768×960 앱 자산)·store-assets(플레이 콘솔 규격)와 목적이 다르다.
// 여기 산출물은 앱에도 스토어에도 안 들어가고 인스타 업로드 폼에만 들어간다.
// ★그래서 insta/ 전체가 .gitignore다 — 원료 사진도 산출 카드도 리포에 안 들어간다.
//
// [입력] insta/raw/{slug}/
//   before.jpg           1장   (jpg·jpeg·png·webp 모두 허용 — 리포 안 webp 자산을 그대로 쓰려고 넓혔다)
//   after-1.jpg ~ after-N.jpg  (2~8장)
//   kit.json { episode, titleLine1, titleLine2, conceptLabel, keyword?, tagsExtra?, dmPrompt,
//              checks?: [3줄]  — 캡션의 ✅ 자리표시를 이 문구로 채운다(없으면 "(수정)" 그대로)
//              tool?: "ChatGPT·Gemini"  — 커버 보조 칩·CTA 한 줄·캡션/DM 안내에 함께 표기 }
//
// [출력] insta/out/{slug}/ — 업로드 순서대로 번호가 붙는다(01부터 그대로 올리면 된다)
//   01-cover / 02-ba / 03…-gallery(애프터 장수만큼) / …-cta / …-follow / caption.txt / dm.txt
//
// [사용법] 리포 루트에서
//   node scripts/insta-kit.mjs            # insta/raw 아래 모든 slug
//   node scripts/insta-kit.mjs voxel      # 특정 slug만
//   node scripts/insta-kit.mjs voxel --style=B   # 커버 스타일 A|B|C (기본 A, kit.json 무변경)
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
const CTA_MIN_PX = 44;                     // "글자 하한 44px 상당"

// ★2026-08-24 커버 리디자인 — 카드에서 브랜딩·AI 고지를 뺐다.
//   워드마크는 08-follow 카드가 단독으로 담당하고, AI 고지는 캡션이 담당한다.
//   앞 카드마다 로고를 박으면 광고물로 읽혀 "저장하고 싶은 무드"가 깨진다(타깃 2030 여성).
const CREAM = "#F3E7CE";                   // B안 오버라인
const LIME = "#D8FF3F";                    // C안 제목 2줄째 (형광)

// ★A안 확정(2026-08-24) — 카드 4종이 공유하는 스타일 언어.
//   커버에서만 쓰면 캐러셀을 넘길 때마다 다른 앱처럼 보인다. 배지 톤·강조 방식·
//   그라데이션 규격을 한 벌로 묶어 02-ba·CTA·팔로우까지 같은 말을 쓰게 한다.
const BADGE_FILL = "#ffffff";              // 배지 바탕 — 핑크에서 톤다운
const BADGE_TEXT = "#1A1A1A";              // 배지 글씨
const HL_FILL = "#000000", HL_OP = 0.42, HL_RX = 14;   // 강조 텍스트 뒤 하이라이트 바
// --style=A|B|C — kit.json은 손대지 않고 커버 스타일만 갈아 끼운다(재실행만으로 비교).
const STYLE = (() => {
  const f = process.argv.slice(2).find((a) => /^--style=/i.test(a));
  const v = f ? f.split("=")[1].toUpperCase() : "A";
  if (!["A", "B", "C"].includes(v)) { console.error(`★--style 은 A|B|C 중 하나 (받은 값: ${v})`); process.exit(1); }
  return v;
})();
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
  // ★스티커 아웃라인: librsvg의 paint-order 지원이 버전마다 갈려서 stroke를 못 믿는다.
  //   halo와 같은 수법으로 검정 글자를 원형으로 여러 번 깔아 굵은 테두리를 만든다.
  if (o.outline) {
    const r = o.outline;
    for (let i = 0; i < 16; i++) {
      const dx = Math.round(r * Math.cos((i / 16) * Math.PI * 2));
      const dy = Math.round(r * Math.sin((i / 16) * Math.PI * 2));
      halo += `<text x="${o.x + dx}" y="${o.y + dy}" ${a} fill="#000">${t}</text>`;
    }
  }
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
// 스타일 3안(--style=A|B|C). 공통: 애프터1 풀블리드 + 하단 그라데이션 + 제목 2줄.
// ★워드마크는 넣지 않는다(2026-08-24) — 브랜딩은 08-follow 카드 단독 담당.
// ★제목·배지는 안전영역(y 135~1215) 안에 앉힌다 — 그래서 제목 블록 아래로 여백이 남는데,
//   그건 낭비가 아니라 그리드 썸네일에서 제목이 살아남는 값이다.

// 하단 그라데이션. depth = 어둠이 시작되는 y, peak = 맨 아래 불투명도.
const gradLayer = (startY, peak, mid) => svgBuf(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="0.45" stop-color="#000" stop-opacity="${mid}"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="${peak}"/></linearGradient></defs>` +
  `<rect x="0" y="${startY}" width="${W}" height="${H - startY}" fill="url(#g)"/></svg>`);

// 알약 배지 한 벌(바탕 + 글자). variant: filled | outline
async function badge(text, o, x, y, { fill, textFill, stroke, fillOpacity }) {
  const m = await measure(text, o);
  const padX = o.size < 30 ? 20 : 30, padY = o.size < 30 ? 12 : 20;
  const w = m.w + padX * 2, h = (m.dBot - m.dTop + 1) + padY * 2;
  const pill = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(h / 2)}"` +
    ` fill="${fill}"${fillOpacity != null ? ` fill-opacity="${fillOpacity}"` : ""}${stroke ? ` stroke="${stroke}" stroke-width="2.5"` : ""}/></svg>`);
  const label = textLayer({ ...o, text, x: x + padX, y: y + padY - m.dTop, fill: textFill });
  return { pill, label, box: { x, y, w, h } };
}

// 강조 텍스트 뒤 하이라이트 바 — 잉크 상자에서 여백을 붙여 만든다.
// ★글자 크기가 아니라 '실측 잉크'로 만드는 이유: 한글은 글꼴마다 어센더가 달라
//   size 기반으로 계산하면 바가 글자를 덜 감싸거나 붕 뜬다.
function hlBar(x, baseline, m, { padX = 16, padY = 12, anchor = "start" } = {}) {
  const bx = Math.round(anchor === "middle" ? x - m.w / 2 - padX : x - padX);
  const by = Math.round(baseline + m.dTop - padY);
  const bw = Math.round(m.w + padX * 2), bh = Math.round((m.dBot - m.dTop + 1) + padY * 2);
  return {
    layer: svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${HL_RX}" fill="${HL_FILL}" fill-opacity="${HL_OP}"/></svg>`),
    box: { x: bx, y: by, w: bw, h: bh },
  };
}

// 제목 2줄 — 같은 크기로 맞춰 한 덩어리로 읽히게 한다(A·C안).
async function titlePair(kit, start, min, o) {
  const f1 = await fitSize(kit.titleLine1, MAX_TEXT_W, start, min, o);
  const f2 = await fitSize(kit.titleLine2, MAX_TEXT_W, start, min, o);
  const size = Math.min(f1.size, f2.size);
  return {
    size,
    m1: await measure(kit.titleLine1, { ...o, size }),
    m2: await measure(kit.titleLine2, { ...o, size }),
    overflow: f1.overflow || f2.overflow,
    shrunk: f1.shrunk || f2.shrunk,
  };
}

// ── 폴라로이드 인셋(A안) ──
// 흰 테두리 + 아래 라벨 자리 + 회전. 회전은 sharp가 하고, 그림자는 같은 각도의 SVG 사각형.
const POLA_ROT = -6;
async function polaroid(beforeSrc, label, photo = 272, bd = 14, strip = 58) {
  const cardW = photo + bd * 2, cardH = photo + bd + strip;
  const shot = await sharp(beforeSrc).flatten({ background: "#ffffff" })
    .resize(photo, photo, { fit: "cover", position: sharp.strategy.attention }).png().toBuffer();
  const lo = { size: 26, weight: 700, spacing: 1, anchor: "middle" };
  const lm = await measure(label, lo);
  const labelSvg = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">` +
    `<text x="${cardW / 2}" y="${photo + bd + Math.round((strip + (lm.dBot - lm.dTop)) / 2) - 2}" ` +
    `font-family="${KR_FONTS}" font-size="${lo.size}" font-weight="${lo.weight}" letter-spacing="1" ` +
    `text-anchor="middle" fill="#5A5A5A">${esc(label)}</text></svg>`);
  const card = await sharp({ create: { width: cardW, height: cardH, channels: 4, background: "#ffffff" } })
    .composite([{ input: shot, left: bd, top: bd }, { input: labelSvg, left: 0, top: 0 }])
    .png().toBuffer();
  const rotated = await sharp(card).rotate(POLA_ROT, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(rotated).metadata();
  return { rotated, w: meta.width, h: meta.height, cardW, cardH };
}

// 손그림풍 화살표 — 곡선 + 삼각 머리. 밝은 사진 위에서도 보이게 검정 밑선을 먼저 깐다.
function scribbleArrow(pts, headAngle, { color = "#fff", width = 7 } = {}) {
  const [x1, y1, cx, cy, x2, y2] = pts;
  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  const a = (headAngle * Math.PI) / 180, L = 26, S = 0.42;
  const head = [
    [x2, y2],
    [x2 - L * Math.cos(a - S), y2 - L * Math.sin(a - S)],
    [x2 - L * Math.cos(a + S), y2 - L * Math.sin(a + S)],
  ].map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" ");
  const stroke = (c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<polygon points="${head}" fill="${c}" stroke="${c}" stroke-width="${w * 0.5}" stroke-linejoin="round"/>`;
  return svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    stroke("#000", width + 5) + stroke(color, width) + `</svg>`);
}

// ══ A안 — 폴라로이드 증거형 ══
// "이 사진이 → 이렇게 됐다"를 카드 한 장에서 증명한다. 광고 문구보다 증거가 세다.
async function coverA(dst, beforeSrc, afterSrc, kit) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: gradLayer(500, 0.9, 0.42), left: 0, top: 0 }];

  // 배지 — 흰 바탕 + 검정 글씨(핑크에서 톤다운)
  const b = await badge(`픽레시피 ${kit.episode}`, { size: 40, weight: 900, spacing: 1 },
    PAD, SAFE_TOP + 16, { fill: BADGE_FILL, textFill: BADGE_TEXT });
  layers.push({ input: b.pill, left: 0, top: 0 }, { input: b.label, left: 0, top: 0 });

  // 툴 보조 칩 — 배지 바로 아래. 배지보다 한 단계 작고 톤도 낮춘다(주인공은 배지가 아니라 제목이다).
  // ★폭은 hlBar와 같은 원리로 실측 잉크에서 뽑는다 — 글자 크기로 계산하면 한글 어센더 차이로 뜬다.
  const tc = await badge(`${kit.tool}에서 바로 사용`, { size: 28, weight: 700, spacing: 0 },
    PAD, b.box.y + b.box.h + 10, { fill: "#000000", fillOpacity: 0.55, textFill: "#fff" });
  layers.push({ input: tc.pill, left: 0, top: 0 }, { input: tc.label, left: 0, top: 0 });

  // 폴라로이드 인셋 — 우상단
  const pola = await polaroid(beforeSrc, "원본");
  const px = W - PAD - pola.w + 6, py = SAFE_TOP + 30;
  const shadow = await sharp(svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect x="${px + 14}" y="${py + 20}" width="${pola.cardW}" height="${pola.cardH}" rx="6" fill="#000" fill-opacity="0.34"` +
    ` transform="rotate(${POLA_ROT} ${px + pola.cardW / 2} ${py + pola.cardH / 2})"/></svg>`)).blur(14).png().toBuffer();
  layers.push({ input: shadow, left: 0, top: 0 }, { input: pola.rotated, left: px, top: py });

  // 인셋 → 본 이미지로 향하는 화살표.
  // ★짧고 급하게, 폴라로이드 바로 아래에만 둔다 — 길게 뽑으면 인물 얼굴을 가로질러
  //   결과 사진을 훼손한다(첫 렌더에서 입술을 관통했다). 인물 사진은 대개 화면을 꽉 채워서
  //   "빈 곳으로 뻗는" 화살표는 존재하지 않는다고 보는 게 맞다.
  const ax = Math.round(px + pola.w * 0.46), ay = py + pola.h + 8;
  layers.push({ input: scribbleArrow([ax, ay, ax - 16, ay + 34, ax - 40, ay + 68], 112, { width: 6 }), left: 0, top: 0 });

  // 제목 2줄 — 1줄 흰(그림자) / 2줄 크림 옐로 + 반투명 검정 하이라이트 바
  const to = { weight: 900, spacing: -1 };
  const T = await titlePair(kit, 84, 44, to);
  if (T.overflow) fails.push(`${path.basename(dst)} 제목이 44px에서도 ${MAX_TEXT_W}px를 넘음`);
  const l2 = Math.round(SAFE_BOT - 30 - T.m2.dBot);
  const l1 = Math.round(l2 - T.size * 1.24);
  const hl = hlBar(PAD, l2, T.m2);
  layers.push({ input: hl.layer, left: 0, top: 0 });
  const t1 = textLayer({ ...to, size: T.size, text: kit.titleLine1, x: PAD, y: l1, fill: "#fff", halo: 3 });
  const t2 = textLayer({ ...to, size: T.size, text: kit.titleLine2, x: PAD, y: l2, fill: YELLOW });
  layers.push({ input: t1, left: 0, top: 0 }, { input: t2, left: 0, top: 0 });

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  const ok = safeCheck("커버 배지", b.box) && safeCheck("커버 툴 칩", tc.box);
  const b1 = await alphaBox(await png(t1.toString())), b2 = await alphaBox(await png(t2.toString()));
  const okT = safeCheck("커버 제목 1줄", b1) && safeCheck("커버 제목 2줄", b2);
  const okP = px >= 0 && px + pola.w <= W && py >= SAFE_TOP && py + pola.h <= SAFE_BOT;
  if (!okP) fails.push(`커버 폴라로이드 인셋 이탈 — (${px},${py}) ${pola.w}×${pola.h}`);
  return { line: `[A 폴라로이드] 제목 ${T.size}px${T.shrunk ? "(자동 축소)" : ""} 잉크 y ${b1.y}~${b2.y + b2.h - 1} ${okT && ok ? "OK" : "★NG"} · ` +
    `배지 흰바탕 ${b.box.w}×${b.box.h} · 툴칩 ${tc.box.w}×${tc.box.h}@y${tc.box.y} · 인셋 ${pola.w}×${pola.h}@(${px},${py}) ${POLA_ROT}° ${okP ? "OK" : "★NG"} · 하이라이트바 ${hl.box.w}×${hl.box.h}` };
}

// ══ B안 — 매거진 미니멀형 ══
// 장식을 걷고 굵기 대비만으로 승부. 광고 티가 가장 적다.
async function coverB(dst, beforeSrc, afterSrc, kit) {
  const base = await coverCrop(afterSrc, W, H);
  // ★하단 55% 구간을 더 깊게(최대 0.97) — 흰 제목만으로 버텨야 하므로 바탕을 더 눌렀다
  const layers = [{ input: gradLayer(Math.round(H * 0.45), 0.97, 0.55), left: 0, top: 0 }];

  // 배지 — 아주 작은 흰 테두리 아웃라인.
  // ★fill="none"으로 두면 밝은 사진 위에서 통째로 사라진다(첫 렌더에서 안 보였다).
  //   미니멀을 지키면서 읽히게 하려면 최소한의 어두운 받침이 필요하다.
  const b = await badge(`픽레시피 ${kit.episode}`, { size: 28, weight: 700, spacing: 2 },
    PAD, SAFE_TOP + 14, { fill: "rgba(0,0,0,0.32)", textFill: "#fff", stroke: "#ffffff" });
  layers.push({ input: b.pill, left: 0, top: 0 }, { input: b.label, left: 0, top: 0 });

  // 제목 — 1줄 가늘게·작게 / 2줄 굵게·크게 (굵기 대비)
  const o1 = { weight: 400, spacing: 0 }, o2 = { weight: 900, spacing: -1.5 };
  const f2 = await fitSize(kit.titleLine2, MAX_TEXT_W, 96, 48, o2);
  // ★0.52는 너무 작았다 — 1줄이 제목이 아니라 캡션처럼 읽혔다. 굵기 대비로 승부하려면
  //   1줄도 제목 크기여야 한다(가늘기만으로 위계가 생긴다).
  const s2 = f2.size, s1 = Math.max(44, Math.round(s2 * 0.64));
  const f1 = await fitSize(kit.titleLine1, MAX_TEXT_W, s1, 30, o1);
  const m1 = await measure(kit.titleLine1, { ...o1, size: f1.size });
  const m2 = await measure(kit.titleLine2, { ...o2, size: s2 });
  if (f1.overflow || f2.overflow) fails.push(`${path.basename(dst)} 제목이 하한에서도 ${MAX_TEXT_W}px를 넘음`);

  // 언더라인 바(4px) → 2줄 → 1줄 순서로 아래에서 쌓는다.
  // ★첫 렌더의 180px는 2줄의 첫 단어만 밑줄 친 것처럼 보였다 — 우연처럼 읽히면 장식이 아니다.
  const barY = SAFE_BOT - 34, barW = Math.min(320, Math.max(160, Math.round(m2.w * 0.42)));
  const l2 = Math.round(barY - 26 - m2.dBot);
  const l1 = Math.round(l2 + m2.dTop - 20 - m1.dBot);
  // 오버라인 — 아주 작은 크림색, 1줄 위
  const oo = { size: 32, weight: 700, spacing: 6 };
  const om = await measure("사진 한 장이면", oo);
  const ly = Math.round(l1 + m1.dTop - 26 - om.dBot);
  layers.push(
    { input: textLayer({ ...oo, text: "사진 한 장이면", x: PAD, y: ly, fill: CREAM, halo: 3 }), left: 0, top: 0 },
    { input: textLayer({ ...o1, size: f1.size, text: kit.titleLine1, x: PAD, y: l1, fill: "#fff", halo: 3 }), left: 0, top: 0 },
    { input: textLayer({ ...o2, size: s2, text: kit.titleLine2, x: PAD, y: l2, fill: "#fff", halo: 2 }), left: 0, top: 0 },
    { input: svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<rect x="${PAD}" y="${barY}" width="${barW}" height="4" rx="2" fill="${PINK}"/></svg>`), left: 0, top: 0 });

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  const ok = safeCheck("커버 배지", b.box);
  const okBar = safeCheck("커버 언더라인", { x: PAD, y: barY, w: barW, h: 4 });
  const bOver = await alphaBox(await png(textLayer({ ...oo, text: "사진 한 장이면", x: PAD, y: ly, fill: CREAM }).toString()));
  const okO = safeCheck("커버 오버라인", bOver);
  return { line: `[B 매거진] 오버라인 ${oo.size}px y${bOver.y} · 제목 ${f1.size}px(400) / ${s2}px(900) 잉크 y ${l1 + m1.dTop}~${l2 + m2.dBot} · ` +
    `언더라인 ${barW}×4 y${barY} · 그라데 45%~ 0.97 ${ok && okBar && okO ? "OK" : "★NG"}` };
}

// ══ C안 — 네온 팝형 ══
// 스티커 타이포 + 형광. 피드에서 가장 멀리서도 눈에 걸린다. 대신 톤이 세다.
async function coverC(dst, beforeSrc, afterSrc, kit) {
  const base = await coverCrop(afterSrc, W, H);
  const layers = [{ input: gradLayer(560, 0.86, 0.36), left: 0, top: 0 }];

  // 배지 — 노랑 필 + 검정 글씨, 영문
  const b = await badge(`PICK RECIPE ${kit.episode}`, { size: 36, weight: 900, spacing: 2 },
    PAD, SAFE_TOP + 16, { fill: YELLOW, textFill: "#141414" });
  layers.push({ input: b.pill, left: 0, top: 0 }, { input: b.label, left: 0, top: 0 });

  // 제목 2줄 — 굵은 검정 아웃라인. 아웃라인이 6px 번지므로 폭 예산을 그만큼 줄인다.
  const to = { weight: 900, spacing: -1 };
  const OUT = 6;
  const T = await titlePair({ ...kit }, 88, 44, to);
  if (T.overflow) fails.push(`${path.basename(dst)} 제목이 44px에서도 ${MAX_TEXT_W}px를 넘음`);
  const l2 = Math.round(SAFE_BOT - 34 - T.m2.dBot - OUT);
  const l1 = Math.round(l2 - T.size * 1.28);
  const t1 = textLayer({ ...to, size: T.size, text: kit.titleLine1, x: PAD, y: l1, fill: "#fff", outline: OUT });
  const t2 = textLayer({ ...to, size: T.size, text: kit.titleLine2, x: PAD, y: l2, fill: LIME, outline: OUT });
  layers.push({ input: t1, left: 0, top: 0 }, { input: t2, left: 0, top: 0 });

  // before 원형 썸네일 — 좌하단 + 화살표
  const R = 96, D = R * 2;
  const sq = await sharp(beforeSrc).flatten({ background: "#ffffff" })
    .resize(D, D, { fit: "cover", position: sharp.strategy.attention }).png().toBuffer();
  const mask = svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}">` +
    `<circle cx="${R}" cy="${R}" r="${R}" fill="#fff"/></svg>`);
  const circle = await sharp(sq).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  // ★좌측 + 제목 위. 첫 렌더는 우측에 놓았고 화살표가 제목 "그림이"를 관통했다 —
  //   타이포를 가로지르는 장식은 무조건 결함이다. 제목 잉크 위쪽으로 클리어런스를 계산해 앉힌다.
  const titleTop = l1 + T.m1.dTop;
  const cx = PAD, cy = Math.max(SAFE_TOP + 90, titleTop - 62 - D);
  layers.push(
    { input: svgBuf(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<circle cx="${cx + R}" cy="${cy + R}" r="${R + 5}" fill="none" stroke="#fff" stroke-width="6"/></svg>`), left: 0, top: 0 },
    { input: circle, left: cx, top: cy },
    // 원 오른쪽 아래에서 짧게 — 끝점을 제목 잉크보다 위에서 끊는다
    { input: scribbleArrow([cx + D - 26, cy + D - 18, cx + D + 26, cy + D + 4, cx + D + 62, cy + D + 26], 32, { color: LIME, width: 8 }), left: 0, top: 0 });

  await sharp(base).composite(layers).png({ compressionLevel: 9 }).toFile(dst);
  const ok = safeCheck("커버 배지", b.box);
  const b1 = await alphaBox(await png(t1.toString())), b2 = await alphaBox(await png(t2.toString()));
  const okT = safeCheck("커버 제목 1줄", b1) && safeCheck("커버 제목 2줄", b2);
  const okC = cy >= SAFE_TOP && cy + D <= SAFE_BOT && cx >= 0 && cx + D <= W;
  if (!okC) fails.push(`커버 원형 인셋 이탈 — (${cx},${cy}) ${D}×${D}`);
  return { line: `[C 네온팝] 제목 ${T.size}px 아웃라인 ${OUT}px 잉크 y ${b1.y}~${b2.y + b2.h - 1} ${okT && ok ? "OK" : "★NG"} · ` +
    `배지 노랑 ${b.box.w}×${b.box.h} · 원형인셋 ⌀${D}@(${cx},${cy}) ${okC ? "OK" : "★NG"}` };
}

const COVERS = { A: coverA, B: coverB, C: coverC };
const buildCover = (dst, beforeSrc, afterSrc, kit) => COVERS[STYLE](dst, beforeSrc, afterSrc, kit);

// ─── 02-ba ────────────────────────────────────────────────────────────────
// 상하 분할(각 1080×675) + 좌상단 "전"/"후" 칩 + 중앙 화살표.
// ★conceptLabel은 여기 화살표 아래에 넣는다: 커버는 안전영역 계산이 빡빡하고 캡션 템플릿은
//   고정이다. 화살표 옆이 이 카드에서 유일하게 비어 있는 자리이고, 무엇이 무엇으로 바뀌는지
//   말해주기에도 제일 맞는 자리다.
async function buildBA(dst, beforeSrc, afterSrc, kit) {
  const half = H / 2;                                          // 675
  const top = await bandCrop(beforeSrc, W, half);
  const bot = await bandCrop(afterSrc, W, half);

  // ★A안 배지 톤 — 커버의 "픽레시피 01"과 같은 흰 바탕·검정 글씨.
  //   검정 반투명 칩은 사진 밝기에 따라 읽힘이 흔들렸고, 무엇보다 커버와 다른 말을 썼다.
  const chip = async (label, absY) => {
    const b = await badge(label, { size: 40, weight: 900, spacing: 1 }, PAD, absY,
      { fill: BADGE_FILL, textFill: BADGE_TEXT });
    return { pill: b.pill, text: b.label, box: `${b.box.w}×${b.box.h}@(${PAD},${absY})` };
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
  // conceptLabel = 이 카드의 강조 한 줄 → 커버 2줄째와 같은 언어(하이라이트 바 + 크림 옐로)
  const lBase = cy + r + 26 + 14 - lm.dTop;
  const lHl = hlBar(cx, lBase, lm, { anchor: "middle", padX: 24 });
  const labelPill = lHl.layer;
  const labelText = textLayer({ ...lo, size: lf.size, text: kit.conceptLabel, x: cx, y: lBase, fill: YELLOW });
  const lw = lHl.box.w, lh = lHl.box.h, ly = lHl.box.y;

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
// 애프터 한 장을 꽉 채운다. 글자는 0장.
// ★워터마크("Made with MOSPIC AI")를 뺐다(2026-08-24): 결과 사진 자체가 유일한 주인공이고,
//   AI 고지는 캡션이 담당한다. 게이트도 같이 뺐다 — 검사할 대상이 없어졌다.
async function buildGallery(dst, src) {
  const base = await coverCrop(src, W, H);
  await sharp(base).png({ compressionLevel: 9 }).toFile(dst);
  // 글자 0 = 안전영역·헤일로 검사 대상이 없다. 규격은 공통 verify()가 본다.
  return { line: "풀블리드 · 글자 0(워터마크 제거)" };
}

// ─── …-cta ────────────────────────────────────────────────────────────────
// 어두운 단색 + 가운데 정렬 3줄 + 하단 안내 한 줄.
// ★행동 줄(①②)만 노란색이다: 이 카드에서 사람이 실제로 해야 하는 일은 그 한 줄뿐이라
//   색을 거기 하나에만 쓴다. 강조를 두 군데 이상 주면 강조가 아니게 된다.
async function buildCTA(dst, kit) {
  const L = [
    { text: `'${kit.titleLine2}' 레시피 받는 법`, start: 64, weight: 900, fill: "#fff", op: 1 },
    // ★행동 줄 바로 위 — "레시피"가 뭘 하는 물건인지 여기서 한 번 말해준다
    { text: `${kit.tool}에 붙여넣기만 하면 끝`, start: 56, weight: 400, fill: "#fff", op: 0.86 },
    { text: `① 팔로우  ② 댓글에 '${kit.keyword}'`, start: 52, weight: 900, fill: YELLOW, op: 1, hl: true },
    { text: "정리된 레시피를 DM으로 보내드려요", start: 48, weight: 400, fill: "#fff", op: 0.86 },
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
  // ★줄 수에서 간격을 만든다 — 손으로 두 칸만 두면 줄이 늘었을 때 gaps[i] ?? 0 이 0이 되어
  //   마지막 두 줄이 겹친다(툴 줄을 넣으면서 실제로 걸릴 뻔한 자리다).
  const gaps = fitted.slice(0, -1).map((f) => Math.round(f.size * 0.95));
  const inkH = fitted.map((f) => f.m.dBot - f.m.dTop + 1);
  const blockH = inkH.reduce((a, b) => a + b, 0) + gaps[0] + gaps[1];
  let inkTop = Math.round(620 - blockH / 2);

  const layers = [];
  const report = [];
  for (let i = 0; i < fitted.length; i++) {
    const f = fitted[i];
    const baseline = inkTop - f.m.dTop;
    // ★행동 줄(②)에만 하이라이트 바 — 커버 2줄째와 같은 언어.
    //   이 카드에서 사람이 실제로 해야 하는 일은 그 한 줄뿐이라 강조도 거기 하나뿐이다.
    if (f.hl) layers.push(hlBar(W / 2, baseline, f.m, { anchor: "middle", padX: 22 }).layer);
    layers.push(textLayer({ ...f.o, size: f.size, text: f.text, x: W / 2, y: baseline, fill: f.fill, opacity: f.op }));
    report.push(`${f.size}px`);
    inkTop += inkH[i] + (gaps[i] ?? 0);
  }

  // ★시리즈 배지 — 커버와 같은 흰 바탕·검정 글씨. 단색 카드라 여기만 시리즈 표식이 없었다.
  const cb = await badge(`픽레시피 ${kit.episode}`, { size: 34, weight: 900, spacing: 1 },
    PAD, SAFE_TOP + 20, { fill: BADGE_FILL, textFill: BADGE_TEXT });
  layers.unshift(cb.pill, cb.label);
  safeCheck("CTA 배지", cb.box);

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
  // ★그라데이션도 공용 헬퍼로 — 같은 수식이 두 곳에 살면 한쪽만 고쳐지는 날이 온다
  const gTop = Math.round(H * 0.4);                             // 아래 60%
  const grad = gradLayer(gTop, 0.92, 0.55);

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

  // ★안내 줄 = 이 카드에서 사람이 해야 하는 유일한 일(팔로우) → CTA 카드와 같은 규칙으로
  //   하이라이트 바를 깐다. 0.55 불투명도로는 실제로 잘 안 읽혔다 — 바를 깔면서 1.0으로 올린다.
  const noteBase = Math.round(noteInkBot - nm.dBot);
  const nHl = hlBar(W / 2, noteBase, nm, { anchor: "middle", padX: 22, padY: 10 });

  await sharp(base).composite([
    { input: grad, left: 0, top: 0 },
    { input: textLayer({ ...markO, text: "MOSPIC", x: W / 2, y: Math.round(markInkBot - mm.dBot), fill: "#fff", halo: 3 }), left: 0, top: 0 },
    { input: textLayer({ ...tagO, text: TAGLINE, x: W / 2, y: Math.round(tagInkBot - tm.dBot), fill: "#fff", opacity: 0.7, halo: 2 }), left: 0, top: 0 },
    { input: nHl.layer, left: 0, top: 0 },
    { input: textLayer({ ...noteO, text: noteText, x: W / 2, y: noteBase, fill: "#fff", halo: 2 }), left: 0, top: 0 },
  ]).png({ compressionLevel: 9 }).toFile(dst);

  safeCheck("팔로우 안내 바", nHl.box);
  return { line: `워드마크 ${markF.size}px 잉크바닥 y${markInkBot} · 태그라인 46px y${tagInkBot} · 안내 36px y${noteInkBot} + 하이라이트바 ${nHl.box.w}×${nHl.box.h} · 그라데이션 y${gTop}~${H}(하단 60%)` };
}

// ─── caption.txt / dm.txt ─────────────────────────────────────────────────
// ✅ 3줄은 자리표시다 — MJ가 컨셉마다 손으로 고치는 자리. 그럴듯한 문장을 지어 넣으면
// 안 고치고 그대로 올라간다. 그래서 일부러 "(수정)" 표시를 남겨둔다.
function buildCaption(kit) {
  const tags = ["#AI사진", "#프롬프트", "#aiart", "#aiphoto", ...kit.tagsExtra];
  // checks 가 있으면 그 문구로, 없으면 "(수정)" 자리표시 그대로.
  // ★자리표시를 그럴듯한 문장으로 자동 생성하지 않는 이유는 그대로다 — 안 고치고 그대로 올라간다.
  const checkLines = kit.checks.length
    ? kit.checks.map((c) => `✅ ${c}`)
    : ["✅ (수정) 이 컨셉의 핵심 한 줄",
       "✅ (수정) 사진 고를 때 챙길 것 한 줄",
       "✅ (수정) 결과가 잘 나온 조건 한 줄"];
  return [
    "일단 저장부터 해두세요 📌",
    "",
    `[픽레시피 ${kit.episode} — ${kit.titleLine2}]`,
    `🛠 ${kit.tool}에서 바로 쓸 수 있어요`,
    "",
    ...checkLines,
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
    `아래 전체를 복사해서 ${kit.tool}에 사진과 함께 넣어주세요.`,
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
    // ★캡션의 ✅ 자리표시를 대신할 3줄. 없으면 빈 배열 → "(수정)" 표시가 그대로 남는다.
    //   빈 문자열은 걸러낸다 — 빈 ✅ 줄이 올라가는 건 자리표시보다 나쁘다.
    checks: (Array.isArray(raw.checks) ? raw.checks : []).map((s) => String(s).trim()).filter(Boolean),
    // ★프롬프트를 어디에 붙여넣는지. 이 말이 없으면 "레시피"가 뭔지 모르는 사람은 그냥 지나간다.
    tool: String(raw.tool ?? "ChatGPT·Gemini").trim(),
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
    // ★checks 는 kit.json 원문으로도 한 번 더 본다 — 캡션 줄 번호만 알려주면
    //   정작 고쳐야 할 파일(kit.json)을 못 찾는다.
    violations.push(...lint(slug, "kit.json(checks)", job.kit.checks.join("\n")),
      ...lint(slug, "caption.txt", job.caption), ...lint(slug, "dm.txt", job.dm));
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
    console.log(`\n■ ${slug} — 애프터 ${N}장 · 카드 ${N + 4}장 · 커버 스타일 ${STYLE}`);
    console.log(`  입력: ${path.basename(job.before)} + ${job.afterNames.join(", ")}`);

    let f = p("cover");     console.log(`  01-cover   ${(await buildCover(f, job.before, afters[0], kit)).line}`); await verify(f);
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
