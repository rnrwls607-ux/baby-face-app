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
async function generateGraduation(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. This is a graduation KEEPSAKE the family will frame — the face must be truly theirs. Enhance through grooming, lighting, and attire only; NEVER reshape facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional studio photographer shooting a graduation portrait. Take the person in this photo and create a proud, polished graduation photo of them.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY LOCK (highest priority):
- Reproduce the facial structure faithfully: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Keep the apparent age and the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color).
- Clean, natural skin: treat shadows, contrast edges, and compression noise as clean skin; do not invent moles or blemishes. Light, natural grooming only — this is a keepsake, not a fashion editorial.

GRADUATION STYLING:
- Dress them in a CLASSIC, universal graduation gown and mortarboard cap — timeless black academic dress with a simple neutral stole or collar, fitting naturally, with neat attire visible underneath. Do NOT imitate any specific school's official gown, crest, or colors — keep it elegant and generic.
- The mortarboard sits naturally on the head: keep their real hairline and hairstyle visible and natural beneath it — the face under the cap must remain 100% the same person.
- They may hold a diploma scroll or a small bouquet — if hands are visible, render them naturally with the correct number of fingers; if a hand would look awkward, keep it relaxed and simple or out of frame.
- Background: a clean graduation studio setting — soft neutral backdrop or a softly blurred campus scene with elegant, bright tones.
- Clean, soft, professional studio lighting; proud, happy, natural expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — look at them graduating!" If not, the result is wrong.

Final look: photorealistic, high-resolution graduation studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME face under the cap, inside the SAME fixed composition.`;
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
  console.log(`[graduation] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generateGraduation(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("graduation error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}