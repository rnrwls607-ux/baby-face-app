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
const RETOUCH_CORE = `You are the master retoucher and photographer of Seoul's most famous premium photo studio — the studio that celebrities and influencers visit before posting their travel photos. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched travel pictorial portrait of them in the scene described below.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color. Render clean, clear lenses with minimal glare so their bright retouched eyes stay clearly visible through them. Glasses are part of this person's identity — do NOT remove them, and do NOT swap them for sunglasses or different frames.
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
- Woman: dewy "no-makeup makeup", soft natural straight brows, a coral or rosy gradient lip tint, delicate eye makeup.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, with soft natural movement as if touched by a gentle breeze (styled around the glasses naturally if they wear them).

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the warm, soft, flattering light of the scene described below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment.`;
const FINISH_RULES = `POSE & FRAMING:
- A natural, candid vacation pose with light, youthful energy: strolling toward the camera mid-smile, glancing back with a soft genuine smile, or leaning lightly against a wall or railing.
- Vertical portrait, eye-level, roughly waist-up — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into creamy bokeh. Bright, warm, film-like color grade with clean whites. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look: heavy dramatic makeup, dark bold lips, thick Western editorial brows, dated hairstyles. Never older than the input.
- Plastic waxy skin, dead flat lighting, oversaturated HDR, muddy dark tones.
- Crowds or other people, distorted hands, warped architecture.
- Any text, letters, logos, watermark, or border.`;
const TRAVEL_PROMPTS: Record<string, string> = {
  jeju: `${RETOUCH_CORE}

THE SCENE — golden hour on the Jeju coast:
- A dreamy Jeju island coastal walk at golden hour: an emerald-turquoise sea sparkling behind them, soft green grass and low volcanic stone walls along a sunlit path, a bright open sky.
- Warm low sunlight, fresh sea-breeze atmosphere, cinematic depth — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful travel style:
- Woman: a fresh flowing dress in white or a soft pastel tone, or a light knit-and-skirt set — airy and modern, the style young Korean women love for Jeju travel photos.
- Man: a relaxed open-collar shirt or light knit in white or a soft tone with light trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  europe: `${RETOUCH_CORE}

THE SCENE — golden hour in a European coastal village:
- A dreamy whitewashed coastal village at golden hour: sunlit white walls, the deep blue sea glittering on the horizon, a few softly blurred bougainvillea flowers for gentle color.
- Warm low sunlight, glowing atmosphere, cinematic depth — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful resort style:
- Woman: a fresh white or soft-toned sundress or chic light linen set — light, airy, modern, the style young Korean women love for travel photos.
- Man: a relaxed open-collar linen shirt in white or a soft tone with light tailored trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  beach: `${RETOUCH_CORE}

THE SCENE — golden hour on a tropical beach:
- A dreamy tropical beach at golden hour: powdery white sand, crystal-clear turquoise shallows glittering behind them, a few softly blurred palm fronds catching the warm light.
- Warm low sunlight with a soft golden backlight glow, paradise-vacation atmosphere — bright and airy, never dark or muddy.

WARDROBE — trendy, youthful beach-resort style:
- Woman: an elegant flowing beach dress or a chic light resort set in white or a soft tone — airy, graceful, magazine-worthy (a tasteful vacation look, not swimwear).
- Man: a breezy open-collar linen shirt in white or a soft tone with light shorts or trousers — clean and effortless.
- Minimal tasteful accessories at most: a delicate necklace, small earrings, or a summer hat held casually. NO sunglasses anywhere in the frame.

${FINISH_RULES}`,
  citynight: `${RETOUCH_CORE}

THE SCENE — magic-hour city night:
- A glamorous city street at early blue hour: the sky still holding a deep twilight blue while warm street lamps, shop windows, and city lights melt into dreamy golden bokeh behind them.
- CRITICAL LIGHTING: the person's face must stay BRIGHT and luminous — lit by a soft, warm, flattering key light as if standing near a glowing storefront, with a gentle warm rim light in the hair. Luminous glass skin against the twilight city; never murky, grainy, or harsh-flash-looking.

WARDROBE — chic city-night style:
- Woman: a chic modern evening-city look — an elegant dress or a stylish light-toned outfit that stays bright against the night, the style young Korean women love for city travel photos.
- Man: a clean smart-casual evening look — a well-fitted shirt or light knit with tailored trousers, modern and effortless.
- Minimal tasteful accessories at most: a delicate necklace or small earrings. NO sunglasses anywhere in the frame.

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
export const POST = withCoin("travel", 1, handler);
