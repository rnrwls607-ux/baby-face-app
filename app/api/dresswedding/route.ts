import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";

export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제

const GEMINI_MODEL = "gemini-3-pro-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 배경칩 3종 — ★키는 클라의 BG_OPTIONS와 반드시 일치해야 한다(불일치 시 hall로 폴백됨)
// background = WEDDING STYLING의 Background 줄 / glow = Light 줄의 배경 주광 서술
const DW_BACKGROUNDS: Record<string, { background: string; glow: string }> = {
  hall: {
    background: `- Background: a grand classic wedding hall — crystal chandeliers glowing above, a long virgin road lined with candlelight and white flowers, elegant marble and soft drapery melting into dreamy depth.`,
    glow: `warm, romantic chandelier and candlelight; dreamy, ceremonial mood`,
  },
  garden: {
    background: `- Background: a sunlit outdoor garden wedding venue — a white flower arch and lush greenery softly blurred behind the person, petals drifting in the air, airy natural depth.`,
    glow: `bright natural daylight through the greenery; fresh, romantic mood`,
  },
  hanok: {
    background: `- Background: a serene traditional Korean hanok courtyard — wooden pillars, hanji doors, and a tiled roofline softly blurred behind the person, an elegant modern-meets-tradition small-wedding mood.`,
    glow: `warm late-afternoon light; quiet, graceful mood`,
  },
};

// ★조명 역전판 — 뷰티 조명이 대장, 장면 주광은 배경. {SKIN}만 역할별로 갈린다.
const lightLine = (skin: string, glow: string) =>
  `- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, ${skin}, every feature crisp and glowing — while the scene around them glows with ${glow}.`;

const brideBody = (background: string, light: string) => `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. Enhance and refine this one real person's features — never replace them with a different person's.
2. ROLE — the person in this photo is the BRIDE. Style them exactly as described in the WEDDING STYLING section below, even if their appearance might read differently. Never switch the wardrobe to the other role.

You are the master retoucher and concept photographer of Seoul's most famous premium wedding studio — the studio that celebrities and influencers visit for their wedding pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the most beautiful version of themselves on their wedding day — while friends still recognize them at a glance.

Take the person in the photo and create ONE stunning, fully-retouched solo wedding portrait of them in the scene described below.

HOW TO USE THE INPUT PHOTO
- Ignore the input photo's framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the standard wedding-portrait composition below.

STEP 1 — Read the person first:
Note their hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- If they are wearing glasses: keep the EXACT same glasses — same frame shape, same color, worn normally on the face, with clean glare-free lenses. Only ONE pair.
- If they are NOT wearing glasses: do NOT add any glasses.
- Never duplicate glasses. Never add sunglasses.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED wedding pictorial, not a raw documentary photo. You are EXPECTED to visibly enhance and slim. The person's own reaction must be: "This is the best I have ever looked in my life — I'm showing this to everyone."

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
- Zero moles, zero spots, zero marks interrupting the flawless skin — every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — bridal, modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrity brides — fresh, youthful, radiant. They must look subtly YOUNGER than the input photo, never older.
- An elegant luminous bridal makeup: a flawless dewy base, softly defined brows, delicate eye makeup with a fine graceful shimmer, and a soft rosy lip — graceful and glowing, never heavy.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.

WEDDING STYLING:
- Wardrobe: an elegant, classic white wedding dress with tasteful refined details (clean silhouette — not gaudy). She may optionally hold a small elegant bouquet.
- Hair: a graceful bridal hairstyle that flatters her — an elegant updo or soft romantic waves, a natural evolution of her real hairstyle in her true hair color, styled beautifully with fine bridal touches.
${background}
${light}
- Expression: a graceful, happy, natural soft smile — subtle, never exaggerated; eyes relaxed and on camera.
- Hands: render naturally and correctly with the right number of fingers; if a hand would look awkward, keep it relaxed and simple.

FRAMING — vertical upper-body wedding portrait: from roughly the head to the waist, centered, portrait-lens perspective — tall, model-like proportions with the small refined face clearly the hero of the frame, with a small even margin above the head.

CAMERA — shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

FINAL SELF-CHECK before output:
- Placed next to the source photo, friends must instantly say "that's the same person — and this is the best she has ever looked."
- Face clearly slimmer, brighter, and more polished than the input, yet never warped or uncanny?
- SKIN CHECK: flawless glass skin with zero moles, zero spots, zero INVENTED marks anywhere?
- Wardrobe matches the role: BRIDE styling only?

ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the background.
- Any readable text, signs, or watermarks anywhere.

Output: one photorealistic photo — the same person in a complete solo wedding portrait, at the absolute best of their life. High resolution, no text, no watermark, no border.`;

