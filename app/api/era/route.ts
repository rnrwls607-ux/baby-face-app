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
const BASE_RULE = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side: same face shape and width-to-length ratio, same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), same ears, same nose bridge/width/tip, same philtrum, same lip shape and thickness, same eyebrows, same spacing between all features, keeping their natural asymmetries. Era-appropriate MAKEUP, HAIRSTYLING, and grooming ARE welcome and encouraged — style the person fully and beautifully for the era — but NEVER reshape the facial features themselves (no enlarging eyes, no slimming the jaw, no raising the nose). The goal is "the same person, styled for that era," never a different person.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up selfie must come out as the standard upper-body composition.

The input photo is a reference for IDENTITY ONLY — ignore its framing, background, lighting, and clothing. Render the skin in the person's TRUE tone (correct any color cast from the source lighting); do not invent moles or marks that are not in the source — treat shadows, contrast, and compression noise as clean skin. Period makeup may be applied on top of clean skin.

FINAL SELF-CHECK: next to the source photo, a family member must instantly say "same person, in that era." If not, the result is wrong.
Photorealistic, high resolution, no text, no watermark, no border.`;
const ERA_PROMPTS: Record<string, string> = {
  joseon: `You are a historical portrait photographer. Take the person in this photo
and portray them as a noble person living in Korea's Joseon dynasty.
${BASE_RULE}
Era styling: elegant traditional Joseon-era hanbok appropriate to the
person (fine silk jeogori and attire of a noble household), with a
period-appropriate traditional hairstyle (or gat/headpiece if it suits
them naturally). Background: a beautiful traditional hanok setting with
wooden beams and paper doors, soft natural light. Dignified, graceful
mood, like a premium historical drama poster portrait.`,
  gyeongseong: `You are a vintage portrait photographer. Take the person in this photo
and portray them in 1920s-1930s Gyeongseong (old Seoul) "modern boy /
modern girl" style.
${BASE_RULE}
Era styling: refined 1920s attire — a classic three-piece suit with a
fedora or a vintage drop-waist dress with elegant accessories, period
hairstyle. Background: a softly blurred vintage street or classic studio
with warm sepia-toned, film-like color grading. Romantic, nostalgic
retro-modern mood like a period film poster.`,
  retro: `You are a retro studio photographer. Take the person in this photo and
portray them in 1970s-80s Korean retro style.
${BASE_RULE}
Era styling: authentic 70s-80s fashion — bold-collared shirt, denim or
corduroy jacket, retro patterns, with a period hairstyle (soft perm,
disco volume, or classic side part). Background: a vintage photo studio
backdrop with warm faded film colors, slight grain, like an old family
album photo taken decades ago. Charming, nostalgic mood.`,
  medieval: `You are a classical court portrait artist using a camera. Take the
person in this photo and portray them as European royalty or nobility
from the medieval-renaissance era.
${BASE_RULE}
Era styling: luxurious period attire — ornate embroidered garments,
velvet and gold details, an elegant crown, circlet, or noble accessories
that suit the person. Background: a grand castle interior with rich
drapery and warm candle-like lighting, painted-portrait atmosphere but
fully photorealistic. Regal, majestic mood.`,
  future: `You are a sci-fi concept photographer. Take the person in this photo
and portray them as a stylish citizen of a futuristic cyberpunk city.
${BASE_RULE}
Era styling: sleek futuristic fashion — high-tech jacket with subtle
glowing accents, modern avant-garde styling that suits the person.
Background: a neon-lit futuristic city at night with holographic lights
and cinematic depth, cool blue-magenta color grading. Confident,
cinematic sci-fi movie poster mood.`,
};
async function generateEra(imageDataUrl: string, era: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = ERA_PROMPTS[era] || ERA_PROMPTS.joseon;
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
      "era"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[era] model=${GEMINI_MODEL} era=${era} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "era"));
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
    const era: string = typeof body?.era === "string" ? body.era : "joseon";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateEra(image, era);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("era error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}