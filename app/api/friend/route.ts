import { NextRequest, NextResponse } from "next/server";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFriend(image1DataUrl: string, image2DataUrl: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Treat this as TWO separate identity-preservation jobs in one photo: NEVER mix, blend, average, or swap any feature between the two friends, and never let their faces drift toward looking alike.
2. COMPOSITION — the output is ALWAYS one vertical snap with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic friendship snap photo showing BOTH friends together in the same photo, having fun side by side.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.
- Place person A on the LEFT and person B on the RIGHT.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries, apparent age, and TRUE skin tone (corrected per person, never unified).
- Clean natural skin on both — do not invent moles or blemishes; treat shadows and compression noise as clean skin.

ANTI-BLEND:
- Do NOT unify or harmonize their faces or builds — real friends look different, and that contrast is the charm of the photo.

Friendship snap styling:
- A trendy "bestie" photo: cheerful natural poses (shoulder to shoulder, playful peace signs, or laughing together), stylish casual outfits that suit each person.
- HANDS (high-risk in playful poses): every visible hand must have exactly five correct fingers with natural proportions — a peace sign shows exactly two raised fingers. If any gesture would look awkward or tangled, simplify it (relaxed hands, arms around shoulders) rather than forcing it.
- Background: a bright clean studio backdrop OR a softly blurred trendy street/cafe scene with warm film-like color grading.
- Bright, joyful, genuine expressions on both — natural laughter is welcome, but each face must stay clearly recognizable (no extreme distortion from exaggerated expressions).

FINAL SELF-CHECK before output: cover person B — A's family must instantly say "that's A." Cover person A — B's family must instantly say "that's B." Count the fingers on every visible hand. If a face reads as a stranger or a mix, or any hand is wrong, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO friends, each exactly themselves, inside the fixed waist-up composition.`;
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
            { inline_data: { mime_type: img1.mimeType, data: img1.data } },
            { inline_data: { mime_type: img2.mimeType, data: img2.data } },
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
  console.log(`[friend] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
  const dataUrl = `data:image/png;base64,${b64}`;
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateFriend(image1, image2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("friend error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}