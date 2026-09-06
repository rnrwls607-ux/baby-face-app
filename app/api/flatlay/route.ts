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

const FLATLAY_PROMPT = `You are a top e-commerce flat-lay stylist and photographer. Take this
casual top-down photo of several products and create ONE polished
FLAT-LAY PRODUCT PHOTO of the EXACT same set of products — neatly
arranged, beautifully lit, shot straight down — for a shop's hero image
or an Instagram seller feed.

STEP 1 — Inventory first:
Count every item in the photo and note each one's type, exact colors,
shape, size relative to the others, material, and any label, mark, or
text on it. The output must contain exactly this set — the same COUNT,
the same items.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME ITEMS, SAME COUNT: every item appears exactly once. Do NOT add,
   remove, duplicate, or swap any item. Do NOT add extra products,
   samples, or filler pieces.
2. TEXT & LOGOS: keep every letter, word, number, logo, and mark on each
   item EXACTLY as in the original — same spelling, font, position, size.
   Do NOT redraw, invent, blur, translate, or remove any. If an item has
   no text, it stays with no text.
3. TRUE COLOR & SHAPE: reproduce each item's real colors, proportions,
   material, and finish exactly. No hue shift, no saturation boost, no
   reshaping, no "prettier" version.
4. NO NEW TEXT ANYWHERE: background, paper, fabric, props, and every
   surface must be BARE — no readable or illegible text, letters,
   numbers, logos, or signage on anything except the products' own
   original labels. Even illegible text shapes are a failure.

CLEAN UP (be bold here):
- Erase dust, lint, fingerprints, and smudges that are handling, not
  product. Remove crumbs, cables, bed sheets, floor grain, and all
  original clutter — the original surface is replaced entirely.
- Gently unfold, flatten, or straighten fabric and packaging so each
  item is presented cleanly, without changing what it is.

THE ARRANGEMENT — style it like a professional flat lay:
- Perfect top-down (90°) camera, everything flat on one plane.
- A balanced composition: items spaced evenly with breathing room, no
  overlapping that hides any item or label, aligned along a clean
  invisible grid or a gentle diagonal flow, the largest item anchoring
  the layout and the rest arranged in a pleasing rhythm.
- Every label faces up and is fully readable as in the source.
- Background: choose ONE clean surface that flatters the set — soft
  ivory linen, pale oak wood, matte pastel paper, or light concrete —
  plain, seamless, and free of any pattern with text.
- Optional: at most ONE small, plain, unbranded, textless accent (a
  sprig of dried grass, a ribbon, a blank card kept completely blank)
  placed in negative space, never touching or hiding any product.

LIGHTING & CAMERA:
- Bright, soft, even overhead daylight with a subtle directional
  quality — gentle, short, realistic contact shadows under each item
  (never long harsh shadows, never floating).
- Shot on a 50mm lens straight down: every item tack-sharp edge to edge,
  accurate white balance, clean bright color grade — vivid but
  true-to-life.

FRAMING — vertical 3:4, the whole set fully inside the frame with
comfortable margins, nothing cropped, nothing cut at the edges.

FINAL SELF-CHECK before output:
- Same number of items as the source, each exactly once?
- Every label, logo, and text IDENTICAL to the source; nothing invented?
- Each item's color, shape, size, and material exactly as the source?
- Is the background and any accent completely free of text or text-like
  shapes?
- Truly top-down, evenly spaced, no item hidden or overlapping?

ABSOLUTELY AVOID:
- Any added, missing, duplicated, or swapped item.
- Any altered, invented, or removed text or logo on a product.
- Any text, letters, numbers, or brand marks on the background, paper,
  fabric, card, or accent.
- Tilted or perspective camera angles; overlapping piles; cluttered or
  trendy-overdesigned styling; more than one accent.
- Plastic, CGI, or 3D-render look; harsh glare; floating items without
  contact shadows.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution flat-lay product photo
— the exact same products, beautifully arranged. No added text, no
watermark, no border.
`;

async function generateFlatlay(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", FLATLAY_PROMPT);
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
  console.log(`[flatlay] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[flatlay] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateFlatlay(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("flatlay error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("flatlay", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
