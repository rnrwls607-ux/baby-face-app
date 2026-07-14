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
1. IDENTITY — THE SINGLE MOST IMPORTANT RULE. The output must be so
   recognizable that the person's close friends and family instantly say
   "that's YOU — where did you travel to?!" with ZERO doubt. This is a
   travel photo of THIS EXACT PERSON, not of someone similar.
   Treat the clearest, most front-facing input photo as the single ground
   truth for identity. Preserve with photographic precision:
   - the exact face shape and width-to-length ratio, jawline and chin
   - the exact eye size, eye shape, and eyelid type (double eyelid stays
     double, monolid stays monolid — NEVER add or remove a crease)
   - the exact eyebrow shape, thickness, and position
   - the exact nose bridge width, tip shape, and nostril impression
   - the exact philtrum length, lip shape and thickness
   - the exact ears, hairline shape, and forehead proportion
   - the exact spacing between ALL features (eyes-to-eyes, eyes-to-brows,
     nose-to-lips distances)
   - natural asymmetries (slightly different eyes, uneven smile — these
     make the person THEM; keep them)
   - the apparent age and TRUE skin tone (the location's light may warm
     the scene but must never change their actual tone)
   The person should look like themselves on a genuinely good day —
   well-rested, healthy glow, flattering natural light — NOT like a
   beautified or idealized different person. Enhancing means better
   LIGHT and MOOD on the SAME face, never a "prettier" face.
   HARD LIMITS: no enlarging eyes, no slimming the jaw or face, no
   raising the nose, no plumping lips, no smoothing away their real
   facial character. Hair may move slightly in the breeze but the
   hairstyle, hair length, and hair color stay exactly theirs.
2. COMPOSITION — the output is ALWAYS a vertical upper-body travel snap with the person as the clear HERO of the frame (sharpest, best-lit, largest element); the landscape is the softly blurred supporting stage. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

The input photos are a reference for IDENTITY ONLY (face and hairstyle) — ignore their framing, zoom, background, lighting, and clothing; the travel styling replaces them. Do NOT average the faces across photos; use the clearest, most front-facing photo as the single primary reference.

MAKE IT A REAL TRAVEL SNAP (anti-composite rules):
- The person is truly IN the scene: the location's ambient light wraps naturally around them (sunlight direction, sky bounce, warm reflections), with consistent shadows on the ground and matching color temperature between subject and background — never a studio-lit person pasted onto a backdrop.
- Shot like a friend took it on a good camera: natural depth of field, relaxed candid posture (a warm easy smile, hair moving slightly in the breeze if outdoors).
- Travel-casual outfit that suits the person and the destination.
- BACKGROUND HAS NO READABLE TEXT: avoid signboards, banners, and lettering entirely — keep the scenery architectural and natural (never render melted or fake letters).

FINAL SELF-CHECK before output — do this rigorously:
1) Place the output next to the source photo mentally. Same face shape?
   Same eyes (size, shape, eyelid type)? Same nose? Same lips? Same
   eyebrows? Same feature spacing? If ANY answer is "slightly different",
   the result is WRONG — regenerate the face to match.
2) Would this person's own mother recognize them instantly at first
   glance? If there is any hesitation, the result is wrong.
3) Does it look like a real travel snap (ambient light wrapping the
   person, consistent shadows) rather than a composite? If not, fix the
   light integration — but NEVER by altering the face.
Photorealistic, high resolution, no text, no watermark, no border.`;
const TRAVEL_PROMPTS: Record<string, string> = {
  jeju: `You are a travel snap photographer. Portray this person on a beautiful trip to Jeju Island:
${BASE_RULE}
Scene: a Jeju coastal path — low black basalt stone walls, emerald sea and soft horizon behind, green fields with gentle wind, bright clear daylight with a fresh breeze mood; outfit: light comfortable spring-summer travel wear in soft tones.`,
  europe: `You are a travel snap photographer. Portray this person on a romantic trip through an old European town:
${BASE_RULE}
Scene: a charming cobblestone alley with pastel plastered buildings, wooden shutters, flower boxes, and warm late-afternoon golden light raking across the stone; outfit: effortless European-holiday chic (light knit or linen, tasteful and comfortable).`,
  beach: `You are a travel snap photographer. Portray this person at a tropical resort beach:
${BASE_RULE}
Scene: powdery white sand, clear turquoise shallows, gentle waves and a few palm fronds entering the frame edge, brilliant vacation sunlight with a soft sea-breeze feel; outfit: breezy resort wear (light shirt or summer dress, tasteful), sunglasses only pushed up on the head so the eyes stay fully visible.`,
  citynight: `You are a travel snap photographer. Portray this person on a city night walk abroad:
${BASE_RULE}
Scene: a glowing evening street — warm bokeh of city lights and neon glow softly blurred behind (no readable signs), reflections on the pavement, cozy jacket weather; the warm ambient glow gently lighting one side of the face; outfit: smart-casual night-out travel look.`,
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
  const dataUrl = `data:image/png;base64,${b64}`;
  // 📐 여행 스냅 인물: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
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
