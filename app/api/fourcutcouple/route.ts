import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFourcutcouple(image1DataUrl: string, image2DataUrl: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. TWO PEOPLE, LOCKED IN EVERY FRAME — person A's face must match image 1 exactly and person B's face must match image 2 exactly, in ALL FOUR frames: that is eight face checks in one strip. NEVER mix, blend, or average features between the two people, never let either face drift between frames, and keep exactly TWO people in every frame — nobody added, removed, or duplicated.
2. COMPOSITION — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR frames stacked top to bottom, small even white gaps between the frames, a thin clean white border around the whole strip, and BOTH faces clearly visible at a similar scale in every frame. The input photos' framing, zoom, crop, and angle have ZERO influence on this layout.

Image 1 shows person A. Image 2 shows person B. Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, showing BOTH people together.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only: image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person.
- POSITION CONSISTENCY: person A stays on the LEFT and person B stays on the RIGHT in ALL four frames — never swap sides between frames.

ONE BOOTH SESSION (the key to frame consistency):
- All four frames were shot seconds apart in the same booth: each person keeps the SAME hairstyle and the SAME outfit in every frame, under the SAME lighting and background tone. Only the poses and expressions change.

PER-PERSON IDENTITY LOCK (apply to EACH person, in EVERY frame):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries, apparent age, and TRUE skin tone (corrected per person, never unified).
- Clean natural skin on both — do not invent moles or blemishes on either person.

ANTI-BLEND:
- Do NOT unify or harmonize their faces or builds — their real differences stay true in every frame.

THE FOUR FRAMES:
- Each frame shows BOTH people together in a different fun couple pose (smiling side by side, peace signs, laughing, leaning in).
- Expressions stay natural — lively but never so exaggerated that either face distorts.
- HANDS: a peace sign shows exactly two raised fingers; every visible hand has five correct fingers; if a gesture would tangle between the two people in a small frame, simplify it.

Style:
- Trendy Korean photo-booth look: clean bright lighting, a simple tasteful background tone (consistent across all four frames), modern fashionable feel.

FINAL SELF-CHECK before output: count the frames — exactly four. In each frame, count the people — exactly two, A on the left, B on the right. Then check all eight faces: covering the other person, each face in each frame must be instantly recognizable as A or as B. If any face in any frame reads as a stranger or a mix, the result is wrong.

Photorealistic, high resolution. No text, no captions, no watermark. Remember the two absolute rules: the SAME two people in all FOUR frames, inside the fixed strip layout.`;
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
      "fourcutcouple"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[fourcutcouple] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "fourcutcouple"));
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
  // 📐 네컷: 2:3 세로 스트립 비율로 크롭
  return await cropToRatio(dataUrl, 2, 3);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateFourcutcouple(image1, image2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fourcutcouple error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}