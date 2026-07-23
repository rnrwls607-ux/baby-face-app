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

async function generateSoftanime(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a single frame from a beautiful hand-painted animation film — soft watercolor backgrounds, warm nostalgic light, and gentle painterly character art. The people must remain unmistakably themselves, simply drawn as animation characters.

STEP 1 — READ THE PHOTO FIRST:
Identify every subject (one person, a couple, and/or a pet) and the setting. Keep the exact same number of subjects — never add or remove anyone. This concept is designed for ONE or TWO people (plus pets); if more people are present, still draw every one of them faithfully from their own face.

STEP 2 — PRESERVE COMPOSITION:
Keep the same camera angle, framing, crop, pose, and placement of every subject. The scene must be instantly recognizable as the same moment, simply painted.

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- Translate each person's real features into the animation style while keeping them clearly recognizable: same face shape impression, same eye shape (adapted into the style, NOT enlarged into generic huge anime eyes), same nose and mouth impression, same skin tone, same hairstyle and hair color, same outfit and accessories.
- GLASSES RULE: if a person wears glasses, keep the exact same frames; if they wear none, add none.
- Keep distinctive cues: moles, dimples, single/double eyelids, facial hair.
- Anyone who knows this person should say "that's definitely them, drawn as an animation character."
- With two people, draw each from their OWN face — never blend, swap, or average features between them, and never make them look like siblings of one another.
- PETS — COAT COLOR LOCK: keep the pet's breed, markings in the same places, and its EXACT real coat color at true brightness and saturation, whatever that color is (white, cream, gray, blue-gray, black, orange, brown, tabby). The painting's colors and light must NEVER tint the fur: white fur stays white (not gold or pink), a gray coat stays natural gray (never vivid blue), orange stays orange.

STEP 4 — APPLY THE ANIMATION FILM STYLE:
- Soft hand-painted watercolor-and-gouache look: gentle visible brush texture in the background, clean confident character line work with warm painted shading.
- Warm nostalgic color palette; golden natural light, soft clouds or foliage where the original background allows.
- Simplify busy background details into charming painted shapes while keeping the location clearly recognizable.
- Calm, heartwarming, storybook-film mood — the feeling of a quiet beautiful moment in an animated movie.

SELF-CHECK before finishing:
- Is each person still recognizable — same eye shape (not generic huge eyes), same hairstyle, same outfit, glasses handled correctly?
- Are there exactly as many subjects as the original, each drawn from their own face?
- If a pet is present, is its coat the same real color, untinted by the scene?
- Is the whole image genuinely hand-painted, with zero leftover photographic texture?
- Only then is the frame complete.

ABSOLUTELY AVOID:
- Generic huge anime eyes, or a face so beautified it becomes a different person.
- Blending two people's features together; changing anyone's ethnicity, skin tone, or age impression.
- Tinting a pet's fur with the scene's colors.
- 3D render / CGI / plastic look; leftover photo textures or photorealism.
- Copying any specific animation studio's signature character designs or logos.
- Any text, letters, watermark, signature, frame, or border.

Final result: one cohesive hand-painted animation-film frame, high resolution.`;

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
  console.log(`[softanime] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[softanime] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateSoftanime(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("softanime error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
