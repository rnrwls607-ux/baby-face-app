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

async function generateClayfigure(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into an adorable handcrafted clay figure — a MATTE polymer-clay character with soft handmade charm, photographed as a real product shot on a desk. It must look like a photograph of a physical clay object, never a drawing and never a glossy plastic toy.

FIGURE DESIGN — IDENTITY THROUGH CLAY (MOST IMPORTANT):
- The figure must be instantly recognizable as THIS person. Anchor the likeness in these five things, all mandatory:
  1) The EXACT same hairstyle and hair color, sculpted in clay with clear shape (parting, length, waves, volume).
  2) The SAME outfit — every garment and color translated into layered clay parts (a cream knit stays a cream knit with sculpted knit texture, a blue vest stays blue).
  3) The SAME accessories — glasses (exact frame shape), hat, earrings. If they wear glasses, the figure wears them; if not, add none.
  4) The same skin tone in clay.
  5) A simplified clay face that keeps their eye shape, eyebrow impression, and signature expression.
- Friendly rounded clay proportions (slightly big head, soft compact body) — cute but still THEM, never a generic clay person.
- Same gender and age impression as the input.
- Clean simple clay hands with intact fingers or tasteful mitten-style hands — never melted.

CLAY MATERIAL (make it feel genuinely handmade — this is what separates it from a plastic toy):
- MATTE modeling-clay surface with soft micro-texture: faint fingerprint traces, gentle tool marks, slightly imperfect hand-rolled edges — lovingly handcrafted, not factory-perfect.
- Distinct clay parts with subtle seams where colors meet (the hair piece, clothing pieces layered like real clay work).
- Soft, warm, cozy color palette with the clay's natural slightly-chalky finish.
- Absolutely NO glossy or shiny plastic finish anywhere.

PHOTOGRAPHY (this sells the "real clay figure" illusion):
- Macro product photography: the figure razor-sharp in focus, standing on a wooden desk or shelf, with a softly blurred warm room background (creamy bokeh).
- Soft window-light key plus a gentle rim light; a realistic soft contact shadow under the figure.
- Optional one tiny clay prop beside them (a small clay heart or star) — minimal and tasteful.

TEXT BAN:
- No letters, numbers, or logos anywhere — not on clothing, not on the desk, not in the background. Any surface that would carry writing is left plain.

SELF-CHECK before finishing:
- Is the surface clearly MATTE handmade clay with visible fingerprints and tool marks — not glossy PVC plastic?
- Same hairstyle, same outfit colors, same accessories (glasses/hat correct)?
- Does it read as a PHOTOGRAPH of a physical object, not a 2D illustration?
- Face simplified but still theirs? Hands intact? Zero text anywhere?
- Only then is the shot complete.

ABSOLUTELY AVOID:
- A glossy PVC/plastic collectible finish — this must read as MATTE handmade clay.
- A 2D illustration or cartoon — this must look like a photograph of a physical clay object.
- Losing the person's hairstyle, outfit, accessories, or expression in simplification; melted or blobby anatomy.
- Changed gender, age impression, or skin tone.
- Copying any famous stop-motion studio's characters.
- Text, logos, watermark, border.

Final result: one high-resolution photorealistic product photo of their handmade clay figure.`;

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
  console.log(`[clayfigure] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[clayfigure] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateClayfigure(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("clayfigure error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
