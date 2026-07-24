import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
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
async function generateFood(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE DISH IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The output must show the EXACT same dish as the input: the same food type, the same ingredients, the same preparation and CUT STYLE of every ingredient, the same count and placement of every topping and side, the same plating, the same portion, on the same kind of dish. NEVER invent, add, swap, remove, or replace any food element. Concrete examples of forbidden changes: a breaded pork cutlet (donkatsu) must stay a breaded pork cutlet — never morph into a hamburg steak or any other dish; finely shredded perilla leaves must stay finely shredded — never become one whole leaf; three shrimp must stay exactly three shrimp in the same spots; a garnish's cut style (shredded / julienned / sliced / diced / whole) must stay identical.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, color accuracy, sharpness, natural gloss and freshness cues, removal of mess and clutter, and the surface/background. Be bold HERE — and only here.

You are a world-class commercial food photographer and retoucher. Make this casually-taken photo of the dish look stunning, mouth-watering, and thumbnail-worthy — while keeping it unmistakably the SAME dish the owner cooked.

FIRST, identify what the dish is, then apply the freshness cues that make THAT specific type of food most appetizing (never changing the food itself):
- Soup/stew/hot pot: glossy broth, gentle rising steam; the visible ingredients stay the same ingredients.
- Grilled meat / BBQ: caramelized sear marks, juicy glistening surface, light oil sheen — on the same cuts, same count.
- Noodles: glossy strands, steam for hot noodles — same noodle type, same toppings.
- Fried food: crispy golden-brown texture, dry-crunchy (not greasy) surface — same coating, same shape.
- Rice dishes: separate glistening grains, steam — same toppings in the same places.
- Salad/vegetables/fruit: crisp freshness, dewy droplets, vibrant natural color — same produce, same cut style.
- Dessert/bread: moist crumb, flaky layers, soft highlights — same item, same decoration.
- Cold drinks: condensation droplets, refreshing clarity — same drink, same garnish.

CLEAN UP AND REPAIR (bold, but identity-safe):
- Erase spills, drips, smudges, stains, crumbs, fingerprints, and dirty edges on the plate, bowl rim, or table.
- Remove distractions: table clutter, phones, hands, used utensils, napkins, receipts, background noise.
- If a part has been eaten, bitten, or is missing: restore it with MORE OF THE EXACT SAME food (fill a missing cutlet slice with an identical cutlet slice; never with different food), so the dish looks whole and untouched.
- Revive dull, dried-out, or soggy areas to look fresh and just-served — the same ingredient at its peak, never a different ingredient.

PRO FOOD-PHOTOGRAPHY TREATMENT:
- Camera & lens: as if shot on a 100mm macro lens at f/2.8, shallow depth of field; sharp focus on the hero element, softly blurred background. Most flattering angle for this dish (45° for most plated food, top-down for pizzas/spreads, eye-level for layered items).
- Lighting: soft, bright, directional side-lighting at ~5500K that sculpts texture; recover shadow and highlight detail; no flat yellow restaurant light.
- Color: accurate white balance, rich appetizing tones, vivid and true-to-life — the food's REAL colors at their best, never shifted to different colors, never oversaturated.
- Freshness signals: subtle steam for hot dishes, droplets for fresh produce and cold drinks, natural glisten on sauces — only where it makes sense, never adding new garnish or ingredients that weren't there.
- Background & composition: place the dish on a clean, tasteful surface that complements the food's own colors; balanced framing without cropping out any of the food.

FINAL SELF-CHECK before output: the restaurant owner must say "that's exactly the dish I cooked — just photographed beautifully," and a customer comparing photo to delivery must find zero differences in what's actually in the dish. If any ingredient changed type, cut style, count, or position, the result is wrong.

FINAL LOOK: ultra-photorealistic, high-resolution, delivery-app-thumbnail quality. NO cartoon, plastic, CGI, or wax look. No text, no watermark, no border. Remember the two absolute rules: the SAME dish, only the photography improved.`;
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
      "food"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[food] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "food"));
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
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateFood(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("food error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("food", 0, handler); // COIN_DORMANT: 실가격 3
