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

type CloudItem = { id: string; url: string; concept: string; createdAt: number; originalUrl?: string };

// 로그인 사용자의 클라우드 히스토리 개별 삭제 (본인 uid 리스트 범위 안에서만 동작)
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  if (!redis) {
    return NextResponse.json({ deleted: false });
  }

  let id: unknown;
  try {
    id = (await request.json()).id;
  } catch {
    return NextResponse.json({ deleted: false });
  }
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ deleted: false });
  }

  try {
    // id는 경로 조립에 쓰지 않는다 — 본인 리스트(history:{uid})에서 항목을 찾고,
    // Blob 삭제도 그 항목이 이미 갖고 있는 url로만 한다 (경로 이탈 불가 구조).
    const key = `history:${userId}`;
    const items = await redis.lrange<CloudItem>(key, 0, -1);
    const item = (Array.isArray(items) ? items : []).find((i) => i?.id === id);
    if (!item) return NextResponse.json({ deleted: false }); // 이미 없음 — 멱등 처리

    // LREM은 저장된 원문과 완전 일치해야 한다 — lpush 때와 같은 클라이언트 직렬화를
    // 타도록 파싱된 객체를 그대로 넘긴다 (문자열 재조립 금지).
    await redis.lrem(key, 1, item);

    // Blob 삭제 실패는 무해한 고아 파일 — Redis 제거가 됐으면 성공으로 응답
    if (item.url && item.url.includes(`/history/${userId}/`) && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(item.url);
      } catch (e) {
        console.warn("[history/delete] Blob 삭제 실패(고아 파일):", (e as Error)?.message);
      }
    }

    // 유료 원본 동반 삭제 — 약관 "이용자가 삭제하는 경우 즉시 파기"와 코드 일치.
    // 소유권 가드: 본인 경로(/originals/{uid}/)의 url만 삭제. 실패는 고아 — 히스토리 삭제는 성공 유지.
    if (item.originalUrl && item.originalUrl.includes(`/originals/${userId}/`)) {
      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) await del(item.originalUrl);
        const oKey = `originals:${userId}`;
        const oItems = await redis.lrange<{ id: string; urls: string[] }>(oKey, 0, -1);
        const target = (Array.isArray(oItems) ? oItems : []).find(
          (o) => Array.isArray(o?.urls) && o.urls.includes(item.originalUrl!)
        );
        if (target) {
          // LREM은 저장 원문과 일치해야 함 — 파싱 객체 그대로 (문자열 재조립 금지)
          await redis.lrem(oKey, 1, target);
          const rest = target.urls.filter((u) => u !== item.originalUrl);
          if (rest.length) await redis.lpush(oKey, { ...target, urls: rest });
        }
      } catch (e) {
        console.warn("[history/delete] 원본 삭제 실패(고아):", (e as Error)?.message);
      }
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ deleted: false });
  }
}
