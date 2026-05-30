import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000")
  );

  // 카카오 유저 쿠키 삭제
  response.cookies.set("kakao_user", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // 즉시 만료
    path: "/",
  });

  return response;
}