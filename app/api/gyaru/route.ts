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

const GYARU_PROMPT = `You are the head stylist team for Korea's trendiest Y2K gyaru makeover studio — hair, makeup, and wardrobe working together on one photo. The person in this photo walks in as themselves; they walk out in full trendy gyaru styling, photographed in this exact same moment and place. Same person, same photo — gyaru version.

[SKIN PERFECTION — the #1 rule of this entire work]
- Render the skin PERFECTLY CLEAN, clear, and even — a flawless, uniform complexion across the face, neck, and body.
- The ONLY marks allowed anywhere are ones CLEARLY visible in the original photo, kept in their exact original spots. Everything else is clean skin — nothing new appears, ever. If unsure whether something is a mark or just shadow/noise, render clean skin.
- Flawless still means REAL: natural pores and fine skin texture remain visible — never waxy, never 3D-render plastic.

[IDENTITY FLOOR — the strongest rule, never cross]
- Bold makeup + new hair + new outfit stack up, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into any real celebrity or idol.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR (color change IS the concept here): restyle into the signature gyaru look — long, voluminous soft waves in a light milk-tea beige to honey-blonde tone, with airy face-framing strands and wispy bangs, slightly teased crown volume. Salon-perfect, natural hairline, believable dyed-hair texture.
- MAKEUP (the heart of gyaru): a bright porcelain-luminous base with sculpted soft nose contour; large doll-like eyes — sharp black winged liner, long defined lashes top AND bottom, prominent cute aegyo-sal; slim softly-arched brows a shade lighter than the hair; peachy blush placed high; and a glossy nude-pink gradient lip. Sparkling, kawaii, camera-ready — bold yet clean, never smudged, never costume-like.
- WARDROBE: replace the outfit with a playful Y2K street-gyaru look — a fitted pastel top (mint, pink, or baby blue) with a frilly or ruffled mini skirt in a contrasting pastel, layered chain necklaces with cute generic heart or ribbon charms, stacks of colorful bracelets and beaded accessories on the wrists, and optionally a cute pastel cap or hair accessory that does NOT shadow the face. Modest and tasteful: NO bare midriff, no revealing cuts. ★ABSOLUTELY NO letters, numbers, brand names, logos, or any existing character designs anywhere — all charms and prints are generic hearts, stars, and ribbons only.
- The outfit must fit the person's actual body and pose naturally, with believable fabric and lighting.

[THE VERDICT LOOK]
- The finished person radiates playful gyaru energy: glossy, doll-like, confident and cute — "she looks like the trendiest gyaru on the street." Next to the original photo, the transformation must be instant and delightful, while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light the person bright and glossy like a trendy studio snap: even, vivid, flattering light on the face; dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: skin perfectly clean with only original marks? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite new hair color and makeup? · same pose, same hands, same background? · outfit modest with zero letters or logos? · does it scream "trendy gyaru" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete gyaru styling. High resolution, no text, no watermark, no border — and the skin perfectly clean: nothing on it that the original does not have.`;

async function generateGyaru(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", GYARU_PROMPT);
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
  console.log(`[gyaru] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[gyaru] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateGyaru(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("gyaru error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("gyaru", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
