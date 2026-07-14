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
async function generateY2k(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must still be unmistakably the SAME person, fully transformed into early-2000s "Y2K high-teen" style. The goal is "them, as a teen-magazine pop star in 2002" — never a different person and never a generic Y2K model. Transform through MAKEUP, HAIR, FASHION, ACCESSORIES, and PHOTO MOOD at full strength; NEVER by reshaping the facial features themselves.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a Y2K-era teen-magazine photographer and stylist. Take the person in this photo and shoot their "2000s high-teen pop star" pictorial — kitschy, glossy, and nostalgic.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and current grooming — the Y2K styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY FOUNDATION (styling is built ON TOP of this, never instead of it):
- The same face shape and width-to-length ratio, the same jawline and chin, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow SHAPE and position (style the brows groomed and glossy, but never thin them into the "Y2K skinny brow" if that changes their real brow shape), and the same spacing between all features. Keep natural asymmetries and the apparent age.
- HARD LIMITS: no enlarging eyes, no slimming the jaw, no raising the nose, no shifting proportions. Makeup creates the ILLUSION only.
- TRUE skin tone (correct source color cast; never lighten or darken their actual tone).

FULL Y2K STYLING (go all in — this is the product):
- Makeup: glossy lip, shimmer/frosted eyeshadow, dewy highlighted skin, a few tiny rhinestone accents near the eyes — visible as playful makeup on clean skin.
- Hair: a Y2K style that suits them — crimped strands, butterfly clips, tiny front braids, high pigtails or zigzag part for feminine looks; gelled spiky or curtain style for masculine looks. Restyling the hair IS encouraged; keep a natural hairline.
- Fashion & props: early-2000s fashion (velour tracksuit, baby tee, denim-on-denim, cargo, chunky rhinestone jewelry, star/heart chokers). Tinted sunglasses may appear ONLY pushed up on the head or worn low on the nose — the EYES must stay fully visible. A classic flip phone or wired earbuds as a cute prop is welcome.
- Set & photo mood: a kitschy 2000s studio backdrop (soft gradient with star/heart motifs, sticker-frame vibe using graphic shapes only — no letters or numbers), direct on-camera flash look, slightly saturated early-digital color grading with a hint of soft grain. IMPORTANT: apply the retro digicam vibe to COLOR and BACKGROUND only — the face itself stays sharp, clean, and fully recognizable, never blurred or degraded.
- Expression: playful, confident pop-star attitude, engaging the camera.

FINAL SELF-CHECK before output: friends must react "no way, is that YOU in 2002?!" — surprising (full Y2K transformation) AND instantly recognizable (same person). If it reads as a different person or a generic Y2K model, the result is wrong.

Photorealistic, high resolution, no text, no letters, no watermark, no border. Remember the two absolute rules: the SAME facial structure underneath, FULL Y2K styling on top, inside the SAME fixed composition.`;
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
  console.log(`[y2k] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateY2k(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("y2k error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
