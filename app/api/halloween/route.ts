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
const BASE_RULE = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must still be unmistakably the SAME person, fully transformed by Halloween costume, hair, and light costume makeup. The goal is "them, at the best Halloween party of their life" — never a different person and never a monster that hides them. Transform through COSTUME, HAIR, ACCESSORIES, SET, and LIGHTING at full strength; costume makeup stays LIGHT and decorative around their real features. HARD LIMITS: no full-face paint, no prosthetics that change the face shape, no wounds, no blood, no gore, no enlarging eyes / slimming jaw / raising nose — the same face shape and width-to-length ratio, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, nose, philtrum, lips, eyebrows, spacing, and natural asymmetries, at their apparent age, in their TRUE skin tone base.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait with the person as the clear HERO of the frame. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

The input photos are a reference for IDENTITY ONLY — ignore their framing, zoom, background, lighting, clothing, and grooming; the Halloween styling replaces them. Do NOT average faces across photos; use the clearest, most front-facing photo as the single primary reference. Clean skin base — do not invent moles or blemishes; decorative makeup is applied on top.
PROP BALANCE: pumpkins, candles, fog, and set decorations stay BEHIND and around the person as a softly blurred backdrop — they never crowd, overlap, or outshine the subject.

FINAL SELF-CHECK: friends must react "the costume is amazing — and it's totally YOU." If the face reads as a different person or is hidden by makeup, the result is wrong.
Photorealistic, high resolution, no text, no watermark, no border.`;
const HALLOWEEN_PROMPTS: Record<string, string> = {
  vampire: `You are a Halloween party photographer. Portray this person as an elegant modern VAMPIRE:
${BASE_RULE}
Styling: a refined dark costume — high-collared cape or velvet jacket over sleek attire; slicked or softly dramatic hair; light costume makeup only: a subtle porcelain finish over their true skin tone, a deep wine lip, softly smoked eyes following their real eye shape; fangs only as a hint — visible just subtly with a closed-lip smirk, never distorting the mouth. Set: a moody candlelit gothic interior with soft haze, deep burgundy and midnight tones, cinematic rim light.`,
  witch: `You are a Halloween party photographer. Portray this person as a stylish WITCH or WIZARD:
${BASE_RULE}
Styling: an elegant black witch/wizard ensemble — a wide-brim pointed hat sitting naturally WITHOUT shading or hiding the face (hairline and full face stay visible), flowing dark robes with subtle celestial embroidery, a broom or an old spellbook as a side prop; light mystical makeup only (a soft plum or emerald accent on the lids following their real eye shape). Set: a magical night scene — floating candles, drifting sparks, a large moon in soft-focus behind, deep purple-teal palette.`,
  fairy: `You are a Halloween party photographer. Portray this person as an enchanting DARK FAIRY:
${BASE_RULE}
Styling: an ethereal costume in deep forest tones — delicate layered fabrics, a fine vine-and-berry crown resting lightly on their real hairstyle, translucent fairy wings glowing softly BEHIND the shoulders (never covering the face or body front); light shimmer makeup only — a dusting of fine glitter on the cheekbones and lids following their real features. Set: a moonlit enchanted forest with fireflies and soft mist, teal-violet palette, dreamy backlight.`,
};
async function generateHalloween(imageDataUrl: string, costume: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = HALLOWEEN_PROMPTS[costume] || HALLOWEEN_PROMPTS.vampire;
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
  console.log(`[halloween] model=${GEMINI_MODEL} costume=${costume} status=${res.status} ${Date.now() - t0}ms`);
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
    const costume: string = typeof body?.costume === "string" ? body.costume : "vampire";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHalloween(image, costume);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("halloween error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
