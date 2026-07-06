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
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. EVERY IDENTITY IS LOCKED INDIVIDUALLY — the PET must exactly match image 1: the same breed, the same fur color and patterns, the same unique markings, the same eye color, the same face; the owner must instantly recognize their own pet — never a different animal or a different individual of the same breed. Each PERSON's face must exactly match their own source image, judged one by one — NEVER mix, blend, or average features between any two people. Everyone appears exactly once: all the people AND the pet, nobody added, removed, or duplicated.
2. COMPOSITION — the output is ALWAYS one vertical family portrait with every person clearly visible from the waist up and the pet fully visible (face unobstructed), all faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows the family's beloved PET. Each of the remaining input images shows ONE human member of the same family. Create ONE single photorealistic family studio portrait showing ALL the people AND the pet together in the same photo.

HOW TO USE THE INPUT PHOTOS
- Image 1 is the identity reference for the PET only. Each remaining image is the identity reference for ITS person only (face and hairstyle). Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one subject, use the clearest, most prominent one.

PET IDENTITY LOCK (image 1 — treat like a photo-retouch subject):
- Same breed, same size class and body proportions for that breed (a small dog stays small, a large dog stays large — never resize the pet unnaturally), same fur length and texture, same color patches in the same places, same unique markings, same eye color, same ear shape and posture, same face.
- The pet's anatomy stays natural and comfortable in the pose — held in someone's arms or sitting beside the family with realistic weight and posture; never distorted, stretched, or doll-like. The pet's face stays fully visible.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries.
- AGE IS PART OF IDENTITY: children stay children, adults stay their age, seniors stay seniors.
- Keep each person's TRUE skin tone individually (never unified), and clean natural skin on everyone — no invented moles or blemishes.

ANTI-BLEND:
- Never average faces toward a "family look," and never let the pet drift toward a generic animal of its breed. Every subject is a specific individual.

Family studio styling:
- A premium family photo studio shoot: coordinated neat outfits, the pet held naturally in someone's arms or sitting adorably beside the family.
- If the pet is held: the holder's hands and arms wrap the pet naturally with the correct number of fingers, supporting its real weight; the pet's body is not squashed or bent unnaturally.
- Clean studio backdrop in a soft tasteful tone, professional soft lighting; warm, happy, natural expressions on everyone — the pet calm and bright-eyed.

FINAL SELF-CHECK before output: first, the owner must instantly say "that's MY pet" (breed, markings, size all correct). Then go person by person — each must be instantly recognizable to their own family. If the pet reads as a different animal, or any face reads as a stranger or a blend, the result is wrong.

Vertical framing with everyone (including the pet) clearly visible. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: every person exactly themselves AND the exact same pet, inside the fixed composition.`;
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