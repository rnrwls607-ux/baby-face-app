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

async function generateOilportrait(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a classical museum-quality oil painting portrait — visible brushstrokes, canvas texture, and rich dramatic lighting, like a masterwork hanging in a European gallery. The subject wears their OWN clothes from the photo; this is a painting of them as they are, not a costume fantasy.

STEP 1 — READ THE PHOTO FIRST:
Identify every subject and keep the exact same number — never add or remove anyone. This concept is designed for ONE or TWO people.

STEP 2 — PRESERVE COMPOSITION:
Keep the same pose, angle, and framing, adapted naturally into a classical portrait composition (upper body, subject as the clear hero).

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- Paint THIS person's real likeness: same face shape and proportions, same eye shape and eyelid type, same nose and mouth, same eyebrows, same skin tone, same hairstyle and hair color — including gray or white hair exactly as it is.
- Keep their REAL outfit from the photo, translated into painterly fabric with believable folds and texture. Do NOT dress them in period costume, robes, crowns, or royal garments.
- GLASSES RULE: if a person wears glasses, paint the exact same frames; if they wear none, add none.
- Keep distinctive cues: moles, dimples, facial hair, laugh lines that are truly theirs.
- AGE TRUTH: paint them at their true age — never age them with heavy shadows or harsh strokes, and never de-age or smooth them into someone younger.
- This is a commissioned portrait — anyone who knows them must instantly recognize the painting.
- With two people, paint each from their OWN face — never blend, swap, or average features between them.

STEP 4 — APPLY THE CLASSICAL OIL PAINTING STYLE:
- Visible confident oil brushwork: soft blended strokes on the face, thicker expressive impasto strokes in hair, clothing, and background.
- Subtle canvas weave texture across the whole image; layered glazed color depth.
- Dramatic warm directional light from one side, gently modeling the face against a dark, elegant painted backdrop (deep umber, warm gray, or muted green tones).
- Rich, slightly warm old-master color palette — luminous skin, deep shadows that still hold detail.
- FACE CLARITY RULE (critical): keep the face luminous and clean. Brushwork on the face stays soft and blended — never thick chaotic strokes, cracks, or muddy darkness across the features.
- Dignified, timeless gallery mood.

SELF-CHECK before finishing:
- Is the person immediately recognizable — same eye shape, nose, hairstyle (gray hair kept as gray), glasses correct?
- Are they wearing their OWN clothes from the photo, not a costume?
- Is the face luminous and clean — not muddied, cracked, or aged by the brushwork?
- Does it read as real paint on canvas, with zero photographic texture remaining?
- With two people, is each clearly their own person?
- Only then is the painting complete.

ABSOLUTELY AVOID:
- A photo filter look with leftover photographic texture — this must read as real paint.
- Dressing the subject in period costume, royal robes, crowns, or any clothing not in the original photo.
- Muddy murky darkness or cracks over the face; brushwork that ages or hardens the person.
- Cartoon, anime, or flat digital painting styles.
- Copying any specific famous painting's composition or costume.
- Any text, signature, watermark, frame, or border.

Final result: one museum-quality classical oil portrait on canvas, high resolution.`;

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
  console.log(`[oilportrait] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[oilportrait] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateOilportrait(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("oilportrait error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("oilportrait", 0, handler); // COIN_DORMANT: 실가격 3
