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

async function generateStitchart(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the subject in this photo into a handmade embroidery artwork — colorful thread stitches on natural fabric, held in a wooden embroidery hoop, photographed as a real handcrafted product. It must look like a photograph of a physical stitched object, never a digital drawing.

STEP 1 — READ THE PHOTO FIRST:
Identify the subject (a person or a pet) and keep the exact same subject — never replace them. This concept is designed for ONE person or ONE pet.

EMBROIDERY DESIGN — IDENTITY THROUGH THREAD (MOST IMPORTANT):
- The stitched portrait must be instantly recognizable as THIS subject. Anchor the likeness in these five things, all mandatory:
  1) The EXACT same hairstyle and hair color in satin-stitch thread (waves stay wavy, length and parting preserved).
  2) The SAME outfit — garment colors and shapes stitched faithfully (a mustard cardigan stays mustard).
  3) The SAME accessories — glasses (stitched in the same frame shape), earrings. If they wear glasses, the portrait has them; if not, add none.
  4) The same skin tone in thread.
  5) A simplified stitched face that keeps their eye shape impression, eyebrow lines, and signature expression.
- FACE CLARITY RULE (critical): keep the face design clean and charming — simple confident stitch lines for eyes, nose, and mouth. Never over-stitch the face into a noisy tangle of threads; clearly them, never a generic doll.
- Same gender and age impression as the input.
- ★COAT COLOR LOCK for pets (critical): keep the breed, the markings in the SAME places (a calico's orange and black patches stay exactly where they are on the face and body), and the EXACT real coat color at true brightness and saturation — whatever that color is (white, cream, gray, blue-gray, black, orange, brown, tabby, tricolor). White thread stays white (never cream or gold), a gray coat stays natural gray (never blue), orange stays orange. The fabric and background colors must never tint the fur threads.

THREAD & FABRIC MATERIAL (make it feel genuinely handmade):
- Visible individual thread stitches: satin stitch for hair and clothing fills, back stitch outlines, French knots for tiny details — each with real thread sheen and clear stitch direction.
- Natural linen or cotton fabric background with visible weave texture, gently stretched in a round wooden embroidery hoop.
- Soft, warm, cozy color palette; a few small stitched accents around the figure (tiny flowers, leaves, or stars) — minimal and tasteful.
- Slight thread relief visible — the stitches sit ON the fabric with real physical depth.

PHOTOGRAPHY (this sells the "real embroidery" illusion):
- Macro product photography: the hoop lying on a warm wooden table or held against a soft neutral wall, stitches razor-sharp in focus, gentle natural window light with soft shadows.

TEXT BAN:
- No letters, numbers, or words stitched anywhere — not on the fabric, not on the hoop. Any area that would carry writing is left as plain fabric.

SELF-CHECK before finishing:
- Are individual thread stitches clearly visible everywhere, with real sheen and direction — not a flat digital drawing?
- Same hairstyle, outfit colors, and glasses as the original?
- If a pet: are the markings in the same places, and is the coat its exact real color?
- Is the face clean and readable, not a noisy tangle?
- Does it read as a PHOTOGRAPH of a physical hoop on a real surface?
- Zero text anywhere?
- Only then is the shot complete.

ABSOLUTELY AVOID:
- A flat digital illustration pretending to be embroidery — real thread texture must be visible everywhere.
- Over-detailed stitching that turns the face into noise; keep face areas clean.
- Losing the hairstyle, outfit, accessories, or expression in simplification.
- Moving a pet's markings or recoloring its fur.
- Any text, letters, watermark, or border.

Final result: one high-resolution photorealistic product photo of a handmade embroidery hoop portrait.`;

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
  console.log(`[stitchart] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[stitchart] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateStitchart(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("stitchart error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("stitchart", 0, handler); // COIN_DORMANT: 실가격 3
