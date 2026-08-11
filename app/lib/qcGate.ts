// 생성 결과 자동 검수 게이트 — 원본에 없는 점·잡티를 발명했는지 비전으로 대조하고,
// 발명이 확인되면 1회만 다시 만든다. 2026-08-11 증명 3종 파일럿.
//
// ★최우선 원칙(validate-photo에서 계승): 판단이 불가능하면 무조건 통과시킨다.
//   멀쩡한 결과를 검수 오류로 날려 재생성하는 것이 최악이다 — 비용도, 대기 시간도 두 배가 된다.
//   네트워크 실패·타임아웃·JSON 파싱 실패·API 키 없음 → 전부 pass.
//
// ★비용 구조: 검수(flash-lite 1콜)는 싸고 재생성(이미지 1장)은 비싸다.
//   그래서 불합격 판정은 보수적이다 — 발명 1개 이상 AND 모델이 high 확신일 때만.
//
// ★끄는 법: Vercel 환경변수 QC_GATE=off → 코드 롤백 없이 즉시 검수 없음(생성만) 상태로 돌아간다.
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const TIMEOUT_MS = 10000; // 생성이 끝난 뒤라 사용자가 이미 기다리는 중 — 짧게 끊는다

export type QcVerdict = { invented: number; confidence: "high" | "low" };

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const PROMPT = `You are a QA inspector comparing a retouched portrait against its source photo.
Image 1 = SOURCE (the person's original photo).
Image 2 = RESULT (the retouched output).

Your ONLY job: find marks that exist in RESULT but NOT in SOURCE.
A "mark" = mole, beauty mark, freckle, dark spot, or scar on skin.

Rules:
- Makeup, lighting, blush, shadows, pores, and texture are NOT marks.
- A mark that is fainter in RESULT than in SOURCE is fine — that is retouching.
- Only count a mark as invented when you can point to its location in RESULT
  and confirm that area is clean skin in SOURCE.
- Different pose, crop, or angle is expected. Judge the face only.
- When uncertain, do NOT count it.

Return ONLY this JSON (no markdown, no explanation):
{"invented_marks": <int>, "locations": [<string>], "confidence": "high"|"low"}
The response must start with { and end with }.`;

// 원본과 결과를 나란히 보여주고 판정 JSON을 받는다. 실패하면 null(= 판단 불가 → 통과).
export async function inspectInvented(src: string, result: string): Promise<QcVerdict | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!src || !result) return null;

  const a = parseImage(src);
  const b = parseImage(result);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: a.mimeType, data: a.data } },
            { inline_data: { mime_type: b.mimeType, data: b.data } },
          ] }],
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) {
      console.log(`[qc] inspect status=${res.status} ${Date.now() - t0}ms → pass(판단 불가)`);
      return null;
    }

    const data = await res.json();
    const respParts = data?.candidates?.[0]?.content?.parts || [];
    const txt: string = respParts.find((p: { text?: string }) => p.text)?.text || "";
    if (!txt) return null;

    // 코드펜스·인사말이 섞여 와도 첫 { 부터 마지막 } 까지만 잘라 파싱한다(validate-photo와 같은 규약).
    const clean = txt.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(clean.slice(start, end + 1)) as { invented_marks?: unknown; confidence?: unknown };

    // 숫자가 아니면 0으로 본다 — 통과 쪽으로 기운다
    const invented = typeof parsed.invented_marks === "number" && Number.isFinite(parsed.invented_marks)
      ? Math.max(0, Math.round(parsed.invented_marks))
      : 0;
    const confidence = parsed.confidence === "high" ? "high" : "low";
    console.log(`[qc] inspect invented=${invented} ${confidence} ${Date.now() - t0}ms`);
    return { invented, confidence };
  } catch {
    clearTimeout(timer);
    return null; // 네트워크·타임아웃·파싱 실패 — 전부 조용히 통과
  }
}

// 불합격 조건 — 발명이 1개 이상이고 모델이 high 확신일 때만. low 확신은 통과시킨다.
const isFail = (v: QcVerdict) => v.invented >= 1 && v.confidence === "high";

// 생성 1건을 감싼다: 생성 → 검수 → (불합격이면) 재생성 1회 → 더 나은 쪽 반환.
// ★생성 자체의 실패·예외는 종전과 100% 동일하게 그대로 던진다(호출부 계약 무변경).
export async function withQc(
  concept: string,
  sourceDataUrl: string,
  generate: () => Promise<string>
): Promise<string> {
  const first = await generate();

  if (process.env.QC_GATE === "off" || !sourceDataUrl) return first;

  const v1 = await inspectInvented(sourceDataUrl, first);
  if (!v1) {
    console.log(`[qc] concept=${concept} attempt=1 skipped(inspect unavailable) → pass`);
    return first;
  }
  if (!isFail(v1)) {
    console.log(`[qc] concept=${concept} attempt=1 invented=${v1.invented} ${v1.confidence} → pass`);
    return first;
  }

  console.log(`[qc] concept=${concept} attempt=1 invented=${v1.invented} high → regenerate`);
  let second: string;
  try {
    second = await generate();
  } catch (e) {
    // 재생성이 실패하면 1차라도 준다 — 사용자가 빈손이 되는 것이 가장 나쁘다
    console.log(`[qc] concept=${concept} attempt=2 generate failed(${(e as { message?: string })?.message}) → served first`);
    return first;
  }

  const v2 = await inspectInvented(sourceDataUrl, second);
  if (!v2) {
    // 2차 검수 불가 — 1차는 발명이 확인된 판이므로 2차를 준다
    console.log(`[qc] concept=${concept} attempt=2 skipped(inspect unavailable) → served second`);
    return second;
  }
  if (!isFail(v2)) {
    console.log(`[qc] concept=${concept} attempt=2 invented=${v2.invented} ${v2.confidence} → pass`);
    return second;
  }

  // 둘 다 불합격 — 막지 않는다. 발명이 적은 쪽을 준다(동점이면 2차).
  const best = v2.invented <= v1.invented ? second : first;
  const which = v2.invented <= v1.invented ? "second" : "first";
  console.log(`[qc] concept=${concept} attempt=2 invented=${v2.invented} → served best (first=${v1.invented} second=${v2.invented}, chose ${which})`);
  return best;
}
