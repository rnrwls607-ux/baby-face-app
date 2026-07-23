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

async function generatePaperart(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a handcrafted layered paper-cut artwork — colored paper shapes cut and stacked in physical layers with real depth and soft shadows, displayed in a shadowbox frame and photographed as a real craft piece. It must look like a photograph of a physical paper object, never a flat digital drawing.

STEP 1 — READ THE PHOTO FIRST:
Identify every subject and the setting. Keep the exact same number of subjects — never add or remove anyone. This concept is designed for ONE or TWO people.

PAPER DESIGN — IDENTITY THROUGH LAYERED SHAPES (MOST IMPORTANT):
- The paper portrait must be instantly recognizable as THIS person. Anchor the likeness in these five things, all mandatory:
  1) The EXACT same hairstyle and hair color as clean cut-paper shapes (a bob stays a bob, long straight hair stays long and straight).
  2) The SAME outfit — every garment and color in layered paper (a red sweater stays red, a denim jacket stays blue).
  3) The SAME accessories — glasses (cut as a clear paper frame in the same shape), earrings. If they wear glasses, the figure has them; if not, add none.
  4) The same skin tone in paper.
  5) A simplified paper face that keeps their eye shape impression, eyebrow lines, and signature expression.
- FEW LARGE PIECES RULE (critical): keep the FACE as few large clean paper pieces — features as crisp cut lines and small shapes. NEVER slice the face into many confusing fragments; that destroys the likeness.
- With two people, cut each from their OWN likeness — never blend or make them look alike.
- Same gender and age impression as the input.

PAPER MATERIAL & CONSTRUCTION (make it feel genuinely handmade):
- Visible physical paper layers: each shape slightly raised above the one below, with soft real drop shadows between layers giving true depth.
- Clean crisp cut edges, subtle paper grain texture, a gentle color palette of quality craft paper.
- Background: the original setting simplified into 3–5 charming paper layers (sky, hills, trees, walls, foliage) receding with depth — the location still recognizable.
- Mounted in a simple shadowbox frame.

PHOTOGRAPHY (this sells the "real paper craft" illusion):
- Straight-on product photography of the framed piece: soft angled natural light revealing the layer depth and the shadows between layers, everything crisply in focus.

TEXT BAN:
- No letters, numbers, or words anywhere — not on the paper, not on the frame. Any surface that would carry writing is left plain.

SELF-CHECK before finishing:
- Are there visible physical paper layers with real drop shadows between them — genuine depth, not a flat vector illustration?
- Same hairstyle, outfit colors, and glasses as the original?
- Is the face built from FEW large clean pieces — still recognizable, not fragmented?
- With two people, is each clearly their own person?
- Does it read as a PHOTOGRAPH of a framed paper craft?
- Zero text anywhere?
- Only then is the piece complete.

ABSOLUTELY AVOID:
- A flat digital vector illustration — real paper depth, edges, and shadows must be visible.
- Slicing the face into unrecognizable fragments; harsh messy shadows that muddy the piece.
- Losing the hairstyle, outfit, or glasses in simplification; blending two people together.
- Leftover photographic texture.
- Any text, letters, watermark, or added logos.

Final result: one high-resolution photorealistic photo of a layered paper-cut portrait in a shadowbox frame.`;

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
  console.log(`[paperart] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[paperart] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generatePaperart(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("paperart error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
