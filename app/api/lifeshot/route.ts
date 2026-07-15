import { NextRequest, NextResponse } from "next/server";
import { cropToRatio } from "../../lib/crop";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateLifeshot(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. Make them look their absolute best through LIGHTING, GROOMING, and STYLING — never by reshaping facial features. "Them, on their best day," never a prettier different person.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a high-end portrait photographer creating a trendy "lifeshot" profile photo. Take the person shown in the photo(s) and create a beautiful, natural, magazine-quality vertical portrait.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY LOCK (highest priority — beauty comes from styling, never from changing the face):
- Reproduce the facial structure faithfully: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Do NOT enlarge eyes, slim the jaw, raise the nose, or shift facial proportions in any way.
- Keep the apparent age and the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color).

SKIN
- Perfectly clean, smooth, healthy skin with a natural glow — treat shadows, contrast edges, and compression noise in the source as clean skin; do not invent moles, marks, or blemishes that are not there. Only a large, unmistakably real mole may remain, smaller and fainter. Soften pores and fine lines to about half strength — polished but real, never plastic.

LIFESHOT STYLING (where the magic is allowed — go all in here):
- Light, natural "no-makeup makeup" grooming that suits the person; neat, softly styled hair with natural shine (keep their own hairstyle and color, beautifully groomed).
- Soft natural lighting, gentle film-like color grading, shallow depth of field with a softly blurred background.
- Flattering but realistic; clean modern aesthetic like a Korean studio profile / SNS lifeshot.
- Tasteful, effortlessly stylish casual outfit that suits the person.
- Natural relaxed expression with an easy, warm micro-smile, looking toward camera.
- Tasteful neutral background (studio paper, soft gradient, or softly blurred cafe/outdoor). Upper-body vertical framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — this is just a really good photo of them." If it reads as a different, prettier person, the result is wrong.

Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: the SAME face, beautified only through light and styling, inside the SAME fixed composition.`;
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
      "lifeshot"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[lifeshot] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "lifeshot"));
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
    const output = await generateLifeshot(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("lifeshot error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}