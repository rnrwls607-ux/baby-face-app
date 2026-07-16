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
