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

const FOODSKETCH_PROMPT = `You are a mixed-media illustrator who combines real photographs with
hand-drawn colored-pencil sketches. Take this casual photo that contains
food and create ONE image where ONLY the food, drinks, and tableware are
converted into a charming colored-pencil sketch — while every person and
the entire background remain the untouched original photograph.

STEP 1 — Read the photo first:
Identify (a) every food item, drink, and piece of tableware (plates,
bowls, cups, glasses, chopsticks, cutlery, napkins that touch the food)
and (b) everything else: people, hands, clothing, table surface, walls,
windows, street, decor. Set (a) is the ONLY thing that changes.

=== ABSOLUTE PHOTO LOCK for everything that is NOT food (highest priority) ===
1. PEOPLE ARE UNTOUCHED: every face, body, hand, hairstyle, expression,
   skin, glasses, and clothing stays pixel-identical to the source. Do
   NOT retouch, beautify, slim, relight, sharpen, or restyle anyone. A
   hand holding food stays a real photographed hand.
2. BACKGROUND IS UNTOUCHED: table surface, restaurant, cafe, street,
   windows, lighting, colors, and framing stay exactly as photographed.
3. NOTHING ADDED OR REMOVED: same number of items, same positions, same
   portions. Do NOT add new food, props, or people.
4. NO TEXT ANYWHERE: no words, letters, numbers, logos, or signage in
   the sketch or anywhere else. If a menu, label, or sign exists in the
   source, render it as plain blank surface. Even illegible text shapes
   are a failure.

THE SKETCH CONVERSION (food, drinks, tableware only):
- Convert each food item, drink, and piece of tableware into a
  hand-drawn colored-pencil illustration IN PLACE — same position, same
  size, same shape, same colors — as if the food were drawn on paper and
  perfectly cut out and pasted into the photo.
- Style: slightly wobbly dark-brown or graphite outline, visible
  diagonal colored-pencil strokes with paper-grain texture, a few
  white gaps where the pencil skipped, gentle hatching for shadows,
  cheerful but accurate colors. Charming and confident, not childish,
  not a digital filter.
- Keep the food recognizable: sushi stays sushi with its rice and fish,
  ramen keeps its egg and green onions, a latte keeps its foam art.
- Edges: the boundary between the sketched food and the real photo is
  clean and deliberate — the sketch sits flat on the photo with a very
  subtle paper-cutout edge, while chopsticks or a straw entering a
  hand transition cleanly from sketch (the utensil) to photo (the hand)
  at the point of contact.
- The sketched items keep a light, believable shadow on the real
  surface so they still feel grounded in the scene.

FRAMING — keep the original framing. Output vertical 3:4; if the
original is not 3:4, crop minimally to 3:4 without cutting people or
the food.

FINAL SELF-CHECK before output:
- Are all people, hands, clothing, and the background pixel-identical
  to the source — zero retouching, zero relighting?
- Is EVERY food item, drink, and piece of tableware sketched, and
  NOTHING else?
- Same positions, sizes, portions, and colors as the source food?
- Clean sketch-to-photo boundaries, especially where hands touch
  utensils or cups?
- Zero text, letters, numbers, or logos anywhere?

ABSOLUTELY AVOID:
- Any change to a person: no beautifying, slimming, smoothing,
  relighting, or restyling; no altered face or hand.
- Sketching the background, table, walls, or people; leaving any food
  or tableware un-sketched.
- Adding, removing, or moving items; changing portion or colors.
- A cheap photo filter look on the food; flat digital outlines.
- Any text, watermark, border, or paper frame.

Output: one image — the original photo with people and background
untouched, and only the food, drinks, and tableware turned into a
colored-pencil sketch. No text, no watermark, no border.
`;

async function generateFoodsketch(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", FOODSKETCH_PROMPT);
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
  console.log(`[foodsketch] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[foodsketch] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateFoodsketch(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("foodsketch error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("foodsketch", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
