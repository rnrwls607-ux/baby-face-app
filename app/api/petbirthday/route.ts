import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetbirthday(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the input pet photo into an adorable premium birthday party portrait — THIS pet as the star of its own birthday celebration, photographed like a high-end pet studio's birthday package. Joyful, bright, and irresistibly cute — and unmistakably the owner's own pet.

PET IDENTITY (absolute):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. The owner must instantly recognize their baby.
- Freshly groomed and glowing: clean fluffy healthy coat with natural shine, bright sparkling eyes, a happy relaxed expression natural to this animal (a cheerful open-mouth smile for a dog, bright-eyed perk for a cat). Groom and brighten ONLY — never alter breed traits, markings, colors, or proportions.

BIRTHDAY STYLING (cute, safe, never covering the pet):
- A small festive party hat (soft pastel cone with a pompom) sits lightly on its head, tilted charmingly — small enough that ears, eyes, and the whole face stay fully visible.
- Optionally ONE more accessory at most: a soft pastel ribbon bow tie OR a tiny festive bandana around the neck — light and comfortable, never a full costume, never distorting anatomy.
- If the pet wears its own collar in the source, the accessory may sit with it; never remove or change the original collar.

THE PARTY SET — premium studio, not clutter:
- A pastel birthday studio scene: a soft solid backdrop in warm cream or gentle pink, a few floating balloons in matching pastels (cream, blush, soft gold), a subtle confetti sprinkle in the air, maybe a string of small triangle flags high in the background.
- A cute pet-friendly birthday cake on a small stand BESIDE the pet — a soft cream-colored pet cake with one or two unlit or softly-lit candles, clearly a decorative prop at a small distance; the pet is NOT eating, licking, or touching it.
- Styling is tasteful and airy — a premium studio package look, never cheap party clutter. The pet remains the clear star, filling most of the frame.

TEXT BAN (critical — birthday scenes tempt the model here):
- Absolutely NO letters or numbers anywhere: no "HAPPY BIRTHDAY" banners, no writing on the cake, no lettered garlands, no balloon text, no age numbers. Flags and banners must be plain colored shapes only. If a spot begs for lettering, use plain bunting or leave it clean.

LIGHT & FINISH:
- Bright, soft, warm studio lighting — the whole scene cheerful and glowing, the pet's face perfectly lit with a delicate rim light on the fur.
- Photorealistic premium studio photography: crisp fur detail, gentle depth of field with the backdrop and balloons melting softly. NOT a cartoon, NOT an illustration.
- Vertical portrait framing, the pet's face large and central.

SELF-CHECK before finishing:
- Side by side with the input: exactly the same pet — markings in the same places, same face? Hat small, face and ears fully visible? At most one extra accessory? Cake beside (not touched), candles safe? ZERO letters or numbers anywhere — cake, flags, balloons all plain? Only then is the portrait complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or marking placement.
- Any letters, numbers, or writing anywhere in the scene.
- A big hat covering ears or eyes; full costumes; anything tight or uncomfortable-looking.
- The pet eating, licking, or reaching for the cake; lit candles right at its face; chocolate-looking cake.
- Cheap cluttered party-store look; harsh saturated colors; cartoon/illustration style; plastic fur.
- Extra or missing paws, ears, tails; watermarks, borders.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
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
      "petbirthday"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petbirthday] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petbirthday"));
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
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetbirthday(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petbirthday error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}