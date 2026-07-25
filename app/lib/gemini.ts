// Gemini 호출 공통 유틸 — 일시 오류 자동 재시도 + 사용자 친화 에러 메시지
//
// - 재시도 대상: 429/500/502/503/504 (구글 쪽 일시 오류)에서만 1회.
//   400대(우리 요청 문제)는 재시도하지 않는다 — 같은 요청은 또 실패한다.
// - 시간 예산: 새 타이머를 만들지 않고 호출부의 AbortController(init.signal)를
//   두 시도가 공유한다. 총 소요 시간 상한이 기존(50/55초)과 동일해
//   Vercel 60초 한도 안에서 구조적으로 안전.
// - ★retries: 이 예산 공유는 flash(1회 수십 초) 기준 설계다. Pro 생성 계열처럼
//   1회에 100~200초 걸리는 route는 두 시도가 예산을 나눠 쓰면 재시도 도중
//   타임아웃으로 죽는다 → 그런 route는 retries=0으로 단일 호출(첫 시도에 전량 배정).
//   기본값 1이라 인자를 넘기지 않는 기존 호출부는 동작이 그대로다.
// - init.body는 반드시 문자열(JSON.stringify)이어야 두 번째 fetch에 재사용 가능.
//   스트림이면 재사용이 불가능하므로 재시도 없이 1회만 호출한다(방어).

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

// ── 오류 원인 구분 (2026-07-25) ──────────────────────────────────────────────
// 왜: 429(쿼터 소진)와 503(진짜 혼잡)이 같은 "요청이 많아요" 문구로 뭉뚱그려져
//     원인 파악에 매번 몇 시간씩 걸렸다. 상태코드+구글 body 키워드로 4갈래로 나누고
//     로그에 검색 가능한 태그를 붙인다. 운영자는 로그에서 [QUOTA] 하나만 찾으면 판별 끝.
// 쿼터/과금 소진 신호 — 구글이 body에 담아 보내는 문자열들
const QUOTA_HINTS = [
  "RESOURCE_EXHAUSTED",
  "quota",
  "Quota",
  "QUOTA",
  "billing",
  "Billing",
  "BILLING",
  "rate limit",
  "Rate limit",
  "rateLimitExceeded",
  "exceeded your current quota",
  "free tier",
  "FreeTier",
];

export type GeminiErrorTag = "QUOTA" | "TRANSIENT" | "AUTH" | "CLIENT" | "SERVER";

// 상태코드 + 구글 원문 → { tag, userMsg }
// ★userMsg는 사용자 잘못이 아님을 전제로 한 중립 문구. 원인 노출·전문 용어 금지.
export function classifyGeminiError(status: number, body: string): { tag: GeminiErrorTag; userMsg: string } {
  const quotaish = QUOTA_HINTS.some(h => body.includes(h));
  // 429 + 쿼터/과금 신호 = 우리 쪽 한도 소진. "이용자가 많아서"가 아니므로 문구를 분리한다.
  if (status === 429 && quotaish) {
    return { tag: "QUOTA", userMsg: "지금은 생성이 어려워요. 잠시 후 다시 시도해주세요 🙏" };
  }
  if (status === 401 || status === 403) {
    return { tag: "AUTH", userMsg: "지금은 생성이 어려워요. 잠시 후 다시 시도해주세요 🙏" };
  }
  if (TRANSIENT_STATUSES.has(status)) {
    return { tag: "TRANSIENT", userMsg: "지금 요청이 많아요. 잠시 후 다시 시도해주세요 🙏" };
  }
  if (status >= 400 && status < 500) {
    return { tag: "CLIENT", userMsg: "" }; // 빈 문자열 = 호출부 failMsg(기존 문구) 사용
  }
  return { tag: "SERVER", userMsg: "" };
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); },
      { once: true }
    );
  });
}

// Gemini fetch + 일시 오류 1회 자동 재시도.
export async function fetchGeminiWithRetry(url: string, init: RequestInit, label = "gemini", retries = 1): Promise<Response> {
  if (typeof init.body !== "string") {
    console.warn(`[${label}] retry 불가: init.body가 문자열이 아니라 재사용할 수 없음 — 단일 호출로 진행`);
    return fetch(url, init);
  }
  if (retries < 1) return fetch(url, init); // 단일 호출 — 시간 예산을 첫 시도에 전량 배정
  const first = await fetch(url, init);
  if (!TRANSIENT_STATUSES.has(first.status)) return first;
  // ★재시도 흐름·타이밍은 그대로. 로그만 태그 + 원문 1200자로 확장(원인 판별용).
  const reason = await first.text().then(t => t.slice(0, 1200)).catch(() => "(본문 읽기 실패)");
  const { tag } = classifyGeminiError(first.status, reason);
  console.warn(`[${tag}][${label}] Gemini 1차 실패 ${first.status} → 1초 후 재시도. 구글 응답: ${reason}`);
  await sleep(1000, init.signal);
  return fetch(url, init);
}

// 실패 응답을 사용자 친화 메시지로 변환. 구글 원문은 서버 로그(console.error)에만 남긴다.
// failMsg: 일시 오류가 아닌 실패에 쓸 문구를 route가 지정할 수 있다(미지정 시 기존 문구 그대로).
export async function geminiFriendlyError(res: Response, label = "gemini", failMsg?: string): Promise<string> {
  const raw = await res.text().catch(() => "(본문 읽기 실패)");
  const { tag, userMsg } = classifyGeminiError(res.status, raw);
  // ★로그 형식: [태그][컨셉] 상태 + 구글 원문 2000자. 운영자는 [QUOTA] 검색 한 번으로 판별.
  console.error(`[${tag}][${label}] Gemini 오류 ${res.status}: ${raw.slice(0, 2000)}`);
  if (userMsg) return userMsg;
  return failMsg || "이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.";
}
