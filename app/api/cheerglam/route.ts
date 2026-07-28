import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 글램 라인 1차 — 나노바나나 Pro (Pro 단일입력 route 구조 복제, 크롭 없음 = 원본 비율 유지)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateCheerglam(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the head stylist team for Korea's top professional cheerleading squad — hair, makeup, and wardrobe working together on one photo. The person in this photo walks in as themselves; they walk out as a star cheerleader, photographed in this exact same moment and place. Think of it as an off-court snapshot: a cheerleader in full game-day styling, caught in an everyday spot. Same person, same photo — cheerleader version.

[SKIN TRUTH v3 — the #1 rule of this entire work]
- DEFAULT SKIN IS CLEAR: unless a mole or mark is CLEARLY visible in the original photo, render that area of skin perfectly clear and unmarked. Marks may ONLY be copied from the original — never invented, never added for "beauty," never imagined out of blur, shadow, or noise.
- ZERO new marks: creating even ONE mole, beauty mark, freckle, spot, or scar that does not exist in the original — on the face, neck, or anywhere — is a critical failure that ruins the entire work.
- When in doubt, leave it out: a missing mark is acceptable; an invented mark is not.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- The makeup NEVER adds marks: no painted-on beauty marks, no aesthetic freckles, no "charming" moles, under any circumstance.
- Flawless skin still means REAL skin — pores and fine texture remain visible; a wax or 3D-render look is a critical failure.

[IDENTITY FLOOR — the strongest rule, never cross]
- This transformation stacks new hair + bold makeup + new outfit, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into any real cheerleader or celebrity.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Do NOT place pom-poms or any props into their hands — the hands stay exactly as the original. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR: restyle into the signature cheerleader look — a high, bouncy ponytail (or a half-up style if it suits them better) tied with a bright ribbon; sleek, energetic, salon-perfect finish with a natural hairline.
- MAKEUP: fresh, energetic game-day stage makeup — flawless luminous base, healthy vivid blush, bright sharply defined eyes with defined lashes, groomed brows, and a vivid coral or pink lip. Camera-ready sparkle, never cakey.
- WARDROBE: replace the outfit with a cheerleading uniform in bright, cheerful team colors (red-white or blue-white color blocking) — a fitted sleeveless or short-sleeved top and a pleated skirt, modest and sporty: NO bare midriff, no revealing cuts. Coordinated small details (wristbands, hair ribbon) may be added as styling. ★ABSOLUTELY NO letters, numbers, team names, or logos anywhere on the uniform — plain color-blocked fabric only.
- The uniform must fit the person's actual body and pose naturally, with believable fabric, fit, and lighting — as if they were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates stadium energy: bright, athletic, dazzling — "she looks like she just stepped off the cheer stage at a ballpark." Next to the original photo, the transformation must be instant and delightful, while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light the person bright and clean like a daytime stadium photo: even, vivid, flattering light on the face; dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: zero new moles, freckles, or painted marks anywhere? · every original mole still in place? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite new hair and outfit? · same pose, same hands with no props added, same background? · uniform modest with zero letters, numbers, or logos? · does it scream "cheerleader" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete cheerleader styling. High resolution, no text, no watermark, no border — and absolutely zero new moles or marks anywhere: default skin is clear.`;
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
      "cheerglam",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[cheerglam] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "cheerglam", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[cheerglam] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[cheerglam] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateCheerglam(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("cheerglam error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("cheerglam", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
