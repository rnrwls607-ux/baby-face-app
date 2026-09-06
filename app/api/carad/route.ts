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

const CARAD_PROMPT = `You are a top automotive advertising photographer and retoucher. Take
this casual photo of a car and create ONE polished CATALOG / ADVERTISING
HERO SHOT of the EXACT same car — the same vehicle, freshly washed,
placed in a cinematic location and lit like a brand campaign.

STEP 1 — Read the car first:
Identify the body type (SUV, sedan, coupe, hatchback, van, truck),
exact paint color and finish (gloss, matte, metallic, pearl), wheel
design and color, trim details (grille shape, headlights, mirrors,
spoiler, roof rails, window tint), and the viewing angle. Note every
existing scratch, dent, scuff, or modification — those stay.

=== ABSOLUTE NO-TOUCH RULES (highest priority — never violate) ===
1. SAME CAR: same model shape and proportions, same paint color and
   finish, same wheels, same trim, same headlights and grille, same
   mirrors, same body kit or modifications. Do NOT swap it for a
   different model, generation, or trim. Do NOT restyle any part.
2. BADGES & MARKS: any emblem, badge, decal, or lettering that exists on
   the source car stays EXACTLY as it is — same shape, position, size.
   Do NOT add any badge, emblem, or lettering that is not on the source.
   If the source car has none, the output has none.
3. TRUE COLOR: reproduce the real paint color EXACTLY. Only correct an
   obvious color cast from the source lighting (garage fluorescent,
   sodium lamps) to reveal the TRUE color — never make it prettier.
4. HONEST BODY: a wash removes dirt, dust, mud, and water spots — it
   never removes damage. Keep every real scratch, dent, scuff, chip, and
   worn tire exactly as it is. Do NOT add damage either.
5. LICENSE PLATE (privacy exception): render the plate as a BLANK plate
   of the same size and position — plain, no characters at all.
6. NO NEW TEXT ANYWHERE: road signs, buildings, banners, walls, and every
   surface in the scene must be BARE — no readable or illegible text,
   letters, numbers, logos, or signage anywhere. Even illegible text
   shapes are a failure.

CLEAN UP (be bold here):
- Remove the original surroundings entirely: parking garage, pillars,
  other cars, poles, carts, walls, clutter, people, and photographer
  reflections.
- Wash the car: spotless paint, clean glass, clean wheels and tires with
  a natural satin dressing — while keeping all real damage.

THE SCENE — choose ONE location that suits this car (keep it clean and
empty, no other vehicles, no people):
- Coastal road: a smooth dark asphalt road curving along a cliff above
  the sea at golden hour, soft warm sunlight, distant haze.
- Mountain pass: a winding road with pine forest and layered blue
  ridges, crisp clear daylight, dramatic clouds.
- Night studio: a dark seamless studio floor with a soft overhead
  light-band reflecting along the body lines, cool moody tones.
- Urban night: an empty wet street with soft neon-colored bokeh far
  behind, reflections on the ground — all light sources blurred and
  textless.

CAMERA & LIGHTING (automotive advertising grammar):
- Keep a similar viewing angle to the source (front three-quarter,
  side-front, or rear three-quarter), lowered to a dramatic low camera
  height, the car large and dominant.
- Shot on a 35mm lens with a wide, cinematic feel but NO fisheye
  distortion; the car tack-sharp, the background softly falling away.
- Sculpted automotive lighting: long soft highlight lines along the
  body, controlled reflections of the sky or studio light on the paint,
  deep clean shadows, a realistic ground shadow under the car and
  correct reflections in the paint, glass, and wheels for the chosen
  scene.
- Rich, clean commercial color grade — true paint color, no HDR halo,
  no oversaturation.

FRAMING — vertical 3:4, the whole car inside the frame with comfortable
margins, nothing cropped, the car placed slightly below center so the
scene breathes above it.

FINAL SELF-CHECK before output:
- Same model, same color and finish, same wheels, same trim, same badges
  (or no badges) as the source?
- Every real scratch, dent, and scuff still there; only dirt removed?
- License plate completely blank?
- Scene, signs, buildings, and background free of any text or logos?
- Reflections and ground shadow physically consistent with the scene?
- Does it read as a real photograph of a real car, not a CGI render?

ABSOLUTELY AVOID:
- Swapping the model, generation, trim, wheels, or paint; adding any
  badge, emblem, decal, or accessory not on the source.
- Repairing or hiding real damage; adding damage.
- Any characters on the license plate; any text, signs, or logos in the
  scene.
- Other cars, people, or clutter in the scene.
- Fisheye distortion, floating car without ground shadow, mismatched
  reflections, plastic CGI look, oversaturated HDR.
- Any watermark, border, or overlay.

Output: one ultra-photorealistic, high-resolution automotive advertising
photo — the exact same car, freshly washed, in a cinematic location. No
added text, no watermark, no border.
`;

async function generateCarad(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", CARAD_PROMPT);
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
  console.log(`[carad] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[carad] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateCarad(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("carad error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("carad", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
