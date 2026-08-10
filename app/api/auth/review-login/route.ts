import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

// 앱 심사(Google Play / App Store)용 데모 로그인 통로.
// 심사원은 한국 카카오 계정이 없어 카카오 로그인을 통과할 수 없다. 설정 탭의
// 숨김 제스처로 코드를 넣으면 카카오를 거치지 않고 동일한 세션 쿠키를 받는다.
//
// ★기능 자체가 env 게이트다 — REVIEW_LOGIN_TOKEN이 없으면 404를 돌려
//   "라우트가 아예 없는 것"처럼 행동한다(안전 기본값). 심사가 끝나면 Vercel에서
//   env만 지우면 통로가 닫힌다 — 코드 롤백·재배포 없이도 즉시 OFF.
// ★토큰 값은 코드·로그 어디에도 없다. process.env로만 읽고, 비교는 sha256
//   다이제스트끼리 timingSafeEqual — 길이도 내용도 응답 시간으로 새지 않는다.
//
// ★신원 "review9001": 게스트 접두("g_")가 아니라서 getUserId/getAnyUserId가
//   정상 회원으로 읽고, ensureWelcome의 게스트 차단에도 걸리지 않는다 →
//   첫 /api/coins 호출 때 웰컴 3코인이 정상 지급되어 심사원이 유료 컨셉을
//   실제로 돌려볼 수 있다(의도된 무해). 반대로 chargeAllowed()는 이 id가
//   COIN_ADMIN_IDS에 없는 한 false라 충전(결제) 버튼은 열리지 않는다.

// 무차별 대입 방어 — 이보다 짧은 토큰은 설정돼 있어도 기능을 켜지 않는다.
const MIN_TOKEN_LEN = 16;

// ★카카오 콜백이 굽는 user 객체와 키 구성이 1:1로 같다
//   (app/api/auth/kakao/callback/route.ts: id · nickname · profileImage · email).
//   /api/auth/me가 이 쿠키를 그대로 JSON.parse해 돌려주므로 홈의 KakaoUser 타입과도 맞는다.
const REVIEW_USER = {
  id: "review9001",
  nickname: "Reviewer",
  profileImage: null,
  email: null,
};

const sha256 = (s: string) => createHash("sha256").update(s).digest();

export async function POST(request: NextRequest) {
  const token = process.env.REVIEW_LOGIN_TOKEN;
  if (!token || token.length < MIN_TOKEN_LEN) {
    // 값은 절대 찍지 않는다 — 길이 미달 사실만 알린다.
    if (token) console.warn(`[review-login] 토큰이 너무 짧아 기능 OFF (최소 ${MIN_TOKEN_LEN}자)`);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string") code = body.code.trim();
  } catch {
    // 빈 본문·비 JSON → 아래 불일치로 떨어진다
  }

  if (!code || !timingSafeEqual(sha256(code), sha256(token))) {
    console.warn("[review-login] 코드 불일치");
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: REVIEW_USER });

  // ★쿠키 옵션도 카카오 콜백과 완전히 동일하다 —
  //   이름 kakao_user · JSON 문자열 · httpOnly · secure(운영만) · sameSite lax · 7일 · path "/".
  response.cookies.set("kakao_user", JSON.stringify(REVIEW_USER), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  console.log("[review-login] 심사용 세션 발급 — uid=review9001");
  return response;
}
