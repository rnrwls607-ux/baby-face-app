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

const GRAVITYAD_PROMPT = `Transform this casual product photo into a JAW-DROPPING PREMIUM ADVERTISING KEY VISUAL — the product suspended in dramatic zero gravity at the center of an explosive, beautifully choreographed burst of its own ingredients, like the hero frame of a big-budget TV commercial.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. TEXT & LABEL: Keep every letter, word, number, logo, and label on the product EXACTLY as in the original — same design, same position, pixel-faithful. Do NOT redraw, invent, blur, or remove any label element. Do NOT add any new text anywhere in the image.
2. TRUE PRODUCT: Reproduce the product's real shape, proportions, colors, and materials EXACTLY. Glossy stays glossy, matte stays matte, transparent stays clear. The owner must recognize their exact product.

THE GRAVITY MOMENT (make it dynamic, not static):
- The product floats at the golden-ratio center of the frame, tilted 10–20 degrees for energy, razor-sharp, lit like the hero it is.
- Around it, a FROZEN EXPLOSION of matching elements caught mid-motion: crystal-clear liquid ribbons twisting and splashing with glassy refraction, hundreds of suspended micro-droplets catching sparks of light, soft petals or botanical leaves tumbling in an arc — every element chosen to match what this product actually is, all obeying believable physics frozen at 1/8000s.
- COMPOSITION: the burst forms a loose spiral or radial sweep AROUND the product, framing it — never covering the label. Depth layers: a few elements blurred large in the extreme foreground, the product tack-sharp in the middle, finer particles receding softly behind.

STAGE & LIGHT (premium commercial spec):
- Background: a deep, rich studio gradient drawn from the product's own color palette — dark-to-glowing, with a soft halo of light directly behind the product for separation.
- Lighting: crisp dramatic key light sculpting the product's form, twin rim lights tracing its edges, sparkling specular highlights on every droplet, a soft realistic reflection on a glossy floor plane below.
- Color: rich, saturated but believable — the product's true colors amplified by the lighting, never shifted.

REALISM:
- Ultra-photorealistic high-speed commercial photography — real liquid physics, real refraction, real light. Shot like a 100mm lens at f/8, everything on the product crisp. NOT a 3D render look, NOT CGI-plastic, NOT cartoon.

ABSOLUTELY AVOID:
- Any altered, invented, or garbled label text; any added slogans or typography anywhere.
- Elements covering or crossing the product's label.
- Changing the product's shape, color, or proportions.
- A static, floating-in-empty-space look with no motion energy.
- Real landmark backdrops or any real brand's advertising style.
- Watermarks, borders.

Output: one photorealistic premium advertising key visual. High resolution.`;

async function generateGravityad(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", GRAVITYAD_PROMPT);
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
  console.log(`[gravityad] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[gravityad] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateGravityad(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("gravityad error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("gravityad", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
