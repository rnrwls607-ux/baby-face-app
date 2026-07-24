import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // 2단 Pro 포스터 생성 대응 — Fluid Compute 전제
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // 1단 — 관상 텍스트(JSON)
const POSTER_MODEL = "gemini-3-pro-image"; // 2단 — 포스터 이미지
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
// feature는 렌더가 콜아웃 위치를 잡는 키 — 5부위 고정(순서도 고정)
type ReceiptItem = { feature: string; name: string; desc: string; score: number };
type ReceiptData = { petType: string; items: ReceiptItem[]; total: number; summary: string };
const FEATURES = ["nose", "eyes", "ears", "forehead", "cheek"] as const;
// 생성물이 형식을 벗어났을 때의 안전 폴백 — 앱이 죽지 않게 (내용은 무난한 덕담)
const FALLBACK: ReceiptData = {
  petType: "반려동물",
  items: [
    { feature: "nose", name: "복코", desc: "복이 모이는 코", score: 98 },
    { feature: "eyes", name: "보석 눈망울", desc: "사랑받는 눈빛", score: 99 },
    { feature: "ears", name: "장수 귀", desc: "귀 복이 넉넉해요", score: 97 },
    { feature: "forehead", name: "대박 이마", desc: "앞날이 훤해요", score: 96 },
    { feature: "cheek", name: "애교 광대", desc: "웃음이 떠나지 않아요", score: 98 },
  ],
  total: 97,
  summary: "사랑복이 가득한 귀한 관상이에요",
};
// 5부위 정렬·결측 보충·점수 범위 보정 (렌더가 항상 5칸을 채울 수 있게)
function normalize(p: Partial<ReceiptData> | null): ReceiptData {
  const src = Array.isArray(p?.items) ? p!.items : [];
  const clamp = (n: unknown, d: number) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) && v >= 95 && v <= 100 ? v : d;
  };
  const items = FEATURES.map((f, i) => {
    const hit = src.find(it => it?.feature === f) || src[i];
    const fb = FALLBACK.items[i];
    return {
      feature: f,
      name: String(hit?.name || fb.name).slice(0, 8),
      desc: String(hit?.desc || fb.desc).slice(0, 16),
      score: clamp(hit?.score, fb.score),
    };
  });
  const avg = Math.round(items.reduce((n, it) => n + it.score, 0) / items.length);
  return {
    petType: String(p?.petType || FALLBACK.petType).slice(0, 20),
    items,
    total: clamp(p?.total, avg),
    summary: String(p?.summary || FALLBACK.summary).slice(0, 30),
  };
}
async function analyzePet(imageDataUrl: string): Promise<ReceiptData> {
  const img = parseImage(imageDataUrl);
  const prompt = `당신은 재치있고 따뜻한 한국의 반려동물 관상가입니다. 사진 속 반려동물의 얼굴을 보고, 재미있고 복스러운 관상 풀이를 만들어주세요.

정확히 다섯 부위를 이 순서로 봅니다: 코(nose) → 눈(eyes) → 귀(ears) → 이마(forehead) → 광대(cheek).

각 부위마다:
- name: 4~6자의 귀엽고 긍정적인 관상 이름. ★매번 다르게, 창의적으로 지어주세요. 아래는 참고 예시일 뿐이니 그대로 쓰지 말고 변형·응용하세요:
  · 코: 복코 / 재물코 / 황금코 / 촉촉복코 / 만복코 / 윤기코
  · 눈: 초롱눈망울 / 보석눈 / 호수눈망울 / 총명한눈 / 반짝눈빛 / 애교눈
  · 귀: 쫑긋복귀 / 장수귀 / 만복귀 / 행운귀 / 복스런귀 / 지혜귀
  · 이마: 훤한이마 / 대박이마 / 복덩이마 / 광채이마 / 앞길이마 / 명당이마
  · 광대: 보름달볼 / 애교광대 / 복볼 / 사랑볼 / 통통복볼 / 재롱광대
- desc: 그 부위에 어울리는 한 줄 풀이, 10자 내외. ★긍정적이고 재치있게, 매번 새로운 표현으로.
- score: 95~100 사이 정수. ★부위마다 다른 점수로 다양하게 흩뿌려주세요 — 다섯 부위가 비슷한 숫자로 몰리지 않게, 95·97·100·96·99 처럼 골고루. 매 호출마다 조합이 달라지게.

전체:
- total: 95~100 사이 정수. 다섯 부위 점수 평균 근처지만 매번 조금씩 다르게.
- summary: 25자 이내의 복스럽고 따뜻한 총평. ★매번 다른 문장으로, 사진 속 아이의 느낌을 살려서.

규칙:
- 모든 내용은 긍정적·귀엽고 복스러운 한국어. 건강 문제나 부정적 표현은 절대 금지.
- ★가장 중요: 매 호출마다 이름·풀이·총평을 다르게 생성하세요. 이전과 같은 문구를 반복하지 말고, 위 예시를 그대로 베끼지 말고, 이 아이만의 개성있는 관상을 새로 지어주세요.

마크다운·코드펜스·설명 없이 아래 JSON 형식으로만 답하세요:
{"petType":"강아지 또는 고양이","items":[{"feature":"nose","name":"...","desc":"...","score":97},{"feature":"eyes","name":"...","desc":"...","score":96},{"feature":"ears","name":"...","desc":"...","score":100},{"feature":"forehead","name":"...","desc":"...","score":95},{"feature":"cheek","name":"...","desc":"...","score":99}],"total":97,"summary":"...`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
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
        }),
        signal: ctrl.signal,
      },
      "petreceipt"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("분석이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petreceipt] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petreceipt"));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const txt: string = respParts.find((p: { text?: string }) => p.text)?.text || "";
  // 이 아래는 전부 폴백 경로 — 형식이 어긋나도 앱이 죽지 않고 안전한 기본 세트로 나간다
  const clean = txt.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) return FALLBACK;
  try {
    return normalize(JSON.parse(clean.slice(start, end + 1)));
  } catch {
    return FALLBACK;
  }
}
// ═══ 2단 — 관상 포스터 이미지(Pro). 1단 결과를 {{ }} 자리에 문자열로 주입한다.
const POSTER_PROMPT = `TASK
You are creating ONE vertical "pet face reading" (관상) analysis poster from the input pet photo. The pet's ID-style portrait sits in the center, and thin elegant callout lines point from specific facial features to short Korean label chips arranged around it. A premium, playful, clean Korean infographic.

PET IDENTITY (absolute):
- The pet in the poster is the EXACT pet from the input photo: same species, breed, coat color, markings in the same places, ear shape, eye color, face. The owner must instantly recognize their pet.
- COAT COLOR LOCK: reproduce the pet's exact real coat color — a gray cat stays cool gray (never blue), white stays white, orange stays orange. The background must not tint the fur.
- Render the pet as a clean ID-photo-style portrait: facing camera, head and upper chest, freshly groomed, bright eyes, on a soft solid pale-blue studio background, inside a rounded-rectangle frame at the poster's center. If the input shows a medical cone or collar, omit it and show the pet's face clean and clear.

POSTER LAYOUT (follow exactly):
- Vertical poster, soft warm ivory background (#F8F2E6), generous margins, premium minimal Korean design.
- TOP: title 「우리 애 관상 보고서」 in bold clean modern Korean typography, dark ink color. Directly below, a smaller subtitle 「AI 관상 분석」 in gray.
- CENTER: the pet ID portrait in its rounded frame (about 45% of poster width), soft shadow.
- AROUND the portrait: exactly FIVE callouts, one per feature. Each callout = a thin elegant gold line starting AT that exact facial feature on the pet, ending at a small rounded chip with Korean text: a bold feature name and a smaller reading below:
  1. NOSE (코) → 「{{nose_name}}」 / 「{{nose_desc}}」
  2. EYES (눈) → 「{{eyes_name}}」 / 「{{eyes_desc}}」
  3. EARS (귀) → 「{{ears_name}}」 / 「{{ears_desc}}」
  4. FOREHEAD (이마) → 「{{forehead_name}}」 / 「{{forehead_desc}}」
  5. CHEEK (광대) → 「{{cheek_name}}」 / 「{{cheek_desc}}」
- ONE-TO-ONE LAW: exactly ONE callout per feature — nose, eyes, ears, forehead, cheek. FIVE callouts and FIVE chips, no more, no less. Never two on one feature, never repeat a chip, never add unlisted callouts (no neck, mouth, chin, body, paws).
- Place chips in the empty side margins (2-3 left, 2-3 right), with clear space so NO chip or text overlaps the pet portrait. Lines start at the correct feature, stay thin and non-crossing, never cover the face. Every chip fully inside the poster with clear margin — no text touching the photo or the poster edge.
- BOTTOM: one wide rounded band with 「총점 {{score}}점 · {{summary}}」 in bold.

EXACT TEXT LAW (critical):
- Render ONLY the Korean strings written above, EXACTLY character for character. Do not invent, add, translate, or alter ANY text. No hanja, no English, no numbers except {{score}}.
- Every Korean character perfectly formed, correctly spelled, crisply legible in clean modern sans-serif. No melted, garbled, mirrored, broken, or invented characters. Nothing cut off by the photo or edge.
- If any area would need text not listed, leave it clean empty design.

STYLE:
- Premium minimal Korean design: soft ivory ground, ink-dark text, warm gold accent for lines and chip borders, gentle pink accent sparingly. Cute but classy. Everything flat graphic design EXCEPT the pet portrait, which stays fully photographic and realistic.

SELF-CHECK: exactly 5 callouts one each on nose/eyes/ears/forehead/cheek? No duplicated or cut-off text? Every Hangul perfect? Pet unmistakably the input pet, true coat color, face clear (no cone)? Only then complete.

ABSOLUTELY AVOID:
- More/fewer than five callouts; two on one feature; repeated text; callouts on neck/mouth/chin/paws/body.
- Any garbled, misspelled, melted, cut-off, or invented text; text not specified; hanja or random English.
- A different pet; changed breed/color/markings; a cartoon/illustrated pet (portrait stays photographic); keeping a medical cone.
- Lines to wrong features; crossing lines; chips or text overlapping the face or edge; cluttered layout; watermarks, borders.`;
function buildPoster(d: ReceiptData): string {
  const map: Record<string, string> = { score: String(d.total), summary: d.summary };
  for (const it of d.items) { map[`${it.feature}_name`] = it.name; map[`${it.feature}_desc`] = it.desc; }
  return POSTER_PROMPT.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => map[k] ?? "");
}
async function generatePoster(imageDataUrl: string, d: ReceiptData): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = buildPoster(d);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${POSTER_MODEL}:generateContent`,
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
      "petreceipt-poster",
      0 // ★재시도 없음 — Pro 생성은 1회가 길어 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petreceipt-poster] model=${POSTER_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petreceipt-poster", "포스터를 만들지 못했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const cand = data?.candidates?.[0];
  console.log(`[petreceipt-poster] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length}`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petreceipt-poster] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error("포스터를 만들지 못했어요. 다른 사진으로 다시 시도해주세요.");
  }
  // ★크롭 없음 — 모델이 세로 포스터로 그리므로 비율을 그대로 보존한다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const result = await analyzePet(image); // 1단 — 관상 텍스트
    const output = await generatePoster(image, result); // 2단 — 포스터 이미지
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petreceipt error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("petreceipt", 0, handler); // COIN_DORMANT: 실가격 3
