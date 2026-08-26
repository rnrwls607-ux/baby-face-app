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

// ── 빠른 실패 한정 재시도 (2026-08-26 · digicam 6연속 실패 사건) ──────────────
// 실측: Pro 혼잡 503이 1.9~9.1초에 즉시 돌아온다. 이건 "느린 실패"가 아니라 "빠른 실패"다.
// ★과거 재시도 사고와 구분되는 지점: 그때는 200초 걸린 뒤 오는 실패를 재시도해서
//   두 시도가 230초 예산을 나눠 갖고 재시도 도중 타임아웃으로 죽었다. 그래서 조건을
//   상태코드가 아니라 "시간"으로 못박는다 — 1차가 15초 안에 끝났을 때만 재시도한다.
//   최악 예산: 9(빠른 실패) + 2(대기) + 200(정상 생성) = 211초 < 230초.
const FAST_FAIL_MS = 15000;   // 1차가 이 시간 안에 끝나야 재시도 자격
const FAST_RETRY_WAIT_MS = 2000;
const FAST_RETRY_STATUSES = new Set([429, 503]);  // 500/502/504는 제외 — 혼잡 신호가 아니다

// 엄격 재시도(fastOnly)까지 소진하고도 혼잡(429/503)으로 끝난 응답의 표식.
// Response에 속성을 심지 않고 WeakSet으로 곁에 적는다 — 기존 호출부의 동작·타입에 완전 불가시.
// 용도: 폴백 채택 route(digicam 파일럿 2호)가 "재시도 소진"을 판별하는 유일한 신호다.
// 느린 503(재시도 미발동)과 재시도 소진 503은 경과 시간만으로는 겹쳐서 못 가른다.
const fastRetryExhausted = new WeakSet<Response>();
export const wasFastRetryExhausted = (res: Response): boolean => fastRetryExhausted.has(res);

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
export async function fetchGeminiWithRetry(url: string, init: RequestInit, label = "gemini", retries = 1, fastOnly = false): Promise<Response> {
  if (typeof init.body !== "string") {
    console.warn(`[${label}] retry 불가: init.body가 문자열이 아니라 재사용할 수 없음 — 단일 호출로 진행`);
    return fetch(url, init);
  }
  if (retries < 1) return fetch(url, init); // 단일 호출 — 시간 예산을 첫 시도에 전량 배정

  // ★fastOnly = Pro 생성 계열 전용 엄격 모드. 인자를 넘기지 않는 기존 호출부(flash 110종)는
  //   아래 블록을 타지 않으므로 동작이 1비트도 바뀌지 않는다.
  if (fastOnly) {
    const t0 = Date.now();
    const first = await fetch(url, init);
    const ms = Date.now() - t0;
    if (!FAST_RETRY_STATUSES.has(first.status)) return first;
    const reason = await first.text().then((x) => x.slice(0, 1200)).catch(() => "(본문 읽기 실패)");
    const { tag } = classifyGeminiError(first.status, reason);
    // 쿼터 소진은 2초 뒤에도 그대로다 — 재시도해봐야 같은 429를 한 번 더 받는다.
    if (tag === "QUOTA") {
      console.error(`[QUOTA][${label}] ${first.status} ${ms}ms — 재시도 안 함(한도 소진). 구글 응답: ${reason}`);
      return new Response(reason, { status: first.status, headers: first.headers });
    }
    if (ms >= FAST_FAIL_MS) {
      console.error(`[${tag}][${label}] ${first.status} ${ms}ms — 느린 실패라 재시도 안 함(예산 부족). 구글 응답: ${reason}`);
      return new Response(reason, { status: first.status, headers: first.headers });
    }
    console.warn(`[${tag}][${label}] 빠른 실패 ${first.status} ${ms}ms → ${FAST_RETRY_WAIT_MS}ms 후 1회 재시도. 구글 응답: ${reason}`);
    await sleep(FAST_RETRY_WAIT_MS, init.signal);
    const second = await fetch(url, init);
    if (FAST_RETRY_STATUSES.has(second.status)) fastRetryExhausted.add(second);
    return second;
  }
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

// ── Pro 소프트컷 → flash 자동 폴백 (2026-08-08) ─────────────────────────────
// 왜: Pro 생성이 시간대에 따라 230초 무응답(행)으로 반복 실패 — 사용자에게 실패를
//     노출하지 않기 위해 Pro를 softCutMs에서 끊고 같은 요청을 flash로 넘긴다.
// 시간 예산: [Pro softCutMs] + [flash 24~45초] ≤ 호출부 백스톱(보통 230초).
//     권고 기본값 softCutMs=180000 — Pro 정상 분포(100~200초)의 꼬리만 흘리고
//     flash에 50초를 남긴다. 폴백으로 새는 정상 Pro도 사용자에겐 성공(품질 한 단계).
// 폴백 발동 조건: ①소프트컷(무응답) ②TRANSIENT 상태(429/5xx) ③네트워크 예외.
//     4xx 비일시 오류(AUTH·CLIENT)는 flash로 가도 똑같이 실패하므로 그대로 반환.
// ★기존 fetchGeminiWithRetry는 무접촉 — flash 108종·Pro 27종 기존 호출부 영향 0.
//     이 함수는 채택 route가 명시적으로 갈아탈 때만 쓰인다(1차 파일럿: hanbok 예정).
// 로그 스키마(§조사 확정): [FALLBACK][라벨] reason=… ms → 전환 / engine=pro|flash-fallback.
export type GeminiFallbackResult = { res: Response; engine: "pro" | "flash-fallback" };

export async function fetchGeminiWithFallback(
  proUrl: string,
  init: RequestInit,
  label = "gemini",
  opts: { softCutMs: number; fallbackUrl: string; signal?: AbortSignal | null }
): Promise<GeminiFallbackResult> {
  const outer = opts.signal ?? (init.signal as AbortSignal | null | undefined) ?? null;
  // body가 문자열이 아니면 flash에 재사용할 수 없다 — 폴백 없이 Pro 단일 호출(기존 헬퍼와 같은 방어).
  if (typeof init.body !== "string") {
    console.warn(`[${label}] fallback 불가: init.body가 문자열이 아님 — Pro 단일 호출`);
    return { res: await fetch(proUrl, init), engine: "pro" };
  }

  // ── 1차: Pro 시도 — 자체 컨트롤러 + softCut 타이머, 외부 signal(총예산 백스톱) 연동 ──
  const proCtrl = new AbortController();
  let outerFired = false;
  const onOuterAbort = () => { outerFired = true; proCtrl.abort(); };
  outer?.addEventListener("abort", onOuterAbort, { once: true });
  const softTimer = setTimeout(() => proCtrl.abort(), opts.softCutMs);
  const t0 = Date.now();
  let reason: string;
  try {
    const res = await fetch(proUrl, { ...init, signal: proCtrl.signal });
    if (!TRANSIENT_STATUSES.has(res.status)) {
      return { res, engine: "pro" }; // 성공 — 또는 flash로 가도 똑같이 실패할 4xx는 그대로 반환
    }
    const body = await res.text().then(t => t.slice(0, 1200)).catch(() => "(본문 읽기 실패)");
    const { tag } = classifyGeminiError(res.status, body);
    reason = `pro-${res.status}(${tag})`;
    console.warn(`[FALLBACK][${label}] ${reason} ${Date.now() - t0}ms → flash 전환. 구글 응답: ${body}`);
  } catch (e: unknown) {
    const aborted = (e as { name?: string })?.name === "AbortError";
    if (aborted && outerFired) throw e; // 총예산 소진 — 폴백 여유가 없으니 그대로 전파(호출부 타임아웃 문구)
    reason = aborted ? `pro-softcut-${opts.softCutMs}ms` : `pro-neterr(${(e as Error)?.message || "fetch 실패"})`;
    console.warn(`[FALLBACK][${label}] ${reason} ${Date.now() - t0}ms → flash 전환`);
  } finally {
    clearTimeout(softTimer);
    outer?.removeEventListener("abort", onOuterAbort);
  }

  // ── 2차: flash 폴백 — 잔여 예산은 외부 signal이 관장. 실패 응답도 그대로 반환해
  //         호출부의 기존 에러 처리(geminiFriendlyError)가 이어받는다. ──
  const f0 = Date.now();
  const res = await fetch(opts.fallbackUrl, { ...init, signal: outer ?? undefined });
  console.log(`[FALLBACK][${label}] engine=flash-fallback status=${res.status} ${Date.now() - f0}ms reason=${reason}`);
  return { res, engine: "flash-fallback" };
}
