import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const BASE_RULE = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the person or pet must be instantly recognizable as themselves in goods-character form. Translate the FORM into a cute merchandise illustration, never the IDENTITY: the FACE gets the highest detail of the whole design — the same face shape impression, the same eye shape and eyelid type, the same nose and mouth impression, the same hairstyle in their TRUE hair color, plus their signature cues (glasses, dimples, beard) exactly as in the source. For a PET: the same breed, the same fur colors and unique markings painted faithfully, the same ear shape — clearly THIS pet. Softly rounded cute character proportions (about 3 heads tall) are welcome — but never blur, average, or "prettify" the face into a generic mascot. Do not invent features that are not in the source.
2. COMPOSITION — the output is ALWAYS a photorealistic PRODUCT PHOTOGRAPH of the physical acrylic goods item described below, placed on a clean surface. The input photo is an identity reference ONLY — its framing, zoom, background, and lighting have ZERO influence on the output.

THE ACRYLIC LOOK (what sells the "real goods" feeling):
- The character is printed inside crystal-clear acrylic, cut out along the character's silhouette with the signature thin WHITE printed border around the artwork.
- Realistic acrylic material: glossy transparent edges catching the light, subtle surface reflections, a faint natural shadow under the item.
- The character artwork itself: clean confident linework, soft cel shading, warm harmonious colors — premium fan-goods print quality.

Soft studio product lighting on a clean pastel or light wood surface, shallow depth of field (crisp goods, softly blurred background).
FINAL SELF-CHECK: the person (or the pet's owner) must instantly say "that's ME / MY pet as a keyring — I want to order this." If the character reads as a generic mascot, the result is wrong.
Photorealistic product photo, high resolution. No text, no letters, no logo anywhere on the goods or in the frame; no watermark, no border.`;
const GOODS_PROMPTS: Record<string, string> = {
  keyring: `You are a fan-goods product photographer. Create a product photo of an ACRYLIC KEYRING featuring this person (or pet) as a charming character:
${BASE_RULE}
Product form: a palm-sized acrylic charm of the character, attached to a small realistic metal keyring with a short chain and clasp; lying at a slight natural angle on the surface, photographed close-up like an online goods-shop listing.`,
  stand: `You are a fan-goods product photographer. Create a product photo of an ACRYLIC STAND featuring this person (or pet) as a charming character:
${BASE_RULE}
Product form: an upright acrylic stand of the character slotted into a small clear acrylic base, standing on a tidy desk like a beloved idol goods display; photographed at a gentle eye-level angle with cozy soft bokeh behind.`,
};
async function generateGoods(imageDataUrl: string, goodsType: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = GOODS_PROMPTS[goodsType] || GOODS_PROMPTS.keyring;
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
      "goods"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[goods] model=${GEMINI_MODEL} goodsType=${goodsType} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "goods"));
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
  // 📐 굿즈 목업: 1:1 정사각 비율로 크롭
  return await cropToRatio(dataUrl, 1, 1);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const goodsType: string = typeof body?.goodsType === "string" ? body.goodsType : "keyring";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateGoods(image, goodsType);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("goods error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
