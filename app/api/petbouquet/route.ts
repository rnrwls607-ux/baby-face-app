import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 꽃다발 속 우리 아이 — pet:pro (cheerglam 템플릿 복제, new-concept.mjs 생성)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetbouquet(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a luxury pet studio photographer. Take the pet in this photo and
create ONE premium studio portrait in which the SAME pet's head and upper
body emerge from the center of a beautiful hand-tied flower bouquet — as
if the pet were the bouquet's most precious flower.

STEP 1 — Read the pet first:
Identify the species (dog or cat), breed or breed mix, size, exact coat
color(s) and pattern (solid, tabby, spots, patches, brindle, points),
every unique marking (face mask, chest patch, sock, ear color, spot
placement), eye color, ear shape and set, nose color, and expression.
This is one specific individual, not a generic breed example.

=== PET IDENTITY LOCK (highest priority — never violate) ===
- COAT COLOR LOCK: the coat color stays EXACTLY as the source — white
  stays pure white (never cream or gray), black stays black, brown stays
  the same brown; pattern and every marking stay in the same place at
  the same size. Never recolor, lighten, or tint the fur with the scene
  lighting or flower colors.
- Same breed look, same head shape, same muzzle length, same ear shape
  and set, same eye color and shape, same nose color, same fur length
  and texture. The owner must instantly recognize their own pet.
- Do NOT turn it into a different animal, a different individual, a
  younger or older animal, or a "cuter" generic version. Natural
  anatomy: correct paws, ears, and eyes, no extra limbs, no distortion.
- Exactly ONE pet in the frame. Do not add a second animal or a person.

THE BOUQUET — choose ONE palette that flatters this pet's coat:
- White or cream coat: warm sunflowers with golden wheat, OR pastel pink
  tulips with white ranunculus, OR lavender with eucalyptus.
- Black or dark coat: midnight-red roses with white baby's breath, OR
  white lilies with soft green foliage, OR peach ranunculus.
- Brown, tan, or tabby coat: cream and butter-yellow tulips, OR blush
  roses with dried grasses, OR blue hydrangea with white filler.
- Spotted or multi-color coat: a single-color bouquet (all white or all
  soft pink) so the pet's pattern stays the hero.
Build the bouquet as a real florist would: fresh blooms in a rounded
cluster around the pet's head and shoulders, real stems below, wrapped
in kraft, matte pastel, or translucent white paper with a satin ribbon
bow at the front. The pet's face is fully visible and unobstructed —
no petal covers the eyes, nose, or mouth; a few blooms may touch the
cheeks and chin like a soft collar.

SETTING, LIGHT & CAMERA:
- Clean studio backdrop in a soft tone that complements the palette
  (ivory, warm beige, pale sage, dusty pink, or light gray), seamless,
  no props other than the bouquet.
- Bright, soft, flattering studio key light on the pet's face with
  delicate catchlights in the eyes and a gentle rim light that makes the
  fur look fluffy and detailed; soft realistic shadow of the bouquet on
  the backdrop. The scene lighting never shifts the coat color.
- Shot on an 85mm lens at f/2: the pet's eyes and fur tack-sharp,
  petals crisp, the backdrop softly falling away. Clean, bright,
  true-to-life color.

POSE — the pet looks toward the camera with a calm, bright, lively
expression, head slightly tilted, ears in their natural position.

FRAMING — vertical 3:4, the bouquet centered, the pet's face in the
upper half of the frame, the ribbon and paper toward the bottom,
nothing cropped.

TEXT — every surface BARE: no card, no tag, no lettering on the paper,
ribbon, or backdrop. Even illegible text shapes are a failure.

FINAL SELF-CHECK before output:
- Next to the source photo, would the owner say "that's my pet" —
  same coat color, same markings, same eyes, same ears?
- Coat color EXACTLY as the source, not tinted by the flowers or light?
- Face fully visible with nothing covering eyes, nose, or mouth?
- Exactly one pet, natural anatomy, no extra animals or people?
- Bouquet looks real (fresh petals, real stems, real paper), zero text?

ABSOLUTELY AVOID:
- Any change to coat color, pattern, markings, breed look, eye color,
  or ear shape; a generic "cute" version of the breed.
- Petals or paper covering the face; a pet buried too deep in flowers.
- A second animal, a person, hands, or props beyond the bouquet.
- Plastic or painted-looking fur, CGI flowers, harsh flash, dark murk.
- Any card, tag, text, logo, watermark, or border.

Output: one photorealistic, high-resolution premium pet studio photo —
the exact same pet emerging from a real flower bouquet. No text, no
watermark, no border.
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
      "petbouquet",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][petbouquet] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petbouquet] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petbouquet", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petbouquet] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petbouquet] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generatePetbouquet(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petbouquet error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("petbouquet", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
