import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 꽃밭 인생샷(펫) — pet:pro (cheerglam 템플릿 복제, new-concept.mjs 생성)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetflowerfield(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a top outdoor pet photographer. Take the pet in this photo and
create ONE photorealistic "life-shot" portrait of the SAME pet sitting in
the middle of a vast flower field, looking straight at the camera — the
kind of shot owners drive hours for and rarely get.

STEP 1 — Read the pet first:
Identify the species (dog or cat), breed or breed mix, body size, exact
coat color(s) and pattern, every unique marking, eye color, ear shape and
set, nose color, fur length and texture. If the source is blurry or
dark, reconstruct the pet faithfully from the visible cues — never
substitute a generic breed face.

=== PET IDENTITY LOCK (highest priority — never violate) ===
- COAT COLOR LOCK: the coat color stays EXACTLY as the source — apricot
  stays apricot, orange tabby stays orange tabby, black-and-white stays
  black-and-white; pattern and every marking stay in the same place at
  the same size. Never recolor or tint the fur with the flower colors,
  sky, or sunlight.
- Same breed look, same head shape, same muzzle, same ear shape and set,
  same eye color, same nose, same fur texture, same body size. The owner
  must instantly recognize their own pet.
- Do NOT turn it into a different animal or individual, and do NOT make
  it a "cuter" generic version. Natural anatomy: correct paws, ears,
  tail, no extra limbs, no distortion.
- Exactly ONE pet. No other animals, no people, no hands, no leash held
  by anyone. Remove any harness or collar from the source, or keep it
  plain with no tag.

THE FLOWER FIELD — choose ONE that flatters this pet's coat:
- White, cream, or light coat: a wide field of pink muhly grass (soft
  pink clouds), OR a purple lavender field in rows, OR blue hydrangea.
- Black or dark coat: a bright yellow canola (rapeseed) field, OR pink
  muhly grass, OR white cosmos.
- Brown, apricot, orange, or tabby coat: a purple lavender field, OR
  blue hydrangea, OR pink and white cosmos.
- Black-and-white or multi-color coat: a single-color field (yellow
  canola or pink muhly) so the pet's pattern stays the hero.
The field stretches to the horizon under a clear blue sky with a few
soft clouds; the flowers are in full bloom at real scale; a narrow gap
in the flowers gives the pet a natural spot to sit, with blooms in the
foreground softly framing the lower edge of the frame.

LIGHT & CAMERA:
- Soft, bright natural daylight (mid-morning or late afternoon), the
  sun slightly behind and to the side of the pet so the fur edges glow
  with a gentle rim light, while the face is evenly lit with clear
  catchlights in the eyes — never a dark or shadowed face, never a
  blown-out white coat. The light never shifts the coat color.
- Shot on an 85mm lens at f/2 from the pet's eye level, camera low
  among the flowers: the pet's face and fur tack-sharp, foreground
  blooms softly blurred, the field and sky melting into creamy bokeh.
- Clean, bright, true-to-life color; vivid flowers but natural.

POSE — the pet sits upright or lies with its head up, facing the
camera with a calm, bright, happy expression, ears in their natural
position, mouth relaxed or gently open.

FRAMING — vertical 3:4, the pet centered, its face in the upper-middle
of the frame, flowers surrounding it on all sides, nothing cropped.

TEXT — every surface BARE: no signs, no tags with lettering, no text
anywhere. Even illegible text shapes are a failure.

FINAL SELF-CHECK before output:
- Next to the source photo, would the owner say "that's my pet" — same
  coat color, markings, eyes, ears, size?
- Coat color EXACTLY as the source, not tinted pink, yellow, or purple
  by the field or the light?
- Face bright, sharp, and looking at the camera, with catchlights?
- Exactly one pet, natural anatomy, no people or other animals?
- Real flowers at real scale, zero text anywhere?

ABSOLUTELY AVOID:
- Any change to coat color, pattern, markings, breed look, eye color,
  size, or ear shape.
- A dark, shadowed, or blown-out face; fur tinted by the flowers.
- A second animal, people, hands, a held leash, or props.
- Plastic fur, oversaturated HDR, fake-looking flowers, painted skies.
- Any sign, tag, text, logo, watermark, or border.

Output: one photorealistic, high-resolution outdoor pet portrait — the
exact same pet in the middle of a blooming flower field, looking at the
camera. No text, no watermark, no border.
`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "petflowerfield",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][petflowerfield] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petflowerfield] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petflowerfield", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petflowerfield] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petflowerfield] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetflowerfield(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petflowerfield error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("petflowerfield", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
