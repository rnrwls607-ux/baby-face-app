import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// 배포 환경에서 GET 응답이 캐시되지 않도록 강제 (옛 빈 목록 캐싱 방지)
export const dynamic = "force-dynamic";

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

type CloudHistoryItem = {
  id: string;
  url: string;
  concept: string;
  createdAt: number;
};

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
  const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
  const userId = getUserId(request);

  // 🐛 디버그: 읽는 userId / key 를 응답에 노출 (원인 파악 후 제거 예정)
  if (!userId) return NextResponse.json({ items: [], userId: null, reason: "no-userId" }, noStore);
  if (!redis) return NextResponse.json({ items: [], userId, reason: "no-redis" }, noStore);

  const key = `history:${userId}`;
  try {
    const items = await redis.lrange<CloudHistoryItem>(key, 0, -1);
    const arr = Array.isArray(items) ? items : [];
    return NextResponse.json({ items: arr, userId, key, count: arr.length }, noStore);
  } catch (e) {
    return NextResponse.json(
      { items: [], userId, key, reason: "error", error: e instanceof Error ? e.message : String(e) },
      noStore
    );
  }
}
