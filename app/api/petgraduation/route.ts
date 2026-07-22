import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetgraduation(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the input pet photo into an adorable premium graduation portrait — THIS pet on its puppy-kindergarten (or kitten-school) graduation day, photographed like a classic school graduation studio photo. Proud, heartwarming, and irresistibly cute — the photo the family frames and sends to everyone: "our baby graduated!"

PET IDENTITY (absolute):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. The owner must instantly recognize their graduate.
- COAT COLOR LOCK (critical): reproduce the pet's EXACT natural coat color at its real brightness and saturation. The costume, clothing, background, and lighting colors must NEVER bleed into or tint the fur. A gray or blue-gray coat (British Shorthair, Russian Blue, Chartreux, Korat, silver tabby) stays a natural cool GRAY — NEVER turned vivid blue. A cream coat stays cream, white stays white, black stays black, orange stays orange, brown stays brown. Any artistic or painting style may add soft shading, but must NEVER shift the actual hue of the fur away from its real-life color — the fur keeps its true color while the outfit and scene keep theirs.
- Freshly groomed for the big day: clean fluffy healthy coat with natural shine, bright proud eyes, a happy dignified expression natural to this animal — sitting up straight like the star student.

BODY TRUTH (critical):
- The pet keeps its OWN natural animal body, proportions, and posture — sitting proudly upright the way a real animal sits. NEVER a human body with a pet head, never human arms or hands, never standing on two legs.

GRADUATION STYLING (full attire, natural fit, face always clear):
- GOWN: a classic graduation gown in deep navy or black, draped naturally over its chest, back, and shoulders as tailored premium pet-wear — complete and properly worn, comfortable, never distorting the body. A neat V of white collar or a simple stole may show at the chest.
- CAP: a small graduation mortarboard with a golden tassel sits lightly BETWEEN or BEHIND the ears, tilted charmingly back — small enough that both eyes and BOTH ears stay fully visible. If the cap would cover the ears, tilt it further back or perch it smaller. The tassel hangs to one side, never over an eye.
- DIPLOMA: a small rolled blank parchment scroll tied with a red ribbon lies at its front paws (or is gently held under one front paw) — completely BLANK, no writing, no seal with characters.
- If the pet wears its own collar in the source, it may remain beneath the gown. Nothing else — no glasses, no extra props.

THE SCENE — classic graduation studio:
- A warm, timeless graduation studio backdrop: soft neutral tone or a softly blurred stately interior with warm bookshelf-brown hints, gentle depth. Optionally a few soft-blurred celebration touches far in the background (a hint of flowers). Elegant and classic — never cluttered, never party-like.
- The pet is the sole star, filling most of the frame, face large and perfectly lit.

TEXT BAN (critical — diplomas and schools tempt the model):
- Absolutely NO letters or numbers anywhere: nothing written on the diploma, no banners, no certificates on walls, no school crests with characters, no year numbers. Every surface stays plain. If a spot begs for lettering, leave it clean.

LIGHT & FINISH:
- Bright, soft, warm studio portrait lighting — the face glowing, a gentle rim light on the fur and gown, classic graduation-photo warmth.
- Photorealistic premium studio photography: crisp fur and fabric detail, gentle depth of field. NOT a cartoon, NOT an illustration.
- Vertical portrait framing — chest-up emphasis like a real graduation photo, face large and central.

SELF-CHECK before finishing:
- Same pet as the input — markings in the same places, same face? Own animal body, zero human anatomy? Gown COMPLETE and properly worn (not a half-draped cloth)? Cap small, tilted back, both eyes AND both ears fully visible? Diploma blank? Zero letters or numbers anywhere? Warm classic studio look? Only then is the portrait complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or marking placement; a human or humanoid body; two-legged standing.
- A cap covering the ears or eyes; a missing or half-worn gown; only a cap with no gown.
- Any letters, numbers, writing on the diploma, banners, crests with characters, or year numbers.
- Party clutter (balloons, confetti — this is the dignified studio shot, not the party); cheap costume look.
- Cartoon/illustration style; plastic fur; extra or missing paws, ears, tails; watermarks, borders.`;
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
      "petgraduation",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petgraduation] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petgraduation", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petgraduation] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petgraduation] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetgraduation(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petgraduation error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}