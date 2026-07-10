import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 증명사진 프롬프트 (차콜그레이 정장 + 밝은 회색 배경 / 남녀공용)
const ID_PROMPT = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. This is a formal ID PHOTO — the face must be truly theirs. Enhance only through grooming, lighting, and the standard attire below; NEVER reshape facial features.
2. COMPOSITION — the output is ALWAYS the fixed head-and-shoulders ID composition described below, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up selfie comes out as the standard ID composition — never more of the face, no matter how large it fills the frame in the source.

TASK
You are RETOUCHING a real photograph of one real person — NOT generating a new person. One to six photos of the SAME individual are provided. Edit them into a single clean, formal ID photo. Keep the face as it is, lightly polished; change only background, clothing, hair tidiness, framing, and lighting to the standard below.

HOW TO USE THE INPUT PHOTOS
- All attached photos are the same person, used for IDENTITY ONLY. Treat the clearest, most front-facing photo as the primary reference for hairstyle and overall appearance; use the other photos only to confirm the true facial features more accurately (shape, proportions, spacing) — never to average or blend them into a different face.
- Ignore the input photos' framing, zoom, crop, and angle entirely — even an extreme close-up selfie must produce the same standard ID composition.
- Output exactly one ID photo of this one person.

IDENTITY LOCK — replicate the face, do not redesign it (highest priority)
- Reproduce the facial structure exactly as in the source: the same face shape and width-to-length ratio, the same hairline and forehead height, the same jaw and chin shape and width (sharp stays sharp, soft stays soft, square stays square), the same cheek fullness and cheekbones, the same eye size and shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing and proportions between all features. Keep the person's natural asymmetries — they are part of the identity.
- Do not drift toward a generic, idealized, or "prettier" face. This is one specific individual; preserve their exact identity and unique features. Do not slim, enlarge, sharpen, feminize, harden, or beautify anything.
- Keep the apparent age, natural bone structure, and sex characteristics as in the source, and the person's TRUE skin tone (correct any warm/cool color cast from the source lighting, but never lighten, darken, or shift the actual skin tone).
- Keep facial hair (beard, stubble, mustache, or clean-shaven) exactly as in the source.

SKIN & MARKS (absolute rule: flawless clean skin)
- Render completely clean, smooth, even, healthy skin with good color; correct any dull or off color from the source lighting. Acne, pimples, blemishes, redness, irritation, discoloration, dark spots, and skin texture issues in the source are TEMPORARY skin conditions — NOT part of the person's identity. Remove them ALL and render that area as perfectly clean skin, exactly like a professional studio retouch with light makeup.
- Treat shadows, contrast edges, lighting gradients, and compression artifacts in the source photo as clean skin — never mistake them for real marks.
- Soften pores and wrinkles to about half strength — a lightly-retouched look that still keeps the person's real age and texture, never plastic and never younger.
- Marks: render AT MOST ONE mole in the entire face, and ONLY if it is large and iconic in the source — smaller and fainter than the source. Two or more marks are NEVER allowed. When in ANY doubt, render zero marks: a face with no marks is always correct; a face with added marks is always wrong.

STANDARD LOOK
- Background: solid, even, pure clean white, no shadows, no gradient. A standard white ID-photo background.
- Clothing: a sharp charcoal gray formal suit jacket over a clean white collared shirt.
- Hair: keep the person's own hairstyle, length, and texture from the primary photo (front or swept back — match the source). Render it neat with a smooth, ROUNDED top outline — no spiky, stray, or flyaway strands, no frizz; if it falls in front keep both sides even and off the face and eyes. Render it in its true color under the output's neutral lighting — warm/orange/brown tints from the source light must not become the hair's actual color.
- Expression: a gentle, natural, closed-lip smile — corners of the mouth slightly raised, warm and friendly for a good first impression. Keep it subtle so the face still looks like the same person; not wide, toothy, or a smirk. Eyes open and relaxed, on camera.
- Lighting: bright, even, frontal (high-key), almost no facial shadow.
- Eyewear & accessories: eyeglasses ONLY if the person is clearly wearing them in the source photos — then keep them (clear, glare-free). If they are NOT wearing glasses in the source, the output must have NO glasses — never add eyewear of any kind. Render the ears clean — remove all earrings and ear jewelry even if present in the source. No other jewelry or accessories.

FRAMING (always identical — ignore how the input is cropped)
- Do NOT copy the input's zoom. Even if the input is a tight close-up of the face, always produce the same standard head-and-shoulders ID composition with the shoulders clearly visible — never more of the face, no matter how large it fills the frame in the source, and no matter how tightly cropped the input already is. Use the same head size for every subject.
- Centered, facing straight at the camera, symmetric, portrait-lens perspective (~85mm, no wide-angle distortion).
- The head, from the top of the hair to the chin, fills about 45% of the frame height, with a small even margin above the head; the eyes sit a little above the middle.
- Shoulders are level and reach the left and right edges; the bottom edge cuts at the upper chest. Show ONLY head and upper shoulders — no arms, hands, or torso below the upper chest, under any circumstance.

FINAL SELF-CHECK before output: placed next to the source photo, a family member must instantly say "that's the same person, in a formal ID photo." If not, the result is wrong. Also check the skin: if the output face has two or more spots/marks, or any acne or blemish, the result is wrong — regenerate mentally with clean skin.

OUTPUT
- Vertical ID ratio (3.5:4.5), studio passport-photo quality, photorealistic, formal — not casual, not editorial, not a fashion portrait. Remember the two absolute rules: the SAME face, inside the SAME fixed ID composition.`;

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
  console.log(`[id-charcoal-gray] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

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
    console.error("id-charcoal-gray error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}