import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 장면 전체 재구성이라 여유 있게

// 🔑 모델 격리 지점: 글램 라인 2차는 GPT 이미지 모델 사용
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateGoddessdress(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the full glam squad preparing a leading actress for the year's biggest awards night — hair, makeup, jewelry, and an evening-gown fitting working together on one photo. The person in this photo walks in as herself; she walks out in complete red-carpet goddess styling, photographed in this exact same moment and place. Think of it as the "getting ready" snapshot before the car arrives: breathtaking, luminous, the main character. Same person, same photo — goddess version.

[SKIN TRUTH v3 — the #1 rule of this entire work]
- DEFAULT SKIN IS CLEAR: unless a mole or mark is CLEARLY visible in the original photo, render that area of skin perfectly clear and unmarked. Marks may ONLY be copied from the original — never invented, never added for "beauty," never imagined out of blur, shadow, or noise.
- ZERO new marks: creating even ONE mole, beauty mark, freckle, spot, or scar that does not exist in the original — on the face, neck, shoulders, or anywhere — is a critical failure that ruins the entire work.
- When in doubt, leave it out: a missing mark is acceptable; an invented mark is not.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- The makeup NEVER adds marks: no painted-on beauty marks, no aesthetic freckles, under any circumstance.
- Flawless skin still means REAL skin — pores and fine texture remain visible; a wax or 3D-render look is a critical failure.

[IDENTITY FLOOR — the strongest rule, never cross]
- This is the biggest transformation in the lineup — new hair, full glam makeup, gown, and jewelry stacked together — so the FACE must anchor the identity with absolute force: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- The result is THIS person as a goddess — NOT a generic award-show beauty, NOT any real actress or celebrity. Anyone who knows her must recognize her INSTANTLY through all the glamour. If the glamour ever competes with her identity, the identity wins.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Do NOT place any props into her hands — no clutch, no trophy, no champagne glass; the hands stay exactly as the original. Nothing in the scene changes except her styling.
- BODY TRUTH: keep her exact body as it is — no slimming, no reshaping. The gown is fitted to HER real figure.
- GLASSES RULE: if she wears glasses, keep the EXACT same frames in the exact same position; if she wears none, add none.

[STYLING LICENSE — what the glam squad may transform, boldly]
- HAIR: restyle into red-carpet hair — glamorous soft Hollywood-style waves swept elegantly, or a polished romantic side-swept style with luminous shine; a refined low chignon with soft face-framing strands is an alternative if it suits her better. Salon-perfect, natural hairline.
- MAKEUP: full evening glam, executed to award-show standard — a radiant flawless base with sculpted luminous dimension, sophisticated smoky-neutral or champagne-bronze eyes with defined liner and dramatic-yet-elegant lashes, perfectly groomed brows, a refined contoured glow on the cheeks, and a statement lip (classic red or deep rose, sharply defined). Unmistakably a professional's full glam — luxurious, never cakey.
- WARDROBE: replace the outfit with a breathtaking evening gown — a floor-length (or elegantly draped, as the framing allows) gown in deep black, wine red, midnight navy, or shimmering champagne, with refined details: delicate draping, a subtle satin or beaded sheen, an elegant neckline no deeper than a tasteful off-shoulder or sweetheart line. Modest sophistication — red-carpet elegance, never revealing.
- JEWELRY: as styling, add fine jewelry that completes the look — sparkling drop earrings or elegant studs, and optionally a delicate necklace or bracelet. Refined and luminous, never gaudy. ★NO brand logos, no lettering anywhere; no tiaras or crowns.
- The gown must fit her actual body and pose naturally, with believable fabric weight, drape, and lighting — as if she were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates main-character presence: luminous, breathtaking, unforgettable — "she looks like the actress of the night, moments before the red carpet." Next to the original photo, the transformation must make people gasp — the single most glamorous version of herself — while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light her like an award-night portrait: soft, luminous, flattering key light with a gentle premium glow on the skin and gown; harsh shadows and dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: scan the skin zone by zone — forehead, cheeks, nose, chin, jaw, neck, shoulders — zero invented moles, freckles, or marks? · every original mole still in place? · glasses exactly as the original (or still absent)? · double eyelids, face structure, and body all untouched? · same person at a glance, through all the glam? · not resembling any real celebrity? · same pose, same hands with nothing added, same background? · gown elegant and modest, logo-free, no tiara? · does it make people gasp "goddess" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete evening-goddess styling. High resolution, no text, no watermark, no border — and absolutely zero new moles or marks anywhere: default skin is clear.`;

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
  console.log(`[goddessdress] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[goddessdress] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateGoddessdress(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("goddessdress error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("goddessdress", 0, handler); // coinCost 3 — concepts.ts 기준(전종 라이브)
