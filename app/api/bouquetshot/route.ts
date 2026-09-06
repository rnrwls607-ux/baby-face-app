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

const BOUQUETSHOT_PROMPT = `You are a top floral product photographer and retoucher. Take this
casual photo of a bouquet — on a worktable, a counter, or held up — and
create ONE clean, professional PRODUCT PHOTO of the EXACT same bouquet:
the hero image a premium flower shop uses for its feed and booking page.

STEP 1 — Read the bouquet first:
List every flower type and its color, count the blooms of each type,
note the greenery and dried elements, the arrangement shape and which
flowers sit where, the wrapping paper (material, color, how it is
folded), the ribbon (color, material, knot), and any card, tag, sticker,
or lettering. The output must be THIS bouquet.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME BOUQUET: same flower types, same number of blooms of each type,
   same greenery and dried stems, same arrangement shape and placement.
   Do NOT add flowers, remove flowers, swap species, or rearrange.
2. TRUE COLOR: reproduce every petal, leaf, paper, and ribbon color
   EXACTLY. Only correct an obvious color cast from shop lighting
   (fluorescent green, warm yellow) to reveal the TRUE colors — never
   make petals more saturated or "prettier".
3. WRAPPING & RIBBON: same paper material, color, folds, and layers;
   same ribbon color, width, and knot. Do NOT restyle the wrap.
4. TEXT: any card, tag, sticker, or lettering on the wrap that is in the
   source is REMOVED from the output (customer privacy) — replaced with
   plain wrap surface. Do NOT add any new card, tag, or lettering.
5. NO NEW TEXT ANYWHERE: the background and every surface must be BARE —
   no readable or illegible text, letters, numbers, logos, or signage
   anywhere. Even illegible text shapes are a failure.

CLEAN UP (be bold here):
- Remove the original surroundings entirely: worktable, scissors, tape,
  clippings, buckets, shelves, pots, walls, and any hand holding the
  bouquet (the bouquet stands or rests on its own).
- Tidy only what a florist would: remove a wilted or damaged leaf edge,
  a stray clipping, dust, and water drops on the paper — never remove or
  add a bloom.
- Gently perk up the arrangement so every bloom faces the camera as in
  the source, without moving flowers to new positions.

THE SHOT — flower-shop standard:
- The bouquet upright and centered, blooms toward the top of the frame,
  wrap and ribbon toward the bottom, stems hidden inside the wrap as in
  the source.
- Background: ONE clean surface and backdrop that complements the
  palette — soft ivory, warm beige, pale sage, muted blush, or light
  gray; plain and seamless. At most one tiny plain accent (a single
  fallen petal of the same flower) near the base.

LIGHTING & CAMERA:
- Soft, bright, directional natural window light with gentle fill —
  petals show their real texture and translucency, ribbon and paper show
  their real sheen; a soft realistic shadow grounds the bouquet; no
  harsh glare, no dark murk.
- Shot on an 85mm lens: the blooms tack-sharp with fine petal detail,
  the background softly blurred; accurate white balance, clean
  commercial color grade.

FRAMING — vertical 3:4, the whole bouquet inside the frame with even
margins, blooms in the upper two-thirds, nothing cropped.

FINAL SELF-CHECK before output:
- Same flower types and same bloom count per type as the source?
- Same arrangement shape and placement; nothing added, removed, or
  moved?
- Colors true to the source, not oversaturated?
- Same wrap and ribbon; any source card or lettering removed and no new
  text anywhere?
- Background clean, no hand or shop clutter, real petal texture?

ABSOLUTELY AVOID:
- Any added, removed, swapped, or rearranged flower, leaf, or stem.
- Color boosting, "perfect" retouched petals, plastic or CGI flowers.
- Any card, tag, sticker, text, or logo in the output.
- Hands, shop tools, buckets, shelves, or clutter in frame.
- Harsh glare, floating bouquet without a ground shadow.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution floral product photo
— the exact same bouquet, professionally shot. No text, no watermark,
no border.
`;

async function generateBouquetshot(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", BOUQUETSHOT_PROMPT);
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
  console.log(`[bouquetshot] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[bouquetshot] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateBouquetshot(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("bouquetshot error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("bouquetshot", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
