import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const kakaoAuthUrl = "https://kauth.kakao.com/oauth/authorize";

  // ★env가 없으면 카카오로 내보내지 않는다(잠기는 방향). `!` 단정으로 두면 undefined가
  //   그대로 나가 카카오가 KOE006으로 거부하고, 사용자는 이유 없는 실패만 본다.
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    console.error(`[auth] env missing — KAKAO_CLIENT_ID=${!!clientId} KAKAO_REDIRECT_URI=${!!redirectUri}`);
    return NextResponse.redirect(new URL("/?error=auth_not_configured", request.url));
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  return NextResponse.redirect(`${kakaoAuthUrl}?${params.toString()}`);
}