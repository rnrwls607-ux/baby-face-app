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
async function generateRoman(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the person must be instantly recognizable in illustrated form: the same person, drawn as a romance-fantasy webtoon protagonist. Simplify the RENDERING, never the IDENTITY. All the glamour comes from the COSTUME, JEWELS, HAIR STYLING, and LIGHT — never from redrawing their features into a generic beautiful character.
2. COMPOSITION — the output is ALWAYS a vertical waist-up "webtoon cover" portrait. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a top cover artist for premium Korean romance-fantasy web novels. Draw the person in this photo as the dazzling protagonist on a webtoon cover. (Generic romance-fantasy illustration style — do not imitate any specific title, artist, or franchise.)

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure, features, hair color). Ignore their framing, zoom, background, lighting, and clothing — the fantasy styling below replaces them.
- Do NOT average the faces across photos; use the clearest, most front-facing photo as the single primary reference.

IDENTITY IN ILLUSTRATED FORM (highest priority — the face gets the most detail):
- Keep the recognizable likeness: the same face shape and width-to-length proportions, the same jaw and chin impression, the same eye SHAPE and eyelid type (double eyelid stays double, monolid stays monolid — draw the monolid beautifully as romance-fantasy monolid characters are drawn), the same nose and mouth impression, the same eyebrow shape, and the same spacing between features. Keep their distinctive cues and a hint of their natural asymmetry.
- EYES: render the iris with the genre's signature luminous, jewel-like sparkle and starlight highlights — but keep the person's real EYE SIZE and shape; never enlarge the eyes to anime proportions.
- HAIR: keep the person's natural hair color; fully restyle it into flowing, elegant romance-fantasy hair with ornate accessories (jeweled pins, ribbons, a delicate tiara or circlet if it suits them).
- Apparent age and skin tone stay true (rendered in the genre's luminous skin style).

ROMANCE-FANTASY STYLING (go all in — this is the product):
- Costume: ornate royal attire that suits the person — for a feminine presentation, a frilled and embroidered gown with lace, ribbons, and glittering jewels; for a masculine presentation, a duke's or royal knight's regalia with embroidered coat, cravat, and elegant details.
- Rendering: delicate clean lineart, luminous 2.5D shading with soft glow, rich yet soft pastel-jewel palette, sparkling light particles, soft roses or ornate frame elements in the background — the polished look of a premium web-novel cover.
- Mood: elegant, dreamy, slightly dramatic lighting from above; graceful confident expression.

ABSOLUTELY AVOID: 3D render or plastic CGI; chibi or childish proportions; leftover photographic textures; a generic "pretty character" that loses the person; any text, letters, logo, signature, watermark, frame text, or border.

FINAL SELF-CHECK before output: someone who knows this person must instantly say "it's YOU as a romance-fantasy lead!" If the face reads as a generic webtoon beauty, the result is wrong.

High resolution. Remember the two absolute rules: the SAME face in illustrated form, full fantasy glamour around it, inside the SAME fixed cover composition.`;
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
      "roman"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[roman] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "roman"));
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
  // 📐 웹툰 표지 인물: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateRoman(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("roman error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
