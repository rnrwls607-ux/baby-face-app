import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const PRODUCT360_PROMPT = `You are a top e-commerce product photographer and technical illustrator.
Take this casual photo of ONE product and create ONE multi-view
PRODUCT SPEC SHEET: the EXACT same product shown from four standard
angles — FRONT, SIDE, BACK, and TOP — arranged in a clean 2×2 grid on a
single white canvas, as if photographed on a turntable in a studio.

STEP 1 — Read the product first:
Identify the product type, its exact colors and finish, materials,
proportions, every construction detail (soles, seams, straps, zippers,
lids, handles, buttons, ports), and every label, mark, or text that is
VISIBLE in the source and on which surface it sits. Note which faces of
the product are visible in the source and which are not.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME PRODUCT IN ALL FOUR VIEWS: identical shape, proportions,
   colors, materials, and details across the grid — the four views must
   clearly be one object rotated, at the same scale.
2. VISIBLE FACES ARE FAITHFUL: any face visible in the source is
   reproduced exactly — same label, text, logo, mark, stitching, and
   color, in the same place and size. Do NOT redraw, invent, blur, or
   remove any text that exists in the source.
3. UNSEEN FACES ARE INFERRED, NEVER INVENTED WITH TEXT: for faces not
   visible in the source (usually back or top), continue the product's
   real shape, materials, and design language plausibly — but render
   those surfaces PLAIN, with NO text, NO logo, NO label, NO added
   marks. If a label plausibly wraps around, stop it where the source
   evidence ends.
4. TRUE COLOR & SHAPE: no hue shift, no saturation boost, no slimming or
   reshaping. Only correct an obvious color cast from the source
   lighting to reveal the TRUE color.
5. NO NEW TEXT ANYWHERE: no captions, view labels ("FRONT"), arrows,
   dimensions, numbers, or grid annotations; the canvas and background
   are BARE. Even illegible text shapes are a failure.

CLEAN UP (be bold here):
- Remove the original surroundings entirely (floor, counter, hooks,
  clutter, hands). Erase dust, fingerprints, lint, and temporary
  creases; keep intentional texture and wear that is part of the
  product.

THE GRID LAYOUT (critical — geometry anchors):
- One vertical 3:4 canvas, pure white seamless background.
- A 2×2 grid: TOP-LEFT = FRONT view (straight-on, the product's main
  face), TOP-RIGHT = SIDE view (a true 90° profile of the side that is
  most visible in the source), BOTTOM-LEFT = BACK view (straight-on rear),
  BOTTOM-RIGHT = TOP view (looking straight down).
- All four renderings at the SAME scale, each centered in its cell,
  with equal margins so no view touches another or the canvas edge.
  Each product occupies roughly 70–80% of its cell width.
- Orthographic-like presentation: minimal perspective, straight verticals,
  no dramatic angles.
- No dividing lines, frames, or labels between cells — just even white
  space.

LIGHTING & CAMERA:
- Identical soft, even, bright studio lighting in all four cells, with a
  faint soft contact shadow beneath the front, side, and back views (the
  top view gets a subtle ambient shadow halo).
- Sharp focus edge to edge; accurate white balance; clean commercial
  color grade.

FINAL SELF-CHECK before output:
- Four views, 2×2, in the order FRONT / SIDE / BACK / TOP, same scale,
  same lighting, none overlapping or cropped?
- Is the product identical across all four — same colors, details,
  proportions?
- Visible-face labels and text exactly as the source; unseen faces
  plain with ZERO invented text?
- No captions, arrows, numbers, grid lines, or any text on the canvas?
- Does it read as real studio photography, not CGI?

ABSOLUTELY AVOID:
- Four different products, inconsistent colors or details, different
  scales between cells.
- Invented text, logos, or labels on unseen faces; altered or missing
  text on visible faces.
- View labels, dimension lines, arrows, numbers, watermarks, borders,
  or grid lines.
- Dramatic perspective, overlapping views, a cropped cell.
- Plastic, CGI, or 3D-render look; floating products with no shadow.

Output: one ultra-photorealistic, high-resolution 2×2 product spec sheet
— the exact same product from the front, side, back, and top on a white
canvas. No text, no watermark, no border.
`;

async function generateProduct360(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", PRODUCT360_PROMPT);
  form.append("size", "auto"); // ★원본 비율 보존 — 모델이 입력 비율에 맞춰 선택
  form.append("quality", "medium");
  form.append("n", "1");
  const bytes = new Uint8Array(Buffer.from(img.data, "base64"));
  form.append("image[]", new Blob([bytes], { type: img.mimeType }), "photo.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: form,
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[product360] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[product360] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음 — 프롬프트가 원본 포즈·배경 유지를 요구하므로 입력 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateProduct360(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("product360 error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("product360", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
