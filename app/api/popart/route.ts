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

async function generatePopart(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a bold retro pop-art poster — flat vivid color blocks, thick graphic outlines, and halftone dot shading, like a vintage silkscreen print. Even with unrealistic colors, the face must be unmistakably this person.

STEP 1 — READ THE PHOTO FIRST:
Identify the subject and keep the exact same person — never replace or idealize them into someone else. This concept is designed for ONE person.

STEP 2 — PRESERVE COMPOSITION:
Keep the same pose, angle, and framing, cropped into a strong poster-style upper-body composition.

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- The line work must trace THIS person's real features: same face shape and jawline, same eye shape and eyelid type, same nose and mouth, same eyebrow shape and thickness, same hairstyle silhouette.
- GLASSES RULE: if they wear glasses, draw the exact same frame shape as a clean graphic element; if they wear none, add none.
- Keep distinctive cues as clean graphic lines: moles, dimples, facial hair (keeping the same beard and mustache shape).
- Same gender, ethnicity impression, and age impression as the input.
- Even with bold unrealistic colors, anyone who knows them must instantly recognize the face from its lines alone.

STEP 4 — APPLY THE POP-ART POSTER STYLE:
- Flat vivid color blocks: a limited palette of 3–5 bold colors (for example warm coral, sunny yellow, electric blue, cream) filling skin, hair, and clothing as clean flat shapes.
- Thick confident dark outlines around the figure and every feature.
- Halftone dot texture used tastefully in shadow areas and the background.
- FACE CLARITY RULE (critical): the face stays clean and readable — halftone dots only lightly at the jaw or neck shadow, never across the eyes, nose, or mouth. Never split the face into multiple clashing color zones that break the likeness; skin reads as ONE flat color (bold and unrealistic is fine, but unified).
- Background: a solid bright color or simple graphic shapes (a circle, a diagonal split) that makes the figure pop.
- A subtle off-register print charm is welcome; energetic, stylish, gallery-poster mood.

SELF-CHECK before finishing:
- Can the person be recognized from the outlines alone — same jawline, eye shape, eyebrows, hairstyle?
- Glasses and facial hair handled correctly?
- Is the face clean — skin as one unified flat color, no dots or color splits crossing the features?
- Is everything flat graphic shapes, with zero gradients and zero leftover photo texture?
- Only then is the poster complete.

ABSOLUTELY AVOID:
- Realistic rendering, soft gradients, or leftover photo texture — everything must be flat graphic shapes.
- Heavy dots or multi-color splits across the face that break the likeness.
- Comic speech bubbles, panels, or any lettering.
- Changed gender, age impression, or facial structure.
- Copying any famous artist's specific iconic artwork.
- Any text, logos, watermark, or border.

Final result: one bold, clean pop-art poster portrait, high resolution.`;

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
  console.log(`[popart] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[popart] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generatePopart(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("popart error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
