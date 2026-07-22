import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 150; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetmemorial(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
You are creating a serene memorial portrait of the beloved pet in the input photo — a "rainbow bridge" tribute. The pet is at peace in a warm, gentle heavenly meadow of soft light and clouds: healthy, comfortable, and calm, as if to tell the family "I'm doing well here." This portrait will be framed and treasured by a grieving family — it must be beautiful, dignified, and unmistakably THEIR pet.

PET IDENTITY (absolute — more sacred here than anywhere else):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. Every unique detail the family remembers must be preserved.
- Show the pet HEALTHY and at ease — a gentle restoration to its bright-eyed, well-groomed best (soft clean coat, clear eyes), while keeping its true age and character. If the source shows a senior pet, it remains gracefully senior — dignified and comfortable, never de-aged into a puppy or kitten, never a different life stage.
- The family's test, through tears: "that's exactly our baby — and they look so peaceful." Never a generic angelic animal.

EXPRESSION & MOOD (the heart of this portrait):
- Calm, peaceful, gently content — soft relaxed eyes, an easy comfortable posture (sitting or lying softly), perhaps the faintest gentle smile natural to the animal.
- NOT excited, NOT playful, NOT sad, NOT sleeping — serenely awake and at peace, looking softly toward the viewer as if saying goodbye kindly.

THE SCENE — a warm, gentle beyond:
- A soft heavenly meadow: warm golden-ivory light, gentle rolling clouds low around the pet like a soft bed, a few delicate flowers (baby's breath, small white blossoms) near its paws.
- Light: a warm, embracing glow from above and behind — a soft luminous rim on the fur, the whole scene bathed in comfort. Bright and warm, never dark, never gloomy.
- Far in the background, the FAINTEST soft arc of rainbow colors woven subtly into the sky — a gentle whisper, not a bold graphic rainbow.
- Palette: warm ivory, soft gold, gentle sky pastels. Ethereal but natural.

RESTRAINT LAW (keep it dignified and universal):
- NO wings on the pet, NO halo, NO angel costume, NO religious symbols of any kind, NO gravestones, NO candles, NO photo frames within the image, NO human figures or hands.
- The pet wears nothing except its own collar IF it wears one in the source (same collar); otherwise nothing.
- The comfort comes from light, clouds, and the pet's peaceful presence — not from props.

COMPOSITION:
- The pet is the sole subject, large and central, face fully visible and softly lit — close enough that the family can look into its eyes.
- Vertical portrait format with gentle margins, composed to be framed and kept.
- Photorealistic with a soft dreamlike warmth — a real photograph of a peaceful moment, gently luminous. NOT a cartoon, NOT an illustration, NOT a heavy fantasy render.

SELF-CHECK before finishing:
- Side by side with the input: is this exactly THEIR pet — same markings in the same places, same face, same life stage? Peaceful and healthy, not excited or sorrowful? No wings, halos, symbols, or props? Warm and bright, never gloomy? Only then is the portrait complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or marking placement; a de-aged or aged pet.
- Wings, halos, angel imagery, religious symbols, gravestones, candles, frames, human presence.
- An overly bold cartoon rainbow; garish saturated colors; dark, somber, or gloomy tones.
- Excited/playful poses, tongue-out big grins, or sleeping/lifeless poses.
- Cartoon or illustration style; plastic fur; any text, letters, watermark, or border.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 140000);
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
      "petmemorial"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 140초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petmemorial] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petmemorial"));
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
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetmemorial(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petmemorial error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}