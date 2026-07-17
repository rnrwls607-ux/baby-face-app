import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFashion(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the master retoucher and fashion photographer of Seoul's most famous premium studio, shooting a brand lookbook. Transform this casual outfit photo into a polished fashion-lookbook editorial image — the outfit stays EXACTLY as it is; the person and the photo become their most stunning version.

STEP 1 — Read the photo first:
Note the person's gender, hair, skin tone, facial features, whether they are WEARING GLASSES — and every detail of their outfit and pose.

OUTFIT LOCK — the clothes are the product (highest priority):
- Keep the EXACT same clothing: every garment, color, pattern, layer, shoe, and accessory must stay identical. Do NOT redesign, recolor, swap, add, or remove any item.
- Keep the same pose and the same framing so the FULL outfit remains visible exactly as shot.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color, with clean clear lenses. Do NOT remove or swap them.
- IF not wearing glasses: do not add glasses or sunglasses.
- Never two pairs, never duplicated eyewear anywhere in the frame.

THE RETOUCH CONTRACT:
- The result must be recognizable as the same person — friends know them instantly.
- BUT this is a professionally RETOUCHED lookbook: visibly enhance the face and skin. Their reaction: "I look like a real model wearing my own clothes."

FACE RETOUCHING (premium Korean studio standard, applied to the face only — never the outfit or body proportions):
- A subtly smaller, more refined face: a soft elegant jawline, brighter subtly larger-looking eyes, a refined nose, lifted youthful contours — blended into ONE natural harmonious face, never warped.

SKIN — flawless glass skin: poreless-smooth, even-toned, luminous with a dewy glow; blemishes, redness, and dark circles removed; alive and healthy, never plastic.

BEAUTY DIRECTION — modern Korean, youthful: TODAY's young Korean celebrity aesthetic, subtly younger than the input, never older. Hair: their own hairstyle, polished and styled beautifully with natural movement — not a different cut.

RELIGHT COMPLETELY:
- Discard the original lighting. Re-light with professional fashion-editorial lighting: soft, flattering light on the face and rich, accurate light on the fabrics — true colors, crisp textile texture. The face always bright and luminous.

THE SCENE — editorial backdrop swap:
- Replace the messy or ordinary background with a clean editorial setting that complements the outfit: studio seamless paper in a flattering tone, a minimal architectural wall, or a softly blurred upscale street.

FINAL LOOK:
- Photorealistic, high-resolution brand-lookbook photography — magazine-grade color, crisp detail on the clothing, creamy background separation.

ABSOLUTELY AVOID:
- Changing, recoloring, or restyling ANY clothing item, shoe, or accessory; changing the pose or cropping the outfit.
- Removing/adding/duplicating glasses. No sunglasses added.
- A warped or uncanny face; making them unrecognizable; aging them.
- Plastic waxy skin, murky lighting, oversaturated HDR.
- Any readable text, letters, logos (beyond what is already printed on the actual clothing), watermark, or border.
- Other people in the frame, distorted hands.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
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
      },
      "fashion"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[fashion] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "fashion"));
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
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateFashion(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fashion error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}