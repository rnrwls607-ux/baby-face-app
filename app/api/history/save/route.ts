import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";

// ✅ usage/route.ts와 동일한 null-safe 초기화 방식
const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

// 사용자당 클라우드에 보관할 최대 개수 (무료 구간 보호)
const MAX_ITEMS = 500;

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

export async function POST(request: NextRequest) {
  // 비로그인·서버 미설정이면 "조용히 스킵" → 기존 동작 그대로 (에러 아님)
  const userId = getUserId(request);
  if (!userId || !redis || !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ saved: false });
  }

  let src: unknown;
  let concept: unknown;
  try {
    const body = await request.json();
    src = body.src;
    concept = body.concept;
  } catch {
    return NextResponse.json({ saved: false });
  }

  // src 는 data URL (예: data:image/jpeg;base64,....) 이어야 함
  if (typeof src !== "string" || !src.startsWith("data:image/")) {
    return NextResponse.json({ saved: false });
  }

  try {
    const match = src.match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
    if (!match) return NextResponse.json({ saved: false });
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = contentType.includes("png") ? "png" : "jpg";

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1) 이미지 파일 → Vercel Blob (영구 보관)
    const blob = await put(`history/${userId}/${id}.${ext}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    // 2) 목록(누가/언제/컨셉/이미지URL) → Upstash Redis
    const item = {
      id,
      url: blob.url,
      concept: typeof concept === "string" ? concept : "",
      createdAt: Date.now(),
    };
    await redis.lpush(`history:${userId}`, item);
    await redis.ltrim(`history:${userId}`, 0, MAX_ITEMS - 1);

    return NextResponse.json({ saved: true, url: blob.url });
  } catch {
    // 저장 실패해도 기존 동작을 깨지 않도록 조용히 실패 처리
    return NextResponse.json({ saved: false });
  }
}
