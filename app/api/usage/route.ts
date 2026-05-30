import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const FREE_LIMIT = 3;

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try {
    const user = JSON.parse(cookie.value);
    return user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({
      count: 0,
      remaining: FREE_LIMIT,
      limitReached: false,
      freeLimit: FREE_LIMIT,
    });
  }

  const count = (await redis.get<number>("usage:" + userId)) ?? 0;

  return NextResponse.json({
    count,
    remaining: Math.max(0, FREE_LIMIT - count),
    limitReached: count >= FREE_LIMIT,
    freeLimit: FREE_LIMIT,
  });
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const current = (await redis.get<number>("usage:" + userId)) ?? 0;
  const newCount = current + 1;

  // 30일 만료 설정
  await redis.set("usage:" + userId, newCount, { ex: 60 * 60 * 24 * 30 });

  return NextResponse.json({
    count: newCount,
    remaining: Math.max(0, FREE_LIMIT - newCount),
    limitReached: newCount >= FREE_LIMIT,
    freeLimit: FREE_LIMIT,
  });
}
