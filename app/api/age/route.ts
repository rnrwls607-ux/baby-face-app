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
const PROMPT_OLD = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be THIS exact person aged to ~70: instantly recognizable as the same individual, side by side with the source. Aging is the ONLY transformation allowed.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional, photorealistic age-progression artist. Take the person in this photo and show how they will naturally look as a healthy, graceful person around 70 years old.

HOW TO USE THE INPUT PHOTO
- The input is a reference for IDENTITY ONLY (face, features, true coloring). Ignore its framing, zoom, background, lighting, and clothing completely.

STEP 1 — Read the person first:
Note their gender, ethnicity, skin tone, face shape, and distinctive features. The aged result MUST keep the same gender, the same ethnicity and skin tone, and the same core facial structure. This is an older version of THIS specific person — never a different elderly person.

STEP 2 — Preserve identity (MOST IMPORTANT):
- Keep the exact same face shape and width-to-length ratio, bone structure, eye size and shape, eyelid type (double eyelid stays double, monolid stays monolid), ears, nose bridge/width/tip, philtrum, mouth and lip shape, eyebrows, and the spacing/proportions between all features.
- Keep the person's natural asymmetries — they are part of the identity.
- Keep the same hairline pattern and a hairstyle that is a natural evolution of their current one — just grayed or whitened.
- Keep distinctive features (moles, dimples, single/double eyelids) exactly where they are. Do NOT invent new moles, marks, or scars that are not in the source — natural aging texture only.
- Anyone who knows them must instantly recognize this as the SAME person, simply much older.

STEP 3 — Apply realistic, natural aging to about 70:
- Gray or white hair with natural texture (somewhat thinner is fine), in a style that suits them.
- Believable signs of aging for around 70: forehead lines, crow's feet, nasolabial folds, gentle neck aging, softer facial contours, natural age spots and realistic skin texture. Subtle and believable — not exaggerated, not frail, not 90+.
- Render the skin in the person's TRUE tone — correct any color cast from the source lighting; the lighting color must never become the skin color.
- A warm, kind, natural expression. Neat, modern clothing suitable for a dignified senior.

Clean, soft studio-like lighting; simple neutral background; vertical upper-body portrait framing.

ABSOLUTELY AVOID:
- Changing gender, ethnicity, or skin tone.
- Turning them into a generic, unrelated elderly person.
- Over-aging (looking 90+, sickly, or frail), or any cartoon/illustration look.
- Any text, letters, watermark, or border.

FINAL SELF-CHECK before output: placed next to the source photo, a family member must instantly say "that's the same person, older." If not, the result is wrong.

Photorealistic, high resolution. Remember the two absolute rules: the SAME person's identity, inside the SAME fixed upper-body composition — regardless of how the input was framed.`;
const PROMPT_BABY = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be THIS exact person as a baby (2–3 years old): a believable younger version of the same individual, never a generic baby. Age-regression is the ONLY transformation allowed.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional, photorealistic age-regression artist. Take the person in this photo and show how they looked as an adorable baby around 2 to 3 years old.

HOW TO USE THE INPUT PHOTO
- The input is a reference for IDENTITY ONLY (features, true coloring). Ignore its framing, zoom, background, lighting, and clothing completely.

STEP 1 — Read the person first:
Note their gender, ethnicity, skin tone, and distinctive facial features. The baby MUST keep the same gender, the same ethnicity and skin tone, and recognizable feature cues. This is THIS specific person as a baby — never a generic, unrelated baby.

STEP 2 — Preserve identity (MOST IMPORTANT):
- Make the baby a believable younger version of the same person: same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), same (where natural) eye color, a similar nose and mouth impression, similar face width-to-length impression, and the same overall facial impression.
- Keep distinctive cues that translate to a baby (single/double eyelids, dimples, etc.). Do NOT invent moles or marks that are not in the source.
- Anyone who knows them should instantly say "that's definitely them as a baby."

STEP 3 — Render a healthy, happy toddler (about 2–3 years old):
- Natural, realistic toddler proportions: rounder face and fuller cheeks, larger eyes relative to the face, a small soft nose, soft baby skin. This must look like a real toddler — NOT an adult face shrunk down.
- Soft baby hair similar in color to the person's hair (sparse is fine, as is natural for a toddler).
- Render the skin in the person's TRUE tone — correct any color cast from the source lighting.
- A cute, simple toddler outfit; a bright, cheerful, natural expression.

Soft natural daylight, bright cozy mood; simple clean background; vertical upper-body portrait framing.

ABSOLUTELY AVOID:
- Changing gender, ethnicity, or skin tone.
- An uncanny "tiny adult" look (an adult-proportioned face on a baby).
- A generic baby that does not resemble the person.
- Any cartoon/illustration style, text, letters, watermark, or border.

FINAL SELF-CHECK before output: a family member must instantly say "that's them as a baby." If not, the result is wrong.

Photorealistic, high resolution. Remember the two absolute rules: the SAME person's identity as a toddler, inside the SAME fixed composition.`;
async function generateAge(imageDataUrl: string, mode: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = mode === "baby" ? PROMPT_BABY : PROMPT_OLD;
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
  console.log(`[age] model=${GEMINI_MODEL} mode=${mode} status=${res.status} ${Date.now() - t0}ms`);
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
    const mode: string = body?.mode === "baby" ? "baby" : "old";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateAge(image, mode);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("age error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}