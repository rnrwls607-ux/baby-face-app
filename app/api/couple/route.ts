import { NextRequest, NextResponse } from "next/server";
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
async function generateCouple(image1DataUrl: string, image2DataUrl: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Treat this as TWO separate identity-preservation jobs happening in one photo: NEVER mix, blend, average, or swap any feature between the two people, and never let their faces drift toward looking alike.
2. COMPOSITION — the output is ALWAYS one vertical portrait with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic studio couple portrait showing BOTH people together in the same photo, standing or sitting close together like a loving couple.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.
- Place person A on the LEFT and person B on the RIGHT, so each person is easy to identify.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries and apparent age.
- Keep each person's TRUE skin tone individually — the two people may have different skin tones; correct source color casts per person and never unify their tones.
- Clean natural skin on both — do not invent moles or blemishes on either person; treat shadows, contrast edges, and compression noise as clean skin.

ANTI-BLEND (the #1 failure mode of two-person shots):
- Do NOT unify or harmonize their faces. If one face is rounder and the other sharper, keep that contrast. Realistic height and build differences stay true to each person.

Studio styling:
- A premium couple studio photoshoot: coordinated neat outfits (smart casual or semi-formal that suit each person), natural affectionate poses (side by side, slight lean-in, or gentle hand on shoulder).
- Clean studio backdrop in a soft tasteful tone, professional soft lighting, gentle depth of field.
- Warm, happy, natural expressions on both, eyes engaged with the camera.
- If hands are visible (holding hands, hand on shoulder), render them naturally with the correct number of fingers; if a hand would look awkward, keep it relaxed and simple or out of frame.

FINAL SELF-CHECK before output: cover person B with your hand — A's family must instantly say "that's A." Cover person A — B's family must instantly say "that's B." If either face reads as a stranger, or as a mix of the two, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO people, each exactly themselves, inside the fixed waist-up composition.`;
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
            { inline_data: { mime_type: img1.mimeType, data: img1.data } },
            { inline_data: { mime_type: img2.mimeType, data: img2.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "couple"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[couple] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "couple"));
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
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateCouple(image1, image2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("couple error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}