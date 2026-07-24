import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

// 🔑 모델 격리 지점: 변환 컨셉은 GPT 이미지 모델 사용 (회화 스타일 표현이 우수)
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generatePixelart(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a charming retro pixel-art scene — the ENTIRE image redrawn as detailed 2D pixel art, like a beautifully crafted sprite illustration from a classic 16-bit era game. Both the person and the background become pixels; nothing stays photographic.

STEP 1 — READ THE PHOTO FIRST:
Identify the subject and the setting. Keep the exact same number of subjects — never add or remove anyone. This concept is designed for ONE person.

STEP 2 — PRESERVE COMPOSITION:
Keep the same pose, framing, and placement, adapted into a clean pixel-art composition.

STEP 3 — PRESERVE IDENTITY THROUGH PIXELS (MOST IMPORTANT):
- Use a LARGE portrait scale with high pixel density — enough pixels across the face that the eyes, hair shape, and expression stay clearly readable. Never shrink the person into a tiny unreadable sprite in a wide landscape.
- Anchor the likeness in these five things, all mandatory:
  1) The EXACT same hairstyle and hair color as clear pixel clusters (ponytail stays a ponytail, bangs stay bangs).
  2) The SAME outfit — every garment and color as pixel blocks (an orange windbreaker stays orange, a purple hoodie stays purple).
  3) The SAME accessories — glasses (drawn as a clear pixel frame in the same shape), hat, earrings. If they wear glasses, the sprite wears them; if not, add none.
  4) The same skin tone.
  5) A simplified pixel face that keeps their eye shape impression, eyebrow position, and signature expression.
- Same gender and age impression as the input.
- Anyone who knows this person should smile and say "that's them as a game character."

STEP 4 — APPLY THE PIXEL ART STYLE:
- Crisp, deliberate pixels: a visible square pixel grid, clean pixel-perfect outlines, and a tasteful limited color palette.
- Shading through classic pixel techniques: dithering patterns and stepped color bands — never smooth gradients or blurs.
- Background: the original setting rebuilt as a charming 2D pixel-art backdrop (pixel sky, pixel buildings, pixel foliage, pixel furniture) with a cozy retro game atmosphere. The background is FLAT 2D pixel art — never 3D cubes or blocks.
- Warm inviting light, a few sparkle or particle pixels for charm.

NO GAME INTERFACE:
- This is a pure illustration. No HUD, no health bars, no item slots, no crosshair, no minimap, no dialogue box, no button prompts, no coordinates — nothing resembling a game interface anywhere.

TEXT BAN:
- No letters, numbers, or words anywhere in the image — not on signs, not on clothing, not as any overlay.

SELF-CHECK before finishing:
- Is the face large enough in pixels to read clearly — eye shape, hairstyle, expression all visible?
- Same hairstyle, outfit colors, and glasses as the original?
- Is EVERYTHING pixels — including the person — with zero photographic texture anywhere?
- Is the background flat 2D pixel art, not 3D blocks or cubes?
- Zero interface elements and zero text?
- Only then is the illustration complete.

ABSOLUTELY AVOID:
- Smooth gradients, anti-aliased soft edges, or leftover photo texture — every element must be honest chunky pixels.
- Keeping the person photorealistic while only the background is stylized.
- 3D cube blocks or an isometric voxel world — this is FLAT 2D pixel art.
- A face too small or too simplified to recognize; erasing glasses or the hairstyle.
- Any game UI, HUD, health bars, or interface elements.
- Copying any specific famous game's characters, items, or art style.
- Any text, letters, watermark, or border.

Final result: one cohesive high-resolution 2D pixel-art illustration with the person clearly recognizable.`;

  // multipart/form-data 구성 (idstyle과 동일 패턴 — Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  form.append("size", "auto"); // ★원본 구도 보존 — 모델이 입력 비율에 맞춰 선택
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
  console.log(`[pixelart] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[pixelart] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // ★크롭 없음 — 원본 구도 보존형
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
    const output = await generatePixelart(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("pixelart error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("pixelart", 0, handler); // COIN_DORMANT: 실가격 3
