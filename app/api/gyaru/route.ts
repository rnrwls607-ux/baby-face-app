import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const GYARU_PROMPT = `You are the master retoucher and head stylist team of Seoul's trendiest Y2K gyaru makeover studio — the studio that trendsetters and influencers visit for their transformation pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the gyaru version of themselves — while friends still recognize them at a glance.

Take the person in the photo and create ONE stunning, fully-retouched gyaru makeover of them — photographed in this exact same moment and place. Same person, same photo — gyaru version.

STEP 1 — Read the person first:
Note their hair color and length, skin tone, facial features, eyelid type, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

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
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny.
EYELID ANCHOR: the eye enhancement NEVER adds or removes double eyelids — keep the person's own eyelid type exactly.

SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow — top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a healthy warm undertone — never plastic, waxy, or flat.
- Zero moles, zero spots, zero marks interrupting the flawless skin — every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — trendy gyaru, youthful:
- Beautify in the aesthetic of TODAY's trendiest young gyaru icons — fresh, glossy, doll-like. They must look subtly YOUNGER than the input photo, never older.
- MAKEUP (the heart of gyaru): a bright porcelain-luminous base with sculpted soft nose contour; large doll-like eyes — sharp black winged liner, long defined lashes top AND bottom, prominent cute aegyo-sal; slim softly-arched brows a shade lighter than the hair; peachy blush placed high; and a glossy nude-pink gradient lip. Sparkling, kawaii, camera-ready — bold yet clean, never smudged, never costume-like.
- HAIR (color change IS this concept): restyle into the signature gyaru look — long, voluminous soft waves in a light milk-tea beige to honey-blonde tone, with airy face-framing strands and wispy bangs, slightly teased crown volume. Salon-perfect, natural hairline, believable dyed-hair texture.

WARDROBE — Y2K street gyaru:
- Replace the outfit with a playful Y2K street-gyaru look — a fitted pastel top (mint, pink, or baby blue) with a frilly or ruffled mini skirt in a contrasting pastel, layered chain necklaces with cute generic heart or ribbon charms, stacks of colorful bracelets and beaded accessories on the wrists, and optionally a cute pastel cap or hair accessory that does NOT shadow the face. Modest and tasteful: NO bare midriff, no revealing cuts. ★ABSOLUTELY NO letters, numbers, brand names, logos, or any existing character designs anywhere — all charms and prints are generic hearts, stars, and ribbons only.
- The outfit must fit the person's actual body and pose naturally, with believable fabric and lighting.

SCENE PRESERVATION — same photo, same place:
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Nothing in the scene changes except the person's styling. Do not add any new people, props, or objects.

RELIGHT THE PERSON (this makes it look real):
- Keep the original background's own light and air, but discard the dull lighting on the person — re-light them with flawless beauty lighting: a bright soft key light with delicate catchlights, gentle fill, and a clean rim light in the hair, idol-grade luminous glossy skin, every feature crisp and glowing — while the scene around them keeps its natural light with dull color casts removed. They must still look truly photographed in this same place at this same moment.

THE VERDICT LOOK:
- The finished person radiates playful gyaru energy: glossy, doll-like, confident and cute — "she looks like the trendiest gyaru on the street." Next to the original photo, the transformation must be instant and delightful, while the face says "still unmistakably her — the best she has ever looked."
- This concept is styled for women.

FINAL SELF-CHECK before output:
- Next to the source photo, friends must instantly say "that's the same person — and this is the best she has ever looked."
- Face clearly slimmer, brighter, and more polished than the input, yet never warped or uncanny? Eyelid type unchanged?
- SKIN CHECK: flawless glass skin with zero moles, zero spots, zero INVENTED marks anywhere?
- Glasses exactly as the source? Same pose, same hands, same background?
- Outfit modest with zero letters, logos, or character designs?
- Does it scream "trendy gyaru" instantly?

ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person, or any real celebrity or idol.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Adding new people, props, or objects; changing the background.
- Any readable text, letters, logos, watermark, or border anywhere.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete gyaru styling, at the absolute best of their life. High resolution, no text, no watermark, no border — and the skin perfectly clean: nothing on it that the original does not have.`;

async function generateGyaru(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", GYARU_PROMPT);
  form.append("size", "auto"); // ★원본 비율 보존 — 모델이 입력 비율에 맞춰 선택
  form.append("quality", "medium");
  form.append("n", "1");
  const bytes = new Uint8Array(Buffer.from(img.data, "base64"));
  form.append("image[]", new Blob([bytes], { type: img.mimeType }), "photo.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: form,
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[gyaru] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[gyaru] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음 — 프롬프트가 원본 포즈·배경 유지를 요구하므로 입력 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateGyaru(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("gyaru error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("gyaru", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
