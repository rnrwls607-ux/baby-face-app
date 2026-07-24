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
const SPORTY_CORE = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio — the studio that celebrities and influencers visit for their concept pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched concept pictorial portrait of them in the scene described below.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color. Render clean, clear lenses with minimal glare so their bright retouched eyes stay clearly visible through them. Do NOT remove them, and do NOT swap them for sunglasses or different frames.
- IF the person is NOT wearing glasses in the input: do not add glasses or sunglasses.
- In ALL cases: never two pairs of glasses, never one pair on the face plus another in the hand or hair, never floating or duplicated eyewear anywhere in the frame.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED pictorial, not a raw documentary photo. You are EXPECTED to visibly enhance and slim. The person's own reaction must be: "This is the best I have ever looked in my life — I'm showing this to everyone."

FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant V-line. Reduce cheek fullness and overall facial width. The whole face should read about 10% smaller and more compact than the input — a small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively, sparkling, clearly defined eyes that light up the whole face (clearly visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny.

SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow — top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a healthy warm undertone — never plastic, waxy, or flat.

BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh, youthful, clean. They must look subtly YOUNGER than the input photo, never older.
- Woman: dewy "no-makeup makeup" base with at most the tasteful accent described in the scene below — soft natural straight brows, delicate eye makeup. Never heavy or dramatic.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, styled beautifully for the scene below (around the glasses naturally if they wear them). Never a dated style that ages them.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.`;
const SPORTY_FINISH = `FRAMING:
- Vertical portrait, eye-level, roughly chest-up to waist-up — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the frame, distorted hands, warped architecture.
- Any readable text, letters, logos, watermark, or border anywhere in the image.`;
const SPORTY_PROMPTS: Record<string, string> = {
  tennis: `${SPORTY_CORE}\n\nTHE SCENE — 스포티 화보: 테니스 (old-money tennis court):
- A beautiful sunlit tennis court in soft late-afternoon light: the green court and white lines softly blurred behind them, a hint of net and fence bokeh — that clean, preppy "old money sports" atmosphere.
- Key light: warm, soft, low sunlight — the face bright, fresh, and glowing with healthy energy.

WARDROBE — old-money tennis style:
- Woman: a chic white or cream tennis dress or pleated-skirt set, with a soft knit sweater draped over the shoulders; a racket held casually and naturally at her side.
- Man: a clean cream or white polo with tailored shorts or trousers, a sweater tied over the shoulders; a racket held casually.
- NO visible brand logos or readable text on any clothing or gear. No caps or visors shading the face. Hands holding the racket must look completely natural.

POSE:
- A light, energetic yet polished pose: standing relaxed with the racket at their side, a fresh confident smile, or a playful mid-turn glance.\n\n${SPORTY_FINISH}`,
  golf: `${SPORTY_CORE}\n\nTHE SCENE — 스포티 화보: 골프 (emerald fairway morning):
- A breathtaking emerald golf course in fresh morning light: a rolling softly-blurred green fairway and distant trees, gentle mist burning off, a clean bright sky — premium country-club atmosphere.
- Key light: soft, bright morning sunlight — the face luminous and fresh.

WARDROBE — trendy golf style:
- Woman: a chic modern golf outfit — a fitted collared top with a pleated skirt set in white or a soft luminous tone, styled like trendy Korean golf fashion; a club held lightly and naturally.
- Man: a sharp modern golf look — a fitted polo or knit with tailored slacks in clean light tones; a club held lightly.
- NO visible brand logos or readable text on clothing or gear. No caps or visors shading the face. Hands holding the club must look completely natural.

POSE:
- A poised, athletic-elegant pose: standing with the club held lightly, a relaxed confident smile, or a graceful glance over the shoulder.\n\n${SPORTY_FINISH}`,
};
async function generateSporty(imageDataUrl: string, option: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = SPORTY_PROMPTS[option] || SPORTY_PROMPTS.tennis;
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
      "sporty"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[sporty] model=${GEMINI_MODEL} option=${option} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "sporty"));
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
  // 📐 인물 화보: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const option: string = typeof body?.option === "string" ? body.option : "tennis";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateSporty(image, option);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("sporty error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("sporty", 0, handler); // COIN_DORMANT: 실가격 3
