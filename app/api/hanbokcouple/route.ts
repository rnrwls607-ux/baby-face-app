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
async function generateHanbokcouple(image1DataUrl: string, image2DataUrl: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Full traditional wedding styling is the product, but it is built ON TOP of each person's real face: NEVER mix, blend, or average features between the two, and NEVER reshape either face.
2. COMPOSITION — the output is ALWAYS one vertical portrait with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic traditional Korean wedding portrait showing BOTH people together in the same photo, dressed in beautiful wedding hanbok.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, clothing, and current grooming — the wedding hanbok styling below replaces it.
- If an input photo contains more than one person, use the clearest, most prominent person.
- Place person A on the LEFT and person B on the RIGHT.

PER-PERSON IDENTITY LOCK (styling is built on top of this, never instead of it):
- For EACH person: the same face shape and width-to-length ratio, the same jaw and chin, the same cheekbones, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries, apparent age, and each person's TRUE skin tone (corrected per person, never unified).
- HARD LIMITS: no enlarging eyes, no slimming jaws, no raising noses. Elegant traditional-style makeup and neat hair styling that suit each person ARE welcome — as visible styling on their real features.
- Clean skin — do not invent moles or blemishes.

HANBOK WEDDING STYLING (go all in — this is the product):
- Dress each person in an elegant traditional Korean wedding hanbok that suits them: rich silk fabrics, refined traditional colors, tasteful norigae or traditional accessories; for a woman, an elegant chima-jeogori in festive bridal tones with a tasteful hair ornament; for a man, a dignified jeogori-baji with a vest or durumagi in deep tones.
- HANBOK STRUCTURE MUST BE CORRECT (critical): a clean white dongjeong collar line on each jeogori; the otgoreum (front ribbon) properly tied with a natural bow shape and smoothly hanging tails — never melted, tangled, fused, or floating ties; if saekdong (rainbow stripes) appears, the stripes stay crisp, parallel, and evenly colored; silk drapes and folds behave like real fabric.
- Background: a graceful traditional Korean setting — a hanok courtyard or an elegant studio with hanji tones and subtle traditional patterns, soft warm lighting.
- Warm, happy, loving expressions; natural couple poses standing close together. If hands are visible, render them naturally with the correct number of fingers; hands gently clasped in traditional style are welcome — if a gesture would look awkward, simplify it.

FINAL SELF-CHECK before output: cover person B — A's family must instantly say "that's A in wedding hanbok." Cover person A — B's family must say the same for B. Check the otgoreum ties and collar lines on both hanbok — if any tie is melted or any face reads as a mix, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO people, each exactly themselves under the styling, inside the fixed waist-up composition.`;
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
      "hanbokcouple"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[hanbokcouple] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "hanbokcouple"));
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
    const output = await generateHanbokcouple(image1, image2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("hanbokcouple error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}