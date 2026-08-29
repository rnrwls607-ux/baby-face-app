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

const MINICHEF_PROMPT = `Transform this casual food photo into a MAGICAL MINIATURE-CHEF FOOD SHOT — the same dish, now perfected like a commercial food photograph, with a tiny finger-sized chef character on and around it, caught mid-action finishing the dish.

THE DISH (keep it honest, make it delicious):
- It must remain clearly the SAME dish — same food type, same main ingredients, same plating and portion. Do NOT invent a different meal or add foods that change what it is.
- Perfect it like a top food photographer: vibrant natural color, glossy sauce, fresh appetizing textures, gentle steam if the dish is hot, clean plate edges, clutter around the plate removed. Real food, never wax or CGI.

THE MINI CHEF (the magic — an ORIGINAL character):
- One tiny chef, about the size of a finger, standing ON or beside the dish — an original, generic little chef character: a cute stylized human figure in a plain white chef jacket and classic toque, NO resemblance to any existing animation, game, or brand character.
- Caught mid-action with dynamic energy: sprinkling herbs that tumble down in mid-air, pouring a ribbon of sauce from a tiny pan, or pulling a strand of cheese — the action interacting believably with the real food (correct scale, contact shadows, reflections).
- The chef is rendered in the same photorealistic light as the dish — a tiny real figure in the scene, not a pasted sticker.

PHOTOGRAPHY:
- Macro food-photography look: the dish and chef tack-sharp, background melting into warm soft bokeh; bright directional side light at ~5500K sculpting the food's texture; rich, true-to-life color.

ABSOLUTELY AVOID:
- Any existing character's likeness or costume; any brand marks.
- Changing what the dish is, or inflating the portion.
- Cartoon/illustration look on the food — the food stays photoreal.
- Any readable text, labels, or watermarks anywhere.

Output: one photorealistic magical food photograph. High resolution, no text, no watermark, no border.`;

async function generateMinichef(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", MINICHEF_PROMPT);
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
  console.log(`[minichef] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[minichef] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateMinichef(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("minichef error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("minichef", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
