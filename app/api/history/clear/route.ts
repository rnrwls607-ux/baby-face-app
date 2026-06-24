import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { del } from "@vercel/blob";

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

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

// 로그인 사용자의 클라우드 히스토리 전체 삭제 (Blob 파일 + Redis 목록)
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId || !redis) {
    return NextResponse.json({ cleared: false });
  }

  try {
    const items = await redis.lrange<{ url: string }>(`history:${userId}`, 0, -1);
    const urls = (Array.isArray(items) ? items : [])
      .map((i) => i?.url)
      .filter((u): u is string => typeof u === "string" && u.length > 0);

    // 1) Blob 파일 삭제 (실패해도 목록 삭제는 진행)
    if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(urls);
      } catch {
        /* Blob 삭제 실패는 무시 */
      }
    }

    // 2) Redis 목록 삭제
    await redis.del(`history:${userId}`);

    return NextResponse.json({ cleared: true });
  } catch {
    return NextResponse.json({ cleared: false });
  }
}
