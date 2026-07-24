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

async function generateChibifigure(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into an adorable chibi-proportioned collectible mini figure — photographed as a real product shot: the figure standing on a desk, shot with a macro lens. It must look like a photograph of a physical object, never a drawing.

FIGURE DESIGN — IDENTITY THROUGH STYLE (MOST IMPORTANT):
- Chibi proportions: large head (about 1/2 of total height), small cute body — but the figure must be instantly recognizable as THIS person.
- Anchor the likeness in these five things, all mandatory:
  1) The EXACT same hairstyle and hair color, sculpted with clear shape (bangs, parting, length, volume).
  2) The SAME outfit — every garment, color, pattern, and layer translated into figure form (a red hoodie stays a red hoodie, a checkered shirt keeps its check).
  3) The SAME accessories — glasses (exact frame shape and color), hat, earrings. If they wear glasses, the figure wears them; if not, add none.
  4) The same skin tone.
  5) A simplified face that keeps their eye shape, eyebrow impression, and signature expression.
- Do NOT output a generic cute figure — someone who knows this person must smile and say "that's them."
- Same gender and age impression as the input.
- Clean appealing chibi anatomy with intact small hands and fingers, and both feet on the base.

FIGURE MATERIAL (make it look like a real collectible):
- High-quality PVC collectible finish: smooth surfaces with a subtle satin-to-glossy sheen, crisp clean paint edges, subtle hand-painted shading on hair and clothing folds, tiny realistic highlights on raised areas.
- Believable figure construction: gentle seam lines, and a simple round display base under the feet.

PHOTOGRAPHY (this sells the "real figure" illusion):
- Macro product photography: the figure razor-sharp in focus, standing on a real wooden desk or shelf, with a softly blurred cozy room background (strong creamy bokeh).
- Soft studio key light plus a gentle rim light; a realistic soft contact shadow under the base.

TEXT BAN:
- No letters, numbers, or logos anywhere — not on the clothing, not on the base, not in the background. Any surface that would carry writing is left plain.

SELF-CHECK before finishing:
- Same hairstyle, same outfit colors and patterns, same accessories (glasses correct)?
- Chibi proportions with a large head — not realistic human proportions, not a shapeless blob?
- Does it read as a PHOTOGRAPH of a glossy physical figure, not a 2D illustration?
- Hands and fingers intact? Zero text anywhere?
- Only then is the shot complete.

ABSOLUTELY AVOID:
- Realistic human proportions (this must be chibi), or a melted blob without clear anatomy.
- A 2D illustration, cartoon drawing, or flat render — this must look like a photograph of a physical figure.
- A matte handmade clay look — this figure is smooth painted PVC with sheen.
- Losing the person's hairstyle, outfit, accessories, or expression in simplification.
- Changed gender, age impression, or skin tone; melted or missing fingers.
- Text, logos, watermark, border.

Final result: one high-resolution photorealistic product photo of their chibi figure.`;

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
  console.log(`[chibifigure] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[chibifigure] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateChibifigure(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("chibifigure error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("chibifigure", 0, handler); // COIN_DORMANT: 실가격 3
