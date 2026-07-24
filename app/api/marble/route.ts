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

async function generateMarble(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into a classical white marble bust sculpture — museum-quality carved stone, displayed on a pedestal and photographed in an elegant gallery. It must look like a photograph of a real carved marble object.

STEP 1 — READ THE PERSON FIRST:
Identify the subject and keep the exact same person. This concept is designed for ONE person.

SCULPTURE DESIGN — IDENTITY CARVED IN STONE (MOST IMPORTANT):
- The marble must reproduce THIS person's real facial structure: same face shape and proportions, same jaw and chin, same cheekbones, same eye shape and depth, same nose, same lips, same eyebrow shape — carved faithfully, never idealized into a generic classical face.
- ★HAIR FORM ANCHOR (critical): marble has no color, so the hairstyle's FORM carries the likeness. Carve their exact real hairstyle in marble with believable sculpted volume, flow, and detail — curls stay defined curls, a swept-back cut stays swept back, length and parting preserved. Never replace it with generic classical waves or a laurel-style crop.
- GLASSES RULE: if they wear glasses, carve the exact same frame shape in marble, resting naturally on the face; if they wear none, add none.
- EYES: gently carved iris and pupil detail (as in refined classical portrait busts) so the gaze feels alive and warm — never blank hollow eyes, never an eerie lifeless stare.
- Keep their real expression, softly dignified. Same gender and age impression as the input.
- Anyone who knows them must instantly say "they made a statue of them."

MARBLE MATERIAL:
- Fine white Carrara-style marble with subtle natural veining, a soft polished sheen on skin areas, and slightly matte texture in the hair — believable carved stone throughout.
- The bust ends naturally at the upper chest with a classical cut, mounted on a simple stone or dark wooden pedestal.
- Clean intact stone: no cracks, chips, or damage across the face.

PHOTOGRAPHY (museum realism):
- An elegant gallery setting: soft directional museum lighting modeling the carved features, a dark muted background (deep gray or charcoal) with gentle depth of field.
- Realistic stone light behavior — soft translucency at thin edges, crisp shadows in carved recesses, believable weight and solidity.

TEXT BAN:
- No letters, numbers, or words anywhere — no plaque lettering, no inscription, no museum label. Any surface that would carry writing is left blank.

SELF-CHECK before finishing:
- Is the facial structure THIS person's — same jaw, cheekbones, nose, eye shape — not a generic classical ideal?
- Is the hairstyle carved in their real form (curls, sweep, length)? Glasses handled correctly?
- Do the eyes have gently carved iris detail — alive, not blank and creepy?
- Does it read as real polished marble in a real gallery photograph — not plastic, not a 3D render?
- Zero text or plaque lettering?
- Only then is the sculpture complete.

ABSOLUTELY AVOID:
- An idealized generic Greek or Roman face that loses the person's likeness.
- Replacing their hairstyle with classical waves, laurel wreaths, or period hair.
- Blank hollow eyes, cracks over the face, or a creepy lifeless stare.
- A plastic, 3D-render, or figurine look — this must read as real carved marble.
- Any text, plaque lettering, watermark, or border.

Final result: one high-resolution photorealistic museum photograph of their classical marble bust.`;

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
  console.log(`[marble] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[marble] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateMarble(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("marble error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("marble", 0, handler); // COIN_DORMANT: 실가격 3
