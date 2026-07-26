import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 장면 전체 재구성이라 여유 있게

// 🔑 모델 격리 지점: 신규 변환 2차는 GPT 이미지 모델 사용
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateBeauty(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are Korea's top makeup artist and portrait retoucher working together on one photo. The person came in bare-faced or barely made-up — send them out looking like their most beautiful, naturally made-up self. Same person, best face of their life.

[SKIN TRUTH — read this first, check it last]
- ZERO new marks: never create a mole, beauty mark, freckle, spot, or scar that does not exist in the original. Not one, anywhere on the face or body. Adding even a single tiny new mark is a critical failure.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- "Natural skin texture" means pores and fine real texture — NEVER sprinkled freckles or invented spots.

[IDENTITY FLOOR — never cross]
- Anyone who knows them must recognize them INSTANTLY. Keep the distinctive features that define this face: overall face shape, eye character (NEVER add or remove double eyelids), nose character.
- Keep the exact pose, expression, framing, hairstyle shape, outfit, and background.

[GLASSES & ACCESSORIES — untouchable]
- GLASSES: if they wear glasses, keep the EXACT same frames in the exact same position; if they wear none, add none.
- Earrings and accessories stay exactly as in the original — none added, none removed.

[NATURAL FULL MAKEUP — the visible transformation]
If the person presents as a woman, apply a complete, natural Korean daily-glam makeup as a top artist would:
- Skin: a flawless luminous base — even glass-skin glow, dark circles and redness gently covered, real skin texture kept (never plastic).
- Eyes: brows neatly groomed and softly filled; soft neutral eyeshadow; a fine eyeliner that sharpens the eye line; naturally curled, defined lashes — the eyes become clearly bigger, brighter, and more alive.
- Cheeks & lips: a soft healthy blush high on the cheeks; lips in a flattering my-lips-but-better tone with a moist finish.
- The makeup must be OBVIOUS next to the bare-faced original — "wow, she did her makeup and looks stunning" — yet completely natural and modern, never heavy or cakey.
If the person presents as a man, apply natural grooming instead: clear even skin, tidy brows, healthy lip color, a clean fresh well-rested look.

[SUBTLE FEATURE REFINEMENT — around 10%, flattering but honest]
- A gently smaller-face impression with a soft, clean jawline (men keep a masculine jaw).
- Eyes a touch larger and more defined; nose bridge and tip subtly refined; overall facial balance harmonized.
- The person looks clearly prettier, brighter, and younger — while staying unmistakably the same person.

[LIGHT POLISH]
- Keep the original scene and background, but light the face like a studio: soft, even, flattering illumination; harsh shadows and dull color casts removed.

SELF-CHECK before finishing: zero new moles, freckles, or marks anywhere? · every original mole still in place? · glasses exactly as the original (or still absent)? · double eyelids untouched? · same person at a glance? Only then is the work complete.

Output: one photorealistic photo, identical in composition to the input — the same person on their most beautiful day. High resolution, no text, no watermark, no border.`;

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
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
  console.log(`[beauty] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[beauty] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
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
    const output = await generateBeauty(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("beauty error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("beauty", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
