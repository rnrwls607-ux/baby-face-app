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

const PRODUCTSCENE_PROMPT = `You are a world-class e-commerce lifestyle photographer and retoucher.
Take this casual photo of a product and create ONE polished LIFESTYLE
SCENE PHOTO of the EXACT same product — as if it were photographed by a
brand's creative team for a product detail page or magazine feature.

STEP 1 — Read the product first:
Identify what it is (skincare, beverage, food package, shoes, bag,
accessory, home goods, electronics, stationery, etc.), its exact colors,
materials, proportions, and every visible label, mark, and text. Then
choose the lifestyle scene below that sells THAT kind of product.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. TEXT & LOGOS: keep every letter, word, number, logo, symbol, and label
   EXACTLY as in the original — same spelling, same font, same position,
   same size, same colors. Do NOT redraw, translate, sharpen into
   different letters, invent, blur, or remove any text. If text is small,
   keep it pixel-faithful rather than regenerating it. If the label has
   no text, keep it with no text.
2. TRUE COLOR: reproduce the product's real colors EXACTLY. Do NOT shift
   hue, boost saturation, or make colors prettier. Only correct an obvious
   color cast from the source lighting to reveal the TRUE color.
3. REAL SHAPE, SIZE & MATERIAL: preserve the exact shape, proportions,
   cap/closure, seams, stitching, texture, finish (glossy stays glossy,
   matte stays matte, transparent stays clear, frosted stays frosted).
   Never slim, stretch, reshape, or "improve" the product.
4. ONE PRODUCT, AS-IS: do not add a second unit, a variant, an open
   version, or contents that were not visible. Do not add a shadow-double
   or a reflection copy of the product.
5. NO NEW TEXT ANYWHERE: every background surface, prop, package, book,
   cup, board, and wall must be BARE — no readable or illegible text,
   letters, numbers, logos, brand marks, or signage may appear on anything
   except the product's own original label, which is preserved exactly.
   Even illegible text shapes on props or backgrounds are a failure.

CLEAN UP ONLY THESE (be bold here):
- Erase dust, fingerprints, smudges, lint, stray threads, and temporary
  creases that are clearly handling, not part of the product.
- Remove the original messy surroundings entirely: clutter, cables,
  hands, tissue boxes, chargers, dish racks, room reflections.
- Straighten a tilted photo to an upright, flattering angle without
  changing the product's real proportions.

THE SCENE — build a warm, minimal lifestyle set around the product,
chosen by category (pick ONE, keep it calm and uncluttered):
- Skincare / cosmetics: a pale oak or marble tabletop by a window, soft
  ivory linen cloth, a small ceramic dish or a single stem of dried
  grass, gentle morning light with a soft window shadow.
- Beverage / food package: a light wooden cafe table or kitchen counter,
  a folded linen napkin, a plain ceramic cup or a few coffee beans or
  fruit slices that match the product, bright airy daylight.
- Shoes / bags / accessories: a clean concrete or light wood floor, a
  plain textured wall, a hint of a plant leaf or a woven basket, natural
  side light with a soft shadow.
- Home goods / stationery / electronics: a tidy desk or shelf with a
  plain notebook (blank cover), a small potted plant, and soft daylight.
- Props are FEW (at most two), plain, unbranded, blank, and placed so
  they never overlap or hide any part of the product or its label.

LIGHTING & CAMERA:
- Soft, bright, directional natural window light with gentle, realistic
  soft shadows and subtle contact shadow grounding the product — no harsh
  glare, no blown-out spots, no dark murk.
- Shot on a 100mm product lens: the product tack-sharp from edge to
  edge, the background and props falling into a gentle, creamy blur.
- Balanced exposure, accurate white balance, clean magazine-grade color
  grade — vivid but true-to-life.

FRAMING — vertical 3:4, the product large and centered as the clear
hero, comfortable margins on every side, nothing cropped.

FINAL SELF-CHECK before output:
- Is every letter, logo, and mark on the product IDENTICAL to the source
  — same spelling, same font, same position?
- Are the product's color, shape, size, and material exactly as the
  source — not prettier, not slimmer, not shinier?
- Exactly ONE product, with no invented duplicates or contents?
- Is every prop, surface, and background completely free of any text or
  text-like shapes?
- Does it read as a real photograph of a real object on a real table?

ABSOLUTELY AVOID:
- Any altered, invented, translated, blurred, or missing text or logo on
  the product.
- Any color shift, saturation boost, or reshaping of the product.
- Any text, letters, numbers, logos, or brand marks on props, packaging,
  cups, books, walls, or anywhere in the background.
- Busy, cluttered, or trendy-overdesigned sets; more than two props;
  props touching or hiding the product.
- Plastic, CGI, 3D-render, or fake-perfect look; invented reflections;
  floating product without a contact shadow.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution lifestyle product photo
— the exact same product, beautifully staged. No added text, no
watermark, no border.
`;

async function generateProductscene(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", PRODUCTSCENE_PROMPT);
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
  console.log(`[productscene] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[productscene] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateProductscene(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("productscene error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("productscene", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
