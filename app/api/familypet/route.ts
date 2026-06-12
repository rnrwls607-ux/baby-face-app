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
async function generateFamilypet(imageDataUrls: string[]): Promise<string> {
  const imgs = imageDataUrls.map(parseImage);
  const prompt = `Image 1 shows the family's beloved PET. Each of the remaining input
images shows ONE human member of the same family. Create ONE single
photorealistic family studio portrait showing ALL the people AND the pet
together in the same photo.
CRITICAL — keep EVERY identity exactly:
- The pet must exactly match image 1: same breed, same fur color and
  patterns, same unique markings, same face. The owner must instantly
  recognize their own pet.
- Each person's face must exactly match their own source image: same
  facial features, same face shape, recognizably the same person.
- Do NOT mix features, do NOT turn anyone into a different person or the
  pet into a different animal, and do NOT add or remove anyone. Every
  person and the pet must appear exactly once.
Family studio styling:
- A premium family photo studio shoot: coordinated neat outfits, the pet
  held in someone's arms or sitting adorably beside the family.
- Clean studio backdrop in a soft tasteful tone, professional soft
  lighting; warm, happy, natural expressions.
Vertical framing with everyone (including the pet) clearly visible.
Photorealistic, high resolution, no text, no watermark, no border.`;
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
            ...imgs.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } })),
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
  console.log(`[familypet] model=${GEMINI_MODEL} n=${imgs.length} status=${res.status} ${Date.now() - t0}ms`);
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
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const images: string[] = Array.isArray(body?.images) ? body.images.filter(Boolean) : [];
    if (images.length < 2) return NextResponse.json({ error: "반려동물 사진과 가족 사진을 각각 한 장 이상 올려주세요." }, { status: 400 });
    if (images.length > 4) return NextResponse.json({ error: "사진은 최대 4장까지 가능해요." }, { status: 400 });
    const output = await generateFamilypet(images);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("familypet error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}