import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-lite";
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const result = await analyzePet(image);
    return NextResponse.json({ result });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petreceipt error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}