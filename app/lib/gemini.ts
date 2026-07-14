// Gemini 호출 공통 유틸 — 일시 오류 자동 재시도 + 사용자 친화 에러 메시지
//
// - 재시도 대상: 429/500/502/503/504 (구글 쪽 일시 오류)에서만 1회.
//   400대(우리 요청 문제)는 재시도하지 않는다 — 같은 요청은 또 실패한다.
// - 시간 예산: 새 타이머를 만들지 않고 호출부의 AbortController(init.signal)를
//   두 시도가 공유한다. 총 소요 시간 상한이 기존(50/55초)과 동일해
//   Vercel 60초 한도 안에서 구조적으로 안전.
// - init.body는 반드시 문자열(JSON.stringify)이어야 두 번째 fetch에 재사용 가능.
//   스트림이면 재사용이 불가능하므로 재시도 없이 1회만 호출한다(방어).

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

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
export async function fetchGeminiWithRetry(url: string, init: RequestInit, label = "gemini"): Promise<Response> {
  if (typeof init.body !== "string") {
    console.warn(`[${label}] retry 불가: init.body가 문자열이 아니라 재사용할 수 없음 — 단일 호출로 진행`);
    return fetch(url, init);
  }
  const first = await fetch(url, init);
  if (!TRANSIENT_STATUSES.has(first.status)) return first;
  const reason = await first.text().then(t => t.slice(0, 300)).catch(() => "(본문 읽기 실패)");
  console.warn(`[${label}] Gemini 일시 오류 ${first.status} → 1초 후 재시도. 사유: ${reason}`);
  await sleep(1000, init.signal);
  return fetch(url, init);
}

// 실패 응답을 사용자 친화 메시지로 변환. 구글 원문은 서버 로그(console.error)에만 남긴다.
export async function geminiFriendlyError(res: Response, label = "gemini"): Promise<string> {
  const raw = await res.text().catch(() => "(본문 읽기 실패)");
  console.error(`[${label}] Gemini 오류 ${res.status}: ${raw.slice(0, 2000)}`);
  if (TRANSIENT_STATUSES.has(res.status)) return "지금 요청이 많아요. 잠시 후 다시 시도해주세요 🙏";
  return "이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.";
}
