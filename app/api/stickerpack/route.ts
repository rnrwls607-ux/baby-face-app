import { NextRequest, NextResponse } from "next/server";
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

async function generateStickerpack(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into ONE sticker sheet containing SIX adorable die-cut illustrated stickers of them — each sticker a different cute expression and pose, like a premium messenger sticker pack. All six must be the SAME recognizable person.

STEP 1 — READ THE PERSON FIRST:
Note their hairstyle and hair color, face shape, eye shape and eyelid type, eyebrow shape, skin tone, outfit and its colors, and every distinctive feature (glasses, moles, dimples, facial hair). This concept is designed for ONE person.

LAYOUT — this is critical:
- ONE clean sheet with a soft solid pastel background, containing exactly SIX stickers arranged in a balanced 2x3 grid or a pleasingly scattered layout.
- Each sticker is a die-cut illustration with a thick clean white sticker border following its silhouette, plus a subtle drop shadow so it sits on the sheet like a real sticker.
- Each sticker shows an upper-body or slightly chibi half-body view with a LARGE, clearly readable face — never tiny.

IDENTITY — THE SAME PERSON IN ALL SIX (MOST IMPORTANT — this is where this concept fails):
- Anchor the likeness IDENTICALLY in every one of the six stickers:
  · the EXACT same hairstyle, hair color, and hair length (bangs stay bangs in all six),
  · the same face shape impression, same eye shape and eyelid type, same eyebrow feel,
  · the same skin tone,
  · the same outfit and its colors in all six (or one consistent simple color scheme),
  · the same accessories — GLASSES RULE: if they wear glasses, all SIX stickers have the exact same frames; if they wear none, none appear in any sticker,
  · distinctive marks (a mole, dimples, facial hair) kept in the same place in all six.
- Do NOT drift into a different character between stickers, and do NOT vary the hair, outfit, or accessories from sticker to sticker. Someone who knows this person must recognize every single one of the six.
- Same gender and age impression as the input, in all six.

SIX EXPRESSIONS (one per sticker — only the expression and pose change):
1) warm smile   2) big cheerful laugh   3) surprised   4) thumbs-up confident   5) shy or blushing   6) playful wink or peace sign.

STYLE:
- Charming polished character illustration: clean confident line work, soft cel shading, warm harmonious colors — premium messenger-sticker quality, cute but never a childish scribble.
- Consistent art style across all six stickers.

TEXT BAN:
- No speech bubbles, no letters, no words, no numbers, no emoji symbols anywhere — the expressions and poses carry all the emotion.

SELF-CHECK before finishing:
- Are there EXACTLY six stickers?
- Placing all six side by side, is it obviously the same person in every one — same hair, same outfit, same glasses, same mole?
- Is each face large enough to read clearly?
- Zero text, speech bubbles, or symbols?
- Only then is the sheet complete.

ABSOLUTELY AVOID:
- Different-looking people across the stickers, or drifting hair/outfit/accessories between them (the fatal failure).
- Tiny unreadable faces; more or fewer than six stickers.
- Photo textures, 3D render, or copying any famous character brand's style.
- Any text, letters, numbers, speech bubbles, watermark, or border around the sheet.

Final result: one high-resolution sticker sheet with six die-cut stickers of the same recognizable person.`;

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
  console.log(`[stickerpack] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[stickerpack] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // ★크롭 없음 — 원본 구도 보존형
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateStickerpack(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("stickerpack error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
