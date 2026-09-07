import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 야생 친구 만난 우리 아이 — pet:pro (cheerglam 템플릿 복제, new-concept.mjs 생성)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetwild(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a wildlife and pet photographer with a playful eye. Take the pet
in this photo and create ONE photorealistic scene in which the SAME pet
is sitting calmly among a group of friendly wild animals in their
natural habitat — as if the pet had wandered into a nature documentary
and been welcomed by the locals.

STEP 1 — Read the pet first:
Identify the species (dog or cat), breed or breed mix, body size, exact
coat color(s) and pattern, every unique marking, eye color, ear shape
and set, nose color, fur length and texture, and its typical expression.
This is one specific individual, not a generic breed example.

=== PET IDENTITY LOCK (highest priority — never violate) ===
- COAT COLOR LOCK: the coat color stays EXACTLY as the source — white
  stays pure white, black stays black, gray stays the same gray, golden
  stays the same golden; pattern and every marking stay in the same
  place at the same size. Never recolor or tint the fur with the scene
  lighting, water, grass, or snow.
- Same breed look, same head shape, same muzzle, same ear shape and set,
  same eye color, same nose, same fur texture, same real body size
  relative to the animals around it (a small dog stays small next to a
  capybara; a large dog stays large next to meerkats).
- Do NOT turn it into a different animal or individual, and do NOT make
  it a cartoon or plush. Natural anatomy: correct paws, ears, tail, no
  extra limbs, no distortion.
- Exactly ONE pet (this one). No other dogs or cats, no people.

THE SCENE — choose ONE that suits this pet's size and mood (all animals
are generic real species, never characters or mascots):
- Capybara hot spring: a steamy natural hot-spring pool with mossy rocks
  and a few relaxed capybaras soaking; the pet sits at the water's edge
  or on a warm rock beside them, dry and comfortable.
- Meerkat lookout: a golden savanna with sandy mounds; a small group of
  meerkats standing upright on watch, the pet sitting upright among
  them in the same alert pose.
- Penguin beach: a cool pebble beach with a few penguins waddling; the
  pet sits among them looking at the sea, soft overcast light.
- Sheep hill: a green rolling hill with a small flock of fluffy sheep
  grazing; the pet sits in the grass among them, sunny day.
- Panda bamboo grove: a misty bamboo forest with one or two pandas
  munching bamboo; the pet sits on a mossy log nearby.
Interaction is gentle and safe: the wild animals are calm, at a natural
distance, no aggression, no chasing, no feeding.

LIGHT & CAMERA (this is what makes the pet belong there):
- The pet is lit by the SAME light as the scene — same direction, same
  color temperature, same softness — with matching contact shadows on
  the ground, matching ambient reflections, and the same slight haze or
  mist as the surroundings. The pet's face stays bright and clearly
  visible with catchlights in the eyes.
- Shot on a 70mm lens at f/2.8 from the pet's eye level: the pet
  tack-sharp, the wild animals sharp to softly sharp, the background
  falling into natural bokeh. Documentary-real color, no filters.

POSE — the pet sits or lies naturally, facing the camera or looking
curiously at its new friends, calm and happy, ears in their natural
position.

FRAMING — vertical 3:4, the pet centered and clearly the hero in the
upper-middle of the frame, the wild animals arranged around and behind
it, nothing important cropped.

TEXT — every surface BARE: no signs, no collar tags with lettering, no
text anywhere. Even illegible text shapes are a failure.

FINAL SELF-CHECK before output:
- Next to the source photo, would the owner say "that's my pet" — same
  coat color, markings, eyes, ears, size?
- Coat color EXACTLY as the source, not tinted by steam, snow, grass, or
  golden light?
- Same light direction, color, and shadows on the pet as on the wild
  animals and ground — no cut-and-paste look?
- Exactly one pet, natural anatomy, real generic wild species, no
  characters?
- Zero text anywhere?

ABSOLUTELY AVOID:
- Any change to coat color, pattern, markings, breed look, eye color,
  size, or ear shape.
- Pasted-on look: mismatched light, missing ground shadow, wrong scale.
- Aggressive or unsafe interactions; the pet in water or in danger.
- A second dog or cat, people, cartoon or mascot animals, plush look.
- Plastic fur, oversaturated HDR, harsh flash.
- Any sign, tag, text, logo, watermark, or border.

Output: one photorealistic, high-resolution wildlife-documentary photo —
the exact same pet, welcomed among friendly wild animals. No text, no
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
      "petwild",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][petwild] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petwild] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petwild", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petwild] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petwild] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generatePetwild(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petwild error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("petwild", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
