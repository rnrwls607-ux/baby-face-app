// kakao_user 쿠키 → userId 파싱 공용 유틸.
// 기존 route 11곳의 복붙 getUserId()와 동일 동작 — 신규 코드는 이 파일을 쓴다.
import { NextRequest } from "next/server";

export function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try {
    const user = JSON.parse(cookie.value);
    return user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

// 게스트 포함 신원 — 카카오 로그인이 있으면 그것이 우선이고, 없을 때만 게스트 쿠키를 쓴다.
// ★이 우선순위 덕분에 기존 로그인 사용자의 키·한도·과금 경로가 1비트도 바뀌지 않는다.
// 형식 검증: middleware가 발급하는 "g_" + UUID 형태만 받는다(임의 문자열 주입 차단).
// getUserId는 그대로 둔다 — "카카오 회원인가"를 묻는 판별자로 계속 쓰인다
// (결제·탈퇴·관리자 판정처럼 실명 계정이어야 하는 곳).
const GUEST_RE = /^g_[0-9a-f-]{36}$/;

export function getAnyUserId(request: NextRequest): string | null {
  const kakao = getUserId(request);
  if (kakao) return kakao;
  const g = request.cookies.get("mospic_guest")?.value;
  return g && GUEST_RE.test(g) ? g : null;
}
