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
const PROMPT_OLD = `You are a professional age-progression artist. Take the person in this
photo and show how they will naturally look as a healthy, graceful person
around 70 years old.
CRITICAL — keep the exact same identity: same face shape, same bone
structure, same distinctive features (eye shape, nose, mouth, moles). The
result must clearly read as the SAME person, simply much older — NOT a
different elderly person.
Apply realistic, natural aging:
- Gray or white hair with natural texture, in a style that suits them.
- Realistic wrinkles and skin aging appropriate for around age 70; slightly
  softer facial contours. Subtle and believable, not exaggerated.
- A warm, kind, natural expression. Neat modern clothing suitable for a
  senior.
Clean, soft studio-like lighting; simple neutral background; vertical
upper-body portrait framing.
Photorealistic, high resolution, no text, no watermark, no border.`;
const PROMPT_BABY = `You are a professional age-regression artist. Take the person in this
photo and show how they looked as an adorable baby around 2 to 3 years old.
CRITICAL — keep the exact same identity: the baby's face must be a
believable younger version of the SAME person — same eye shape, nose,
mouth, and overall facial impression, so anyone who knows them would
instantly say "that's definitely them as a baby."
Render a healthy, happy toddler:
- Natural baby skin, soft baby hair similar in color to the person's hair,
  realistic toddler face and body proportions.
- A cute, simple toddler outfit; bright, cheerful, natural expression.
Soft natural daylight, bright cozy mood; simple clean background; vertical
upper-body portrait framing.
Photorealistic, high resolution, NOT a cartoon, no text, no watermark, no
border.`;
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