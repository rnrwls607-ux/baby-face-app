import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
import { withCoin } from "../../lib/coins";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
// ★v6 공용 머리 — PAYLOAD-V6에서 THE SCENE 블록만 뺀 앞 구간(THE ABSOLUTE RULE ~ RELIGHT COMPLETELY).
// 조립 순서: RETOUCH_CORE + THE SCENE + WARDROBE + FINISH_RULES = v6 전문 그대로.
const RETOUCH_CORE = `THE ABSOLUTE RULE (this overrides everything else):
IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. Enhance and refine this one real person's features — never replace them with a different person's. The scene, wardrobe, styling, and light are the transformation; the face stays anchored to the source at every step.

You are the master retoucher and concept photographer of Seoul's most famous premium photo studio — the studio that celebrities and influencers visit for their concept pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo and create ONE stunning, fully-retouched travel pictorial portrait of them in the scene described below.

HOW TO USE THE INPUT PHOTO
- Ignore the input photo's framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the standard travel-pictorial composition below.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- If they are wearing glasses: keep the EXACT same glasses — same frame shape, same color, worn normally on the face, with clean glare-free lenses. Only ONE pair.
- If they are NOT wearing glasses: do NOT add any glasses.
- Never duplicate glasses. Never add sunglasses.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED pictorial, not a raw documentary photo. You are EXPECTED to visibly enhance and slim. The person's own reaction must be: "This is the best I have ever looked in my life — I'm showing this to everyone."

FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant V-line. Reduce cheek fullness and overall facial width. The whole face should read about 10% smaller and more compact than the input — a small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively, sparkling, clearly defined eyes that light up the whole face (clearly visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny — still unmistakably the same person.

SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow — top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a healthy warm undertone — never plastic, waxy, or flat.
- Zero moles, zero spots, zero marks interrupting the flawless skin — every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh, youthful, clean. They must look subtly YOUNGER than the input photo, never older.
- Woman: an elegant luminous vacation makeup that glows on camera — a flawless dewy base with a soft radiant glow, softly defined brows, delicate eye makeup with a subtle fresh shimmer, and a juicy coral or rosy gradient lip. Polished and glowing, never heavy.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, in their true hair color, styled beautifully for the scene (around the glasses naturally if they wear them, and naturally under any headwear the scene requires). Never a dated style that ages them.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.`;
// ★v6 공용 꼬리 — THE SCENE·WARDROBE 뒤 전 구간(POSE ~ Output).
const FINISH_RULES = `POSE — a natural, candid vacation pose with light, youthful energy: strolling toward the camera mid-smile, glancing back with a soft genuine smile, or leaning lightly against a wall or railing.
- Expression: a soft, genuine, happy smile — subtle, never exaggerated; eyes relaxed, bright, and on camera.

FRAMING — vertical 3:4 portrait, upper-body shot, the person centered — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA — shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

FINAL SELF-CHECK before output:
- Next to the source photo, friends must instantly say "that's the same person — and this is the best they have ever looked."
- Face clearly slimmer, brighter, and more polished than the input, yet never warped or uncanny?
- SKIN CHECK: flawless glass skin with zero moles, zero spots, zero INVENTED marks anywhere?
- Glasses exactly as the source? Hair color true to the source?

ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look: heavy dramatic makeup, dark bold lips, thick Western editorial brows, dated hairstyles. Never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the background.
- Any readable text, signs, or watermarks anywhere.

Output: one photorealistic photo — the same person in a complete travel pictorial portrait, at the absolute best of their life. High resolution, no text, no watermark, no border.`;
// 신규 도시 칩 공용 의상 — v6 WARDROBE에서 "for Jeju travel photos" → "for their travel photos" 한 곳만 일반화.
// (jeju는 v6 전문 그대로, europe·beach·citynight는 기존 전용 의상 그대로 자기 블록에 둔다)
const WARDROBE_GENERIC = `WARDROBE — trendy, youthful travel style:
- Woman: a fresh flowing dress in white or a soft pastel tone, or a light knit-and-skirt set — airy and modern, the style young Korean women love for their travel photos.
- Man: a relaxed open-collar shirt or light knit in white or a soft tone with light trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually — with no letters, logos, or brand marks anywhere on the clothing. NO sunglasses anywhere in the frame.`;
const TRAVEL_PROMPTS: Record<string, string> = {
  jeju: `${RETOUCH_CORE}

THE SCENE — a bright clear day on the Jeju coast:
- A dreamy Jeju island coastal walk on a bright clear day: an emerald-turquoise sea sparkling behind them, soft green grass and low volcanic stone walls along a sunlit path, a bright open blue sky.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with crisp, bright daylight with clean fresh tones; fresh sea-breeze atmosphere, cinematic depth — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful travel style:
- Woman: a fresh flowing dress in white or a soft pastel tone, or a light knit-and-skirt set — airy and modern, the style young Korean women love for Jeju travel photos.
- Man: a relaxed open-collar shirt or light knit in white or a soft tone with light trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually — with no letters, logos, or brand marks anywhere on the clothing. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  europe: `${RETOUCH_CORE}

THE SCENE — golden hour in a European coastal village:
- A dreamy whitewashed coastal village at golden hour: sunlit white walls, the deep blue sea glittering on the horizon, a few softly blurred bougainvillea flowers for gentle color.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with warm low sunlight; glowing atmosphere, cinematic depth — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful resort style:
- Woman: a fresh white or soft-toned sundress or chic light linen set — light, airy, modern, the style young Korean women love for travel photos.
- Man: a relaxed open-collar linen shirt in white or a soft tone with light tailored trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  beach: `${RETOUCH_CORE}

THE SCENE — golden hour on a tropical beach:
- A dreamy tropical beach at golden hour: powdery white sand, crystal-clear turquoise shallows glittering behind them, a few softly blurred palm fronds catching the warm light.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with warm low sunlight with a soft golden backlight glow; paradise-vacation atmosphere — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful beach-resort style:
- Woman: an elegant flowing beach dress or a chic light resort set in white or a soft tone — airy, graceful, magazine-worthy (a tasteful vacation look, not swimwear).
- Man: a breezy open-collar linen shirt in white or a soft tone with light shorts or trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  citynight: `${RETOUCH_CORE}

THE SCENE — magic-hour city night:
- A glamorous city street at early blue hour: the sky still holding a deep twilight blue while warm street lamps, shop windows, and city lights melt into dreamy golden bokeh behind them.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with warm street lamps, shop windows, and city lights melting into dreamy golden bokeh; luminous glass skin against the twilight city; never murky, grainy, or harsh-flash-looking.

WARDROBE — chic city-night style:
- Woman: a chic modern evening-city look — an elegant dress or a stylish light-toned outfit that stays bright against the night, the style young Korean women love for city travel photos.
- Man: a clean smart-casual evening look — a well-fitted shirt or light knit with tailored trousers, modern and effortless.
- Minimal tasteful accessories at most: a delicate necklace or small earrings. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  paris: `${RETOUCH_CORE}

THE SCENE — a chic Parisian street on a bright morning:
- A classic Haussmann boulevard in Paris: cream limestone facades with wrought-iron balconies, a corner café with woven rattan chairs and small round marble tables, and the Eiffel Tower softly visible far away in the light morning haze. Real, lived-in textures — weathered stone, aged brass, cobblestone crosswalk, a gentle city haze — like a real travel photograph taken on location, never a rendered backdrop.
- Every awning, storefront, and café surface is kept completely BARE and clean — no readable letters, no logos, not even blurry half-formed lettering anywhere.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with soft, clear morning daylight with clean fresh tones; effortless Parisian-chic atmosphere, cinematic depth — bright and airy, never dark or muddy.

${WARDROBE_GENERIC}

${FINISH_RULES}`,
  tokyo: `${RETOUCH_CORE}

THE SCENE — a charming retro alley in Tokyo:
- A cozy Tokyo backstreet on a clear day: weathered low-rise shopfronts with paper lanterns and fabric noren curtains, criss-crossing power lines overhead, a softly glowing retro vending machine, small potted plants along the curb. Real, lived-in textures — faded paint, worn concrete, sun-bleached wood, a soft city haze — like a real travel photograph taken on location, never a rendered backdrop.
- Every lantern, curtain, signboard, and vending-machine surface is kept completely BARE and clean — no readable letters or characters, no logos, not even blurry half-formed lettering anywhere.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with crisp, bright daylight with clean fresh tones; nostalgic yet trendy Tokyo-alley atmosphere, cinematic depth — bright and airy, never dark or muddy.

${WARDROBE_GENERIC}

${FINISH_RULES}`,
  newyork: `${RETOUCH_CORE}

THE SCENE — a stylish New York street moment:
- A classic New York brownstone street on a bright clear day: warm brick stoops with black iron railings, street trees dappling the sidewalk, a yellow cab passing softly blurred in the background, the Manhattan skyline hinted far behind. Real, lived-in textures — worn brick, painted metal, asphalt sheen, honest urban grit kept photogenic — like a real travel photograph taken on location, never a rendered backdrop.
- Every storefront, cab marking, and street sign is kept completely BARE and clean — no readable letters or numbers, no logos, not even blurry half-formed lettering anywhere.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with crisp, bright daylight with clean modern tones; confident city-break energy, cinematic depth — bright and airy, never dark or muddy.

${WARDROBE_GENERIC}

${FINISH_RULES}`,
  swiss: `${RETOUCH_CORE}

THE SCENE — a breathtaking Swiss alpine meadow:
- A sunlit alpine meadow in Switzerland: vivid green grass sprinkled with tiny wildflowers, a calm turquoise lake below, snow-capped peaks rising sharp against a deep blue sky, a weathered wooden fence line leading into the distance. Real, natural textures — crisp mountain-air clarity, sun-warmed wood grain, soft grass swaying — like a real travel photograph taken on location, never a rendered backdrop.
- Light: flawless beauty lighting on the person — a bright soft key light with delicate catchlights, gentle fill, and a clean rim light, idol-grade luminous skin, every feature crisp and glowing — while the scene around them glows with brilliant, clear mountain daylight with clean fresh tones; grand open-air freedom, cinematic depth — bright and airy, never dark or muddy.

${WARDROBE_GENERIC}

${FINISH_RULES}`,
};
async function generateTravel(imageDataUrl: string, destination: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = TRAVEL_PROMPTS[destination] || TRAVEL_PROMPTS.jeju;
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
      "travel"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[travel] model=${GEMINI_MODEL} destination=${destination} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "travel"));
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
  // 📐 여행 스냅 인물: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const destination: string = typeof body?.destination === "string" ? body.destination : "jeju";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateTravel(image, destination);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("travel error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
export const POST = withCoin("travel", 3, handler); // 출력 1장 × 3 (가격표 확정 2026-07-17)
