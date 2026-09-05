import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 홀리데이 파티 스냅 — person:pro (cheerglam 템플릿 복제, new-concept.mjs 생성)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePartysnap(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the master retoucher and concept photographer of Seoul's most
famous premium photo studio — the studio that celebrities and influencers
visit for their concept pictorials. Your signature skill: every client
walks out with a noticeably smaller face, flawless glass skin, and
brighter features — looking like the idol version of themselves — while
friends still recognize them at a glance.
Take the person in the photo and create ONE stunning, fully-retouched
holiday party snap portrait of them in the scene described below.
STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and
whether they are WEARING GLASSES. Adapt every choice below to flatter
THIS specific person.
GLASSES RULE (check the input, then follow exactly):
- If they are wearing glasses: keep the EXACT same glasses — same frame
  shape, same color, worn normally on the face, with clean glare-free
  lenses. Only ONE pair.
- If they are NOT wearing glasses: do NOT add any glasses.
- Never duplicate glasses. Never add sunglasses.
THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the
  fundamental impression and arrangement of their features so friends
  know them instantly.
- BUT this is a professionally RETOUCHED pictorial, not a raw documentary
  photo. You are EXPECTED to visibly enhance and slim. The person's own
  reaction must be: "This is the best I have ever looked in my life —
  I'm showing this to everyone."
RETOUCH INTENSITY — read this as a hard requirement:
- This is a FULL premium retouch, NOT a subtle natural edit. Push every
  enhancement in the FACE RETOUCHING ORDER below to a clearly VISIBLE
  level — the upgrade from the source must be obvious at first glance.
- A timid, barely-changed result is a FAILURE. If in doubt between
  "too subtle" and "clearly enhanced", always choose clearly enhanced —
  while keeping the face natural, harmonious, and recognizable.
FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant
   V-line. Reduce cheek fullness and overall facial width. The whole face
   should read about 18% smaller and more compact than the input — a
   small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively,
   sparkling, clearly defined eyes that light up the whole face (clearly
   visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth
   jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious
   face — the "expensive photoshop" look where everything is clearly
   enhanced but nothing looks warped, stretched, or uncanny.
SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow —
  top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a
  healthy warm undertone — never plastic, waxy, or flat.
- Zero moles, zero spots, zero marks interrupting the flawless skin —
  every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do
  not paint any new mole, freckle, beauty mark, or spot anywhere, under
  any circumstance.
BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh,
  youthful, clean. They must look subtly YOUNGER than the input photo,
  never older.
- AIM HIGH: the finished face should read like the stunning visual
  center of a top idol group — the kind of face that stops the scroll —
  while still being unmistakably this same person.
- Woman: dewy "no-makeup makeup" base with a soft natural accent — soft
  natural straight brows, delicate eye makeup, a gentle rosy lip. Never
  heavy or dramatic.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear
  skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, in their true
  hair color, styled beautifully for the scene (around the glasses
  naturally if they wear them). Never a dated style that ages them.
RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face
  and body with the flattering key light described in the scene below,
  with a gentle rim light in the hair and natural soft shadows. They must
  look truly photographed in this place at this moment — and the face
  must always stay BRIGHT and luminous.
THE SCENE — a glamorous year-end holiday party in an upscale hotel lounge,
after dark.
- Setting: a dim, luxurious party lounge — deep charcoal and midnight-navy
  walls, polished dark surfaces, a long bar with rows of champagne flutes,
  gold-and-white string lights, tall candles and glass ornaments — all of
  it far behind the person and melting into soft, creamy golden bokeh. No
  other people anywhere in the frame; the person owns the room.
- Wardrobe: if the person presents as a woman — a sleek, well-fitted
  glitter or sequin party dress in champagne-gold, liquid silver, or deep
  emerald, with a clean neckline that frames the face and neck, delicate
  drop earrings, no necklace clutter near the jaw. If the person presents
  as a man — a sharp dark formal look: a black or midnight-navy slim suit
  or velvet blazer over a crisp dark shirt with an open collar or a slim
  black tie, clean shoulder line. Fabrics are rich and real (sequins catch
  tiny sparkles, velvet has depth); the fit at neck and shoulders is crisp
  and structured so the outfit supports the face. Optional: one champagne
  flute held low near the chest, never near the face.
- Light: flawless beauty lighting on the person — a bright, CLEAN,
  neutral-toned soft key light with delicate catchlights, gentle fill, and
  a crisp rim light, clearly BEAUTIFYING, idol-grade luminous, the face
  glowing warm and fresh, every feature crisp — while the scene around
  them glows with warm amber party lights, golden string-light bokeh and
  soft candle-like glow; festive, glamorous, celebratory mood.
  WARM-LIGHT ISOLATION (critical): every amber, gold, and candle tone
  belongs to the BACKGROUND and to sparkles on the outfit only — it must
  NEVER tint the face yellow, orange, or muddy. The face keeps its own
  clean neutral key light, bright and evenly lit, as if a separate beauty
  light were set just for the person.
- Every surface BARE — no readable text, letters, numbers, logos, brand
  marks, labels, or signage anywhere on clothing, glasses, bottles, walls,
  or decorations. Even illegible text shapes are a failure.
POSE — standing relaxed and confident near the bar, body turned slightly
off-axis with the face toward the camera; a soft, glowing, celebratory
smile or a poised, elegant half-smile, chin slightly lifted, one hand
resting lightly on the bar or holding the flute low.
FRAMING — vertical 3:4 portrait, upper-body shot, the person centered —
tall, model-like proportions with the small refined face clearly the
hero of the frame.
CAMERA — shot on an 85mm portrait lens at f/1.4: the person tack-sharp,
the party lights dissolving into large, soft, round golden bokeh discs
behind them. Rich, clean, cinematic color grade with deep blacks and a
bright, neutral face. Photorealistic, high resolution — real fabric, real
sparkle, real skin.
FINAL SELF-CHECK before output:
- Next to the source photo, friends must instantly say "that's the same
  person — and this is the best they have ever looked."
- Is the enhancement CLEARLY visible — face obviously smaller, brighter,
  and prettier than the input? A timid result is a failure.
- Never warped or uncanny?
- SKIN CHECK: flawless glass skin with zero moles, zero spots, zero
  INVENTED marks anywhere?
- Glasses exactly as the source? Hair color true to the source?
- Is the face clean and NEUTRAL-toned — zero yellow or amber cast from
  the party lights — while the background clearly glows warm gold?
- Zero readable text, logos, or signage anywhere — including bottles
  and glassware?
ABSOLUTELY AVOID:
- A timid, under-retouched result that barely improves on the source.
- Removing the person's glasses if they wore them, adding glasses they
  didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as
  expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face,
  oversaturated HDR.
- A yellow, orange, or amber-tinted face; warm party light bleeding onto
  the skin; a dim or underexposed face against a bright background.
- Crowds or other people in the background.
- Cheap costume-party props (paper hats, plastic confetti, party horns,
  novelty glasses) or a cluttered table blocking the person.
- Any readable text, signs, or watermarks anywhere.
Output: one photorealistic photo — the same person in a complete holiday party snap portrait,
at the absolute best of their life. High resolution, no text, no watermark,
no border.
`;
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
      "partysnap",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][partysnap] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[partysnap] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "partysnap", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[partysnap] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[partysnap] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePartysnap(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("partysnap error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("partysnap", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
