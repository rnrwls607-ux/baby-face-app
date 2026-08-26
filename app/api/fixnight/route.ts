import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 신규 변환 1차 — 나노바나나 Pro (펫 Pro 단일입력 route 구조 복제, 크롭 없음 = 원본 비율 유지)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFixnight(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a master retoucher at a premium Korean photo studio, specializing in rescuing night photos. The attached photo was taken at night and came out too dark and noisy. Rescue THIS EXACT photo into a clean, bright, beautiful night shot — while keeping it unmistakably a NIGHT photo.

SCENE & IDENTITY LOCK (critical — the SAME photo, only the light changes):
- Keep the photograph's content EXACTLY as it is: the same people with their exact same faces, identities, expressions, poses, hairstyles, and clothing; the same pets, food, objects, buildings, background, composition, framing, and camera angle.
- Add nothing, remove nothing, move nothing, reshape nothing. Do NOT beautify, slim, or restructure anyone's face or body — every person must stay instantly recognizable as themselves.
- Every background line, wall, horizon, and structure stays perfectly straight and unwarped.
- ONLY light, exposure, color, and atmosphere may change, exactly as instructed below. The physical scene itself never changes.
- GLASSES RULE: if a person wears glasses, keep the exact same frames; if they wear none, add none.

NIGHT RESCUE:
- Brighten the subject naturally: faces and main subjects become clearly visible with accurate, healthy skin tones and detailed eyes — as if shot with a superb modern night mode.
- Clean the image: remove digital noise and grain, restore crisp detail and the true colors that the darkness swallowed.
- KEEP IT NIGHT: the sky stays dark and the evening atmosphere stays. Streetlights, neon signs, shop windows, and lamps keep their glow — render them crisp and beautiful with a gentle natural bloom. Never turn the scene into daytime, and never flatten it into a gray dusk.
- Fix ugly night color casts: sickly yellow-green streetlight tones become pleasing, natural night colors; neon keeps its vivid character without bleeding onto skin.
- Balanced night exposure: bright enough to see everything that matters, dark enough to still feel like night.

KEEP IT REAL:
- No daytime conversion, no HDR halos, no plastic skin, no invented lights that were not there.

Photorealistic, high resolution, no text, no watermark, no border.`;
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
      "fixnight",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][fixnight] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[fixnight] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "fixnight", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[fixnight] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[fixnight] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다(풍경·세로 모두 대응)
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateFixnight(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("fixnight error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("fixnight", 0, handler); // COIN_DORMANT: 실가격 3 · 엔진 gemini-3-pro-image
