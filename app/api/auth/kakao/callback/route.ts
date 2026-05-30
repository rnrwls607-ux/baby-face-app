import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("카카오 콜백 에러:", error);
    return NextResponse.redirect(new URL("/?error=kakao_login_failed", request.url));
  }

  try {
    const tokenBody: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_CLIENT_ID!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      code,
    };

    // client_secret이 있으면 추가
    if (process.env.KAKAO_CLIENT_SECRET && process.env.KAKAO_CLIENT_SECRET !== "dummy") {
      tokenBody.client_secret = process.env.KAKAO_CLIENT_SECRET;
    }

    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("토큰 발급 실패:", errorText);
      return NextResponse.redirect(new URL("/?error=token_failed", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!userResponse.ok) {
      console.error("유저 정보 조회 실패");
      return NextResponse.redirect(new URL("/?error=user_info_failed", request.url));
    }

    const userData = await userResponse.json();

    const user = {
      id: String(userData.id),
      nickname: userData.kakao_account?.profile?.nickname || "카카오 사용자",
      profileImage: userData.kakao_account?.profile?.profile_image_url || null,
      email: userData.kakao_account?.email || null,
    };

    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set("kakao_user", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("카카오 로그인 처리 중 오류:", err);
    return NextResponse.redirect(new URL("/?error=server_error", request.url));
  }
}