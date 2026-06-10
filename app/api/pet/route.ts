import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePet(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `Create a funny and adorable professional ID/passport-style headshot of the PET (dog or cat) shown in the photo, as if the pet were a person taking an employee ID photo.

IDENTITY — MOST IMPORTANT:
Keep the EXACT same animal as in the input photo — same species, same breed, same fur color and pattern, same face, same eyes, same ears. The owner must instantly recognize it as their own pet. Do NOT turn it into a different animal or a generic stock animal.

OUTFIT: Dress the pet in a tiny formal business suit — a small black blazer with a white dress shirt collar, fitted naturally around the pet's neck and shoulders, as if wearing a real little suit. Make it look cute and believable, not pasted on.

COMPOSITION (consistent ID-photo framing):
- Front-facing, the pet looking straight toward the camera.
- Head and upper body (shoulders) centered in the frame, with a small even margin above the head.
- Calm, neutral, cute expression. Mouth closed or gently relaxed.
- Vertical portrait orientation.

BACKGROUND: A clean, perfectly uniform solid light background (soft white or light blue), flat with NO gradient, NO texture, NO objects.

LIGHTING & SHADOWS: Soft even studio lighting. NO shadow cast on the background behind the pet. Background stays flat and evenly lit.

QUALITY: Photorealistic, sharp focus, natural realistic fur texture, high-resolution studio photo. The suit looks real, the pet looks real.

DO NOT INCLUDE: no text, no watermark, no logo, no border, no human, no extra props, no shadow on background.`;
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
  console.log(`[pet] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generatePet(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("pet error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}