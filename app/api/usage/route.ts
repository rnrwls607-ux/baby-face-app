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
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ count: 0, remaining: FREE_LIMIT, limitReached: false, freeLimit: FREE_LIMIT, bonusUses: 0 });
  }

  const [used, bonus] = await Promise.all([
    redis.get<number>("usage:" + userId).then(v => v ?? 0),
    redis.get<number>("bonus:" + userId).then(v => v ?? 0),
  ]);

  const totalLimit = FREE_LIMIT + bonus;
  const remaining = Math.max(0, totalLimit - used);

  return NextResponse.json({
    count: used,
    remaining,
    limitReached: used >= totalLimit,
    freeLimit: FREE_LIMIT,
    bonusUses: bonus,
    totalLimit,
  });
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [current, bonus] = await Promise.all([
    redis.get<number>("usage:" + userId).then(v => v ?? 0),
    redis.get<number>("bonus:" + userId).then(v => v ?? 0),
  ]);

  const newCount = current + 1;
  const totalLimit = FREE_LIMIT + bonus;

  await redis.set("usage:" + userId, newCount, { ex: 60 * 60 * 24 * 365 });

  return NextResponse.json({
    count: newCount,
    remaining: Math.max(0, totalLimit - newCount),
    limitReached: newCount >= totalLimit,
    freeLimit: FREE_LIMIT,
    bonusUses: bonus,
    totalLimit,
  });
}
