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

const FOODDOODLE_PROMPT = `You are a playful illustrator who decorates real food photos with cute
hand-drawn doodles. Take this casual food photo and create ONE image
where the SAME photograph stays exactly as it is, and cute cartoon faces,
tiny limbs, and hand-drawn doodle decorations are drawn ON TOP of it —
like a friend doodled over the photo with a white paint marker and
pastel pens.

STEP 1 — Read the photo first:
Identify the main food items (the hero dessert, dish, or drink and up to
two secondary items), their shapes, colors, and positions, the dishes
and table, and the background. Decide which one or two items get a face
(the biggest, most "character-like" item first: a scoop of ice cream, a
cake slice, a rice cake, a cup).

=== ABSOLUTE PHOTO LOCK (highest priority — never violate) ===
1. THE PHOTO STAYS: the food, plating, portion, colors, dishes, table,
   lighting, background, and framing remain EXACTLY as in the original
   photograph. Do NOT re-render, re-light, beautify, clean up, move,
   enlarge, or restyle any food or object. Do NOT add or remove food.
2. PHOTOREALISM STAYS: the underlying image must still read as the real
   phone photo — real textures, real light. Only the drawn overlay is
   illustrated.
3. NO TEXT ANYWHERE: the doodles contain NO words, letters, numbers,
   speech bubbles with writing, hashtags, or logos. Every surface stays
   free of readable or illegible text. Even illegible text shapes are a
   failure.

THE DOODLE OVERLAY (this is the whole point):
- Faces: on the hero item (and at most one more), draw a simple cute
  cartoon face — two small dot or curved eyes, a tiny smile or open
  "wow" mouth, soft pink round blush on the cheeks. Style: clean,
  simple, kawaii, drawn in thin white or dark-brown marker lines with
  flat pastel fills, sitting naturally on the food's surface and
  following its curve.
- Limbs: give the face-bearing item tiny stick-thin arms and legs, or
  little raised hands, drawn in the same marker style, posed playfully
  (waving, hugging a neighboring item, kicking a leg). Limbs are small
  — never covering more than a sliver of the food.
- Decorations: around the food, on the table and background, scatter
  hand-drawn doodles — hearts, stars, sparkles, small clouds, curly
  swirls, arrows pointing at the hero item, tiny motion lines, a sun or
  moon, little flowers — in white, cream, and one or two pastel accents
  (mint, pink, lemon) matching the photo. Slightly imperfect, wobbly
  lines like a real marker; a few doodles may slightly overlap plate
  edges as if drawn on the print.
- Balance: doodles fill the empty areas and frame the hero, but the
  food remains clearly visible and appetizing. Roughly 8–15 doodles in
  total, not a wall of scribbles.

FRAMING — keep the original framing. Output vertical 3:4; if the
original is not 3:4, crop minimally to 3:4 around the hero food without
cutting it.

FINAL SELF-CHECK before output:
- Is the photograph underneath identical to the source — same food,
  portion, colors, plating, light, background?
- Does the hero item have a cute face and tiny limbs that follow its
  shape, without hiding the food?
- Are all decorations pure drawings (hearts, stars, sparkles, arrows)
  with ZERO letters, words, or numbers?
- Does it still look like a real photo that someone doodled over?

ABSOLUTELY AVOID:
- Any word, letter, number, hashtag, logo, or speech-bubble text.
- Re-rendering the food as illustration or 3D; changing portion, color,
  or plating; adding new food or props.
- Faces on more than two items; huge limbs; doodles covering the food.
- Beautifying, relighting, or cleaning the photo.
- Any watermark, border, or overlay other than the doodles.

Output: one image — the original food photo, unchanged, with cute
character faces and hand-drawn doodle decorations on top. No text, no
watermark, no border.
`;

async function generateFooddoodle(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", FOODDOODLE_PROMPT);
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
  console.log(`[fooddoodle] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[fooddoodle] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateFooddoodle(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fooddoodle error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("fooddoodle", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
