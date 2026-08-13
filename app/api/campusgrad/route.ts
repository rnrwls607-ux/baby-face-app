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

// 칩 합성 — bgchange route와 같은 구조: CORE + 씬 + FINISH
// ★키는 클라의 CAMPUS_OPTIONS와 반드시 일치해야 한다(불일치 시 ivy로 폴백됨)
const CAMPUS_CORE = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio — the studio that celebrities and influencers visit for their concept pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo and create ONE stunning, fully-retouched graduation portrait of them in the scene described below.

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
- Zero moles, zero spots, zero marks interrupting the flawless skin — every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh, youthful, clean. They must look subtly YOUNGER than the input photo, never older.
- Woman: dewy "no-makeup makeup" base with a soft natural accent — soft natural straight brows, delicate eye makeup, a gentle rosy lip. Never heavy or dramatic.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, styled beautifully under the graduation cap (around the glasses naturally if they wear them). Never a dated style that ages them.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.`;

const CAMPUS_SCENES: Record<string, string> = {
  ivy: `THE SCENE — a prestigious ivy-style graduation portrait:
- Wardrobe: a classic black academic gown with a rich crimson hood draped over the shoulders, and a black mortarboard cap with a gold tassel, all fitting naturally with neat formal attire visible underneath. They may hold a leather-bound diploma.
- MORTARBOARD RULE (critical): the cap sits back on the head with the board angled UP so it NEVER shadows or covers the forehead, eyebrows, or eyes — the full face stays bright, open, and clearly visible, with the hairline showing naturally under the cap.
- A classic graduation gown fitting naturally, with neat attire visible at the collar; holding a diploma scroll or a small bouquet below the chest line.
- Location: a historic gothic-style campus — weathered stone archways and towers covered in green ivy, softly blurred behind the person, warm afternoon light filtering through old trees. Every wall and building surface is completely BARE and unmarked — plain clean stone with no plaques, no engravings, no banners, no signboards of any kind.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with golden late-afternoon sunlight through old trees; prestigious, timeless mood.
- ABSOLUTELY NO school names, emblems, crests, flags, banners, or any readable or even blurry half-formed lettering anywhere — where a sign or plaque would naturally be, render plain empty stone instead. Even illegible text shapes are a failure. The atmosphere alone tells the story.`,
  krspring: `THE SCENE — a Korean university graduation portrait in full spring:
- Wardrobe: a classic black academic gown with a deep navy-blue hood, and a black mortarboard cap, fitting naturally with neat attire underneath. They may hold a diploma tube or a small bouquet.
- MORTARBOARD RULE (critical): the cap sits back on the head with the board angled UP so it NEVER shadows or covers the forehead, eyebrows, or eyes — the full face stays bright, open, and clearly visible, with the hairline showing naturally under the cap.
- A classic graduation gown fitting naturally, with neat attire visible at the collar; holding a diploma scroll or a small bouquet below the chest line.
- Location: a beautiful Korean university campus at cherry-blossom peak — a grand granite main gate and stone buildings softly blurred behind, pink petals drifting in the air, a clean open plaza. Every gate, wall, and building surface is completely BARE and unmarked — plain clean stone with no plaques, no engravings, no banners, no signboards of any kind.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with bright, clear spring daylight; fresh, hopeful, celebratory mood.
- ABSOLUTELY NO school names, emblems, crests, flags, banners, or any readable or even blurry half-formed lettering anywhere — where a sign or plaque would naturally be, render plain empty stone instead. Even illegible text shapes are a failure. The atmosphere alone tells the story.`,
  euclassic: `THE SCENE — a classic European university graduation portrait:
- Wardrobe: a formal black academic gown with a white fur-trimmed hood draped elegantly, and a black mortarboard cap, over smart formal attire. They may hold a ribbon-tied diploma scroll.
- MORTARBOARD RULE (critical): the cap sits back on the head with the board angled UP so it NEVER shadows or covers the forehead, eyebrows, or eyes — the full face stays bright, open, and clearly visible, with the hairline showing naturally under the cap.
- A classic graduation gown fitting naturally, with neat attire visible at the collar; holding a diploma scroll or a small bouquet below the chest line.
- Location: a centuries-old honey-stone college quadrangle — arched cloisters, tall spires, and a manicured courtyard lawn softly blurred behind the person. Every wall and stone surface is completely BARE and unmarked — no plaques, no engravings, no banners, no signboards of any kind.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with soft, gentle European daylight with warm tones; dignified, scholarly, timeless mood.
- ABSOLUTELY NO school names, emblems, crests, flags, banners, or any readable or even blurry half-formed lettering anywhere — where a sign or plaque would naturally be, render plain empty stone instead. Even illegible text shapes are a failure. The atmosphere alone tells the story.`,
  city: `THE SCENE — a modern city-campus graduation portrait:
- Wardrobe: a sleek black academic gown with a minimal charcoal-gray hood and a black mortarboard cap, over modern smart attire. They may hold a slim diploma folder.
- MORTARBOARD RULE (critical): the cap sits back on the head with the board angled UP so it NEVER shadows or covers the forehead, eyebrows, or eyes — the full face stays bright, open, and clearly visible, with the hairline showing naturally under the cap.
- A classic graduation gown fitting naturally, with neat attire visible at the collar; holding a diploma scroll or a small bouquet below the chest line.
- Location: a contemporary urban campus — glass-and-steel architecture with clean lines, a bright open plaza, the city skyline softly blurred in the distance. Every glass and wall surface is completely BARE and unmarked — no signage, no banners, no lettering of any kind.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with crisp, bright daylight with clean modern tones; ambitious, fresh, metropolitan mood.
- ABSOLUTELY NO school names, emblems, crests, flags, banners, or any readable or even blurry half-formed lettering anywhere — where a sign or plaque would naturally be, render plain empty stone instead. Even illegible text shapes are a failure. The atmosphere alone tells the story.`,
};

const CAMPUS_FINISH = `POSE — proud, happy, natural:
- A confident, proud smile or a warm gentle expression; shoulders relaxed, posture upright and dignified.

FRAMING — vertical 3:4 portrait, upper-body shot, the person centered — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA — shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the background.
- Any readable text, signs, or watermarks anywhere.

Output: one photorealistic photo — the same person in a complete graduation portrait. High resolution, no text, no watermark, no border.`;

async function generateCampusgrad(imageDataUrl: string, chip: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const scene = CAMPUS_SCENES[chip] || CAMPUS_SCENES.ivy; // 미지정·이상값 → ivy 폴백
  const prompt = `${CAMPUS_CORE}\n\n${scene}\n\n${CAMPUS_FINISH}`;

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
      "campusgrad",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[campusgrad] model=${GEMINI_MODEL} chip=${chip} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "campusgrad", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));

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
    // 칩 값은 클라가 body.chip으로 보낸다 — 문자열이 아니면 ivy로 (bgchange 관례)
    const chip: string = typeof body?.chip === "string" ? body.chip : "ivy";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateCampusgrad(image, chip);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("campusgrad error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("campusgrad", 0, handler); // COIN_DORMANT: 실가격 3 · 엔진 gemini-3-pro-image
