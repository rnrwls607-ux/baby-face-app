import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

function buildPrompt(pose: string): string {
  return `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be clearly recognizable as the SAME person as the input, side by side. This is a BUSINESS PROFILE photo — professional styling, pose, and lighting are the transformation; NEVER reshape their facial features.
2. COMPOSITION — the output is ALWAYS the half-to-three-quarter body business-portrait framing described below, regardless of the input photos' framing, zoom, crop, or angle. Even an extreme close-up selfie comes out as the standard business-portrait composition.

TASK
You are RETOUCHING real photographs of one real person into a single polished, professional BUSINESS PROFILE photo (corporate portrait / lookbook style) — NOT a stiff ID photo, and NOT a new person. One to six photos of the SAME individual are provided. Keep the face as it is; restyle clothing, pose, framing, background, and lighting to the professional standard below.

HOW TO USE THE INPUT PHOTOS
- All attached photos are the same person, used for IDENTITY ONLY. Use the clearest, most front-facing photo as the primary reference for the face and hairstyle; use the others only to confirm the true facial features more accurately (shape, proportions, spacing) — never to average or blend them into a different face.
- Ignore the input photos' framing, zoom, crop, angle, and background entirely — even an extreme close-up selfie must produce the same standard business-portrait composition.
- Even if every input is a tight face selfie, the output still shows the full waist-to-mid-thigh business framing below — build the body, outfit, and studio scene from the spec, and place this person's exact face and hair on it.
- Output exactly one business profile photo of this one person.

IDENTITY LOCK (highest priority)
- Reproduce the facial structure faithfully: the same face shape and width-to-length ratio, the same hairline and forehead, the same jaw and chin, the same cheekbones, the same eye size and shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing and proportions between all features, so the result is unmistakably THIS person. Keep the person's natural asymmetries — they are part of the identity.
- Keep the apparent age and sex characteristics as in the source, and the person's TRUE skin tone (correct any warm/cool color cast from the source lighting, but never lighten, darken, or shift the actual skin tone). Do not slim, enlarge, sharpen, or beautify the face — the professional look below comes from styling, pose, and lighting, never from reshaping features.
- Keep facial hair (beard/stubble/mustache/clean-shaven) as in the source.

SKIN & MARKS
- Clean, smooth, even, healthy skin with good color; correct dull/off color from source light. Treat shadows, contrast edges, lighting gradients, and compression artifacts in the source photo as clean skin — never mistake them for real marks. Soften pores and wrinkles to about half strength — polished but not plastic, keep real age.
- By default NO spots or marks. The only exception: a clearly real, obvious mole in the source, rendered SMALLER and fainter. If unsure whether a dark area is a real mole, render clean skin. Never add, invent, or enlarge any mark.

STYLING (men's business profile — gray studio background)
- Clothing: a well-tailored CHARCOAL or NAVY blazer worn over a fine-gauge TURTLENECK (roll-neck) sweater in black, charcoal, or cream — NO shirt collar, NO tie. Modern, minimal, sophisticated style — sleek and intentional.
- Background: a clean, even studio backdrop in a BRIGHT, LIGHT neutral gray — a soft, airy light gray that is clearly lighter than the suit and the hair (but NOT pure white). Softly and evenly lit with a subtle gentle gradient (only very slightly deeper toward the edges), no harsh shadows. Keep the background distinctly BRIGHTER than the subject so the person clearly stands out and never blends into it — clean, bright, premium corporate studio feel. This is a plain seamless studio backdrop ONLY — absolutely NO office, NO windows, NO furniture, NO plants, NO interior scene of any kind behind the person.
- Hair: keep the person's own hairstyle, length, texture and true color, but render it neat,
  groomed, and polished (no frizz or stray flyaways). Professional and tidy.
- Expression: a calm, confident, approachable closed-lip smile conveying competence and
  trustworthiness. Subtle and natural, eyes engaged with the camera.
- Lighting: soft, even, flattering professional studio lighting (gentle key + fill), polished
  corporate-headshot quality, minimal harsh shadow.
- Accessories: eyeglasses ONLY if the person is clearly wearing them in the source (then keep them, clear and glare-free); if they are NOT wearing glasses in the source, add NO glasses of any kind. Remove earrings/ear jewelry and any
  flashy accessories — keep it clean and professional.

POSE & FRAMING (this is a confident professional portrait, NOT an ID shot)
- ${pose}
- Frame the person from roughly the head down to the hips/upper-thigh area (about waist-to-mid-thigh visible), so the outfit and posture are clearly shown — a half-to-three-quarter body business portrait, like a corporate lookbook. Do NOT crop tightly to head-and-shoulders, no matter how tightly the source photo was cropped.
- The person is well-composed and centered with comfortable, balanced spacing; confident and natural, never stiff. Portrait-lens perspective (~85mm), realistic proportions, no wide-angle distortion. Eyes looking at the camera.
- Render hands naturally and correctly with the right number of fingers; if a hand would look awkward, keep it relaxed and simple.

FINAL SELF-CHECK before output: placed next to the source photos, someone who knows them must instantly say "that's them, in a professional business profile." If not, the result is wrong.

OUTPUT
- Vertical ratio 1:1.5 (width:height = 3:4.5), high-end professional studio profile photo, photorealistic, polished and corporate — like a premium business headshot/lookbook, not casual, not an ID photo. Remember the two absolute rules: the SAME person, inside the SAME fixed business-portrait composition.`;
}

const POSES = [
  "Pose: standing confidently with arms crossed lightly over the chest, shoulders relaxed and slightly squared, conveying self-assured leadership. Body angled very slightly (about 10-15 degrees) while the face turns to the camera.",
  "Pose: standing upright with both hands gently clasped together in front at waist level, a poised and trustworthy posture. Shoulders relaxed and level, calm and composed, facing the camera.",
  "Pose: standing in a relaxed three-quarter angle (body turned about 20 degrees), one arm resting naturally at the side and the other hand resting lightly near the waist, a soft confident professional stance. Face turned to the camera.",
];

async function generateOneBizPhoto(imageDataUrls: string[], pose: string): Promise<string> {
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
          contents: [{ parts: [{ text: buildPrompt(pose) }, ...imageParts] }],
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
  console.log(`[biz-man-turtleneck] status=${res.status} ${Date.now() - t0}ms`);

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
      generateOneBizPhoto(images, POSES[0]),
      generateOneBizPhoto(images, POSES[1]),
      generateOneBizPhoto(images, POSES[2]),
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
    console.error("biz-man-turtleneck error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}