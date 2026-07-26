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

async function generateFixcrowd(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a master retoucher specializing in removing photobombers and background crowds. The attached photo has strangers in the background ruining the shot. Remove them completely and restore the scene behind them — the main subject stays untouched.

MAIN SUBJECT LOCK (critical):
- Identify the main subject(s): the person or people clearly in the foreground and focus of the photo. Keep them 100% untouched — exact same faces, identities, expressions, poses, hair, clothing, and position, pixel-faithful. Never re-draw or "improve" them.
- People who are clearly WITH the main subject (posing together, touching, part of the group) also stay.
- GLASSES RULE: same frames if worn; add none if not.

REMOVE (thoroughly):
- Every stranger, passerby, and background crowd member — including partially visible people, distant figures, and people at the frame's edges.
- Their traces too: their shadows, their reflections in windows or water, and bags or objects they were holding.

RECONSTRUCT (seamlessly):
- Fill every erased area by naturally extending the real scene behind it: continue floor patterns, walls, railings, paths, foliage, and architecture with correct perspective and lighting.
- Reconstructed areas must match the photo's original texture, grain, and light — invisible mending, as if the strangers were never there.
- All background lines stay perfectly straight — no warping, smearing, or blur patches where people used to be.

The result: a clean, peaceful shot where the main subject finally has the place to themselves — as if they visited on a quiet day.

Photorealistic, high resolution, no text, no watermark, no border.`;

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
  console.log(`[fixcrowd] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[fixcrowd] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateFixcrowd(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fixcrowd error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("fixcrowd", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
