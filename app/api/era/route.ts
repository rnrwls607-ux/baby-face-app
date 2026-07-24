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
const ERA_CORE = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio, shooting an era-transformation pictorial — the way top K-pop idols shoot period concept photos: the era lives in the costume, setting, and photographic mood, while the face is held to TODAY's beauty standards. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched era portrait of them in the era described below.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color, with clean clear lenses. Do NOT remove them or swap them for period eyewear.
- IF not wearing glasses: do not add glasses or sunglasses.
- Never two pairs, never duplicated eyewear anywhere in the frame.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED pictorial. You are EXPECTED to visibly enhance and slim. The person's reaction must be: "This is the best I have ever looked — I'm showing this to everyone."

FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): slim the jawline into a soft elegant V-line, reduce cheek fullness and facial width — about 10% smaller and more compact than the input, with idol-like head-to-shoulder proportions.
2. EYES: brighter, more awake, subtly larger-looking — lively, sparkling, clearly defined (visible through the lenses if they wear glasses).
3. NOSE: subtly slimmer, straighter, more refined.
4. CONTOURS: softly lifted youthful contours; a clean jaw-to-neck line with no double chin.
5. HARMONY RULE: blend everything into ONE natural harmonious face — expensive photoshop, never distortion.

SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous with a dewy glow; blemishes, acne, redness, dark circles, and oiliness completely removed.
- Alive and healthy: soft highlights on the cheekbones and nose bridge, a warm undertone — never plastic, waxy, or flat.

ERA FIREWALL — the era styles the world, NOT the face (CRITICAL):
- The era treatment applies ONLY to costume, accessories, setting, and photographic mood.
- The FACE stays beautified to TODAY's young Korean celebrity standard — fresh, youthful, modern. They must look subtly YOUNGER than the input photo, never older, never dated.
- Woman: a dewy modern Korean makeup base with at most a delicate era-appropriate accent. Man: clean modern K-drama actor grooming.
- Hair: styled for the era described below, but always as a flattering, modern-beautiful interpretation that suits them — NEVER a severe or dated period style that ages them.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the era below, with a gentle rim light in the hair. They must look truly photographed in that world — and the face must always stay BRIGHT and luminous.`;
const ERA_FINISH = `FRAMING:
- Vertical portrait, eye-level, roughly chest-up to waist-up — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Rich, clean, film-like color grade. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Aging or dating the FACE in any way — the era lives in the costume and setting; the person must never look older than the input, and never like a dated period portrait of a different person.
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face; making them unrecognizable or generic.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the frame, distorted hands, warped architecture.
- Any readable text, letters, logos, watermark, or border.`;
const ERA_PROMPTS: Record<string, string> = {
  joseon: `${ERA_CORE}

THE ERA & SCENE — 조선시대 (Joseon nobility):
- Costume — woman: an exquisite fine-silk hanbok of a noble household in luminous, harmonious tones with delicate embroidery and a neat goreum; man: a refined nobleman's hanbok in deep tasteful tones with a dignified silhouette.
- HAIR RULE (critical): woman — soft, romantic period-inspired styling with a delicate binyeo accent, loose and flattering, NEVER a severe tightly-pulled braided updo; man — neat period-inspired hair; a gat may appear ONLY worn back so it never shadows the face, or be omitted entirely.
- Scene: a beautiful hanok at golden hour — warm wooden beams and hanji doors softly blurred, drifting petals or soft foliage for color. Dignified and graceful, like a premium historical-drama poster.
- Key light: warm, soft, low golden sunlight from the front-side — the face bright and glowing.

${ERA_FINISH}`,
  gyeongseong: `${ERA_CORE}

THE ERA & SCENE — 1920 경성 (modern boy / modern girl):
- Costume — woman: an elegant vintage drop-waist dress or a refined two-piece with delicate accessories; man: a classic three-piece suit, a fedora held in hand or worn back off the face.
- PERIOD FIREWALL: the 1920s live in the fashion and mood only — the face and makeup stay TODAY's fresh Korean standard: no thin vintage brows, no dark vintage lips, never aged or dated.
- Scene: a romantic softly-blurred vintage street or classic studio with warm sepia-toned, film-like color grading — nostalgic period-film-poster mood, bright and dreamy, never murky.
- Key light: a soft warm key light with a gentle glow — the face luminous against the sepia scene.

${ERA_FINISH}`,
  retro: `${ERA_CORE}

THE ERA & SCENE — 7080 레트로 (70s-80s Korean retro):
- Costume: charming 70s-80s Korean fashion worn the lovable way — a bold-collared shirt, a denim or corduroy jacket, or sweet retro patterns.
- RETRO FIREWALL (maximum strength): ONLY the clothes, backdrop, and film color are retro. The face, makeup, and hair volume stay TODAY's youthful Korean standard — NEVER a dated heavy perm, never old-fashioned makeup, never anything that reads as a middle-aged person from an old album. They must look like a fresh young star shooting a fun retro concept.
- Hair: a modern youthful style with only a soft retro twist (gentle waves, natural volume) — never a stiff period perm.
- Scene: a vintage photo-studio backdrop with warm faded film colors and a whisper of fine grain — charming old-album mood, rendered crisp and high-resolution.
- Key light: classic soft studio key light — bright, even, flattering.

${ERA_FINISH}`,
  medieval: `${ERA_CORE}

THE ERA & SCENE — 중세 유럽 (European royalty):
- Costume: breathtaking European royal attire — luxuriously embroidered garments with velvet and gold details, and an elegant delicate crown or circlet that never shadows the face.
- BEAUTY FIREWALL (critical): the royal styling applies to costume and setting ONLY. The face stays TODAY's young KOREAN beauty standard — fresh, dewy, youthful. NEVER Western editorial glamour: no heavy dramatic makeup, no thick bold brows, no dark lips, no mature sculpted glam. A young Korean star wearing a European crown — not a Western oil-painting noble.
- Scene: a grand castle interior with rich drapery softly blurred and a warm golden candle-like glow — regal and majestic, fully photorealistic.
- Key light: a warm golden key on the face with a soft cool rim — bright, dewy, and luminous against the rich dark interior, never murky.

${ERA_FINISH}`,
  future: `${ERA_CORE}

THE ERA & SCENE — 미래 도시 (cyberpunk future):
- Costume: sleek futuristic fashion — a modern avant-garde jacket with subtle glowing accents and clean high-tech details that suit them.
- Scene: a neon-lit futuristic city at night — holographic lights and signs melting into cinematic blue-magenta bokeh behind them. All signage abstract: NO readable text anywhere.
- CRITICAL LIGHTING: the face must stay BRIGHT and luminous — a soft flattering key light as if lit by a glowing panel nearby, with delicate neon rim lights in the hair; glass skin glowing against the dark city, never murky, harsh, or hidden in shadow.

${ERA_FINISH}`,
};
async function generateEra(imageDataUrl: string, era: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = ERA_PROMPTS[era] || ERA_PROMPTS.joseon;
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
      "era"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[era] model=${GEMINI_MODEL} era=${era} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "era"));
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
    const era: string = typeof body?.era === "string" ? body.era : "joseon";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateEra(image, era);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("era error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("era", 0, handler); // COIN_DORMANT: 실가격 3
