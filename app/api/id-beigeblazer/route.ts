import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 소프트펌 베이지 블레이저 (남성 전용 / 웜 아이보리 배경)
const ID_PROMPT = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side, even though the hairstyle is restyled below. Hair and clothing are the ONLY things that change — NEVER reshape the facial features themselves.
2. COMPOSITION — the output is ALWAYS the fixed head-and-shoulders composition described below, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up selfie comes out as the standard composition — never more of the face, no matter how large it fills the frame in the source.

TASK
You are RETOUCHING a real photograph of one real person into a single clean, refined profile-style ID photo. One to six photos of the SAME individual are provided. You may restyle hair and clothing to the concept below, but you must NOT redesign the face. This concept is for MEN only — always render a man.

HOW TO USE THE INPUT PHOTOS
- All attached photos are the same person, used for IDENTITY ONLY. Treat the clearest, most front-facing photo as the primary reference for facial features; use the others only to confirm the true face more accurately — never to average or blend them into a different face.
- Ignore the input photos' framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the same standard composition.
- Output exactly one photo of this one person.

IDENTITY LOCK — replicate the face, do not redesign it (highest priority)
- Reproduce the facial structure exactly as in the source: the same face shape and width-to-length ratio, the same hairline and forehead height, the same jaw and chin, the same cheek fullness and cheekbones, the same eye size and shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing and proportions between all features. Keep the person's natural asymmetries. If a feature conflicts with the concept, keep the feature — identity wins.
- Even though the hairstyle is changed below, the FACE must remain 100% the same person. Do not slim, enlarge, sharpen, or beautify the face. Do not drift toward a generic idol-like face — this is one specific individual. Changing the hair must never change the face.
- Keep the apparent age, natural bone structure, and any facial hair as in the source, and the person's TRUE skin tone (correct any warm/cool color cast from the source lighting, but never lighten, darken, or shift the actual skin tone).

SKIN & MARKS (absolute rule: flawless clean skin)
- Render completely clean, smooth, even, healthy skin. Acne, pimples, blemishes, redness, irritation, discoloration, and dark spots in the source are TEMPORARY conditions — NOT part of the person's identity; remove them ALL and render perfectly clean skin, like a professional studio retouch with light makeup. Soften pores and wrinkles to about half strength — natural, not plastic. Treat shadows, contrast edges, lighting gradients, and compression artifacts as clean skin, never real marks. Marks: render AT MOST ONE mole, and only if large and iconic in the source (smaller and fainter); two or more marks are NEVER allowed. When in ANY doubt, render zero marks — a face with no marks is always correct.

CONCEPT — HAIR / CLOTHING / BACKGROUND (restyle to this)
- Hair: restyle into a soft, natural men's perm with gentle waves and light volume, relaxed and tidy, natural dark hair. The hair outline must be clean and smooth where it meets the background. (This overrides the source hairstyle, but NOT the face.)
- Clothing: a soft beige blazer over a clean white or light inner top, refined and warm.
- Background: solid, even, warm ivory tone, smooth and clean, no shadows, no props.

STYLING
- Expression: a gentle, natural, closed-lip smile, warm and easygoing. Eyes open, relaxed, on camera.
- Lighting: bright, even, frontal (high-key), soft, almost no harsh shadow.
- Accessories: no earrings or jewelry, clean.
- Glasses: if the person is wearing glasses in the source photo, keep the same glasses on; if they are not wearing glasses, do not add any. Match the source exactly.

FRAMING (always identical — ignore how the input is cropped)
- Do NOT copy the input's zoom. Always produce a head-and-shoulders composition with shoulders clearly visible — never more of the face, no matter how large it fills the frame in the source, and no matter how tightly cropped the input already is.
- Centered, facing straight at the camera, symmetric, portrait-lens perspective (~85mm, no distortion).
- Head from top of hair to chin fills about 45% of the frame height, small even margin above the head, eyes slightly above the middle. Shoulders reach both edges, bottom cuts at upper chest.

FINAL SELF-CHECK before output: placed next to the source photo, a family member must instantly say "that's the same person, with the new hair and styling." If not, the result is wrong. Also check the skin: if the output face has two or more spots/marks, or any acne or blemish, the result is wrong — regenerate mentally with clean skin.

OUTPUT
- Vertical ID ratio (3.5:4.5), high-quality studio portrait, photorealistic, refined and warm. Remember the two absolute rules: the SAME face under the new hair, inside the SAME fixed composition.`;

async function generateOneIdPhoto(imageDataUrls: string[]): Promise<string> {
  const imageParts = imageDataUrls.map((url) => {
    const img = parseImage(url);
    return { inline_data: { mime_type: img.mimeType, data: img.data } };
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  const t0 = Date.now();

  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: ID_PROMPT }, ...imageParts] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "id-beigeblazer"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError")
      throw new Error("이미지 생성이 시간을 초과했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[id-beigeblazer] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

  if (!res.ok) throw new Error(await geminiFriendlyError(res, "id-beigeblazer"));

  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter(
    (p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
      p?.inlineData?.data || p?.inline_data?.data
  );
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const images: string[] = body?.images;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    }
    if (images.length < 3) {
      return NextResponse.json({ error: "정면 얼굴 사진을 3장 이상 올려주세요." }, { status: 400 });
    }
    if (images.length > 6) {
      return NextResponse.json({ error: "사진은 최대 6장까지 올릴 수 있어요." }, { status: 400 });
    }

    const results = await Promise.allSettled([
      generateOneIdPhoto(images),
      generateOneIdPhoto(images),
      generateOneIdPhoto(images),
    ]);

    const outputs = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    if (outputs.length === 0) {
      const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      const msg = (firstError?.reason as { message?: string })?.message || "이미지를 만들지 못했어요.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ output: outputs });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("id-beigeblazer error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("idbeigeblazer", 0, handler); // COIN_DORMANT: 실가격 9
