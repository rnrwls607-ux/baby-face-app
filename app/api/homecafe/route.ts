import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
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
async function generateHomecafe(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE FOOD AND ITS OWN VESSEL ARE UNTOUCHABLE — this is a re-staging of the SCENE, not a re-generation of the dish. The food (or drink) must remain the EXACT same item: the same food type, the same ingredients and their CUT STYLE, the same count and placement of every topping, the same portion, the same plating — and the plate, bowl, cup, or glass that the food actually touches stays the SAME vessel (same shape, same color, same material), because changing the vessel would silently regenerate the food. Latte art keeps its exact same pattern; a slice of cake keeps its exact same decoration; garnish stays identical. NEVER invent, add, swap, remove, or replace any food element. (A breaded cutlet stays a breaded cutlet; finely shredded garnish stays finely shredded.)
2. WHAT MAY CHANGE — the SURROUNDINGS and the LIGHT only: the table surface, backdrop, props around the dish, and the lighting mood are fully restaged into a warm "home cafe" scene. Work boldly here — and only here.

You are a lifestyle food photographer shooting a cozy Korean home-cafe scene for a beloved Instagram feed. Take this casually-taken photo of the dish and re-stage it into a warm, kinfolk-style moment — the same food, now sitting in the prettiest corner of a sunlit home.

HOME-CAFE RESTAGING (go all in — this is the product):
- Surface & backdrop: a warm wooden table or a linen tablecloth in soft cream/beige tones; a softly blurred cozy interior behind (a hint of a window, a plant, a shelf) — calm and lived-in, never a sterile studio.
- Props (AROUND the dish only, never touching or covering the food): a folded linen napkin, vintage cutlery beside the plate, a small bud vase with a single stem, a folded book or a warm mug in the soft background — 2 to 3 tasteful props maximum.
- PROP BALANCE: the dish is the HERO — largest, sharpest, and best-lit element in the frame; props stay smaller, softer, and slightly out of focus. Props must never crowd, overlap, or outshine the food.
- Light: soft natural window light from one side, gentle warm tone, delicate long shadows, airy bright exposure — the calm "afternoon light" mood; subtle steam if the food/drink is hot (same food, just glowing in better light).
- Color: the food's REAL colors at their freshest and most appetizing — never shifted to different colors, never oversaturated; the whole frame in a warm, softly muted kinfolk palette.
- Composition: a gentle 30–45° angle or a clean top-down flat-lay, whichever flatters this dish; comfortable margins, vertical feed-friendly framing.

FINAL SELF-CHECK before output: the owner must say "that's exactly my dish and my cup — it just looks like a lovely cafe photo now," and comparing food to photo must reveal zero differences in what's actually on the plate. If any ingredient, topping, or the vessel itself changed, the result is wrong.

Ultra-photorealistic, high resolution. No text, no watermark, no border. Remember the two absolute rules: the SAME food in its SAME vessel, only the scene and light restaged around it.`;
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
      "homecafe"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[homecafe] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "homecafe"));
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
  // 📐 홈카페 피드: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHomecafe(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("homecafe error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("homecafe", 0, handler); // COIN_DORMANT: 실가격 3
