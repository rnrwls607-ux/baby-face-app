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
async function generateWedding(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be unmistakably the SAME person as the input, transformed by full bridal/groom styling. The goal is "them, on their wedding day" — never a generic bride or groom. Transform through MAKEUP, HAIR, ATTIRE, and LIGHTING; NEVER by reshaping facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait of exactly ONE person, as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional wedding photographer shooting a solo bridal / groom portrait. Take the person in this photo and create an elegant wedding studio portrait of them alone.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and current grooming — the wedding styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.
- Exactly ONE person in the output — the person from the photo, alone. Never add a partner or anyone else.

IDENTITY FOUNDATION (styling is built ON TOP OF this, never instead of it):
- The same face shape and width-to-length ratio, the same jawline and chin, the same cheekbones, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow position, and the same spacing between all features. Keep natural asymmetries.
- HARD LIMITS: do not enlarge the eyes, slim the jaw, raise the nose, or shift any facial proportion. Makeup may create the ILLUSION of definition — the underlying structure must not move.
- Keep the apparent age and the person's TRUE skin tone (correct source color cast; never lighten or darken their actual tone). Clean skin — do not invent moles or blemishes; treat shadows and compression noise as clean skin.

WEDDING STYLING (go all in — this is the product):
- If the person presents as a woman: an elegant white wedding dress with refined detailing, a tasteful bridal hairstyle (updo or soft styling that suits her — restyling the hair IS allowed and encouraged for this concept), and complete soft bridal makeup: luminous base in her true tone, gentle eye definition, soft blush, an elegant lip — radiant but classic, built on her real features.
- If the person presents as a man: a refined tuxedo or classic wedding suit with a crisp shirt and bow tie or necktie, neat groom hair styling, clean subtle grooming.
- Render the attire with premium detail: realistic fabric behavior (satin sheen, lace texture, wool structure), clean seams and edges — the dress/suit must look expensive and real, never melted, smudged, or warped.
- If hands are visible, render them naturally with the correct number of fingers; a small bouquet is welcome if natural — otherwise keep hands relaxed and simple or out of frame.
- Background: a luxurious, airy wedding studio set — soft white and cream tones, elegant drapery or floral arrangements, dreamy soft-focus depth.
- Bright, soft, romantic studio lighting; graceful, happy, natural expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — they look beautiful on their wedding day." If it reads as a different, generic bride or groom, the result is wrong.

Final look: photorealistic, high-resolution wedding studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME facial structure under the styling, exactly ONE person, inside the SAME fixed composition.`;
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
  console.log(`[wedding] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generateWedding(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("wedding error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}