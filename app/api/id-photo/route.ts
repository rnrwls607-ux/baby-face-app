import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import sharp from "sharp";
export const runtime = "nodejs";
export const maxDuration = 60;
// 🔑 모델 격리 지점: 나중에 모델을 바꾸려면 이 두 줄과 generateOne 함수만 손대면 됨
// 현재: Google Gemini "Nano Banana Pro"
const GEMINI_MODEL = "gemini-3.1-flash-image"; // 빠름 (Pro는 50초 초과 위험)
const NUM_OUTPUTS = 3; // 다른 증명 31종과 동일한 1회 3장 — 독립 병렬 3회 (연속 생성은 결과가 비슷해짐)
// 📐 증명사진 규격 비율 (가로:세로 = 3.5 : 4.5). 여기 숫자만 바꾸면 비율 변경됨
const RATIO_W = 3.5;
const RATIO_H = 4.5;

// 📌 증명사진 구도 표준 (모든 증명사진 컨셉 공통) — 입력 비율과 무관하게 규격 구도로 강제
//    한국/ICAO 여권·증명 규격 기준: 머리(정수리~턱)가 세로의 약 70%, 중앙·정면, 머리 위 여백 확보
const ID_COMPOSITION = `This MUST be composed as a regulation ID / passport photo with a TIGHT head-and-shoulders crop, regardless of the framing, angle, or aspect ratio of the input photo(s). Reframe and recompose as needed:
- Output is a vertical portrait. The person faces the camera directly, shoulders level and squared to the camera.
- The head is centered horizontally. The face and gaze point straight forward (no tilt, no turn).
- Head size (very important): the head, from the top of the hair to the chin, fills about 75-80% of the image height. The frame is filled mostly by the head, like a real passport photo. Leave only a small even margin of empty space above the top of the head (do not crop the top of the head or hair).
- TIGHT crop at the shoulders: crop the body at the SHOULDER LINE so that only the top of the shoulders is visible at the very bottom edge. Do NOT show the chest, do NOT show shirt buttons, do NOT show a wide or full upper body. Only the collar and the very top of the shoulders should appear.
- Both ears and the full face outline are visible.
- Crop out any background people or objects; only this one person remains.`;

// data URL 또는 순수 base64 → { mimeType, data }
function parseImage(input: string): { mimeType: string; data: string } {
  const m = input.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: "image/jpeg", data: input };
}
// 📐 생성된 이미지를 3.5:4.5 비율로 가운데 크롭 (실패하면 원본 그대로 반환 = 안전장치)
async function cropToRatio(dataUrl: string): Promise<string> {
  try {
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return dataUrl;
    const inputBuf = Buffer.from(m[2], "base64");
    const img = sharp(inputBuf);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return dataUrl;
    const targetRatio = RATIO_W / RATIO_H; // 목표 가로/세로
    const curRatio = w / h;
    let cropW = w;
    let cropH = h;
    if (curRatio > targetRatio) {
      // 현재가 더 넓음 → 좌우를 잘라냄
      cropW = Math.round(h * targetRatio);
    } else {
      // 현재가 더 김(세로 김) → 위아래를 잘라냄
      cropH = Math.round(w / targetRatio);
    }
    const left = Math.round((w - cropW) / 2);
    // 세로 크롭은 머리 위 여백을 살짝만 남기려고 위에서 22%/아래 78% 비율로 잘라냄 (어깨선 위주)
    const top = Math.round((h - cropH) * 0.22);
    const out = await img
      .extract({ left: Math.max(0, left), top: Math.max(0, top), width: cropW, height: cropH })
      .png()
      .toBuffer();
    return await stampAiMetadata(out.toString("base64")); // AI 생성물 비가시 표시 (로컬 크롭이 벗긴 도장 재적용)
  } catch (e) {
    console.error("[id-photo] crop failed, returning original:", (e as { message?: string })?.message);
    return dataUrl; // 크롭 실패 시 원본 반환
  }
}
// Gemini로 사진 1장 생성 → base64 PNG data URL 반환 (일시적 5xx면 재시도)
async function generateOne(prompt: string, images: { mimeType: string; data: string }[]): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000); // 50초 넘으면 중단
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
        signal: ctrl.signal,
      },
      "id-photo"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[id-photo] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "id-photo"));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
// 🔑 증명사진 생성 엔진
async function generateIdPhotos(
  imageDataUrls: string[],
  gender: string,
  background = "white",
  clothing = "black_suit",
  hair = "keep"
): Promise<string[]> {
  const BG: Record<string, string> = {
    white: "a clean solid white background",
    skyblue: "a solid light sky-blue background",
    gray: "a solid light gray background",
    beige: "a solid soft beige background",
  };
  const OUTFIT: Record<string, string> = {
    black_suit: "a formal black business suit with a white dress shirt",
    navy_suit: "a formal navy business suit with a white dress shirt",
    white_shirt: "a clean white collared dress shirt (no jacket)",
  };
  const HAIR: Record<string, string> = {
    keep: "keep the original hairstyle",
    neat: "tidy, neatly groomed hair",
    forehead: "neat hair with the forehead clearly visible",
  };
  const images = imageDataUrls.map(parseImage);
  const who = gender === "man" ? "man" : "woman";
  const bgDesc = BG[background] || BG.white;
  const outfitDesc = OUTFIT[clothing] || OUTFIT.black_suit;
  const hairDesc = HAIR[hair] || HAIR.keep;
  const sameIdentity = images.length > 1
    ? `The ${images.length} input photos are all the SAME person from different angles — use them together to capture their true likeness.`
    : "";

  const prompt = `Create a professional ID/passport-style headshot of the ${who} shown in the photo(s).

IDENTITY (most important): Keep the EXACT same face and identity as the input person — same facial features, face shape, eyes, nose, mouth, eyebrows, and overall likeness. The result must be instantly recognizable as the same person. Do NOT beautify, slim, reshape, or turn them into a different or more "average" looking person. Keep their natural skin texture. ${sameIdentity}

COMPOSITION: ${ID_COMPOSITION}

STYLING: A gentle, natural closed-mouth smile with a soft, friendly, relaxed expression — warm and approachable, NOT stiff, stern, angry, or sad. Lips stay together (no teeth, not laughing), but the eyes and mouth look subtly pleasant, like a good real-life ID photo. Dress them in ${outfitDesc}. Hairstyle: ${hairDesc}. Background: ${bgDesc}. Even soft studio lighting, sharp focus, natural realistic skin, high-quality professional photo. No shadow on the background. No text, no watermark, no border.`;

  const tasks = Array.from({ length: NUM_OUTPUTS }, () => generateOne(prompt, images));
  const settled = await Promise.allSettled(tasks);
  const ok = settled
    .filter((s): s is PromiseFulfilledResult<string> => s.status === "fulfilled")
    .map((s) => s.value);
  if (!ok.length) {
    const firstErr = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(firstErr?.reason?.message || "이미지 생성에 실패했어요.");
  }
  // 📐 생성된 이미지들을 3.5:4.5 비율로 크롭
  const cropped = await Promise.all(ok.map(cropToRatio));
  return cropped;
}
export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(GEMINI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await req.json();
    const images: string[] = body?.images || [];
    const gender: string = body?.gender || "woman";
    const background: string = body?.background || "white";
    const clothing: string = body?.clothing || "black_suit";
    const hair: string = body?.hair || "keep";
    if (!images.length) {
      return NextResponse.json({ error: "사진을 한 장 이상 올려주세요." }, { status: 400 });
    }
    const output = await generateIdPhotos(images, gender, background, clothing, hair);
    return NextResponse.json({ output });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("id-photo error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}