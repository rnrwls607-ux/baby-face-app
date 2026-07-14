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
async function generateLuxe(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must still be unmistakably the SAME person, fully transformed by high-fashion editorial styling. The goal is "them, on the cover of a luxury fashion magazine" — never a different person and never a generic luxury model. Transform through MAKEUP, HAIR, WARDROBE, JEWELRY, and LIGHTING at full strength; NEVER by reshaping the facial features themselves.
2. COMPOSITION — the output is ALWAYS a vertical upper-body editorial portrait. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard editorial framing.

You are a world-class luxury fashion magazine's cover photographer and stylist. Take the person in this photo and shoot their high-end editorial cover portrait. (Generic luxury editorial style — do NOT reference or imitate any real brand, logo, or magazine.)

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and current grooming — the editorial styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY FOUNDATION (styling is built ON TOP of this, never instead of it):
- The same face shape and width-to-length ratio, the same jawline and chin, the same cheekbone structure, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid — style the monolid strikingly as top monolid models are styled), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow position, and the same spacing between all features. Keep natural asymmetries and the apparent age.
- HARD LIMITS: no enlarging eyes, no slimming the jaw, no raising the nose, no shifting proportions. Editorial makeup creates the ILLUSION of sculpted definition — the underlying structure must not move.
- TRUE skin tone (correct source color cast; never lighten or darken their actual tone). Flawless but real skin texture — luminous, never plastic.

FULL LUXURY EDITORIAL STYLING (go all in — this is the product):
- Makeup: polished high-fashion editorial makeup that suits this person — sculpted-look shading done as visible makeup, defined eyes, elegant lip (a refined red or a sophisticated nude), groomed strong brows in their real shape.
- Hair: a sleek editorial style that suits them — glossy slicked-back, a refined updo, or perfectly finished waves; restyling IS encouraged, natural hairline kept.
- Wardrobe & jewelry: unbranded haute-couture pieces — a sharply tailored black or ivory suit, a sculptural dress, or a dramatic coat; statement jewelry (bold earrings, layered necklaces, elegant rings) with realistic metal and gemstone rendering. NO logos, NO brand marks, NO lettering anywhere on clothing or jewelry.
- Set & light: a minimal high-end studio — deep charcoal, ivory, or rich burgundy seamless backdrop, or dramatic architectural marble; crisp directional editorial lighting with intentional shadow play, magazine-cover contrast and depth.
- Pose & expression: confident editorial presence — strong gaze into the camera, elegant posture, the quiet power of a cover star. Leave a little clean negative space above the head (cover-like composition) but place NO text in it.

ABSOLUTELY NO TEXT: no magazine title, no headlines, no letters, no numbers, no logos, no watermark, no border — the "magazine cover" feeling must come ONLY from the lighting, styling, and composition.

FINAL SELF-CHECK before output: friends must react "you look like a magazine cover — and it's SO you." Surprising (full editorial transformation) AND instantly recognizable (same person). If it reads as a different person, a generic model, or contains any lettering, the result is wrong.

Photorealistic, high resolution. Remember the two absolute rules: the SAME facial structure underneath, FULL luxury styling on top, inside the SAME fixed editorial composition.`;
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
            { inline_data: { mime_type: img.mimeType, data: img.data } },
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
  console.log(`[luxe] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
  // 📐 인물 화보: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateLuxe(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("luxe error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
