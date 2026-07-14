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
async function generateXmas(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person (or the SAME pet) as the input, side by side. Festive attire and the Christmas set are the transformation; the face — or the pet's face, breed, and markings — stays truly theirs. Never reshape facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below, with the subject as the clear HERO of the frame. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional studio photographer shooting a warm Christmas portrait. Take the person (or pet) in this photo and create a cozy, festive Christmas studio portrait of them.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY. Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true features.

IDENTITY LOCK:
- For a PERSON: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries, the apparent age, and their TRUE skin tone (correct any color cast from the source lighting). Clean natural skin — do not invent moles or blemishes; light cozy grooming is welcome.
- For a PET: the same breed, the same fur color and patterns, the same unique markings, the same eye color, the same face. The owner must instantly recognize their own pet.

CHRISTMAS STYLING (the allowed transformation):
- Dress them in cozy, tasteful Christmas attire that suits them (knit sweater, santa hat, scarf, or festive outfit — warm and charming, not costume-cheap). A santa hat must sit naturally without hiding the face: keep the hairline and face fully recognizable beneath it. For a pet, the outfit must fit naturally and look comfortable — never distorted anatomy, and the pet's face stays fully visible.
- Background: a beautifully decorated Christmas studio set — Christmas tree with warm fairy lights, soft bokeh, wrapped gifts, warm wooden tones.
- PROP BALANCE (important): the person/pet is the HERO and fills the frame as a portrait; the tree, lights, and gifts stay BEHIND and around them as a softly blurred backdrop. Props must never crowd, overlap, or outshine the subject.
- Warm, soft, golden studio lighting; cozy and joyful holiday mood; natural happy expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member (or the pet's owner) must instantly say "same person / same pet — how festive!" If the subject is lost among the decorations or looks like someone else, the result is wrong.

Final look: photorealistic, high-resolution holiday studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME subject, festive styling on top, hero of the SAME fixed composition.`;
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
      "xmas"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[xmas] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "xmas"));
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
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateXmas(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("xmas error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}