const groomBody = (background: string, light: string) => `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. Enhance and refine this one real person's features — never replace them with a different person's.
2. ROLE — the person in this photo is the GROOM. Style them exactly as described in the WEDDING STYLING section below, even if their appearance might read differently. Never switch the wardrobe to the other role.

You are the master retoucher and concept photographer of Seoul's most famous premium wedding studio — the studio that celebrities and influencers visit for their wedding pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the most handsome version of themselves on their wedding day — while friends still recognize them at a glance.

Take the person in the photo and create ONE stunning, fully-retouched solo wedding portrait of them in the scene described below.

HOW TO USE THE INPUT PHOTO
- Ignore the input photo's framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the standard wedding-portrait composition below.

STEP 1 — Read the person first:
Note their hair color and length, skin tone, facial features, facial hair, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- If they are wearing glasses: keep the EXACT same glasses — same frame shape, same color, worn normally on the face, with clean glare-free lenses. Only ONE pair.
- If they are NOT wearing glasses: do NOT add any glasses.
- Never duplicate glasses. Never add sunglasses.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED wedding pictorial, not a raw documentary photo. You are EXPECTED to visibly enhance and slim. The person's own reaction must be: "This is the best I have ever looked in my life — I'm showing this to everyone."

FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant V-line. Reduce cheek fullness and overall facial width. The whole face should read about 10% smaller and more compact than the input — a small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively, sparkling, clearly defined eyes that light up the whole face (clearly visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny.

SKIN — flawless clear skin:
- Poreless-smooth, even-toned, luminous clear skin with a healthy fresh glow — top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a healthy warm undertone — never plastic, waxy, or flat.
- Zero moles, zero spots, zero marks interrupting the flawless skin — every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — groom, modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean actors — fresh, youthful, sharp. They must look subtly YOUNGER than the input photo, never older.
- Clean, polished K-drama actor grooming: fresh clear skin, neat natural brows, effortless and modern — camera-ready, never made-up.
- Keep facial hair exactly as in the source — beard, stubble, or clean-shaven.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.

WEDDING STYLING:
- Wardrobe: a refined black or midnight-navy tuxedo (or a classic formal wedding suit) over a crisp white dress shirt, with a neat bow tie or tie and a small boutonnière.
- Hair: neat, polished groom styling — a trendy modern Korean cut that suits him, a natural evolution of his real hairstyle in his true hair color. Never a dated style that ages him.
${background}
${light}
- Expression: a confident, happy, natural soft smile — subtle, never exaggerated; eyes relaxed and on camera.
- Hands: render naturally and correctly with the right number of fingers; if a hand would look awkward, keep it relaxed and simple.

FRAMING — vertical upper-body wedding portrait: from roughly the head to the waist, centered, portrait-lens perspective — tall, model-like proportions with the small refined face clearly the hero of the frame, with a small even margin above the head.

CAMERA — shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

FINAL SELF-CHECK before output:
- Placed next to the source photo, friends must instantly say "that's the same person — and this is the best he has ever looked."
- Face clearly slimmer, brighter, and more polished than the input, yet never warped or uncanny?
- SKIN CHECK: flawless clear skin with zero moles, zero spots, zero INVENTED marks anywhere?
- Facial hair exactly as the source?
- Wardrobe matches the role: GROOM styling only?

ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the background.
- Any readable text, signs, or watermarks anywhere.

Output: one photorealistic photo — the same person in a complete solo wedding portrait, at the absolute best of their life. High resolution, no text, no watermark, no border.`;

// 성별칩 × 배경칩 = 6조합. 배경 분기는 Background 줄과 Light 줄만 갈아끼운다.
function buildPrompt(role: "bride" | "groom", bg: string): string {
  const b = DW_BACKGROUNDS[bg] || DW_BACKGROUNDS.hall; // 미지정·이상값 → hall 폴백
  const skin = role === "groom" ? "luminous clear skin" : "idol-grade luminous skin";
  const light = lightLine(skin, b.glow);
  return role === "groom" ? groomBody(b.background, light) : brideBody(b.background, light);
}

async function generateDresswedding(imageDataUrl: string, role: "bride" | "groom", bg: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = buildPrompt(role, bg);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
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
      "dresswedding",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[dresswedding] model=${GEMINI_MODEL} role=${role} bg=${bg} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "dresswedding", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));

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

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const role: "bride" | "groom" = body?.role === "groom" ? "groom" : "bride";
    // 배경칩은 클라가 body.bg로 보낸다 — 문자열이 아니면 hall로 (bgchange 관례)
    const bg: string = typeof body?.bg === "string" ? body.bg : "hall";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateDresswedding(image, role, bg);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("dresswedding error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("dresswedding", 0, handler); // COIN_DORMANT: 실가격 3 · 엔진 gemini-3-pro-image
