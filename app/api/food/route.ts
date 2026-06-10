import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFood(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a professional commercial food photographer and retoucher.
Transform this casually-taken restaurant photo into an advertising-quality
food image suitable for a menu, catalog, or ad campaign.
CRITICAL — preserve the actual food exactly:
- Keep every dish, ingredient, garnish, topping, and side exactly as it
  appears. Do NOT add any food, ingredient, or prop that is not already in
  the photo, and do NOT remove or hide any food that is present.
- Keep the same number of items, same portion sizes, same plating
  arrangement, and the same cuisine. The viewer must recognize it as the
  exact same meal.
Enhance ONLY the photographic quality:
- Lighting: replace flat or yellow restaurant lighting with soft, bright,
  directional light that makes the food look fresh and appetizing; recover
  detail in shadows and highlights.
- Color: correct the white balance, remove color casts, and render colors
  rich, accurate, and appetizing — vibrant but natural, never oversaturated
  or artificial.
- Texture & freshness: bring out the natural gloss, moisture, crispness,
  and texture that are already present in the food.
- Background & composition: clean up non-food distractions (table clutter,
  phones, hands, crumpled napkins), apply a tasteful shallow depth-of-field
  blur to the background, and subtly refine the framing for a balanced,
  professional composition — without cropping out any of the food.
Final look: photorealistic, high-resolution commercial food photography.
Clean, crisp, mouth-watering, magazine quality. No cartoon or plastic look,
no artificial-looking additions, no extra garnish that wasn't there.`;
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
  console.log(`[food] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generateFood(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("food error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}