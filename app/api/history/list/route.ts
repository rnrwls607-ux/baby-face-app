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
  if (!userId || !redis) {
    return NextResponse.json({ items: [] }, noStore);
  }

  try {
    // lpush 로 최신이 앞에 오므로 그대로 최신순
    const items = await redis.lrange<CloudHistoryItem>(`history:${userId}`, 0, -1);
    return NextResponse.json({ items: Array.isArray(items) ? items : [] }, noStore);
  } catch {
    return NextResponse.json({ items: [] }, noStore);
  }
}
