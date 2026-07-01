import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 증명사진 프롬프트 (화이트 셔츠, 재킷 없음 + 밝은 회색 배경 / 남녀공용)
const ID_PROMPT = `TASK
You are RETOUCHING a real photograph of one real person — NOT generating a new person.
One to six photos of the SAME individual are provided. Edit them into a single clean,
formal ID photo. THE HIGHEST PRIORITY, above everything else: the output face must be
instantly recognizable as the SAME person side by side with the source. Keep the face as
it is, lightly polished; change only background, clothing, hair tidiness, framing, and
lighting to the standard below.

INPUT HANDLING
- All attached photos are the same person. Treat the clearest, most front-facing photo as
  the primary reference for hairstyle and overall appearance; use the other photos to
  read the true facial features more accurately (shape, proportions, spacing).
- Output exactly one ID photo of this one person.

KEEP THE PERSON — replicate the face, do not redesign it (highest priority)
- Reproduce the facial structure exactly as in the source: the same face shape and width,
  the same jaw and chin shape and width (sharp stays sharp, soft stays soft, square stays
  square), the same cheek fullness, the same eye size and shape, the same nose, the same
  lips, the same eyebrows, and the same spacing and proportions between all features.
  If a feature conflicts with the standard look, keep the feature — identity wins.
- Do not drift toward a generic, idealized, or "prettier" face. This is one specific
  individual; preserve their exact identity and unique features. Do not slim, enlarge,
  sharpen, feminize, harden, or beautify anything.
- Keep the apparent age, natural bone structure, and sex characteristics as in the source.
- Keep facial hair (beard, stubble, mustache, or clean-shaven) exactly as in the source.

SKIN & MARKS (default to clean skin)
- Render clean, smooth, even, healthy skin with good color; correct any dull or off color
  from the source lighting. By default the skin carries NO spots, dots, or marks.
- Soften pores and wrinkles to about half strength — a lightly-retouched look that still
  keeps the person's real age and texture, never plastic and never younger.
- The ONLY mark allowed: a mole that is unmistakably a real, obvious mole in the source.
  Render it SMALLER and fainter than in the source. If you are not fully certain a dark
  area is a real mole, render clean skin — treat every shadow, contrast edge, lighting
  gradient, or blemish as clean skin.
- Never add, invent, or enlarge any mark. A real mole becoming lighter or gone is fine;
  a new or bigger mark is never allowed.

STANDARD LOOK
- Background: solid, even, bright light neutral gray, no shadows.
- Clothing: a clean, crisp white collared dress shirt, no jacket and no tie.
- Hair: keep the person's own hairstyle, length, and texture from the primary photo
  (front or swept back — match the source). Render it neat with a smooth, ROUNDED top
  outline — no spiky, stray, or flyaway strands, no frizz; if it falls in front keep both
  sides even and off the face and eyes. Render it in its true color under the output's
  neutral lighting — warm/orange/brown tints from the source light must not become the
  hair's actual color.
- Expression: a gentle, natural, closed-lip smile — corners of the mouth slightly raised,
  warm and friendly for a good first impression. Keep it subtle so the face still looks
  like the same person; not wide, toothy, or a smirk. Eyes open and relaxed, on camera.
- Lighting: bright, even, frontal (high-key), almost no facial shadow.
- Eyewear & accessories: keep eyeglasses if worn (clear, glare-free). Render the ears
  clean — remove all earrings and ear jewelry even if present in the source. No other
  jewelry or accessories.

FRAMING (always identical — ignore how the input is cropped)
- Do NOT copy the input's zoom. Even if the input is a tight close-up of the face, always
  produce the same standard head-and-shoulders ID composition with the shoulders clearly
  visible. Use the same head size for every subject.
- Centered, facing straight at the camera, symmetric, portrait-lens perspective (~85mm,
  no wide-angle distortion).
- The head, from the top of the hair to the chin, fills about 45% of the frame height,
  with a small even margin above the head; the eyes sit a little above the middle.
- Shoulders are level and reach the left and right edges; the bottom edge cuts at the
  upper chest. Show ONLY head and upper shoulders — no arms, hands, or torso below the
  upper chest, under any circumstance.

OUTPUT
- Vertical ID ratio (3.5:4.5), studio passport-photo quality, photorealistic, formal —
  not casual, not editorial, not a fashion portrait.`;

// 사진 여러 장(3~6장)으로 증명사진 1장 생성 — 독립 1회 호출
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
    res = await fetch(
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
      }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError")
      throw new Error("이미지 생성이 시간을 초과했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[id-whiteshirt-gray] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

  if (!res.ok) throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));

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
  return `data:image/png;base64,${b64}`;
}

export async function POST(request: NextRequest) {
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
    console.error("id-whiteshirt-gray error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}