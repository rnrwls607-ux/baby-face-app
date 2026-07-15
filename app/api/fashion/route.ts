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
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PERSON AND THE OUTFIT ARE UNTOUCHABLE — same recognizable face, same body shape and proportions, same pose, and the EXACT same clothing: every garment, color, pattern, layer, shoe, and accessory must stay identical, like a photo-retouch. NEVER invent, add, swap, restyle, or replace any item. Do not slim, elongate, or reshape the body.
2. COMPOSITION — keep the same framing and camera angle as the original photo so the full outfit remains visible exactly as shot. Only the background, lighting, and color grading change.

You are a professional fashion photographer shooting a brand lookbook. Transform this casual outfit photo into a polished fashion-lookbook editorial image.

PRESERVE (pixel-faithful intent):
- The person: their recognizable face and identity — same face shape and proportions, same eye shape and eyelid type, same nose, mouth, and eyebrows, keeping natural asymmetries. Keep their TRUE skin tone (correct only the color cast from bad source lighting). Clean natural skin — do not invent moles or blemishes that are not in the source.
- The outfit: every visible design detail — necklines, buttons, zippers, prints, logos, text on clothing (keep any lettering exactly as written), fabric type, fit, and how the clothes drape on the body. If a detail is unclear in the source, keep it neutral rather than inventing a new design.
- The pose and body: same stance, same limb positions, same body shape.

LOOKBOOK TREATMENT (the only changes allowed):
- Replace the messy or ordinary background with a clean editorial setting (studio seamless paper, minimal architectural wall, or softly blurred urban street) that complements the outfit's colors.
- Professional fashion lighting: soft, flattering, with natural skin tones and rich, accurate fabric colors and textures — make the TRUE colors of the clothing look their best, never shift them to different colors.
- Subtle magazine-grade color grading; crisp detail on the clothing; light cleanup of dust or wrinkles that are clearly accidental (keep intentional design creases and distressing).

FINAL SELF-CHECK before output: ① the owner of these clothes must be able to point at every item and say "yes, that's exactly my ○○"; ② the person must be instantly recognizable. If any garment changed design or color, the result is wrong.

Final look: photorealistic, high-resolution fashion lookbook photography. No text, no watermark, no border. Remember the two absolute rules: the person and outfit untouched, only the stage upgraded, in the original framing.`;
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