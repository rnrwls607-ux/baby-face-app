import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 120; // 3D 캐릭터 렌더 — flash 기본(60)보다 여유
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateToon3d(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into a 3D animated movie character — the polished, appealing look of a modern theatrical CG animation film. This must be THIS specific person rendered as a character, never a generic one.

STEP 1 — READ THE PERSON FIRST:
Note their gender, age impression, ethnicity and skin tone, face shape and jawline, hairstyle and hair color, outfit and its colors, and every distinctive feature (glasses, freckles, moles, dimples, facial hair, eyelid type). All of these carry over into the character.

STEP 2 — PRESERVE IDENTITY THROUGH STYLIZATION (MOST IMPORTANT):
- Same face-shape impression, same skin tone, same hairstyle and hair color, same outfit colors and style, and every distinctive feature kept and clearly visible.
- EYES: they may be moderately larger and more expressive in the 3D-animation way, but their REAL eye shape, eye color, and eyelid type must remain the base — never swap in generic round doll eyes.
- GLASSES RULE: if they wear glasses, keep the exact same frame shape and color; if they wear none, add none.
- FACIAL HAIR, FRECKLES, MOLES, DIMPLES: keep them, rendered in the character style.
- Keep their real expression as the base, made warm and appealing.
- Same gender, same ethnicity, same age impression — always. Never de-age an adult into a child, never change skin tone.
- Anyone who knows them must instantly recognize this character as them.

STEP 3 — RENDER AS A HIGH-END 3D ANIMATION CHARACTER:
- Smooth sculpted 3D character modeling with soft subsurface-scattering skin and appealing stylized proportions (slightly larger head and eyes, simplified but charming features) — fully committed to the stylized look, never halfway between real and cartoon.
- Detailed stylized hair with soft strands and natural volume, matching their real hairstyle exactly.
- Their outfit rebuilt as stylized 3D clothing with believable fabric folds, in the same colors and design.
- Warm cinematic three-point lighting with a gentle rim light; soft depth of field.
- Background: a softly blurred, colorful cinematic set inspired by the original photo's setting.
- Natural, intact hands with correct fingers if visible.

SELF-CHECK before finishing:
- Same gender, ethnicity, age impression, and skin tone as the input?
- Real eye shape and eyelid type preserved (not generic doll eyes)? Glasses handled correctly?
- Same hairstyle and outfit colors? Freckles/moles/facial hair kept?
- Fully stylized 3D — no uncanny half-realistic look, no leftover photo texture?
- Only then is the render complete.

ABSOLUTELY AVOID:
- An uncanny semi-realistic look — commit fully to the stylized animation render.
- A generic character that doesn't resemble the person; changed gender, ethnicity, age, or skin tone.
- Generic doll eyes replacing their real eye shape; erasing glasses, freckles, or facial hair.
- Copying any specific animation studio's famous characters.
- Text, watermark, logos, borders.

Final result: one high-resolution waist-up portrait render of them as a 3D animated film character, looking toward camera.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 110000);
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
      "toon3d"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 110초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[toon3d] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "toon3d"));
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
    const output = await generateToon3d(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("toon3d error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}