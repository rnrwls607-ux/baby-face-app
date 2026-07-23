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

async function generatePendrawing(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into an elegant hand-drawn ink pen portrait — confident line work and delicate crosshatching on warm paper, like a high-end editorial illustration. The likeness must be captured faithfully in line.

STEP 1 — READ THE PHOTO FIRST:
Identify every subject and keep the exact same number — never add or remove anyone. This concept is designed for ONE or TWO people (plus pets).

STEP 2 — PRESERVE COMPOSITION:
Keep the same camera angle, framing, crop, and pose. The drawing must clearly be the same photo, redrawn by a skilled hand.

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- The line work must capture THIS person's real likeness: same face shape and proportions, same eye shape and eyelid type, same nose and mouth, same eyebrows, same hairstyle, and the same outfit.
- GLASSES RULE: if a person wears glasses, draw the exact same frame shape; if they wear none, add none.
- Keep distinctive cues in line: moles (drawn as small deliberate marks), dimples, facial hair (drawn with directional strokes, keeping the same beard shape and density).
- This is a portrait artist's commission — anyone who knows them must instantly recognize the drawing.
- With two people, draw each from their own face — never blend features. For pets, keep the breed, markings, and fur direction clear in the line work.

STEP 4 — APPLY THE INK PEN DRAWING STYLE:
- Confident, varied ink lines: bolder contour lines on the outside, finer detail lines within.
- Shading built from delicate crosshatching and light stippling — never smudgy digital airbrush.
- FACE CLARITY RULE (critical): keep skin areas clean and luminous. Use hatching sparingly on the face — only light shading along the jaw, under the nose, and beside the cheekbones. Never cover the face in dense hatching that reads as wrinkles, dirt, or age.
- Paper: warm ivory or cream drawing paper with subtle visible texture; the background simplified into a few loose suggestive strokes or left mostly clean so the subject stays the hero.
- At most one quiet accent wash (a soft sepia tone) — the piece reads as a refined, mostly-monochrome ink drawing.
- Sophisticated, gallery-quality editorial sketch mood.

SELF-CHECK before finishing:
- Is the person immediately recognizable from the lines alone — same eye shape, nose, eyebrows, hairstyle, beard?
- Glasses handled correctly? Moles and distinctive marks kept?
- Is the face CLEAN — no dense hatching aging them or making the skin look dirty?
- Does it read as real ink on textured paper, with zero photographic texture remaining?
- Only then is the drawing complete.

ABSOLUTELY AVOID:
- Cartoon or caricature exaggeration; childish doodle lines.
- Heavy digital painting, full color, or a photo-filter look with leftover photographic texture.
- Over-hatching the face into wrinkles or grime; making the person look older or harsher than they are.
- Erasing glasses, moles, or facial hair.
- Any text, signature, watermark, or border.

Final result: one refined hand-drawn ink portrait on textured paper, high resolution.`;

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
  console.log(`[pendrawing] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[pendrawing] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generatePendrawing(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("pendrawing error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
