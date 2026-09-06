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

const PLANTSHOT_PROMPT = `You are a top botanical and interior photographer. Take this casual
photo of a potted houseplant and create ONE magazine-quality PLANT
PORTRAIT of the EXACT same plant in the EXACT same pot — the kind of
"plant parent" hero shot that stops the scroll.

STEP 1 — Read the plant first:
Identify the plant type, count the leaves, and note each leaf's shape,
size, splits or holes, variegation or stripes, color (including any
yellowing, browning, or damaged edges), the stems and their angles, the
overall silhouette and height, and the pot (material, color, shape,
saucer). The output must be THIS individual plant.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME PLANT: the same number of leaves, the same leaf shapes, splits,
   holes, stripes, and variegation pattern, the same stem arrangement and
   angles, the same size and silhouette. Do NOT add leaves, remove
   leaves, make it fuller, taller, or more symmetrical, or swap the
   species or variety.
2. HONEST CONDITION: a yellowing leaf, a brown tip, a bent stem, or a
   small hole stays exactly as it is. Do NOT heal, green up, or
   "perfect" the plant. Only remove dust on the leaves and dead
   clippings on the soil.
3. TRUE COLOR: reproduce the real leaf greens, variegation colors, and
   pot color EXACTLY. Only correct an obvious color cast from indoor
   lighting (blue window cast, yellow lamp) to reveal the TRUE colors —
   never boost saturation.
4. SAME POT: same material, color, shape, size, and saucer. Do NOT
   replace it with a prettier pot. Any label, sticker, or lettering on
   the pot in the source is REMOVED and replaced with plain pot surface.
   Do NOT add any.
5. NO NEW TEXT ANYWHERE: the background, pot, and every surface must be
   BARE — no readable or illegible text, letters, numbers, logos, or
   signage anywhere. Even illegible text shapes are a failure.

CLEAN UP (be bold here):
- Remove the original surroundings entirely: windowsill clutter,
  cables, remotes, mugs, papers, shoes, bags, curtains, and walls.
- Dust the leaves so they show their real sheen; tidy the soil surface;
  wipe the pot.

THE SCENE — choose ONE calm setting that suits the plant (plain and
uncluttered, no other plants):
- A bright minimal room corner: soft white or warm-beige wall, light
  wood floor, a hint of a linen curtain edge.
- A wooden plant stand or side table by a window, warm oak tone, soft
  wall behind.
- A clean studio backdrop in a muted tone (sage, sand, terracotta, or
  warm gray) that complements the leaf color.
- At most ONE plain accent (a small ceramic vessel, a folded linen)
  placed far from the plant, never overlapping it.

LIGHTING & CAMERA:
- Soft, bright, directional natural window light from the side — leaf
  veins and texture clearly sculpted, gentle backlight glow through
  thinner leaves where natural, a soft realistic shadow on the wall or
  floor; no harsh glare, no dark murk.
- Shot on an 85mm lens at eye level with the plant: leaves tack-sharp,
  background softly falling away; accurate white balance, clean
  editorial color grade.

FRAMING — vertical 3:4, the whole plant and pot inside the frame with
comfortable margins, foliage in the upper two-thirds, pot toward the
bottom, nothing cropped.

FINAL SELF-CHECK before output:
- Same leaf count, shapes, splits, and variegation pattern as the
  source; same stems and silhouette?
- Every yellow leaf, brown tip, or bent stem still there — nothing
  healed or added?
- Colors true, not oversaturated; same pot, no label?
- Background clean, no other plants, no clutter, no text anywhere?
- Real leaf texture and light, not CGI?

ABSOLUTELY AVOID:
- Adding, removing, or reshaping leaves; a fuller, taller, or more
  symmetrical plant; a different species or variety.
- Healing damage, greening yellow leaves, or boosting color.
- A different pot; any label, sticker, text, or logo anywhere.
- Other plants, clutter, or people in frame.
- Plastic or CGI foliage; harsh glare; floating pot without a shadow.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution plant portrait — the
exact same plant and pot, beautifully lit. No text, no watermark, no
border.
`;

async function generatePlantshot(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", PLANTSHOT_PROMPT);
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
  console.log(`[plantshot] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[plantshot] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generatePlantshot(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("plantshot error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("plantshot", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
