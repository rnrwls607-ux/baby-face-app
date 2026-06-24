import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

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
  const userId = getUserId(request);
  // 🐛 디버그: 실패 원인을 응답에 노출 (원인 파악 후 제거 예정)
  if (!userId) return NextResponse.json({ saved: false, reason: "no-userId" });
  if (!redis) return NextResponse.json({ saved: false, reason: "no-redis" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ saved: false, reason: "no-blob-token" });
  }

  let src: unknown;
  let concept: unknown;
  try {
    const body = await request.json();
    src = body.src;
    concept = body.concept;
  } catch {
    return NextResponse.json({ saved: false, reason: "bad-json" });
  }

  if (typeof src !== "string" || !src.startsWith("data:image/")) {
    return NextResponse.json({ saved: false, reason: "bad-src" });
  }

  try {
    const match = src.match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
    if (!match) return NextResponse.json({ saved: false, reason: "no-match" });
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = contentType.includes("png") ? "png" : "jpg";

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const key = `history:${userId}`;

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
    await redis.lpush(key, item);
    await redis.ltrim(key, 0, MAX_ITEMS - 1);

    // 🐛 디버그: 저장에 사용한 userId / key 를 응답에 노출
    return NextResponse.json({ saved: true, userId, key, url: blob.url });
  } catch (e) {
    return NextResponse.json({
      saved: false,
      reason: "error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
