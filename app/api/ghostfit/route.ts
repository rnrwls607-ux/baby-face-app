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

const GHOSTFIT_PROMPT = `You are a top e-commerce apparel photographer specializing in GHOST
MANNEQUIN (invisible mannequin) product shots. Take this casual photo of
ONE garment — hanging, draped, or laid flat — and create ONE clean,
professional ghost-mannequin photo of the EXACT same garment, shaped as
if worn by an invisible body, on a seamless studio background.

STEP 1 — Read the garment first:
Identify the garment type (blouse, shirt, sweatshirt, jacket, dress,
knit, pants, skirt, etc.), its exact color(s), fabric and weave, pattern
or print, every construction detail (collar, placket, buttons, zipper,
pockets, cuffs, hem, seams, stitching color), and any label, tag, or
mark on it. The output must be THIS garment, nothing else.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME GARMENT: same type, same cut, same length, same sleeve length,
   same neckline, same number and placement of buttons, pockets, seams,
   and details. Do NOT redesign, restyle, add, or remove any element.
2. TRUE COLOR & PATTERN: reproduce the real colors, print, pattern
   scale, and contrast stitching EXACTLY. No hue shift, no saturation
   boost, no "prettier" version. Only correct an obvious color cast from
   the source lighting to reveal the TRUE color.
3. FABRIC TRUTH: keep the real fabric character — cotton stays cotton,
   denim stays denim, knit stays knit, silk stays silk — with true
   texture, sheen, and weight. Never turn it plastic or glossy.
4. TEXT & LABELS: any visible label, tag, print, or mark stays EXACTLY as
   in the original — same spelling, font, position, size. Do NOT redraw,
   invent, blur, or remove it. If the garment has no text, it stays with
   no text.
5. NO NEW TEXT ANYWHERE: the background and every surface must be BARE —
   no readable or illegible text, letters, numbers, logos, tags, or
   marks anywhere except the garment's own original ones. Even illegible
   text shapes are a failure.

CLEAN UP (be bold here):
- Remove the hanger, chair, floor, wall, clips, and all original
  surroundings entirely.
- Smooth out temporary wrinkles and crumples from storage; keep
  intentional design features (pleats, gathers, ruching, puff sleeves,
  distressing) exactly as they are.
- Erase lint, dust, stray threads, and fingerprints.

THE GHOST MANNEQUIN STRUCTURE (critical — this is the whole point):
- The garment is shaped in full 3D volume as if worn by a body — natural
  shoulder width, chest and torso fullness, sleeves gently filled and
  falling naturally, hem hanging straight — but there is NO body, NO
  mannequin, NO neck, NO hands, NO legs, NO hanger visible. The inside
  is hollow.
- Through the neckline, the INSIDE BACK of the collar/neck area is
  visible (the classic hollow "ghost" look), rendered cleanly with the
  garment's own inner fabric and back label if it exists in the source.
- Sleeves hang slightly away from the body with subtle interior shadow;
  for open garments (jackets, cardigans) keep them closed or open exactly
  as the source shows, with the inner lining visible where it naturally
  would be.
- Front view, perfectly upright and centered, garment symmetrical unless
  the design is asymmetric.

BACKGROUND, LIGHTING & CAMERA:
- Seamless pure white (or very light neutral gray) studio background,
  completely plain.
- Bright, soft, even studio lighting from the front-top, gentle
  wrap-around fill, a faint soft shadow only where fabric folds — no
  harsh shadows, no glare, no dark murk.
- Shot on an 85mm lens at eye level with the garment: every stitch and
  weave tack-sharp, accurate white balance, clean commercial color grade.

FRAMING — vertical 3:4, the full garment inside the frame with even
margins, nothing cropped, the garment filling most of the height.

FINAL SELF-CHECK before output:
- Is it unmistakably the SAME garment — same cut, details, color,
  pattern, fabric, and any label — with nothing added or removed?
- Full 3D worn shape with NO body, mannequin, hanger, hands, or neck?
- Inside back of the collar visible through the neckline?
- Background completely plain and free of any text or marks?
- Does it read as a real commercial photo of real fabric, not CGI?

ABSOLUTELY AVOID:
- Any visible mannequin, body part, skin, hair, hanger, clip, or stand.
- Redesigning, restyling, recoloring, or changing the garment's
  proportions or details.
- Any invented, altered, or removed label, print, or text; any text or
  logo on the background.
- A flat lay, a floating 2D cutout, or a garment with no volume.
- Plastic, CGI, or 3D-render fabric; glare; harsh shadows.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution ghost-mannequin apparel
photo — the exact same garment, shaped as if worn, on a clean studio
background. No added text, no watermark, no border.
`;

async function generateGhostfit(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", GHOSTFIT_PROMPT);
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
  console.log(`[ghostfit] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[ghostfit] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateGhostfit(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("ghostfit error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("ghostfit", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
