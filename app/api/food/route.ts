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
  const prompt = `You are a world-class commercial food photographer and retoucher. Transform this casually-taken food photo into a stunning, mouth-watering, thumbnail-worthy food image that makes anyone instantly crave it.

FIRST, identify what the dish is, then apply the freshness cues and styling that make THAT specific type of food most appetizing:
- Soup/stew/hot pot: glossy broth, visible ingredients lifted into view, gentle rising steam.
- Grilled meat / BBQ: caramelized sear marks, juicy glistening surface, light oil sheen.
- Noodles: glossy strands, a sense of motion as if just lifted, steam for hot noodles.
- Fried food: crispy golden-brown texture, dry-crunchy (not greasy) surface.
- Rice dishes: separate glistening grains, steam, vivid toppings.
- Salad/vegetables/fruit: crisp freshness, dewy water droplets, vibrant natural color.
- Dessert/bread/baked goods: moist crumb, flaky layers, dusting detail, soft highlights.
- Cold drinks: condensation droplets on the glass, refreshing clarity.

KEEP THE DISH'S IDENTITY: It must remain clearly the same dish — same food type, same main ingredients, same cuisine, roughly the same plating and portion. Do NOT invent a completely different meal or add fake foods that change what the dish is.

ACTIVELY FIX AND PERFECT IT (be bold, not timid):
- Repair imperfections: if a part has been eaten, bitten, or is missing, naturally restore it to look whole and untouched. Remove bite marks, gaps, and half-eaten areas.
- Clean up: erase spills, drips, smudges, stains, crumbs, fingerprints, and dirty edges on the plate, bowl rim, or table. Make everything spotless.
- Remove distractions: delete table clutter, phones, hands, used utensils, crumpled napkins, receipts, and background noise.
- Perfect the food itself: make it look fresh, hot, and just-served. Restore vibrant natural color, glossy moisture, crisp edges, juicy textures, and appetizing sheen. Fix dull, dried-out, soggy, or greasy-looking areas so the food looks at its peak — but keep it looking like REAL food, never wax-like or fake-perfect.

PRO FOOD-PHOTOGRAPHY TREATMENT:
- Camera & lens: render as if shot on a 100mm macro lens at f/2.8 with a shallow depth of field; sharp focus on the hero element of the dish with a softly blurred background. Use the most flattering angle for this dish (45-degree for most plated food, top-down flat-lay for pizzas/spreads, eye-level for layered items like burgers).
- Lighting: soft, bright, directional side-lighting at ~5500K that sculpts texture and makes the food glow; recover shadow and highlight detail; no flat yellow restaurant light.
- Color: accurate white balance, rich and appetizing tones with high dynamic range — vivid and true-to-life, never oversaturated or artificial.
- Freshness signals: add subtle natural steam wisps to hot dishes; water droplets to fresh produce and cold drinks; a natural glisten to sauces — only where it makes sense for the dish.
- Texture micro-details: bring out sear marks, melting cheese, glistening sauce, droplets, flaky crusts, and fresh garnish that is ALREADY present (do not add new garnish that wasn't there).
- Background & composition: place the dish on a clean, tasteful surface and background color that complements the food's own colors; balanced, professional framing without cropping out any of the food.

FINAL LOOK: ultra-photorealistic, high-resolution, award-winning magazine-cover and delivery-app-thumbnail quality. Crisp, fresh, irresistible, with natural realism. Absolutely NO cartoon, plastic, CGI, or wax-model look. No text, no watermark, no border.`;
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