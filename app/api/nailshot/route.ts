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

const NAILSHOT_PROMPT = `You are a top nail-salon photographer and retoucher. Take this casual
photo of a customer's hand showing a finished manicure and create ONE
clean, professional NAIL-ART PRODUCT PHOTO of the EXACT same hand and
the EXACT same nail design — the standard hero shot a premium nail
salon posts on its feed.

STEP 1 — Read the hand and the nails first:
Note the hand (left or right, skin tone, finger proportions, any rings),
how many nails are visible, and for EACH nail: the shape (square, round,
almond, coffin, stiletto), the length, the base color and finish (glossy,
matte, sheer, glitter, cat-eye, chrome), every art element (lines,
French tips, ombré, marble, dots, flowers, foil), and every attached
part (pearls, stones, charms, metal pieces) with its exact position.
Also note any text, logo, or mark on parts or rings.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. HAND ANATOMY LOCK: the same hand — exactly FIVE fingers, each with the
   same length, thickness, knuckles, and natural proportions as the
   source; the same skin tone; the same rings or bracelets if present.
   Do NOT slim, lengthen, reshape, or beautify the fingers; do NOT add
   or remove a finger; do NOT change the hand's skin tone. No face, no
   body — the hand (and wrist) only.
2. NAIL DESIGN LOCK: each nail keeps its exact shape, length, base color,
   finish, art, and parts — in the same position on the same finger.
   Do NOT add, remove, move, recolor, or "improve" any art element or
   part. Do NOT change the nail shape or make nails longer. Nail count
   and which finger has which design stay identical.
3. TRUE COLOR: reproduce the gel colors EXACTLY. Only correct an obvious
   color cast from the salon lighting (yellow fluorescent) to reveal the
   TRUE color — never make it brighter, pinker, or more saturated.
4. TEXT & MARKS: any text, logo, or mark on parts, charms, or rings
   stays exactly as in the source. Do NOT add any.
5. NO NEW TEXT ANYWHERE: the background and every surface must be BARE —
   no readable or illegible text, letters, numbers, logos, or signage
   anywhere. Even illegible text shapes are a failure.

CLEAN UP (be bold here, nails only where noted):
- Remove the original surroundings entirely: salon table, tools,
  bottles, cushions, walls, clutter, other hands.
- Tidy the skin AROUND the nails: clean cuticle lines, remove stray gel,
  dust, lint, and smudges on the skin next to the nail — without
  changing the nail edge or shape.
- Light natural skin polish on the hand (even tone, remove temporary
  redness or dry flakes) — keep real skin texture, knuckle lines, and
  veins; never plastic or waxy.

THE SHOT — nail-salon standard:
- The hand posed in the classic nail-display pose: fingers gently
  curled or softly spread so ALL nails face the camera clearly, seen
  from slightly above, resting on or hovering over the surface.
- Background: ONE clean surface — soft ivory, pale blush, light gray, or
  a matte pastel that complements the nail colors; plain, seamless,
  with at most one tiny plain accent (a small dried flower or a smooth
  pebble) far from the nails, never touching the hand.

LIGHTING & CAMERA:
- Soft, bright, diffused beauty light from the front-top with gentle
  fill — glossy nails show small clean highlights, matte nails stay
  matte, glitter and chrome sparkle naturally; no harsh glare hiding the
  design, no dark shadows on the nails.
- Shot on a 100mm macro lens: every nail tack-sharp, art and parts
  crisp, the background softly blurred; accurate white balance, clean
  commercial color grade.

FRAMING — vertical 3:4, the hand large in the upper two-thirds of the
frame with all nails clearly visible, wrist toward the bottom, nothing
cropped.

FINAL SELF-CHECK before output:
- Exactly five fingers, same proportions, same skin tone, same rings?
- Every nail: same shape, length, color, finish, art, and parts on the
  same finger as the source — nothing added, removed, or moved?
- Colors true to the source, not brightened or shifted?
- Background clean and completely free of text or marks?
- Real skin texture, no plastic look; no face or body in frame?

ABSOLUTELY AVOID:
- Any change in finger count, length, shape, or skin tone; a
  beautified or generic hand.
- Any added, removed, moved, or recolored nail art, part, tip, or
  gradient; a different nail shape or length.
- Any text, letters, numbers, or logos anywhere; a face or body.
- Salon clutter, tools, bottles, or other hands in frame.
- Plastic, waxy, CGI skin; blown-out glare on the nails; murky shadows.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution nail-salon hero photo
— the exact same hand and nail design, professionally shot. No added
text, no watermark, no border.
`;

async function generateNailshot(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", NAILSHOT_PROMPT);
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
  console.log(`[nailshot] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[nailshot] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateNailshot(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("nailshot error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("nailshot", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
