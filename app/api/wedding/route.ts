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
function buildPrompt(role: "bride" | "groom"): string {
  const ROLE_WORD = role === "groom" ? "GROOM" : "BRIDE";
  const styling = role === "groom"
    ? `- Wardrobe: a refined black or midnight-navy tuxedo (or a classic formal wedding suit) over a crisp white dress shirt, with a neat bow tie or tie and a small boutonnière.
- Hair: neat, polished groom styling keeping his real hairstyle, length, and true hair color.`
    : `- Wardrobe: an elegant, classic white wedding dress with tasteful refined details (clean silhouette — not gaudy). She may optionally hold a small elegant bouquet.
- Hair & makeup: a graceful bridal hairstyle that is a natural evolution of her real hairstyle, keeping her true hair color; soft bridal makeup that brightens but never changes her features.`;
  return `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. This is a WEDDING PORTRAIT of this one real person — the elegant wardrobe, styling, and lighting are the transformation; NEVER reshape their facial features.
2. ROLE — the person in this photo is the ${ROLE_WORD}. Style them exactly as described in the WEDDING STYLING section below, even if their appearance might read differently. Never switch the wardrobe to the other role.

TASK
You are RETOUCHING a real photograph of one real person into a single elegant solo wedding studio portrait — NOT generating a new person. Keep the face as it is, lightly polished; transform only wardrobe, hair styling, background, lighting, and framing to the wedding standard below. Output exactly one wedding portrait of this one person.

HOW TO USE THE INPUT PHOTO
- Ignore the input photo's framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the standard wedding-portrait composition below.

IDENTITY LOCK — replicate the face, do not redesign it (highest priority)
- Reproduce the facial structure exactly as in the source: the same face shape and width-to-length ratio, the same hairline and forehead height, the same jaw and chin shape and width, the same cheek fullness and cheekbones, the same eye size and shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing and proportions between all features. Keep the person's natural asymmetries — they are part of the identity.
- Do not drift toward a generic, idealized, or "prettier" face. This is one specific individual; do not slim, enlarge, sharpen, or beautify anything — the bridal/groom beauty comes from wardrobe, styling, and lighting, never from reshaping features.
- Keep the apparent age and sex characteristics as in the source, and the person's TRUE skin tone (correct any warm/cool color cast from the source lighting, but never lighten, darken, or shift the actual skin tone).
- Keep facial hair (beard, stubble, mustache, or clean-shaven) exactly as in the source.

SKIN & MARKS (absolute rule: flawless clean skin)
- Render completely clean, smooth, even, healthy skin with good color; correct any dull or off color from the source lighting. Acne, pimples, blemishes, redness, irritation, discoloration, dark spots, and skin texture issues in the source are TEMPORARY skin conditions — NOT part of the person's identity. Remove them ALL and render that area as perfectly clean skin, exactly like a professional studio retouch with light makeup.
- Treat shadows, contrast edges, lighting gradients, and compression artifacts in the source photo as clean skin — never mistake them for real marks. Soften pores and wrinkles to about half strength — a lightly-retouched look that keeps the person's real age, never plastic.
- Marks: render AT MOST ONE mole in the entire face, and ONLY if it is large and iconic in the source — smaller and fainter than the source. Two or more marks are NEVER allowed. When in ANY doubt, render zero marks.

WEDDING STYLING
${styling}
- Background: a luxurious, airy wedding studio set — soft white and cream tones, elegant drapery or floral arrangements, dreamy soft-focus depth.
- Lighting: bright, soft, romantic studio lighting, flattering and even.
- Expression: a graceful, happy, natural soft smile — subtle, never exaggerated; eyes relaxed and on camera.
- Eyewear & accessories: eyeglasses ONLY if the person is clearly wearing them in the source photo — then keep them (clear, glare-free). If they are NOT wearing glasses in the source, the output must have NO glasses — never add eyewear of any kind.
- Hands: render naturally and correctly with the right number of fingers; if a hand would look awkward, keep it relaxed and simple.

FRAMING
- Vertical upper-body wedding portrait: from roughly the head to the waist, centered, portrait-lens perspective (~85mm, no wide-angle distortion), with a small even margin above the head.

FINAL SELF-CHECK before output: placed next to the source photo, a family member must instantly say "that's the same person, in a wedding portrait." Also check the skin: if the output face has two or more spots/marks, or any acne or blemish, the result is wrong. And confirm the wardrobe matches the role: ${ROLE_WORD} styling only.

OUTPUT
- High-end wedding studio photography, photorealistic and elegant. No text, no watermark, no border.`;
}

async function generateWedding(imageDataUrl: string, role: "bride" | "groom"): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = buildPrompt(role);
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
    const role: "bride" | "groom" = body?.role === "groom" ? "groom" : "bride";
    const output = await generateWedding(image, role);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("wedding error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}