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
async function generateCrewglam(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the styling team preparing a flight attendant for duty — hair, makeup, and uniform fitting working together on one photo. The person in this photo walks in as themselves; they walk out in immaculate cabin-crew styling, photographed in this exact same moment and place. Think of it as a commute snapshot: a flight attendant on her way to the airport, caught in an everyday spot. Same person, same photo — cabin-crew version.

[SKIN PERFECTION — the #1 rule of this entire work]
- Render the skin PERFECTLY CLEAN, clear, and even — a flawless, uniform complexion across the face, neck, and body, like a premium studio profile photo.
- The ONLY marks allowed anywhere are ones CLEARLY visible in the original photo, kept in their exact original spots. Everything else is clean skin — nothing new appears, ever. If unsure whether something is a mark or just shadow/noise, render clean skin.
- Flawless still means REAL: natural pores and fine skin texture remain visible — never waxy, never 3D-render plastic.

[IDENTITY FLOOR — the strongest rule, never cross]
- This transformation stacks new hair + polished makeup + a uniform, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into any real flight attendant or celebrity.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Do NOT place any props into their hands — no luggage, no carrier handle, no documents; the hands stay exactly as the original. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR: restyle into the signature cabin-crew look — an immaculate, sleek low bun or French-twist updo, not a strand out of place, finished with clean shine; the hairline must blend naturally with the face. If an updo truly does not suit the photo, a flawlessly neat low ponytail is the fallback.
- MAKEUP: polished in-flight service glam — a flawless luminous-matte base, softly defined eyes with a precise fine liner, neatly groomed brows, a healthy touch of blush, and the classic warm coral-red service lip. Immaculate, welcoming, camera-ready — never heavy or cakey.
- WARDROBE: replace the outfit with a tailored flight-attendant uniform — a fitted deep-navy jacket (or vest) over a crisp ivory blouse, with the signature neatly knotted silk neck scarf in a soft solid coral or muted rose tone. Elegant pearl or small stud earrings may be added as styling. Modest, professional cuts only. ★ABSOLUTELY NO airline logos, no wing pins, no name tags, no lettering or emblems anywhere — and the uniform must NOT replicate any real airline's signature design or color set. A generic, elegant, premium cabin-crew look.
- The uniform must fit the person's actual body and pose naturally, with believable tailoring, fabric, and lighting — as if they were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates immaculate professional grace: composed, polished, quietly confident — "she looks like a flight attendant on her way to a flight." Next to the original photo, the transformation must be instant and admiring, while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light the person clean and flattering like a premium profile photo: soft, even illumination on the face; harsh shadows and dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: skin perfectly clean with only original marks? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite the updo and uniform? · hairline natural with the new updo? · same pose, same hands with no props added, same background? · uniform free of logos, wing pins, name tags, and lettering, and not matching any real airline? · does it read "cabin crew" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete cabin-crew styling. High resolution, no text, no watermark, no border — and the skin perfectly clean: nothing on it that the original does not have.`;
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
      "crewglam",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[crewglam] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "crewglam", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[crewglam] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[crewglam] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generateCrewglam(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("crewglam error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("crewglam", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
