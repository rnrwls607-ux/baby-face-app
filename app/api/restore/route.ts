import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateRestore(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a master photo-restoration and colorization artist. Restore this old, damaged, or faded photograph so it looks like a freshly scanned, well-preserved original - and where appropriate, add natural color. Be thorough and confident in repairing damage, but treat the people's identity as sacred and untouchable.

STEP 1 - READ THE PHOTO, THEN ADAPT
First assess what you are working with, then restore accordingly:
- Damage level: lightly faded vs heavily damaged (deep scratches, tears, missing chunks, water or mold stains). Repair as much as the damage demands.
- Photo type: black and white / sepia / faded-and-color-shifted color / mostly-fine color. Handle color per the rules below.
- Subject: portrait (faces are the top priority) / group photo (every face matters equally) / scene or object. Spend the most care on faces and eyes.

=== ABSOLUTE - NEVER CHANGE (identity is sacred) ===
- Keep every person's exact face, likeness, bone structure, facial proportions, age, expression, and pose. This is a real person and a real memory - restore the actual person, NOT an idealized version.
- Do NOT beautify, slim, smooth away, de-age, or "improve" any face. Do NOT change eye shape, nose, mouth, skin, or hairstyle. No modern makeup or features.
- Do NOT add, remove, duplicate, or move any person. Keep clothing, accessories, and the background composition exactly as in the original.
- Keep the original era and style. No modernizing of clothes, hair, or objects.
- Preserve any visible text, handwriting, dates, or studio stamps faithfully; never invent or produce fake or garbled lettering.

=== RESTORE THOROUGHLY (repair damage with confidence) ===
- Remove scratches, tears, creases, folds, stains, spots, and dust, and fill missing or torn areas by reconstructing what was plausibly there (matching surrounding texture and lighting).
- Reduce noise and grain and recover lost detail and sharpness - but keep a natural photographic texture. Do NOT over-smooth into a plastic, airbrushed, "AI" look; keep real skin texture (pores, fine lines) and believable film character.
- Recover the full tonal range: clean (not crushed) shadows, bright (not blown-out) highlights, balanced midtones. Fix fading, yellowing, and discoloration.

COLOR
- If the photo is BLACK AND WHITE or SEPIA: add natural, believable, period-appropriate color to skin, hair, eyes, clothing, and background. Soft and realistic - never neon, never oversaturated.
- If the photo is FADED or COLOR-SHIFTED color: do not recolor from scratch - correct the color cast and revive the original colors to look natural and vivid-but-real.
- If the color is already fine: focus on damage repair and keep the palette faithful.

FINAL LOOK
- A faithfully restored real photograph, as if scanned from a pristine original. Photorealistic, natural, respectful of the era. Lifelike eyes and skin.
- No watermark, no text overlay, no borders, no added logos. Restore the memory - do not reinvent it.`;
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
  console.log(`[restore] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
  return `data:image/png;base64,${b64}`;
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateRestore(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("restore error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}