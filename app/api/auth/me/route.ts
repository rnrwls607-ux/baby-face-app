import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../lib/auth";

// ★서명 검증을 지난 사용자만 로그인으로 본다(2026-08-29 P0-1).
//   예전에는 쿠키를 그대로 JSON.parse해 돌려줬다 — 위조 쿠키로도 화면이
//   "로그인 상태"로 보이던 구멍. 이제 서버 판정과 화면 표시가 같은 관문을 쓴다.
export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ user: null, loggedIn: false });
  return NextResponse.json({ user, loggedIn: true });
}
