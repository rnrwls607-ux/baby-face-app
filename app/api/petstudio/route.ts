import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetstudio(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PET'S IDENTITY IS UNTOUCHABLE — the exact same pet: the same breed, the same size class and body proportions for that breed (a small dog stays small, a large dog stays large), the same fur color, pattern, length, and texture, the same unique markings in the same places, the same eye color, the same ear shape, the same face. The owner must instantly recognize their own pet. Never a different animal, never a different individual, never a generic stock animal — and never invent markings or colors that are not in the source.
2. COMPOSITION — the output is ALWAYS a vertical portrait centered on the pet, the pet as the clear HERO of the frame, regardless of the input photo's framing, zoom, crop, or angle.

You are a luxury pet studio photographer. Take the pet in this photo and create a premium studio portrait of them — like an expensive pet photo studio package shot.

HOW TO USE THE INPUT PHOTO
- The input is a reference for the PET'S IDENTITY ONLY. Ignore its framing, zoom, background, and lighting.
- Render the fur in its TRUE color under the studio light — color casts from the source lighting must not become the fur's actual color.

STUDIO TREATMENT (the product — style boldly here):
- Elegant studio setting: soft seamless backdrop in a tasteful tone that complements the pet's fur, with premium soft studio lighting and a gentle rim light that makes the fur look fluffy and richly detailed.
- The pet posed naturally and adorably (sitting or lying) in an anatomically comfortable, breed-realistic posture — never stretched, twisted, or doll-like — looking toward the camera with bright, lively eyes.
- PROP BALANCE: at most one tasteful prop (a small cushion or ribbon) placed beside or under the pet — clean and classy, never cluttered, never covering the pet's face, markings, or body. The pet is the hero; everything else stays subtle.
- Vertical portrait framing centered on the pet, with the ears and top of the head never cropped.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY pet — this looks like an expensive studio shoot." Same breed, same markings, same size impression, same eyes. If it reads as a different or generic animal, the result is wrong.

Final look: photorealistic, high-resolution premium pet studio photography — sharp fur detail, beautiful bokeh. No text, no watermark, no border, no human. Remember the two absolute rules: the SAME pet, hero of the SAME fixed composition.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
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
      },
      "petstudio"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petstudio] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petstudio"));
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
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 펫 스튜디오: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetstudio(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petstudio error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}