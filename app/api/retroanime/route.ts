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

async function generateRetroanime(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a single frame from a 1990s hand-drawn cel animation — nostalgic retro anime aesthetic with visible film grain, warm faded colors, and classic cel shading. The people must remain unmistakably themselves, redrawn as vintage animation characters.

STEP 1 — READ THE PHOTO FIRST:
Identify every subject (one person, a couple, and/or a pet) and the setting. Keep the exact same number of subjects — never add or remove anyone. This concept is designed for ONE or TWO people (plus pets); if more are present, still draw every one of them faithfully from their own face.

STEP 2 — PRESERVE COMPOSITION:
Keep the same camera angle, framing, crop, pose, and placement of every subject. The scene must be recognizable as the same moment, redrawn as a 90s animation frame.

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- Translate each person's real features into the retro anime style while keeping them clearly recognizable: same face shape impression, same eye shape adapted the 90s-anime way (expressive but NOT giant generic eyes), same nose and mouth impression, same skin tone, same hairstyle and hair color, same outfit.
- GLASSES RULE: if a person wears glasses, keep the exact same frames; if they wear none, add none.
- Keep distinctive cues: moles, dimples, facial hair, single/double eyelids.
- Anyone who knows this person should say "that's definitely them in a 90s anime."
- With two people, draw each from their OWN face — never blend, swap, or average features between them.
- PETS — COAT COLOR LOCK: keep the pet's breed, markings in the same places, and its EXACT real coat color at true brightness and saturation, whatever that color is (white, cream, gray, blue-gray, black, orange, brown, tabby). The scene's sunset light, color grading, and film grain must NEVER change the fur's real hue: white fur stays white (not orange or gold), a gray coat stays natural gray (never blue), orange stays orange.

STEP 4 — APPLY THE 1990s CEL ANIMATION STYLE:
- Classic hand-drawn cel look: clean dark outlines, flat cel shading with crisp two-tone shadows, and a painted background-art style backdrop.
- Nostalgic 90s color grading: slightly faded warm tones, gentle film grain, a subtle vintage softness — like a frame scanned from old animation film stock.
- Dramatic retro lighting where the scene allows: golden-hour sunset glow, evening neon signs, or soft daytime haze.
- Simplify the background into charming painted retro animation art while keeping the location clearly recognizable.

SELF-CHECK before finishing:
- Is each person still recognizable — eye shape adapted but not giant generic anime eyes, same hairstyle, same outfit, glasses handled correctly?
- Are there exactly as many subjects as the original, each drawn from their own face?
- If a pet is present, is its coat still the same real color, untouched by the grading and grain?
- Does it read as hand-drawn vintage cel animation — not modern digital anime, not 3D, not webtoon?
- Is the film grain gentle enough that faces stay clean and readable?
- Only then is the frame complete.

ABSOLUTELY AVOID:
- Modern digital anime gloss, 3D render, or webtoon style — this must feel hand-drawn and vintage.
- Giant generic anime eyes, or a beautified face that becomes a different person.
- Heavy grain or noise that muddies faces and fur.
- Recoloring a pet's fur with the sunset or vintage grading.
- Copying any specific famous animation's characters, logos, or title cards.
- Any text, letters, subtitles, watermark, or border.

Final result: one cohesive vintage 90s cel-animation frame, high resolution, with authentic retro film texture.`;

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
  console.log(`[retroanime] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[retroanime] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateRetroanime(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("retroanime error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
