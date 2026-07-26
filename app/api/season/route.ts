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

// 칩 합성 — era route와 같은 구조: CORE + 계절별 본문 + FINISH
const SEASON_CORE = `You are a master of seasonal scene transformation. Re-imagine this exact photo as if the very same moment had been captured in a different season — same people, same place, transformed world.

WHAT STAYS (lock):
- The people: exact same faces, identities, expressions, poses, hair, and clothing — instantly recognizable, outfits unchanged. (Keeping the same outfit across seasons is intentional — it proves it is the same moment.)
- The place: same location, same buildings, structures, roads, and composition. Same framing and camera angle. All lines stay straight.
- GLASSES RULE: same frames if worn; add none if not.

WHAT TRANSFORMS (be bold — the season change must be dramatic and unmistakable):
- ALL vegetation transforms to the new season: trees, leaves, grass, and plants are fully re-dressed.
- The sky, the quality of light, and the color of the air all shift to the new season's mood.
- The ground transforms too: petals, deep summer shade, fallen leaves, or snow as the season demands.
- Every seasonal detail must be consistent — one glance must instantly say which season it is.

THE SEASON:`;

const SEASON_FINISH = `The result: the same person, the same spot, convincingly photographed in a different season — beautiful enough to frame all four side by side.
Photorealistic, high resolution, no text, no watermark, no border.`;

const SEASON_PROMPTS: Record<string, string> = {
  spring: `${SEASON_CORE}
Full spring bloom: cherry-blossom trees in full pink flower, soft petals drifting through the air and scattered on the ground, fresh young greens, gentle warm spring sunlight, a tender pastel sky.

${SEASON_FINISH}`,
  summer: `${SEASON_CORE}
Peak summer: deep lush green foliage everywhere, a vivid blue sky with bright white cumulus clouds, strong clear summer sunlight with crisp shadows, the air bright and alive.

${SEASON_FINISH}`,
  autumn: `${SEASON_CORE}
Deep autumn: trees turned brilliant red, orange, and gold, fallen leaves carpeting the ground, warm low golden autumn light, a calm clear sky with a nostalgic amber mood.

${SEASON_FINISH}`,
  winter: `${SEASON_CORE}
Snowy winter: fresh white snow covering the ground, rooftops, and bare tree branches, soft gray-blue winter light, gentle snowflakes drifting in the air, a serene cold hush over everything.

${SEASON_FINISH}`,
};

async function generateSeason(imageDataUrl: string, season: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = SEASON_PROMPTS[season] || SEASON_PROMPTS.spring; // 미지정·이상값 → 봄 폴백
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
      "season",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[season] model=${GEMINI_MODEL} season=${season} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "season", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[season] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[season] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다(풍경·세로 모두 대응)
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    // 칩 값은 클라가 body.season으로 보낸다 — 문자열이 아니면 봄으로 (era 관례)
    const season: string = typeof body?.season === "string" ? body.season : "spring";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateSeason(image, season);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("season error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("season", 0, handler); // COIN_DORMANT: 실가격 3 · 엔진 gemini-3-pro-image
