import { NextRequest, NextResponse } from "next/server";
import { ensureWelcome, WELCOME_COINS } from "../../../../lib/coins";
import { signIdentity } from "../../../../lib/auth";

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

    // 웰컴 코인 — 로그인 즉시 지급. 첫 지급일 때만 ?welcome=N을 달아 홈이 모달을 띄운다.
    // ★uid는 쿠키에 넣는 user.id와 같은 문자열이라(둘 다 String(userData.id)),
    //   나중에 getUserId()가 만드는 uid와 welcome:{uid} 키가 정확히 일치한다.
    // ★지급 실패가 로그인을 막으면 안 된다 — 삼켜서 로그인만은 성사시킨다
    //   (다음 /api/coins·유료 생성 때 ensureWelcome이 다시 시도한다).
    let welcomed = false;
    try {
      welcomed = await ensureWelcome(user.id);
    } catch (e) {
      console.error("[kakao] 웰컴 코인 지급 실패(로그인은 계속):", (e as { message?: string })?.message);
    }

    // ★서명 — AUTH_COOKIE_SECRET이 없으면 로그인을 성립시키지 않는다(잠기는 방향).
    //   무서명 쿠키를 구워봐야 getUserId가 거부하므로, 굽지 않고 사유를 알리는 편이 정직하다.
    const signed = signIdentity(user);
    if (!signed) {
      console.error("[auth] bake_aborted — AUTH_COOKIE_SECRET 미설정/미달로 쿠키를 굽지 못함");
      return NextResponse.redirect(new URL("/?error=auth_not_configured", request.url));
    }

    const dest = new URL("/", request.url);
    if (welcomed) dest.searchParams.set("welcome", String(WELCOME_COINS));
    const response = NextResponse.redirect(dest);

    // 🩺 진단(2026-08-29) — 쿠키가 실제로 서명돼 구워졌는지. uid만 찍는다(서명·payload 금지).
    console.log(`[auth] baked uid=${user.id} welcomed=${welcomed}`);

    response.cookies.set("kakao_user", signed, {
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