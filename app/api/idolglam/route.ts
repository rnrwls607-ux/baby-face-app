import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
// 두 엔진 모두 내부 컷 230초 · 상한 240으로 동일하다(GPT·Pro 원본 실측) — 단일 값으로 충분.
export const maxDuration = 240;

// 🔑 엔진 2칩: 화보컷 = GPT(과감한 스타일링) / 직캠컷 = Pro(자연광·현장감)
const OPENAI_MODEL = "gpt-image-2";
const GEMINI_MODEL = "gemini-3-pro-image";
const CUT_MS = 230000; // 양 경로 공통 컷

// ★프롬프트는 두 칩이 완전히 동일하다 — 갈리는 것은 엔진뿐이다.
//   그래서 상수 하나를 양 경로가 공유한다(복사 2벌 금지 — 개정 시 여기 한 곳만 고친다).
const IDOL_PROMPT = `You are the head stylist team of Korea's top K-pop entertainment company — hair, makeup, and wardrobe working together on one photo. The person in this photo walks in as themselves; they walk out as a debut-ready idol, photographed in this exact same moment and place. Think of it as a fansign or behind-the-scenes photo: an idol in full stage styling, caught in an everyday spot. Same person, same photo — idol version.

[SKIN TRUTH v3 — the #1 rule of this entire work]
- DEFAULT SKIN IS CLEAR: unless a mole or mark is CLEARLY visible in the original photo, render that area of skin perfectly clear and unmarked. Marks may ONLY be copied from the original — never invented, never added for "beauty," never imagined out of blur, shadow, or noise.
- ZERO new marks: creating even ONE mole, beauty mark, freckle, spot, or scar that does not exist in the original — on the face, neck, or anywhere — is a critical failure that ruins the entire work.
- When in doubt, leave it out: a missing mark is acceptable; an invented mark is not.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- The makeup NEVER adds marks: no painted-on beauty marks, no aesthetic freckles, no "charming" moles, under any circumstance.
- Flawless idol skin still means REAL skin — pores and fine texture remain visible; a wax or 3D-render look is a critical failure.

[IDENTITY FLOOR — the strongest rule, never cross]
- This transformation stacks new hair + bold makeup + new outfit, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into an existing celebrity or any real idol — this is THIS person as an idol, not someone famous.
- Keep the exact pose, body, expression mood, framing, camera angle, and the entire original background. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR: restyle into a trendy, polished K-pop idol hairstyle that flatters this person — cut, styling, and volume may change freely; a tasteful fashionable color (soft brown, ash, or a subtle tint) is allowed. Salon-perfect finish, natural hairline.
- MAKEUP: full idol stage makeup, executed to broadcast standard — flawless luminous base, sculpted-yet-natural dimension, sharply defined eyes with idol-grade shadow and liner, groomed statement brows, and a polished stage-ready lip. Bold and camera-perfect, never cakey.
- WARDROBE: replace the outfit with a stylish stage-ready or idol-profile look that suits them — modern, modest, and tasteful (no revealing cuts), like a music-show outfit or concept-photo styling. Coordinated tasteful accessories (earrings, necklace, ear cuffs) MAY be added as part of the styling. NO real brand logos, NO specific group's signature costume, no lettering anywhere on the clothing.
- The new outfit must fit the person's actual body and pose naturally, with believable fabric, fit, and lighting — as if they were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates idol presence: polished, luminous, magnetic — "wow, they look like they just stepped off a music-show stage." Next to the original bare-faced photo, the transformation must be jaw-dropping, while the face itself says "it's still unmistakably them."
- If the person presents as a man, style them as a boy-group idol instead: sharp trendy idol haircut, flawless stage grooming with subtly defined eyes, and a clean stage-ready outfit — charismatic K-star presence.

[LIGHT POLISH]
- Keep the original scene and background, but light the person like an idol photo: soft, even, flattering key light on the face with a clean premium finish; harsh shadows and dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: zero new moles, freckles, or painted marks anywhere? · every original mole still in place? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite new hair and outfit? · same pose, same background? · outfit modest, logo-free, and not copying any real idol? · does it scream "idol" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete idol styling. High resolution, no text, no watermark, no border — and absolutely zero new moles or marks anywhere: default skin is clear.`;

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

// ── 화보컷 = GPT 경로 (GPT 이미지 편집 route 구조) ──
async function generateViaGpt(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", IDOL_PROMPT);
  form.append("size", "auto"); // ★원본 비율 보존 — 모델이 입력 비율에 맞춰 선택
  form.append("quality", "medium");
  form.append("n", "1");
  const bytes = new Uint8Array(Buffer.from(img.data, "base64"));
  form.append("image[]", new Blob([bytes], { type: img.mimeType }), "photo.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CUT_MS);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: form,
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[idolglam:pictorial] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[idolglam:pictorial] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

// ── 직캠컷 = Pro 경로 (Pro 단일입력 route 구조) ──
async function generateViaPro(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CUT_MS);
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
            { text: IDOL_PROMPT },
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "idolglam:fancam",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[idolglam:fancam] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "idolglam:fancam", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[idolglam:fancam] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[idolglam:fancam] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    // 칩 값은 클라가 body.style로 보낸다 — "fancam"이 아니면 전부 화보컷(미지정·이상값 폴백)
    const style: string = body?.style === "fancam" ? "fancam" : "pictorial";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    // 키 가드는 실제로 타는 경로에만 건다 — 직캠컷은 OPENAI_API_KEY가 없어도 동작해야 한다
    if (style === "pictorial" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const output = style === "fancam" ? await generateViaPro(image) : await generateViaGpt(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("idolglam error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("idolglam", 0, handler); // coinCost 3 — concepts.ts 기준(전종 라이브)
