import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePet(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PET'S IDENTITY IS UNTOUCHABLE — the output must show the EXACT same animal as the input: the same species and breed, the same size class and head shape for that breed, the same fur color, pattern, and length, the same unique markings in the same places, the same eye color, the same ear shape and posture, the same face. The owner must instantly recognize their own pet — never a different animal, never a generic stock animal of the same breed, and never a different individual. Do NOT invent new markings, patches, or eye colors that are not in the source.
2. COMPOSITION — the output is ALWAYS the fixed ID-photo framing described below, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up of the pet's face comes out as the standard head-and-shoulders ID composition.

Create a funny and adorable professional ID/passport-style headshot of the PET (dog or cat) shown in the photo, as if the pet were a person taking an employee ID photo.

HOW TO USE THE INPUT PHOTO
- The input is a reference for the PET'S IDENTITY ONLY. Ignore its framing, zoom, background, lighting, and any accessories — the suit below replaces them.
- Render the fur in its TRUE color under neutral studio light — warm/yellow tints from the source lighting must not become the fur's actual color.

OUTFIT (the fun — built on top of the identity):
- Dress the pet in a tiny formal business suit — a small black blazer with a white dress shirt collar, fitted naturally around the pet's neck and shoulders, as if wearing a real little suit. Cute and believable, not pasted on.
- The suit must fit the pet's real body naturally and comfortably — never distorted anatomy, never a humanized body; this is the real pet wearing a tiny suit. The face and head markings stay fully visible.

COMPOSITION (fixed ID-photo framing):
- Front-facing, the pet looking straight toward the camera.
- Head and upper body (shoulders) centered in the frame, with a small even margin above the head (ears and the top of the head never cropped).
- Calm, neutral, cute expression. Mouth closed or gently relaxed.
- Vertical portrait orientation.

BACKGROUND: a clean, perfectly uniform solid light background (soft white or light blue), flat with NO gradient, NO texture, NO objects.

LIGHTING & SHADOWS: soft even studio lighting. NO shadow cast on the background behind the pet. Background stays flat and evenly lit.

QUALITY: photorealistic, sharp focus, natural realistic fur texture with fine detail, high-resolution studio photo. The suit looks real, the pet looks real.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY baby in a suit!" — same breed, same markings, same eyes, same size impression. If it reads as a different or generic animal, the result is wrong.

DO NOT INCLUDE: no text, no watermark, no logo, no border, no human, no extra props, no shadow on background. Remember the two absolute rules: the SAME pet, inside the SAME fixed ID composition.`;
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
      "pet"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[pet] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "pet"));
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
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 반려동물 증명사진: 3.5:4.5 비율로 크롭 (증명사진 규격)
  return await cropToRatio(dataUrl, 3.5, 4.5);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePet(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("pet error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("pet", 0, handler); // COIN_DORMANT: 실가격 3
