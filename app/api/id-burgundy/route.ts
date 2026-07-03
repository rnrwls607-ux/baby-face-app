import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// 버건디 오프숄더 (여성 전용 / 웜 피치 배경)
const ID_PROMPT = `TASK
You are RETOUCHING a real photograph of one real person into a single clean, elegant profile-style photo. One to six photos of the SAME individual are provided. THE HIGHEST PRIORITY, above everything else: the output face must be instantly recognizable as the SAME person side by side with the source. You may restyle hair and clothing to the concept below, but you must NOT redesign the face.

INPUT HANDLING
- All attached photos are the same person. Treat the clearest, most front-facing photo as the primary reference for facial features; use the others to read the true face more accurately.
- Output exactly one photo of this one person.

KEEP THE PERSON — replicate the face, do not redesign it (highest priority)
- Reproduce the facial structure exactly as in the source: same face shape and width, same jaw and chin, same cheek fullness, same eye size and shape, same nose, same lips, same eyebrows, and the same spacing and proportions between all features. If a feature conflicts with the concept, keep the feature — identity wins.
- Even though the hairstyle is changed below, the FACE must remain 100% the same person. Do not slim, enlarge, sharpen, or beautify the face. Do not drift toward a generic idol-like face. This is one specific individual.
- Even though the hairstyle changes, the face must stay the SAME person — same identity, same proportions. Changing the hair must never change the face.
- Keep the apparent age and natural bone structure as in the source.

SKIN & MARKS (default to clean skin)
- Render clean, smooth, even, healthy skin. Soften pores and wrinkles to about half strength — natural, not plastic. By default no spots or marks. Only keep a clearly real, obvious mole, rendered smaller and fainter. If unsure, render clean skin.

CONCEPT — HAIR / CLOTHING / BACKGROUND (restyle to this)
- Hair: restyle into soft layered shoulder-length hair in a light-brown color, with gentle movement and face-framing layers, glossy and neat. The hair outline must be clean and smooth where it meets the background — a soft, even silhouette with no jagged, lumpy, or pixelated edges. (This overrides the source hairstyle, but NOT the face.)
- Clothing: an elegant deep burgundy satin off-shoulder top, feminine and chic, with a smooth draped neckline that gently exposes the shoulders in a tasteful, sophisticated way (elegant, not revealing).
- Background: solid, even, warm peach tone, smooth and clean, no shadows, no props. Keep a clear separation between the burgundy top and the peach background so the clothing edge stays crisp.

STYLING
- Expression: a soft, alluring, closed-lip smile, elegant and confident. Eyes open, relaxed, on camera.
- Lighting: bright, even, frontal (high-key), soft and flattering, almost no harsh shadow.
- Accessories: remove earrings and other jewelry, keep it clean. Soft feminine makeup.
- Glasses: if the person is wearing glasses in the source photo, keep the same glasses on; if they are not wearing glasses, do not add any. Match the source exactly.

FRAMING (always identical — ignore how the input is cropped)
- Do NOT copy the input's zoom. Always produce a head-and-shoulders composition with shoulders clearly visible.
- Centered, facing straight at the camera, symmetric, portrait-lens perspective (~85mm, no distortion).
- Head from top of hair to chin fills about 45% of the frame height, small even margin above the head, eyes slightly above the middle. Shoulders reach both edges, bottom cuts at upper chest.

OUTPUT
- Vertical ID ratio (3.5:4.5), high-quality studio portrait, photorealistic, elegant and feminine.`;

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
  console.log(`[id-burgundy] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

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
    console.error("id-burgundy error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}