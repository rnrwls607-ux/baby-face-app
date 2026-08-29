import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 150; // Pro 추론형 대응 — Fluid Compute 전제 (실측 로그로 확인)
// 2인 라인 Wave 1 — 나노바나나 Pro (2인 CORE 기준 원본 = couple, 공식 수정 시 couple 고치고 재이식)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
// 성별은 사용자 확정값("female"|"male") → 프롬프트 표기(a woman|a man)
const G = (g: string) => (g === "male" ? "a man" : "a woman");
const DUO_PROMPT = (G1: string, G2: string) => `Image 1 shows Person 1. Image 2 shows Person 2. Create ONE single
photorealistic premium "best friends profile snap" showing BOTH people
together in the same photo — a trendy duo pictorial, retouched to
studio-glam standard.
STEP 1 — ROLL CALL: Person 1 is ${G1}. Person 2 is ${G2}. For EACH
person, note their gender, hair color and length, skin tone, facial
features, and whether THEY are wearing glasses. Every rule below applies
to each person individually, based on their OWN source image.
ANTI-CLONE RULE: the two people must NOT look alike. Do NOT blend, mix,
average, or harmonize their faces. Each face is reconstructed ONLY from
its own source image. If the two faces drift toward looking similar,
that is a critical failure.
THE RETOUCH CONTRACT:
- Each person must be recognizable as the same person as their own
  source — friends know each of them instantly.
- BUT this is a professionally RETOUCHED pictorial. You are EXPECTED to
  visibly enhance and slim EACH face, each from its own source.
  CRITICAL: retouch each face from its OWN source only — NEVER mix,
  blend, or average features between the two people.
FACE RETOUCHING — apply to EACH person individually:
1. SMALL FACE: slim each jawline into a soft elegant V-line, each face
   reading about 15% smaller and more compact than its own source.
2. EYES: brighter, livelier, subtly larger-looking for each person.
3. NOSE: subtly slimmer and more refined, per their own source.
4. CONTOURS: softly lifted youthful contours, clean jaw-to-neck lines.
5. HARMONY: each face one natural harmonious whole — expensive
   photoshop, never warped.
SKIN — flawless glass skin on BOTH: poreless, even-toned, luminous with
a dewy glow; all blemishes removed. Marks are one-way: only REMOVED,
never added — no invented moles or spots on either person.
GLASSES RULE per person: if THEY wear glasses in their own source, keep
that exact pair on THEM; if not, add none. Never swap eyewear between
the two. No sunglasses.
BEAUTY DIRECTION — modern Korean, youthful, for EACH: fresh dewy
no-makeup-makeup base, soft natural brows, gentle rosy lips; each
person's hair in THEIR OWN true color and length, styled beautifully.
Both subtly YOUNGER than their sources, never older.
RELIGHT COMPLETELY: discard both source photos' lighting; re-light both
faces with the flattering key light below — both faces equally BRIGHT
and luminous.
THE SCENE — trendy besties snap:
- The two stand close together — shoulder to shoulder, one gently
  leaning on the other, or laughing mid-moment — natural, warm,
  genuinely close.
- Light: flawless beauty lighting on BOTH faces — bright soft key with
  delicate catchlights, gentle fill, clean rim light, both faces
  equally luminous and crisp — while the scene glows with bright airy
  daylight; a joyful, effortless, feed-ready mood.
- Wardrobe: coordinated but not matching — two stylish casual outfits
  in harmonious tones that suit each person. Clean necklines. No logos,
  no lettering.
- Setting: a softly blurred bright studio backdrop or a clean sunlit
  street corner — lived-in textures, never a rendered backdrop. No
  readable text anywhere.
FRAMING — vertical 3:4, both people clearly visible from the waist up,
both faces equally prominent.
FINAL SELF-CHECK:
- Person 1 matches image 1 exactly? Person 2 matches image 2 exactly?
- The two faces clearly DIFFERENT from each other — zero blending?
- Both faces visibly enhanced, bright, and flawless — zero invented
  marks on either?
- Exactly two people, each appearing once?
ABSOLUTELY AVOID:
- Blending or averaging the two faces; any feature borrowed from the
  other person.
- Either person unrecognizable, warped, or aged.
- Any invented mole or mark on either person.
- Extra people, duplicated people, plastic skin, murky lighting.
- Any readable text, signs, or watermarks anywhere.
Output: one photorealistic duo profile snap — both people at the
absolute best of their lives. High resolution, no text, no watermark,
no border.`;
function buildPrompt(g1: string, g2: string): string {
  return DUO_PROMPT(G(g1), G(g2));
}
async function generateProfileduo(image1DataUrl: string, image2DataUrl: string, gender1: string, gender2: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = buildPrompt(gender1, gender2);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 140000);
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
            { inline_data: { mime_type: img1.mimeType, data: img1.data } },
            { inline_data: { mime_type: img2.mimeType, data: img2.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "profileduo",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][profileduo] 140초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 140초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[profileduo] model=${GEMINI_MODEL} g1=${gender1} g2=${gender2} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "profileduo"));
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
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    const gender1: string = typeof body?.gender1 === "string" ? body.gender1 : "female";
    const gender2: string = typeof body?.gender2 === "string" ? body.gender2 : "male";
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateProfileduo(image1, image2, gender1, gender2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("profileduo error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("profileduo", 0, handler); // COIN_DORMANT: 실가격 3
