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
async function generateHairstyle(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — ONLY the hair changes. The face must remain EXACTLY the same person: this is a salon PREVIEW, so if the face changes even slightly, the preview becomes useless. No beautifying, no reshaping, no makeup changes — the person's real face under a new hairstyle.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional hair-salon visualization artist. Take the person in the photo(s) and show them with a fresh, trendy new hairstyle so they can preview a salon change before committing.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for the FACE (identity) only. Ignore their framing, zoom, background, lighting, and clothing. The original hairstyle is replaced by this concept.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

FACE LOCK (highest priority — replicate, do not redesign):
- Reproduce the face exactly as in the primary photo: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Keep the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color). Keep clean, natural skin — do not invent moles, marks, or blemishes that are not in the source; treat shadows, contrast edges, and compression noise as clean skin.
- Keep the apparent age, expression character, glasses (if worn), and facial hair exactly as in the source.

THE NEW HAIR (the only transformation):
- Apply a natural, fashionable hairstyle that suits this person's face shape (modern Korean salon style) — a style a real stylist would actually recommend for them.
- Keep the hair realistic with natural texture, volume, and a believable hairline that matches the person's real hairline position; blend it naturally with the face and lighting. No wig-like edges, no floating hair.
- Render the new hair in a realistic color that suits them (natural tones unless the source hair is already vividly colored).

Clean, even lighting; simple neutral background; vertical portrait framing, upper body. Photorealistic, high resolution, no text, no watermark, no border.

FINAL SELF-CHECK before output: cover the hair with your hand — the face alone must be instantly identifiable as this exact person. If not, the result is wrong.

Remember the two absolute rules: the SAME face, ONLY the hair changed, inside the SAME fixed composition.`;
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
      "hairstyle"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[food] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "hairstyle"));
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
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHairstyle(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("hairstyle error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}