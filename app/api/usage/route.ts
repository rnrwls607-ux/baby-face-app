// ⛔ 은퇴 — 구형 무료체험 게이트(아기얼굴 일 3회 usage:{uid}). 호출처 0 (baby는 /baby 라우트형 전환으로
//    코인 게이트로 이관, 홈의 옛 MakeScreen도 3/3에서 제거됨). 코인 시스템(withCoin)이 이 역할을 대체.
//    삭제하지 않고 보존: Redis 키 usage:{uid}·bonus:{uid} 데이터가 아직 남아 있어(자연 만료 방치),
//    참고·롤백·데이터 조회용. 되살릴 일은 없지만 GET/POST 로직은 그대로 둔다.
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../lib/auth";
import { Redis } from "@upstash/redis";

const FREE_LIMIT = 3;

// ✅ null-safe 초기화 (generate/route.ts와 동일한 방식)
const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId || !redis) {
    return NextResponse.json({ count: 0, remaining: FREE_LIMIT, limitReached: false, freeLimit: FREE_LIMIT, bonusUses: 0, totalLimit: FREE_LIMIT });
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

  if (!redis) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
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
