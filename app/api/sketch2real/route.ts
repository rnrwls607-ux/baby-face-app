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

const SKETCH2REAL_PROMPT = `You are a master industrial-design visualizer and product photographer.
Take this photo of a hand-drawn product sketch and create ONE
PHOTOREALISTIC PRODUCT PHOTOGRAPH of exactly the object that was sketched
— as if the designer's idea had been manufactured and photographed in a
professional product studio.

STEP 1 — Read the sketch first:
Identify the product type (bag, chair, shoe, lamp, bottle, appliance,
accessory, etc.), its overall silhouette and proportions, every drawn
detail (handles, straps, pockets, buttons, seams, legs, cushions, sole
layers, closures, rings, vents) and how many of each, and any material
cues the designer gave (hatching, shading, color, texture marks). Also
note any written notes, dimensions, arrows, or labels on the paper —
these are NOT part of the product and must NOT be rendered.

=== DESIGN FIDELITY LOCK (highest priority — this is the whole point) ===
- Reproduce the EXACT silhouette and proportions of the sketch: the same
  width-to-height ratio, the same curves and angles, the same thickness
  of soles, legs, handles, and edges.
- Reproduce every drawn detail in the same position, size, and count —
  one front flap pocket stays one, three sole layers stay three, four
  splayed legs stay four, a single wide strap stays a single wide strap.
- Do NOT add features the designer did not draw (extra pockets, logos,
  laces, stitching patterns, hardware, decorative elements). Do NOT
  remove or simplify any drawn feature. Do NOT "improve" the design,
  make it more conventional, or drift toward an existing brand's
  product.
- If the sketch is colored, use those colors. If it is uncolored,
  choose ONE tasteful, realistic colorway that fits the material cues
  and keep it consistent across the whole product.
- Interpret materials from the sketch's cues (hatching = fabric/leather
  grain, smooth shading = metal or molded plastic, wood grain marks =
  wood); if there is no cue, choose the material most natural for that
  product type and render it truthfully.

MAKE IT REAL (this is where the value is):
- Render the product with true physical materials: leather grain,
  fabric weave, wood grain, brushed or polished metal, molded plastic,
  rubber sole texture, foam padding — with correct weight, thickness,
  seams, and construction so it looks manufacturable.
- The object has real volume, stands or sits naturally with correct
  ground contact and a realistic soft contact shadow.
- The output is the real object, NOT the paper: no paper texture, no
  pencil or ink lines, no sketch outlines, no photo-of-a-drawing.

TEXT RULES:
- Do NOT render any notes, dimensions, arrows, labels, letters, or
  numbers from the sketch anywhere.
- Every surface of the product and background is BARE — no readable or
  illegible text, letters, numbers, logos, or brand marks. Even
  illegible text shapes are a failure.

STUDIO, LIGHTING & CAMERA:
- Seamless studio background in a neutral tone that flatters the
  product (off-white, warm gray, or a soft muted color), completely
  plain.
- Soft, bright, directional studio lighting with gentle fill and a
  subtle rim light to define edges; realistic reflections on glossy
  parts, soft diffusion on matte parts.
- Shot on a 100mm product lens from the SAME viewpoint the sketch shows
  (side view stays side view, three-quarter stays three-quarter): the
  product tack-sharp edge to edge, accurate white balance, clean
  commercial color grade.

FRAMING — vertical 3:4, the product large and centered as the hero,
comfortable margins, nothing cropped.

FINAL SELF-CHECK before output:
- Side by side with the sketch, would the designer say "that is exactly
  my drawing, made real" — same silhouette, proportions, and every
  detail in the same count and place?
- Nothing added, removed, simplified, or drifted toward a known brand?
- Fully photorealistic materials and light, no sketch lines or paper
  left?
- Zero text, numbers, arrows, or logos anywhere?
- Same viewpoint as the sketch?

ABSOLUTELY AVOID:
- Changing proportions, adding or removing features, adding logos or
  decorative hardware, or making the design "more normal".
- Rendering any annotation, dimension, arrow, or letter from the paper;
  any text or brand mark on the product or background.
- Resemblance to a specific existing branded product.
- Paper texture, sketch outlines, or a drawing-style filter left in the
  result.
- Plastic CGI, 3D-render look, floating object without contact shadow,
  flat dead lighting.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution product photograph of
the sketched design made real — exactly as drawn. No text, no watermark,
no border.
`;

async function generateSketch2real(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", SKETCH2REAL_PROMPT);
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
  console.log(`[sketch2real] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[sketch2real] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateSketch2real(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("sketch2real error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("sketch2real", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
