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
async function generateFourcutillust(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. ONE PERSON, FOUR TIMES, ILLUSTRATED — all four frames show the SAME person in drawn form, and every frame must be instantly recognizable as that person on its own. Simplify the RENDERING, never the IDENTITY: the illustrated face must not drift or change between frames — only the pose and expression change.
2. COMPOSITION & STYLE CONSISTENCY — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR square frames stacked top to bottom, small even white gaps between the frames, a thin clean white border around the whole strip; and ONE consistent illustration style across all four frames — the same line weight, the same color palette, the same shading technique, as if one artist drew all four cuts in one sitting. The input photo's framing, zoom, crop, and angle have ZERO influence on this layout.

Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, drawn as a polished digital illustration, using the person in the input photo.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true features.

ONE BOOTH SESSION:
- All four frames are the same booth session: the SAME illustrated hairstyle, the SAME outfit, and the SAME background tone in every frame. Only the pose and expression change.

IDENTITY IN ILLUSTRATED FORM (must hold in every frame):
- Keep the recognizable likeness: the same face shape and width-to-length proportions, the same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), the same nose and mouth impression, the same eyebrows, and the same hairstyle and hair color — clearly the same person, just drawn.
- FACES GET THE HIGHEST DETAIL: backgrounds may be flat and simple, but every face keeps enough drawn detail to stay instantly recognizable. Never let the style blur or "prettify" the face into a generic character — and never drift toward chibi or caricature proportions in any frame.
- Keep distinctive cues that exist in the source (glasses, dimples); do not invent new ones.

THE FOUR FRAMES:
- Each frame shows a different fun pose and expression (warm smile, peace sign, playful surprise, candid laugh) — expressive but never distorting the likeness.
- HANDS: drawn cleanly — a peace sign shows exactly two raised fingers; every visible hand has five fingers; simplify any gesture that would look awkward in a small square frame.

Illustration style:
- Premium hand-drawn webtoon / animation illustration: clean, confident line work with consistent weight, soft painterly shading, warm harmonious colors. Charming and modern — NOT a childish doodle, NOT a photo filter, and no leftover photographic textures anywhere in the strip.

FINAL SELF-CHECK before output: count the frames — exactly four, all in ONE consistent art style. Then look at each frame alone: someone who knows this person must instantly recognize them in every single cut. If any frame reads as a different person or a different art style, the result is wrong.

High resolution. No text, no captions, no watermark, no signature. Remember the two absolute rules: the SAME person in all FOUR frames, one consistent illustration style, inside the fixed strip layout.`;
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
      "fourcutillust"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[fourcutillust] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "fourcutillust"));
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
  // 📐 네컷: 2:3 세로 스트립 비율로 크롭
  return await cropToRatio(dataUrl, 2, 3);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateFourcutillust(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fourcutillust error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("fourcutillust", 0, handler); // COIN_DORMANT: 실가격 3
