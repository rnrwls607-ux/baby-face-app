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

async function generateFixbacklight(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a master portrait retoucher rescuing a failed backlit photo. In the attached photo, the subject came out dark and underexposed against blinding bright light behind them. Transform THIS EXACT photo into the dreamy, glowing backlit shot the photographer was hoping for — the kind of luminous golden backlit picture people save as their profile photo.

IDENTITY LOCK:
- Same person: exact same face, expression, pose, hair, and clothing — instantly recognizable, never a different person.
- Same moment: same background content, same objects, same composition and framing. Nothing added, nothing removed. All background lines stay straight.
- GLASSES RULE: if a person wears glasses, keep the exact same frames; if they wear none, add none.

THE RESCUE (be bold — the change must be dramatic):
1. BRING THE SUBJECT INTO BEAUTIFUL LIGHT: lift the face and body completely out of darkness — bright, luminous, clearly visible, with warm natural skin tones and detailed sparkling eyes. The face goes from a dark shadow to the glowing hero of the photo.
2. TAME THE BLOWN-OUT LIGHT: the searing white background becomes a soft, dreamy wash of warm light — recover gentle detail and color in the sky or window so it is airy and bright, but no longer a wall of pure white.
3. KEEP AND PERFECT THE BACKLIT MAGIC: a radiant golden rim light glowing along the hair, shoulders, and edges; a soft warm haze of light in the air; an optional subtle sun flare. It must still feel like a backlit photo — now shot perfectly.
4. If the subject is food or an object instead of a person, apply the same rescue: the subject becomes bright, vivid, and appetizing with true colors, wrapped in soft luminous window light.

Anyone comparing before and after must be amazed: the dark, ruined photo becomes a luminous, romantic backlit shot — same person, same moment, finally captured right.

KEEP IT REAL:
- Photorealistic. No HDR halo outlining the subject, no plastic over-brightened skin, no flat frontal-flash look — the light still comes from behind.

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
  console.log(`[fixbacklight] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[fixbacklight] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateFixbacklight(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fixbacklight error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("fixbacklight", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
