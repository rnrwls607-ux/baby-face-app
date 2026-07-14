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
async function generateFourcut(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. ONE PERSON, FOUR TIMES — all four frames show the SAME person, and every frame must be instantly recognizable as that person ON ITS OWN. This is four identity-preservation jobs in one strip: the face must not drift, morph, or change between frames — only the pose and expression change.
2. COMPOSITION — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR square frames stacked top to bottom (frame 1 on top, frame 4 at the bottom), with small, even white gaps between the frames and a thin clean white border framing the whole strip. The input photo's framing, zoom, crop, and angle have ZERO influence on this layout — even an extreme close-up selfie produces the standard four-cut strip.

Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, using the person in the input photo.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

ONE BOOTH SESSION (the key to frame consistency):
- All four frames were shot seconds apart in the same booth: the SAME hairstyle, the SAME outfit, the SAME lighting, and the SAME background tone in every frame. Only the pose and expression change from frame to frame.

IDENTITY LOCK (must hold in every single frame):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries, the apparent age, and the person's TRUE skin tone (correct source color casts; identical tone in all four frames).
- Clean natural skin — do not invent moles or blemishes; treat shadows, contrast edges, and compression noise as clean skin.

THE FOUR FRAMES (different, but the same person):
- Frames 1–4 each show a different fun pose and expression (e.g. warm smile, peace sign, playful surprise, candid laugh).
- EXPRESSIONS stay within natural range: lively and fun, but never so exaggerated that the face distorts — every frame must still read instantly as this person.
- HANDS: a peace sign shows exactly two raised fingers; every visible hand has five correct fingers. If a gesture would look awkward in a small square frame, simplify it.

Styling:
- Trendy Korean photo-booth look: clean bright studio lighting, a simple tasteful background tone (consistent across all four frames), modern fashionable feel.

FINAL SELF-CHECK before output: count the frames — exactly four, evenly sized, cleanly separated. Then look at each frame ALONE: each must be instantly recognizable as the same person, in the same outfit and hair. If any single frame reads as a different person, or the count/layout is wrong, the result is wrong.

Photorealistic, high resolution. No text, no captions, no watermark. Remember the two absolute rules: ONE person in all FOUR frames, inside the fixed strip layout.`;
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
      "fourcut"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[fourcut] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "fourcut"));
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
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateFourcut(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fourcut error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}