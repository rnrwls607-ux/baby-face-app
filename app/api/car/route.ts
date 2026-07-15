import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateCar(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE CAR IS UNTOUCHABLE — this is a WASH, not a repair and not a re-generation. The output must show the EXACT same vehicle in the same spot: the same make, model, trim, and year cues (same grille, headlights, wheels, and badges — never a newer-looking or different car); the same license plate, odometer, and badge text kept pixel-faithful (never redrawn or regenerated); the same part count and configuration (no added or removed options, spoilers, or trim pieces); and — critically — every scratch, dent, scuff, chip, rust spot, crack, curb rash, and worn tire stays visible. A wash removes dirt, never damage. If dirt was hiding a flaw, cleaning makes it MORE visible, never erases it. The same background, surroundings, camera angle, and framing.
2. WHAT MAY CHANGE — the PHOTOGRAPH and the DIRT only: brightness and even lighting, accurate natural color (keeping the exact paint color and finish), sharpness and noise cleanup, and washing dirt, dust, mud, water spots, and smudges off the body, glass, and wheels — freshly washed, not repaired.

Retouch this exact photo of a used car for an honest listing (Encar, KB Chachacha, Danggeun). A photo that hides flaws causes disputes and refunds — the goal is the same car, clean and clearly visible.

CHANGE (boldly, within the wash):
- Brighten and even out the lighting so the car and its true condition are clearly visible. Fix any color cast for natural, accurate color — the exact paint color and finish stay (metallic stays metallic, matte stays matte).
- Wash off all dirt, dust, mud, water spots, and smudges from the body, glass, and wheels, giving the car its real freshly-washed gloss level. Reflections on the cleaned body must stay consistent with the actual surroundings — never paint in fake studio reflections or skies.
- Reduce photo noise and compression artifacts.

KEEP EXACTLY (do not touch):
- Every scratch, dent, scuff, chip, rust spot, crack, curb rash, and worn tire.
- The same background and surroundings, the same camera angle.
- The odometer reading, badges, and license plate exactly as photographed.

KEEP IT BELIEVABLE:
- Photorealistic and natural — it must look like the same real photo, just cleaner and brighter. Not a glossy brochure, not over-processed, not CGI. Still a used car, not a new one.

FINAL SELF-CHECK before output: the seller must say "that's my car, freshly washed," and a buyer inspecting the real car must find every mark the photo shows — and no marks the photo hid. If any damage disappeared or the car reads as a different or newer vehicle, the result is wrong.

OUTPUT: high-resolution, natural, honest. No text, no watermark, no border. Remember the two absolute rules: the SAME car with its SAME flaws — only washed and well photographed.`;
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
      "car"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[car] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "car"));
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
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateCar(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("car error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}