import { NextRequest, NextResponse } from "next/server";

// 게스트 신원 — 서버 키(coin·free 등)의 uid로 사용한다.
// 카카오 로그인과 별개이며, 로그인 시 잔액 병합은 IAP 라운드의 C커밋에서 다룬다.
//
// 왜 proxy인가: 발급 지점이 하나여야 이중 발급·누락이 원천 차단된다.
// ★Next 16에서 middleware 규약은 deprecated — proxy.ts로 쓴다(함수명도 proxy).
// getUserId는 동기 함수라 응답에 쿠키를 붙일 수 없고, withCoin은 handler의 Response를
// 그대로 흘리는 구간이 여러 곳이라 부착 지점이 흩어진다.
//
// ★동시 첫 요청 경합(탭 여러 개를 동시에 여는 경우): 각 응답이 서로 다른 ID를 Set-Cookie 하고
//   마지막 응답이 이긴다. 패자 ID로 만들어진 키는 아무도 다시 참조하지 않고 TTL로 자연 소멸한다
//   (free:*는 2일, coin/coinlog는 게스트 잔액이 0이라 생성되지도 않는다).
const COOKIE = "mospic_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  if (request.cookies.get(COOKIE)) return res; // 이미 있으면 통과
  res.cookies.set(COOKIE, "g_" + crypto.randomUUID(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return res;
}

// 페이지 요청에서만 발급한다 — api·_next·정적 파일은 제외.
// (페이지를 한 번이라도 열면 쿠키가 심기고, 이후 api 요청에 자동 동봉된다)
export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
