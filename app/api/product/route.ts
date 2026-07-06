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
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PRODUCT IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The shopper must receive exactly what this photo shows: ① every letter, word, number, logo, and label EXACTLY as in the original — same spelling, same font, same position, same size; if text is small, keep it pixel-faithful rather than regenerating it; ② the product's REAL colors exactly (fix only the lighting color-cast, never "prettify" the color); ③ the exact shape, proportions, part count, and real material features — fabric weave, leather grain, stitching, intentional distressing are NOT flaws. NEVER redraw, translate, invent, remove, reshape, slim, or stretch anything on the product. If a detail is unclear in the source, keep it neutral and faithful — never invent a new design.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, white balance, sharpness, removal of dust/fingerprints/clutter, straightening the camera tilt, and the background/surface. Work boldly here — and only here.

You are a world-class e-commerce product photographer and retoucher. Transform this casual product photo into a clean, premium online-store product image that makes shoppers trust it and want to buy — because the photo matching reality is exactly what earns that trust.

FIRST, identify the product type, then apply the treatment that best presents THAT kind of product (never changing the product itself):
- Clothing/fashion: smooth out accidental fold wrinkles (keep intentional design creases), show true fabric texture and color, natural drape.
- Cosmetics/bottles: keep glossy or matte finish as-is, crisp label text, elegant soft reflections.
- Electronics/gadgets: sleek clean surfaces, sharp edges, remove fingerprints and dust.
- Food packaging/drinks: vivid TRUE packaging color, crisp label, fresh appealing look.
- Jewelry/accessories: sparkle and material shine, fine detail, tasteful macro feel.
- Home goods/furniture: show real material (wood grain, fabric, ceramic) and true proportions.

CLEAN UP ONLY THESE (bold, identity-safe):
- Erase what is clearly dirt or handling, NOT part of the product: dust, fingerprints, smudges, lint, stray threads, temporary creases from folding or shipping.
- Remove distractions around the product: background clutter, hands, price tags, stray cables, room reflections.
- Straighten a tilted photo to an upright, flattering angle — WITHOUT changing the product's real proportions or perspective identity.

PRO PRODUCT-PHOTOGRAPHY TREATMENT:
- Background: a clean, seamless studio background — pure white for a marketplace look, or a soft light neutral tone that makes the product's own colors pop. Grounded with a soft, realistic contact shadow directly beneath the product (no floating, no fake angled shadows).
- Camera & lighting: as if shot on a 100mm product lens with crisp focus across the product; bright, even, soft studio lighting at ~5500K; recover shadow/highlight detail; remove harsh glare and blown-out spots.
- Material fidelity: glossy stays glossy, matte stays matte, transparent stays clear — faithful texture and micro-detail, never turning real material into plastic or CGI.

FINAL SELF-CHECK before output: the seller must say "that's exactly my product," and a buyer comparing photo to delivery must find zero differences — same text, same color, same shape, same parts. If any of those changed, the result is wrong.

FINAL LOOK: ultra-photorealistic, high-resolution commercial product photography — clean, crisp, premium, trustworthy. The product itself (text, color, shape, material, part count) IDENTICAL to reality; only background, lighting, cleanliness, and framing improved. No invented reflections, no altered branding, no text overlay, no watermark, no border. Remember the two absolute rules: the SAME product, only the photography improved.`;
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