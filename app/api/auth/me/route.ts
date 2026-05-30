import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userCookie = request.cookies.get("kakao_user");

  if (!userCookie?.value) {
    return NextResponse.json({ user: null, loggedIn: false });
  }

  try {
    const user = JSON.parse(userCookie.value);
    return NextResponse.json({ user, loggedIn: true });
  } catch {
    return NextResponse.json({ user: null, loggedIn: false });
  }
}