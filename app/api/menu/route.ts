import { NextRequest, NextResponse } from "next/server";
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
  const prompt = `You are a professional food and delivery-app photographer. Take this casually-taken food photo and turn it into a clean, appetizing, high-converting photo ready for a restaurant menu, poster, or delivery app (Baemin, Coupang Eats). Make the food look fresh and delicious so it sells - while staying completely TRUE to the actual dish.

STEP 1 - READ THE DISH, THEN ADAPT
Identify the food type and style it appropriately:
- Soup/stew: gentle rising steam, fresh garnish, rich broth.
- Grilled meat: glossy, juicy, sizzling look.
- Stir-fry/noodles: fresh, vibrant, glossy.
- Fried food: crisp, golden texture.
- Dessert/bakery: bright, clean, soft.
- Drinks/coffee: fresh, with natural condensation for cold drinks.

=== ABSOLUTE - KEEP THE FOOD HONEST (most important) ===
- Keep every dish, ingredient, garnish, side, portion, and plating EXACTLY as it appears. The customer must receive what this photo shows.
- Do NOT add or remove any food. Do NOT add ingredients, toppings, or garnish that are not there. Do NOT increase the portion or make it look like more food. Same cuisine, same amount, same plating. The owner must recognize it as their exact menu item.

=== MAKE IT APPETIZING (within honesty) ===
- Bring out fresh, natural, vibrant color; glossy sauces; gentle steam for hot food; crispness for fried; condensation for cold drinks. Make the existing food look its freshest and most delicious - without changing what it is.

=== CLEAN IT UP AND STYLE IT ===
- Remove all clutter: hands, phones, receipts, napkins, messy table items.
- Background: place the dish on ${styleLine}.
- Composition: balanced and centered with comfortable margins so text could be added later - but do NOT add any text yourself.

PHOTOGRAPHY SPEC
- Bright, soft, even studio lighting; crisp focus on the dish; gentle separation from the background (shallow depth of field); an appetizing straight-on or 45-degree angle. High-end food / delivery-app thumbnail quality.

KEEP IT REAL
- Photorealistic only. Real food textures, real light. NOT a CGI render, NOT a 3D model, NOT over-processed or plastic-looking. No fake garnish.

OUTPUT
- High-resolution, clean, appetizing, professional. No text, no watermark, no logo, no border.`;
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
  console.log(`[menu] model=${GEMINI_MODEL} style=${styleKey} status=${res.status} ${Date.now() - t0}ms`);
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