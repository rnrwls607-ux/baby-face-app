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

async function generateAnisky(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a color artist who grades real photographs to look like frames from a beautiful Japanese animated film — the dreamy, nostalgic summer-afternoon mood of Japanese youth animation. The photo STAYS a real photograph; its sky and colors become pure anime emotion.

WHAT STAYS (lock):
- Everything remains photographic and physically unchanged: the same people (exact same faces, identities, poses, and clothing — never illustrated, never re-drawn), the same buildings, streets, trains, wires, objects, composition, and framing. All lines stay straight.
- GLASSES RULE: if a person wears glasses, keep the exact same frames; if none, add none.

THE ANIME-FILM TREATMENT (be bold):
1. THE SKY IS THE HERO: transform the sky into the iconic anime summer sky — a deep, clear cerulean blue filled with towering, brilliantly white cumulus clouds, their sunlit tops glowing cream and their shaded sides tinted soft pink and pale violet. If the original sky is gray, hazy, or empty, REBUILD it entirely into this beautiful anime sky.
2. ANIME COLOR GRADE across the whole frame: luminous, saturated-yet-airy color — cyan-leaning blues, lush vivid greens, warm glowing highlights, clean soft shadows with a gentle blue cast. Everyday things (power lines, train tracks, rooftops, crosswalks) become quietly beautiful.
3. EMOTIONAL LIGHT: a soft golden-hour warmth or clear afternoon glow, gentle bloom around bright areas, a faint dreamy haze in the distance — the feeling of a nostalgic summer scene from an animated film.
4. STAY A PHOTO: keep real photographic textures, real detail, real people. This is a photograph wearing anime colors — NEVER a drawing, painting, cartoon, or illustration filter.

The verdict test: viewers should say "this looks like a scene straight out of a Japanese animated film" — while clearly seeing it is still a real photo.

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
  console.log(`[anisky] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[anisky] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateAnisky(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("anisky error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("anisky", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
