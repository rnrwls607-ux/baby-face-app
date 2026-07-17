import { NextRequest, NextResponse } from "next/server";
import { cropToRatio } from "../../lib/crop";
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
async function generateY2k(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio, shooting a Y2K retro concept pictorial — the way today's top K-pop idols shoot their nostalgic "year 2000" concept photobooks: retro styling and retro camera mood, but the face held to TODAY's beauty standards. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched Y2K concept portrait of them.

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
2. EYES: Brighter, more awake, and subtly larger-looking — lively, sparkling, clearly defined eyes with crisp flash catchlights (clearly visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny.

RETRO FIREWALL — Y2K the styling, NOT the face (CRITICAL):
- The Y2K retro treatment applies ONLY to fashion, accessories, background, and camera mood.
- The FACE is beautified to TODAY's young Korean celebrity standard — fresh, youthful, modern. They must look subtly YOUNGER than the input photo, never older.
- Woman: modern dewy Korean makeup with only playful Y2K accents — glossy lips, a subtle shimmer on the eyelids or cheekbones. NEVER actual 2000s makeup: no thin plucked brows, no dark lip liner, no flat matte foundation, no heavy smoky eyes.
- Man: clean modern K-drama actor grooming — neat natural brows, fresh clear skin, effortless. No dated styling on the face.
- Hair: a trendy modern Korean hairstyle with a playful Y2K twist that suits them — soft layered waves with tiny claw clips or thin face-framing braids for a woman; a fresh modern cut with natural, softly tousled texture for a man. Never a dated 2000s haircut that ages them.

SKIN — flawless glass skin under flash:
- Poreless-smooth, even-toned, luminous glass skin — top-tier beauty retouching. Under the direct flash it must look glossy and dewy in the most flattering way: soft bright highlights on the cheekbones, nose bridge, and lips.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Never plastic, waxy, greasy-looking, or blown-out white.

FLASH RELIGHT (this creates the Y2K digicam magic):
- Discard the lighting of the original photo entirely. Re-light the person with a direct on-camera FLASH, as if shot on an early-2000s compact digital camera: the person bright, crisp, and glossy in the flash, with a soft flash shadow falling behind them; the background settling into a dimmer, moodier exposure.
- The flash must FLATTER: bright, even light on the face, sparkling catchlights in the eyes, glossy highlights on the glass skin — never harsh, washed-out, or unflattering.

THE SCENE — Y2K night flash snap:
- A nostalgic city night: the person flash-lit against a softly blurred street glowing with colorful neon signs and city lights melting into bokeh — the "friend snapped this with a digicam on a fun night out" moment, but perfected.
- The background stays dimmer and moodier than the flash-lit person, with a subtle cool blue-cyan night cast contrasting the bright flash on the subject — that authentic early-2000s digicam color feel.

WARDROBE — Y2K fashion, worn like today's idols:
- Woman: an iconic Y2K look styled the modern way — a baby tee or cropped cardigan with low-rise or straight denim, a pleated mini with a fitted zip-up, or a velour track set; playful chunky accessories (a beaded necklace or choker, a tiny shoulder bag, colorful hair clips). Cute and fashionable, never costume-cheap.
- Man: 2000s street style worn clean — an oversized graphic tee or open short-sleeve shirt layered over a tee, baggy or straight-leg jeans, a chain necklace or a retro track jacket. Effortless, never sloppy.
- NO sunglasses or tinted glasses anywhere in the frame.

POSE & FRAMING:
- A playful, candid Y2K snapshot pose with youthful energy: a peace sign near the face, a candid laugh, glancing back mid-moment, or a confident close-to-camera stance.
- Vertical portrait, roughly chest-up to waist-up — the small refined flash-lit face clearly the hero of the frame.

CAMERA — digicam MOOD, modern QUALITY:
- The look of an early-2000s compact digital camera with direct flash: slightly punchy contrast, a whisper of fine film-like grain, a subtle vignette, nostalgic digicam color — but rendered CRISP and high-resolution, the person tack-sharp.
- Never actually low-quality: no blur, no heavy noise, no pixelation, no motion smear.

ABSOLUTELY AVOID (equally important):
- Any dated 2000s face: thin plucked brows, dark lip liner, matte cakey foundation, heavy smoky eyes, or hairstyles that age them. They must NEVER look older than the input.
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- Plastic waxy skin, a blown-out overexposed face, harsh unflattering flash.
- Actual low resolution, heavy grain, pixelation, or motion blur.
- Timestamp or date stamp of any kind, any text, letters, logos, watermark, or border.
- Crowds or other people in the frame, distorted hands, warped signage.`;
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
      "y2k"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[y2k] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "y2k"));
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
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateY2k(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("y2k error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
