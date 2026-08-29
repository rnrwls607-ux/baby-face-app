import { NextRequest, NextResponse } from "next/server";
import { signIdentity } from "../../lib/auth";

// ⚠️ 개발(localhost) 전용 임시 로그인.
// 배포(프로덕션)에서는 자동으로 막혀서 절대 작동하지 않음.
// localhost에서 카카오 로그인 없이 클라우드 저장 기능을 테스트하기 위한 용도.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // 실제 카카오 로그인과 동일한 모양의 가짜 사용자 (id 만 있으면 됨)
  const user = {
    id: "dev-test-user",
    nickname: "개발테스트",
    profileImage: null,
    email: null,
  };

  // ★서명 — 로컬에서도 운영과 같은 관문을 쓴다. .env.local에 AUTH_COOKIE_SECRET이
  //   없으면 개발 로그인도 안 된다(운영과 다른 경로를 만들지 않는다).
  const signed = signIdentity(user);
  if (!signed) {
    return NextResponse.json({ error: "AUTH_COOKIE_SECRET 미설정 — .env.local에 32자 이상 넣어주세요" }, { status: 503 });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("kakao_user", signed, {
    httpOnly: true,
    secure: false, // localhost(http) 이므로 false
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
