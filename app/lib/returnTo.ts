// 충전 후 "이어서 만들기" 복귀 경로 — 402 시트로 막힌 사용자를 원래 컨셉으로 돌려보낸다.
//
// ★왜 localStorage인가 (sessionStorage 아님):
//   Toss 결제는 같은 탭 리다이렉트지만 mospic.com → pay.toss.im → mospic.com 으로
//   오리진을 넘나든다. sessionStorage는 오리진별 격리인 데다, 안드로이드 웹뷰·카카오
//   인앱 브라우저가 중간에 새 컨텍스트를 열면 세션이 통째로 갈려 빈 값으로 돌아온다.
//   localStorage는 같은 오리진(mospic.com)에서 그 체인 전체를 살아남는다.
//
// ★대신 오래 남는 부작용을 세 겹으로 막는다: TTL 30분 · 내부 경로만 허용 · 1회성 소비.
const KEY = "mospic_return_to";
const TTL_MS = 30 * 60 * 1000;

type Saved = { path: string; at: number };

// 내부 경로만 허용 — "//evil.com"(프로토콜 상대)·"https://…"·"javascript:" 전부 거부한다.
function isInternalPath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes(":");
}

// 402 시트에서 결제로 넘어가기 직전에 부른다. 지갑 탭 충전은 부르지 않는다
// (지갑에서 온 사람의 볼일은 잔액 확인이라 지갑 복귀가 자연스럽다).
export function saveReturnTo(path: string): void {
  try {
    if (typeof window === "undefined" || !isInternalPath(path)) return;
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() } satisfies Saved));
  } catch {
    /* 시크릿 모드 등 — 복귀만 포기한다 */
  }
}

// 결제 성공 화면에서 1회 읽고 즉시 삭제한다. 뒤로가기로 되돌아와도 두 번 발동하지 않는다.
export function consumeReturnTo(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY); // ★읽는 순간 소비 — 실패 경로에서도 남기지 않는다
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!isInternalPath(saved?.path)) return null;
    if (typeof saved.at !== "number" || Date.now() - saved.at > TTL_MS) return null;
    return saved.path;
  } catch {
    return null;
  }
}
