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
async function generateGuestlook(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the styling team preparing a wedding guest for the big day — hair, makeup, and wardrobe working together on one photo. The person in this photo walks in as themselves; they walk out in a flawless Korean wedding-guest look, photographed in this exact same moment and place. Think of it as the mirror-check snapshot before leaving for the ceremony: elegant, polished, perfectly appropriate. Same person, same photo — wedding-guest version.

[SKIN PERFECTION — the #1 rule of this entire work]
- Render the skin PERFECTLY CLEAN, clear, and even — a flawless, uniform complexion across the face, neck, and body, like a premium studio profile photo.
- The ONLY marks allowed anywhere are ones CLEARLY visible in the original photo, kept in their exact original spots. Everything else is clean skin — nothing new appears, ever. If unsure whether something is a mark or just shadow/noise, render clean skin.
- Flawless still means REAL: natural pores and fine skin texture remain visible — never waxy, never 3D-render plastic.

[IDENTITY FLOOR — the strongest rule, never cross]
- This transformation stacks new hair + makeup + a new outfit, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into any celebrity.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Do NOT place any props into their hands — no clutch bag, no invitation, no bouquet; the hands stay exactly as the original. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR: restyle into an elegant wedding-guest look — soft, polished loose waves worn down, or a graceful low half-up style with a neat finish. Refined and feminine, not a strand messy, natural hairline.
- MAKEUP: the classic hall-ready guest makeup — a luminous flawless base, softly defined eyes with delicate shimmer and neat lashes, groomed elegant brows, a gentle rosy blush, and a refined rose or MLBB lip. Polished and graceful — beautiful, yet tastefully understated: a guest never outshines the bride.
- WARDROBE: replace the outfit with a tasteful Korean wedding-guest dress — a well-fitted, knee-to-midi-length one-piece or elegant two-piece in a muted refined tone (soft black, deep navy, dusty rose, or warm beige). ★NEVER white, ivory, or cream — those colors are reserved for the bride; using them is a critical failure. Modest neckline and cuts. Small pearl or delicate gold earrings and a thin necklace may be added as styling. NO brand logos, no lettering anywhere.
- The dress must fit the person's actual body and pose naturally, with believable fabric, drape, and lighting — as if they were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates occasion-ready elegance: polished, graceful, quietly stunning — "she's clearly on her way to a wedding." Next to the original photo, the transformation must be instant and admiring, while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light the person soft and luminous like a premium portrait: even, flattering illumination on the face; harsh shadows and dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: skin perfectly clean with only original marks? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite the new hair and dress? · same pose, same hands with no props added, same background? · dress NOT white/ivory/cream, logo-free, modest? · does it read "wedding guest" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in a complete wedding-guest look. High resolution, no text, no watermark, no border — and the skin perfectly clean: nothing on it that the original does not have.`;
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
      "guestlook",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][guestlook] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[guestlook] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "guestlook", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[guestlook] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[guestlook] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generateGuestlook(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("guestlook error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("guestlook", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
