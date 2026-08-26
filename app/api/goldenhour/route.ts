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
async function generateGoldenhour(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a master colorist grading this exact photograph into golden hour. This is a RETOUCH of the existing photo — do NOT re-shoot, re-imagine, or regenerate the scene. Work on the photograph as it is.

GROUND LOCK — the #1 rule (everything below the sky is untouchable):
- Every building, tree, pole, wire, road, object, and structure stays EXACTLY where it is, with its exact shape, size, outline, and position. Same for every person: exact same face, identity, expression, pose, hair, and clothing.
- THE OVERLAY TEST: if the original and your result were laid on top of each other, every edge on the ground — every rooftop line, window, branch, and silhouette — must align perfectly. If anything moved, grew, shrank, appeared, or disappeared, the work is wrong.
- Do not invent any object, light source, person, or scenery. Do not remove anything. Same framing, same camera angle, all lines straight.
- GLASSES RULE: same frames if worn; add none if not.

THE SKY — your one creative zone:
- The sky may transform freely into the most beautiful golden-hour sky: clouds may change shape, grow, glow, or re-form into sunset clouds lit in gold, coral, and rose, melting into peach and dusty lavender-blue above. A plain sky may become a gorgeous warm sunset gradient.
- Keep it tasteful and believable — no garish neon, and do not paint a sun disc into the frame unless the sun was already visible in the original.

GOLDEN HOUR LIGHT on the locked scene:
- Wash the entire scene in warm, low-angle honey-gold sunset light: every locked surface keeps its exact shape but glows in the new light — warm highlights, softened warm shadows, a gentle luminous haze in the air.
- People glow: warm radiant natural skin, a soft golden rim light on hair and shoulders, bright catchlights in the eyes. Faces clearly lit and flattering — never silhouetted.
- The color transformation must be dramatic and unmistakable — a dull afternoon becomes the most beautiful minute of sunset — while the world in the photo stays exactly in place.

SELF-CHECK before finishing: overlay test passed on every ground edge? · nothing added or removed? · same people, same pose? · sky breathtaking? Only then is the grade complete.

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
      "goldenhour",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][goldenhour] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[goldenhour] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "goldenhour", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[goldenhour] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[goldenhour] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generateGoldenhour(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("goldenhour error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("goldenhour", 0, handler); // COIN_DORMANT: 실가격 3 · 엔진 gemini-3-pro-image
