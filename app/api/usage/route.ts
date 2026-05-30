import { NextRequest, NextResponse } from "next/server";

const FREE_LIMIT = 3;

export async function GET(request: NextRequest) {
  const usageCookie = request.cookies.get("usage_count");
  const count = usageCookie ? parseInt(usageCookie.value) : 0;
  
  return NextResponse.json({
    count,
    remaining: Math.max(0, FREE_LIMIT - count),
    limitReached: count >= FREE_LIMIT,
    freeLimit: FREE_LIMIT,
  });
}

export async function POST(request: NextRequest) {
  const usageCookie = request.cookies.get("usage_count");
  const currentCount = usageCookie ? parseInt(usageCookie.value) : 0;
  const newCount = currentCount + 1;

  const response = NextResponse.json({
    count: newCount,
    remaining: Math.max(0, FREE_LIMIT - newCount),
    limitReached: newCount >= FREE_LIMIT,
    freeLimit: FREE_LIMIT,
  });

  response.cookies.set("usage_count", String(newCount), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
  });

  return response;
}