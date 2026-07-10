import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-lite";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
type ReceiptItem = { name: string; desc: string; score: number };
type ReceiptData = { petType: string; items: ReceiptItem[]; total: number; summary: string };
async function analyzePet(imageDataUrl: string): Promise<ReceiptData> {
  const img = parseImage(imageDataUrl);
  const prompt = `당신은 따뜻하고 재치있는 한국의 반려동물 관상 전문가입니다.
사진 속 반려동물의 얼굴을 보고 재미있고 긍정적인 관상 풀이를 해주세요.

[형식 절대 규칙 — 최우선]
응답은 JSON 객체 하나뿐입니다. 첫 글자는 { 이고 마지막 글자는 } 입니다.
마크다운 코드펜스, 인사말, 설명, 이모지, JSON 밖의 어떤 텍스트도 절대 금지.
모든 키와 문자열은 큰따옴표 사용, 후행 쉼표 금지, 아래 스키마의 키 이름을 정확히 그대로 사용:
{"petType":"강아지/고양이 등 동물 종류(품종이 보이면 품종까지, 예: 강아지(비숑))","items":[{"name":"관상 항목 이름","desc":"한 줄 풀이 (18자 이내)","score":92}],"total":95,"summary":"따뜻하고 귀여운 한 줄 총평 (35자 이내)"}

[개인화 규칙 — 이 아이만의 풀이]
- 사진에서 실제로 보이는 특징을 근거로 항목을 만드세요: 귀 모양, 눈매와 눈빛, 코 색과 크기, 털 색·무늬·복슬함, 수염, 입매·미소, 이마, 표정.
- 아무 반려동물에나 쓸 수 있는 범용 문구는 금지 — desc에 그 특징이 드러나서 주인이 "우리 애 얘기네!" 하고 느끼게.
- 항목 이름은 실제 관상 용어 느낌으로 재치있게 (복코, 재물눈, 장수 귀, 금전수염, 대박 이마, 애교 광대 등).

[내용 규칙]
- items는 정확히 5개. score는 80~100 사이 정수. total은 5개 score의 평균을 반올림한 정수.
- 전부 긍정적이고 사랑스럽게. 부정적 표현, 건강·질병 관련 언급, 진단성 표현 절대 금지 — 이것은 재미를 위한 덕담입니다.
- desc는 18자 이내, summary는 35자 이내. 모든 텍스트는 한국어.

다시 한번 — 출력은 위 스키마의 JSON 객체 하나뿐, 다른 글자는 하나도 없습니다.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(
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
      }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("분석이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petreceipt] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const txt: string = respParts.find((p: { text?: string }) => p.text)?.text || "";
  if (!txt) throw new Error("분석 결과를 받지 못했습니다.");
  const clean = txt.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("분석 결과 형식이 올바르지 않아요. 다시 시도해주세요.");
  let parsed: ReceiptData;
  try {
    parsed = JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw new Error("분석 결과를 읽지 못했어요. 다시 시도해주세요.");
  }
  if (!Array.isArray(parsed?.items) || parsed.items.length === 0) throw new Error("관상 항목을 받지 못했어요. 다시 시도해주세요.");
  return parsed;
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