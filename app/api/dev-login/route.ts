import { NextRequest, NextResponse } from "next/server";

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

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("kakao_user", JSON.stringify(user), {
    httpOnly: true,
    secure: false, // localhost(http) 이므로 false
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
