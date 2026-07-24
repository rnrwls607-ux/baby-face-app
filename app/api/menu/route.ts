import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";

const STYLES: Record<string, string> = {
  white: "a clean bright white or light neutral surface, minimal and crisp",
  wood: "a warm natural wood table, cozy and homey",
  dark: "a dark moody background with focused lighting, premium restaurant feel",
  pop: "a very bright, vivid, high-contrast surface that pops on a delivery-app thumbnail",
  korean: "a warm traditional Korean table feel with subtle wood and hanji tones",
  cafe: "a light table with soft natural window light, cozy cafe aesthetic",
};

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateMenu(imageDataUrl: string, styleKey: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const styleLine = STYLES[styleKey] || STYLES.white;
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE FOOD IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The customer must receive exactly what this photo shows: the same dish, the same ingredients, the same preparation and CUT STYLE of every ingredient (shredded stays shredded, sliced stays sliced, whole stays whole), the same count and placement of toppings and sides, the same portion, the same plating. NEVER add, remove, swap, or replace any food. Never make the portion look bigger. A breaded cutlet stays a breaded cutlet; finely shredded garnish stays finely shredded.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, true-color accuracy, sharpness, natural freshness cues, cleanup of clutter, and the background/surface. This is where you work boldly.

You are a professional food and delivery-app photographer. Take this casually-taken food photo and turn it into a clean, appetizing, high-converting photo ready for a restaurant menu, poster, or delivery app (Baemin, Coupang Eats) — while staying completely TRUE to the actual dish, because a photo that overpromises creates refunds and bad reviews.

STEP 1 - READ THE DISH, THEN ADAPT (freshness cues only — never changing the food):
- Soup/stew: gentle rising steam, rich glossy broth — same visible ingredients.
- Grilled meat: glossy, juicy, sizzling look — same cuts, same count.
- Stir-fry/noodles: fresh, vibrant, glossy — same components.
- Fried food: crisp, golden texture — same coating, same shape.
- Dessert/bakery: bright, clean, soft — same item, same decoration.
- Drinks/coffee: fresh, natural condensation for cold drinks — same drink, same garnish.

MAKE IT APPETIZING (within honesty):
- Bring out fresh, natural, vibrant color; glossy sauces; gentle steam for hot food; crispness for fried; condensation for cold drinks. The existing food at its freshest — never different food, never invented garnish.

CLEAN IT UP AND STYLE IT:
- Remove all clutter: hands, phones, receipts, napkins, messy table items.
- Background: place the dish on ${styleLine}.
- Composition: balanced and centered with comfortable margins so text could be added later — but do NOT add any text, letters, or numbers yourself.

PHOTOGRAPHY SPEC:
- Bright, soft, even studio lighting; crisp focus on the dish; gentle separation from the background (shallow depth of field); an appetizing straight-on or 45-degree angle. High-end delivery-app thumbnail quality.

KEEP IT REAL:
- Photorealistic only. Real food textures, real light. NOT a CGI render, NOT a 3D model, NOT over-processed or plastic-looking. No fake garnish.

FINAL SELF-CHECK before output: the owner must recognize it as their exact menu item, and a customer comparing this photo to the delivered dish must find zero differences in the food itself. If anything about the food changed, the result is wrong.

OUTPUT: high-resolution, clean, appetizing, professional. No text, no watermark, no logo, no border. Remember the two absolute rules: the SAME honest dish, only the photography improved.`;
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
      "menu"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[menu] model=${GEMINI_MODEL} style=${styleKey} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "menu"));
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

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const style: string = typeof body?.style === "string" ? body.style : "white";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateMenu(image, style);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("menu error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("menu", 0, handler); // COIN_DORMANT: 실가격 3
