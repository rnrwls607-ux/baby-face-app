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

const KIDSDRAW_PROMPT = `You are a master visual-effects artist famous for bringing children's
drawings to life. Take this photo of a child's drawing and create ONE
PHOTOREALISTIC PHOTOGRAPH of exactly what the child drew — as if the
creature, character, or object in the drawing were a real, living,
physical thing standing in a real place, photographed with a real camera.

STEP 1 — Read the drawing first:
List every element the child drew: the main character(s) or object(s),
their colors, body parts, facial features, accessories, and the setting
(grass, sun, house, sky, clouds, flowers, etc.). Count the subjects.
Note every "mistake" — uneven legs, a huge head, mismatched eyes, a tail
longer than the body, colors outside the lines — because those are the
most important things to keep.

=== DRAWING FIDELITY LOCK (highest priority — this is the whole point) ===
- Reproduce the EXACT shapes and proportions the child drew. A round body
  stays round; a giant head stays giant; four legs of different lengths
  stay different lengths; one big eye and one small eye stay that way; a
  zigzag arm stays zigzag; wheels instead of feet stay wheels.
- Reproduce the EXACT colors the child chose, even if unrealistic: a
  purple cat is purple, a rainbow-striped dinosaur is rainbow-striped, an
  orange whisker is orange.
- Keep the same number of subjects, the same pose, the same facial
  expression (a big toothy grin stays a big toothy grin), and the same
  accessories or objects they hold.
- Keep the setting the child drew, made real: scribble grass becomes real
  grass, a yellow sun with rays becomes a bright sun in a real sky, a
  lopsided house becomes a real lopsided house with the same colors.
- Do NOT "fix", normalize, beautify, or make anatomically correct
  anything. Do NOT turn it into a generic realistic animal, a known
  cartoon character, or a licensed toy. It must be unmistakably THIS
  child's drawing, exactly as drawn — just real.

MAKE IT REAL (this is where the magic is):
- Render every element with convincing real-world materials: fur, scales,
  feathers, skin, metal, plastic, fabric, wood, grass, soil, sky. Give it
  weight, volume, and believable form while keeping the drawn silhouette.
- If the drawing is of a creature, it looks alive — breathing, eyes with
  real moisture and catchlights, fur or scales with real texture.
- If the drawing is of an object or vehicle, it looks like a real
  physical object with true materials, edges, and wear.
- Place it in a real environment matching the drawing's setting, seen
  from a natural camera height, with real depth, ground contact, and
  shadows.

LIGHTING & CAMERA:
- Natural daylight (or the light the drawing implies — sunny if there is a
  sun, soft if there is not), realistic shadows on the ground, gentle
  atmosphere.
- Shot on a 50mm lens: the subject tack-sharp and centered, the
  background naturally softened. Clean, bright, true-to-life color.

TEXT & PAPER RULES:
- The output is the real scene, NOT the paper: no paper texture, no
  crayon strokes, no drawing outlines, no photo of a drawing.
- If the child wrote a name, letters, or numbers on the drawing, do NOT
  render them anywhere. Every surface in the scene is BARE — no readable
  or illegible text, letters, numbers, logos, or signs on anything. Even
  illegible text shapes are a failure.

FRAMING — vertical 3:4, the drawn subject large and centered as the
hero, the drawn setting around it, nothing important cropped.

FINAL SELF-CHECK before output:
- Side by side with the drawing, would the child shout "that's MY
  drawing!" — same shapes, same colors, same weird proportions, same
  number of things?
- Did I keep every "mistake" instead of correcting it?
- Is it fully photorealistic — real materials, real light — with no
  crayon, paper, or outline left?
- Zero text, letters, numbers, or signs anywhere?
- Not a generic animal, not a known character, not a branded toy?

ABSOLUTELY AVOID:
- Correcting proportions, symmetry, anatomy, or colors toward "realism".
- Adding, removing, or merging subjects, limbs, eyes, or accessories.
- Replacing the drawn creature with a real-species animal or a famous
  cartoon/game/toy character.
- Paper texture, crayon/marker strokes, outlines, or a "drawing style"
  filter left in the result.
- Any text, letters, numbers, logos, watermarks, borders, or a
  side-by-side of the original drawing.
- Plastic CGI or 3D-render look; flat dead lighting.

Output: one photorealistic, high-resolution photograph of the child's
drawing brought to life exactly as drawn. No text, no watermark, no
border.
`;

async function generateKidsdraw(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", KIDSDRAW_PROMPT);
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
  console.log(`[kidsdraw] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[kidsdraw] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateKidsdraw(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("kidsdraw error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("kidsdraw", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
