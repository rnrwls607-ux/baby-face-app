import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const FELTDOLL_PROMPT = `Transform the subject of this photo into a HYPER-REALISTIC MACRO PHOTOGRAPH of an exquisite handmade NEEDLE-FELTED WOOL DOLL of them — a palm-sized artisan felt figure so lovingly detailed it looks like a master crafter spent weeks on it, photographed like a premium handmade-goods shop's signature product shot.

IDENTITY (most important):
- The felt doll must be instantly recognizable as THIS subject. For a person: same hairstyle and hair color rendered in fine wool strands, same glasses if worn (tiny wire-frame miniature), same outfit colors and key pieces recreated in felt. For a pet: keep the EXACT same breed, the same fur colors and their exact markings and patterns in the same places, the same ear and tail shape — the owner must instantly say "that's my baby as a felt doll."
- Charming simplified doll proportions — a slightly rounder, cuter read of the subject, but faithful. NOT a generic doll.

MASTER-CRAFT DETAIL (this sells the handmade feel):
- True needle-felted texture everywhere: dense, soft wool surface with thousands of fine fuzzy fibers catching the light, gently uneven hand-sculpted contours, visible layered shading where darker wool was felted over lighter wool.
- Loving handmade touches: tiny visible stitches at seams, small glass-bead eyes with a bright catchlight, a hand-embroidered little nose and mouth, a wisp of stray wool fiber here and there — clearly touched by human hands.
- For pets: individually felted ear tips, a fluffy felted tail, paw pads in a slightly different wool tone.

THE SCENE (cozy artisan diorama):
- The doll sits on a warm wooden shelf or worktable in soft golden afternoon window light, surrounded by a tiny cozy vignette: a miniature knitted blanket, a small wooden spool of thread, a felting needle resting nearby, a tiny potted plant — everything at doll scale, no readable text on anything.
- MACRO LENS LOOK: the doll razor-sharp with every wool fiber crisp, the warm background melting into creamy golden bokeh; a gentle rim of window light glowing through the fuzzy wool edges — the signature "backlit wool halo" of great felt photography.
- A heartwarming, quiet, handcrafted-with-love mood.

ABSOLUTELY AVOID:
- Changing the subject's colors, markings, hairstyle, or identity cues.
- Smooth plastic, clay, 3D-render, or cartoon look — every surface must read as real wool fiber.
- A cheap, lumpy, or careless doll — this is master-level craft.
- Any readable text, tags, labels, or watermarks anywhere.

Output: one photorealistic macro photo of a real needle-felted wool doll. High resolution, no text, no watermark, no border.`;

async function generateFeltdoll(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", FELTDOLL_PROMPT);
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
  console.log(`[feltdoll] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[feltdoll] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음 — 프롬프트가 원본 포즈·배경 유지를 요구하므로 입력 비율을 그대로 살린다
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
    const output = await generateFeltdoll(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("feltdoll error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("feltdoll", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
