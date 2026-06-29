import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 여성 비즈프로필 (체크 블레이저 수트 + 밝은 회색 배경). {POSE} 자리에 포즈별 지시.
function buildPrompt(pose: string): string {
  return `TASK
You are RETOUCHING real photographs of one real WOMAN into a single polished, professional
BUSINESS PROFILE photo (corporate portrait / lookbook style) — NOT a stiff ID photo, and
NOT a new person. One to six photos of the SAME woman are provided. THE HIGHEST PRIORITY:
the output face must be clearly recognizable as the SAME person as the source. Keep the face,
lightly polished and flattering; restyle clothing, pose, framing, background, and lighting to
the professional standard below. This concept is for WOMEN only — always render a woman.

INPUT HANDLING
- All attached photos are the same woman. Use the clearest, most front-facing photo as the
  primary reference for the face and hairstyle; use the others to read the true facial
  features more accurately (shape, proportions, spacing).
- Output exactly one business profile photo of this one woman.

KEEP THE PERSON (high priority, but a flattering professional result is desired)
- Reproduce the facial structure faithfully: the same face shape, jaw and chin, cheekbones,
  eye shape, nose, lips, eyebrows, and the spacing/proportions between features, so the result
  is unmistakably THIS person. Keep apparent age and feminine characteristics.
- A clean, attractive, confident, professional look is welcome and encouraged — well-groomed,
  polished, photogenic — but it must still clearly be the same individual, not a generic face.

SKIN & MARKS
- Clean, smooth, even, healthy skin with good color; correct dull/off color from source light.
  Soften pores and wrinkles to about half strength — polished but not plastic, keep real age.
- By default NO spots or marks. The only exception: a clearly real, obvious mole in the source,
  rendered SMALLER and fainter. If unsure whether a dark area is a real mole, render clean skin.
  Never add, invent, or enlarge any mark.

STYLING (women's business profile — check blazer suit / bright light gray background)
- Clothing: a well-tailored CHECK / houndstooth women's business suit — a refined black-and-white
  (or beige-and-brown) glen-check or houndstooth blazer over a clean white blouse or shell, paired
  with matching check trousers or a pencil skirt suited to the framing. Elegant, fitted, sophisticated
  classic style with a tasteful pattern; intentional and premium. Freshly pressed and smooth, no messy
  wrinkles.
- Background: a clean, even studio backdrop in a BRIGHT, LIGHT neutral gray — the airy, premium
  light-gray studio tone of a high-end Korean corporate headshot (clearly a soft, light gray,
  NOT pure white), with a subtle gentle gradient that is just slightly deeper toward the edges
  and corners. Softly and evenly lit, no harsh shadows — clean, bright, premium corporate studio feel.
- Hair: keep the woman's own hairstyle, length, texture and true color, but render it neat,
  groomed, and polished (no frizz or stray flyaways). Professional and tidy.
- Expression: a calm, confident, approachable closed-lip smile conveying competence and
  trustworthiness. Subtle and natural, eyes engaged with the camera.
- Lighting: soft, even, flattering professional studio lighting (gentle key + fill), polished
  corporate-headshot quality, minimal harsh shadow. Even though the backdrop is bright and light,
  keep the outfit clearly readable and cleanly SEPARATED from it: give the clothing gentle
  dimension through soft, smooth shading along the sides, the shoulder line, and folds of form
  (form shadows only — NOT messy fabric wrinkles), so it has defined edges and never merges into
  the light background. Keep the check/houndstooth pattern crisp and even, not blurry or warped.
- Accessories: keep eyeglasses if worn (clear, glare-free). Keep jewelry minimal and tasteful
  (small simple earrings are fine); remove anything flashy — keep it clean and professional.

POSE & FRAMING (this is a confident professional portrait, NOT an ID shot)
- ${pose}
- Frame the person from roughly the head down to the hips/upper-thigh area (about waist-to-mid-
  thigh visible), so the outfit and posture are clearly shown — a half-to-three-quarter body
  business portrait, like a corporate lookbook. Do NOT crop tightly to head-and-shoulders.
- The person is well-composed and centered with comfortable, balanced spacing; confident and
  natural, never stiff. Portrait-lens perspective (~85mm), realistic proportions, no wide-angle
  distortion. Eyes looking at the camera.
- Render hands naturally and correctly with the right number of fingers; if a hand would look
  awkward, keep it relaxed and simple.

OUTPUT
- Vertical ratio 1:1.5 (width:height = 3:4.5), high-end professional studio profile photo,
  photorealistic, polished and corporate — like a premium business headshot/lookbook, not
  casual, not an ID photo.`;
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
  console.log(`[biz-check-gray] status=${res.status} ${Date.now() - t0}ms`);

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
    console.error("biz-check-gray error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}