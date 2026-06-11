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
  const prompt = `You are a professional photo restoration and colorization expert.
Restore this old, damaged, faded photograph and add natural, realistic color.
CRITICAL — preserve identity and content exactly:
- Keep every person's face, identity, expression, pose, clothing, and the
  background composition exactly as in the original. Do NOT change who is in
  the photo or what they look like.
Restoration:
- Repair scratches, tears, creases, stains, spots, and missing areas.
- Reduce noise and graininess; recover lost detail and sharpness gently.
- Fix faded, yellowed, or discolored areas; rebalance overall tones.
Colorization (only if the photo is black & white or sepia):
- Add natural, believable, period-appropriate colors for skin, hair,
  clothing, and background. Keep colors soft and realistic, never neon or
  oversaturated.
Final look: a faithfully restored real photograph, as if scanned from a
well-preserved original. Photorealistic, natural, respectful of the era.
No modernization of clothing or hairstyles, no added or removed people,
no artificial-looking color, no watermark.`;
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