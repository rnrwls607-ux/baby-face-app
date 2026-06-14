import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateProduct(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a world-class e-commerce product photographer and retoucher. Transform this casual product photo into a clean, premium online-store product image that makes shoppers trust it and want to buy.

FIRST, identify the product type, then apply the treatment that best sells THAT kind of product:
- Clothing/fashion: smooth out wrinkles, show fabric texture and true color, natural drape.
- Cosmetics/bottles: glossy or matte finish as-is, crisp label text, elegant soft reflections.
- Electronics/gadgets: sleek clean surfaces, sharp edges, remove fingerprints and dust.
- Food packaging/drinks: vivid packaging color, crisp label, fresh appealing look.
- Jewelry/accessories/small items: sparkle and material shine, fine detail, tasteful macro feel.
- Home goods/furniture: show material (wood grain, fabric, ceramic) and true proportions.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. TEXT & LOGOS: Keep every letter, word, number, logo, and label EXACTLY as in the original — same spelling, same font, same position, same size. Do NOT redraw, translate, sharpen-into-different-letters, invent, blur, or remove any text. If text is small, keep it pixel-faithful rather than regenerating it. Brand identity must be untouched.
2. TRUE COLOR: Reproduce the product's real colors EXACTLY as in the original. Do NOT shift hue, boost saturation, or make colors "prettier" — a shopper must receive the exact color they see. Only fix obvious lighting color-cast (e.g. yellow room light) to reveal the product's TRUE color, never to change it.
3. REAL SHAPE & FEATURES: Preserve the exact shape, proportions, and real material features — fabric weave, leather grain, intentional distressing, stitching, natural texture. These are NOT flaws. Do NOT smooth them away, slim, stretch, or reshape the product.

=== CLEAN UP ONLY THESE (be bold here) ===
- Erase things that are clearly dirt or handling, NOT part of the product: dust, fingerprints, smudges, lint, stray threads, temporary creases from folding.
- Remove distractions around the product: background clutter, hands, price tags, stray cables, room reflections.
- Straighten a tilted photo to an upright, flattering angle — WITHOUT changing the product's real proportions.

PRO PRODUCT-PHOTOGRAPHY TREATMENT:
- Background: place the product on a clean, seamless studio background — pure white for a marketplace look, or a soft neutral/complementary tone that makes the product's own colors pop. Keep it naturally grounded with a soft, realistic contact shadow directly beneath the product (no floating, no fake or oddly-angled shadows).
- Camera & lighting: render as if shot on a 100mm product lens with crisp focus across the product; bright, even, soft studio lighting at ~5500K; recover shadow/highlight detail; remove harsh glare and blown-out spots.
- Material fidelity: keep glossy glossy, matte matte, transparent clear — faithful texture and micro-detail, never turning real material into plastic or CGI.

FINAL LOOK: ultra-photorealistic, high-resolution commercial product photography — clean, crisp, premium, and trustworthy. The product itself (text, color, shape, material) must look IDENTICAL to reality; only the background, lighting, cleanliness, and framing are improved. NO cartoon, plastic, CGI, or fake look; no invented reflections; no altered branding; no text overlay, no watermark, no border.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[product] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  return `data:image/png;base64,${b64}`;
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateProduct(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("product error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}