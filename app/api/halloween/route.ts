import { NextRequest, NextResponse } from "next/server";
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
const HALLOWEEN_CORE = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio, shooting a glamorous Halloween concept pictorial — the way top K-pop idols shoot their Halloween concept photos: stylish, charming, and profile-picture-worthy, never scary. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched Halloween transformation portrait of them in the transformation described below.

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

BEAUTY DIRECTION — modern Korean, youthful (CRITICAL for Halloween):
- Beautify to TODAY's young Korean celebrity standard — fresh, youthful, clean. They must look subtly YOUNGER than the input photo, never older. Halloween concepts drift toward aged, haggard, or spooky faces — that is absolutely forbidden here.
- Makeup is POINT-ACCENT ONLY: a fresh dewy modern base with the single tasteful accent described in the transformation below. NEVER heavy gothic makeup, face paint, dark smoky eyes, or anything that hides their features.
- Man: clean modern K-drama actor grooming, styled to the costume — fresh and effortless.
- Hair: a trendy modern Korean hairstyle that suits them, elegantly styled for the scene (around the glasses naturally if they wear them).

RELIGHT COMPLETELY — a bright face in a moody world (CRITICAL):
- Discard the lighting of the original photo entirely. The scene is atmospheric, but the person's FACE must stay BRIGHT and luminous: the soft, flattering key light described in the transformation below, plus a gentle rim light in the hair.
- Luminous glass skin glowing against the darker backdrop — never murky, shadowed, or hidden in darkness.`;
const HALLOWEEN_FINISH = `POSE & FRAMING:
- A confident, charming pose with playful magic energy: a soft knowing smile toward the camera, a graceful turn with the outfit flowing, or a light playful gesture near the face — never covering it.
- Vertical portrait, roughly chest-up to waist-up — the small refined face clearly the hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft cinematic bokeh. Rich, atmospheric color grade with clean luminous skin tones. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- ANYTHING scary or gory: blood, wounds, scars, heavy face paint, prosthetics, fangs, red or colored contact-lens eyes, green or gray skin, creepy expressions. This must be charming and profile-picture-safe.
- Aging them in ANY way: a haggard witch-stereotype face, wrinkles, a hooked nose. Never older than the input — subtly younger.
- The hat, wings, props, or hands covering or shadowing any part of the face.
- A cheap plastic party-costume look — everything must be elegant and high-end.
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face; making them unrecognizable or turning them into a generic pretty person.
- Plastic waxy skin, murky dark lighting on the face, oversaturated HDR, muddy tones.
- Crowds or other people, distorted hands, any text, letters, logos, watermark, or border.`;
const HALLOWEEN_PROMPTS: Record<string, string> = {
  vampire: `${HALLOWEEN_CORE}

THE TRANSFORMATION & SCENE — elegant aristocratic VAMPIRE:
- Style them as an elegant, aristocratic modern VAMPIRE — refined and alluring, never scary.
- Costume — woman: luxurious deep-black velvet or silk attire with a wine-red accent (collar detail, ribbon, or lining); man: a refined dark suit or velvet jacket with a wine-red accent. For both: a high-collared cape or jacket worn OPEN so the face and neck stay fully visible. Delicate accessories at most: a thin chain or a single deep-red gem.
- Point makeup accent: a deepened wine-red lip tint on a fresh dewy base, with a soft shimmer on the eyelids — elegant and modern, never gothic-heavy. Keep their NATURAL eye color and natural teeth — no fangs.
- Skin stays luminous porcelain with a healthy glow — bright and alive, never gray, sickly, or dead-pale.
- Scene: an opulent midnight — deep crimson and midnight-blue tones, warm candlelight bokeh like an elegant old mansion at night, soft drifting mist, a hint of moonlight.
- Key light: warm golden candle glow from the front blended with a cool moonlit rim light — the face bright, dewy, and captivating against the rich dark scene.

${HALLOWEEN_FINISH}`,
  witch: `${HALLOWEEN_CORE}

THE TRANSFORMATION & SCENE — stylish moonlight WITCH:
- Style them as an elegant, fashionable modern WITCH — chic and glamorous, never scary or hag-like.
- Costume — woman: a chic black dress or modern black ensemble with delicate velvet or lace details; man: a stylish all-black warlock look — a modern long dark coat or velvet jacket over a neat black outfit. For both: a classic pointed witch hat worn tilted back on the head so the ENTIRE face stays fully visible and unshadowed. Delicate accessories at most: a thin choker, a subtle moon-and-star pendant.
- Point makeup accent: a tasteful berry-rose lip tint and a soft shimmer on the eyelids — fresh and modern, never gothic.
- Scene: a dreamy moonlit night — a deep blue-violet sky with a large glowing full moon, soft drifting mist, warm floating candlelight bokeh, and subtle magical sparkles in the air.
- Key light: soft silvery moonlight from the front blended with a warm candle-glow fill — the face bright, dewy, and enchanting against the moody night.

${HALLOWEEN_FINISH}`,
  fairy: `${HALLOWEEN_CORE}

THE TRANSFORMATION & SCENE — dreamy DARK FAIRY:
- Style them as a dreamy, ethereal DARK FAIRY — mystical and beautiful, never creepy.
- Costume — woman: an ethereal dark fairy dress in deep violet or midnight tones with delicate tulle, shimmer, and fine sparkling details; man: a refined dark elven-prince style — an elegant dark outfit with subtle shimmering details. For both: elegant translucent fairy wings positioned BEHIND the shoulders, never covering or shadowing the face. Delicate accessories at most: a fine star or vine hairpiece.
- Point makeup accent: a soft glitter shimmer near the eyes and a rosy lip tint on a fresh dewy base — dreamy and modern, never heavy.
- Scene: an enchanted twilight forest — deep teal-violet tones, glowing floating particles like fireflies, soft magical mist, and gentle moonbeams filtering through the trees.
- Key light: a soft ethereal glow from the front, as if lit by the magic itself, with a delicate cool rim light — the face bright, dewy, and luminous against the mystical dark forest.

${HALLOWEEN_FINISH}`,
};
async function generateHalloween(imageDataUrl: string, costume: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = HALLOWEEN_PROMPTS[costume] || HALLOWEEN_PROMPTS.vampire;
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
      "halloween"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[halloween] model=${GEMINI_MODEL} costume=${costume} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "halloween"));
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
    const costume: string = typeof body?.costume === "string" ? body.costume : "vampire";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHalloween(image, costume);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("halloween error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
