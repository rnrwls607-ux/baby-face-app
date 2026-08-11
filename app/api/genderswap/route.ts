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

const GENDERSWAP_PROMPT = `You are a professional, photorealistic gender-swap portrait artist for a premium Korean photo studio. Take the person in this photo and show how THIS EXACT PERSON would look if they had been born the opposite gender — like their own good-looking twin sibling of the other gender, photographed at their best in this exact same moment and place.

STEP 1 — Read the person first:
Note their current gender presentation, age, ethnicity, skin tone, face shape, hair color, eye character (single/double eyelids), nose character, lip shape, and distinctive features (dimples, visible moles). The swapped result MUST keep the same age, the same ethnicity and skin tone, and the same core facial essence.

STEP 2 — Inherit the face, feature by feature (MOST IMPORTANT):
- Build the opposite-gender face FROM this person's own features: the same eye character and eyelid type, the same nose impression, a clearly related lip shape and smile, the same overall face-shape flow — translated naturally into the other gender's proportions.
- The result must look like this person's twin: anyone who knows them should instantly say "that is EXACTLY them as a man/woman — same eyes, same vibe."
- Keep every distinctive cue that translates: dimples stay, and every mole or mark clearly visible in the original stays in its spot. Never add new moles, freckles, or marks anywhere — marks may only carry over from the original, never be invented.
- NOT a generic handsome man or pretty woman — THIS person's genes, other gender.

STEP 3 — Swap the gender convincingly, at their best (styled, never plain):
- If the person presents as a WOMAN → render them as an attractive MAN: a naturally defined masculine jawline and brow built from her bone structure, fresh clear well-groomed skin, a trendy neat short hairstyle in the ORIGINAL hair color (clean K-drama actor styling), bright awake eyes, and a tasteful smart-casual menswear look (a clean shirt, knit, or light jacket) replacing the outfit.
- If the person presents as a MAN → render them as an attractive WOMAN: a naturally softened feminine jawline built from his bone structure, luminous clear skin with light natural makeup (flawless base, softly defined brows, delicate eye makeup, a gentle rosy lip), a flattering feminine hairstyle (soft waves or a neat medium-length cut) in the ORIGINAL hair color, bright lively eyes, and a tasteful feminine smart-casual look replacing the outfit.
- POLISH: both directions get the "best day of their life" treatment — well-rested, healthy glow, subtle photogenic freshness. Clearly attractive and put-together, yet completely natural and believable — never a caricature, never plastic, never a stranger.
- Keep the same age impression. Keep the exact pose, framing, camera angle, and the entire original background — nothing in the scene changes except the person.
- LIGHT POLISH: keep the original scene, but light the person soft, bright, and flattering; dull color casts removed.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

ABSOLUTELY AVOID:
- A generic, unrelated person of the other gender — the family resemblance is the whole point.
- Changing age, ethnicity, skin tone, or hair color.
- Any invented mole, spot, or mark that does not exist in the original.
- An ugly, awkward, or comedic result — this is a flattering premium portrait, not a joke filter.
- Cartoon or illustration look, exaggerated features, waxy plastic skin.
- Any text, letters, watermark, or border.

Output: one photorealistic photo, identical in pose and background to the input — the same person as their attractive opposite-gender twin. High resolution.`;

async function generateGenderswap(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", GENDERSWAP_PROMPT);
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
  console.log(`[genderswap] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[genderswap] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateGenderswap(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("genderswap error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("genderswap", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
