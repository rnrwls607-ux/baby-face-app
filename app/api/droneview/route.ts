import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 드론뷰 여행샷 — person:pro (cheerglam 템플릿 복제, new-concept.mjs 생성)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateDroneview(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `Transform this ground-level travel photo into a stunning LOW-ALTITUDE DRONE SHOT of the same person at the same landmark — the viral travel-influencer drone photo style: the drone hovers just 4 to 7 meters up (about second-floor height, just above a raised selfie stick), tilted down at a 30–45 degree angle, so the person is the clear HERO of the frame with the landmark and scenery sweeping away behind and below them.

THE HERO FRAMING (most important — this is the whole point):
- The person fills about ONE THIRD to ONE HALF of the frame's height — full body visible, standing proud, clearly the main subject. NOT a tiny distant figure.
- Their face is clearly visible and readable: looking UP toward the drone with a bright natural smile, or glancing back over their shoulder mid-walk — the confident, effortless travel-influencer moment.
- Behind and below them, the plaza and the landmark stretch away in dramatic high-angle perspective — the tilted-down view creating that signature "the world at my feet" drone feel.
- CAMERA GEOMETRY (non-negotiable): because the camera looks DOWN at 30–45 degrees, the horizon sits in the TOP quarter of the frame or is cut off entirely, and the ground plane fills at least the BOTTOM HALF — the person's feet, their long shadow, and the paving around them are all fully visible from above. If the horizon sits mid-frame or the shot could have been taken by someone standing on the ground, the angle is WRONG — redo it from above.

IDENTITY & BEAUTY (the face is visible now, so it must look great):
- Keep the SAME person, instantly recognizable: same facial features and impression, same hair color and length, same outfit with the same colors and pieces. Friends must say "that's them" at a glance.
- Light premium retouch: a subtly slimmer, refined face, bright sparkling eyes, flawless even glowing skin — clearly their best self, never a different person, never warped.
- If they wear glasses, keep the exact same glasses; if not, add none. No sunglasses.

REAL-WORLD SCALE:
- Everything keeps true scale relative to the person: trees taller than them, the landmark towering far above, paving stones and benches person-sized. The drama comes from the angle, not from shrinking or enlarging anyone.

THE SCENE:
- Keep the SAME landmark from the input photo, rising behind/above the person in bold high-angle perspective, with the plaza, walkways, and greenery spreading out around them.
- Golden-hour light: warm low sun, the person's long dramatic shadow stretching across the ground — glowing, cinematic, feed-ready color.
- The space right around the person is clear; any other people are distant and incidental. Exactly ONE person as the subject.

DRONE-PHOTO REALISM:
- This is the photo TAKEN BY the drone — the drone itself is NEVER in the frame. No aircraft, no propellers, no camera rig, no shadow of a drone anywhere.
- A genuine drone camera look: crisp wide-angle clarity with mild, natural wide-lens perspective (no fisheye warp on the person), rich realistic color, gentle atmospheric depth toward the horizon.
- A real aerial photograph — NOT a 3D render, NOT tilt-shift miniature, NOT an illustration.

ABSOLUTELY AVOID:
- Any drone, aircraft, or flying camera visible in the image.
- A ground-level or eye-level camera angle; a horizon in the middle of the frame; the person's feet or shadow cut off at the bottom.
- The person tiny or unrecognizable in the frame — this is a hero shot, not a landscape.
- A straight-down top-view (bird's-eye) — the angle is tilted, 30–45 degrees.
- Changing the person's outfit, hair, or identity; warping the face.
- Any readable text on signs, streets, or anywhere.
- Distorted or melted architecture; cartoon or CGI look.

FINAL SELF-CHECK before output:
- Is the camera clearly ABOVE the person, looking down — ground filling the lower half, horizon high or gone?
- Is the person 1/3 to 1/2 of the frame height with the face readable?
- Is there ANY drone or aircraft visible? (must be none)
- Same outfit, hair, and face as the input?

Output: one photorealistic low-altitude drone travel photo — the person as the glowing hero of a sweeping scene. High resolution, no text, no watermark, no border.
`;
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
      "droneview",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][droneview] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[droneview] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "droneview", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[droneview] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[droneview] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generateDroneview(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("droneview error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("droneview", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
