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

async function generateBrickfigure(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `Transform this photo into a HYPER-REALISTIC photograph of the same scene completely rebuilt as an adorable plastic construction-brick toy diorama — as if someone recreated this exact moment out of studded building bricks and photographed it with a real camera.

SCENE PRESERVATION (most important):
- Keep the SAME composition, camera angle, framing, and poses. The viewer must instantly recognize the exact same moment, rebuilt in bricks.
- PEOPLE become cute plastic brick-toy figures — simple cylindrical-style toy bodies with printed friendly faces — while keeping each person's recognizable cues: the same hairstyle shape and color (as a molded plastic hairpiece), the same outfit colors and details printed on the toy body, the same accessories and glasses, the same pose and expression mood. Each person maps to exactly one figure; never add or remove anyone.
- PETS become adorable brick-built animal figures with the same fur colors and markings.

THE BRICK WORLD:
- Rebuild the entire environment from interlocking plastic toy bricks: walls, ground, furniture, trees, and structures made of studded bricks with visible round studs on top, crisp molded edges, and fine seam lines between bricks.
- Match the original scene's colors and layout with bricks so the place stays recognizable; simplify small clutter into clean brick shapes.
- Signs and lettering are rebuilt as plain colored brick tiles — NO readable text anywhere.

PHOTOREAL TOY FINISH (this sells it):
- A real macro photograph of real plastic: glossy ABS-like sheen, tiny realistic highlights, believable toy-scale depth of field, soft studio-like shadows.
- Photorealistic — like a photo of an actual brick creation, NOT a 3D render, NOT a cartoon.

GENERIC RULE: do not reproduce any specific toy company's name, logo, or trademarked branding anywhere.

High resolution, no text, no watermark, no border.`;

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
  console.log(`[brickfigure] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[brickfigure] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateBrickfigure(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("brickfigure error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("brickfigure", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
