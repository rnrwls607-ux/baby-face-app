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
  const prompt = `당신은 따뜻하고 재치있는 한국의 반려동물 관상 전문가입니다.
사진 속 반려동물의 얼굴을 보고 재미있고 긍정적인 관상 풀이를 해주세요.

[형식 절대 규칙 — 최우선]
응답은 JSON 객체 하나뿐입니다. 첫 글자는 { 이고 마지막 글자는 } 입니다.
마크다운 코드펜스, 인사말, 설명, 이모지, JSON 밖의 어떤 텍스트도 절대 금지.
모든 키와 문자열은 큰따옴표 사용, 후행 쉼표 금지, 아래 스키마의 키 이름을 정확히 그대로:
{"petType":"강아지/고양이 등 동물 종류(품종이 보이면 품종까지, 예: 강아지(비숑))","items":[{"feature":"nose","name":"복코","desc":"복이 모이는 코","score":98}],"total":97,"summary":"따뜻하고 복스러운 한 줄 총평"}

[부위 고정 규칙 — 절대]
- items는 정확히 5개이며, feature 값은 이 순서 그대로: nose, eyes, ears, forehead, cheek
- feature는 반드시 영문 소문자 그대로 쓰세요(nose/eyes/ears/forehead/cheek). 다른 부위를 추가하거나 빠뜨리지 마세요.
- name: 4~6자의 긍정적인 관상 이름 (복코, 보석 눈망울, 장수 귀, 대박 이마, 애교 광대 같은 느낌)
- desc: 10자 내외의 한 줄 풀이
- score: 95~100 사이 정수, 항목마다 다른 값으로
- total: 95~100 사이 정수 (5개 score 평균 근처)
- summary: 25자 이내의 복스럽고 따뜻한 총평 한 줄

[개인화·다양성 규칙]
- 사진에서 실제로 보이는 특징(코 색과 크기, 눈매와 눈빛, 귀 모양, 이마, 볼살, 털 색과 무늬)을 근거로 쓰세요.
- 아무 반려동물에나 쓸 수 있는 범용 문구 금지 — 주인이 "우리 애 얘기네!" 하고 느끼게.
- 매번 다른 표현을 쓰고, 같은 문구를 반복하지 마세요.
- 전부 긍정적이고 사랑스럽게. 부정적 표현, 건강·질병 관련 언급, 진단성 표현 절대 금지 — 이것은 재미를 위한 덕담입니다.

다시 한번 — 출력은 위 스키마의 JSON 객체 하나뿐, 다른 글자는 하나도 없습니다.`;
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