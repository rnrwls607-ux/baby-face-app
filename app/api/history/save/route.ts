import { NextRequest, NextResponse } from "next/server";
import { hasSameOriginal, makeThumbnail, saveHistoryItem } from "../../../lib/historyStore";

export const runtime = "nodejs";

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
  if (!userId) {
    return NextResponse.json({ saved: false });
  }

  let src: unknown;
  let concept: unknown;
  let originalUrl: unknown;
  try {
    const body = await request.json();
    src = body.src;
    concept = body.concept;
    originalUrl = body.originalUrl; // 유료 원본 Blob 주소 (옵션 — 없으면 기존 동작 그대로)
  } catch {
    return NextResponse.json({ saved: false });
  }

  // src 는 data URL (예: data:image/jpeg;base64,....) 이어야 함
  if (typeof src !== "string" || !src.startsWith("data:image/")) {
    return NextResponse.json({ saved: false });
  }

  const origin = typeof originalUrl === "string" ? originalUrl : undefined;

  // ★중복 방지 (2026-08-13) — withCoin이 이미 서버측에서 확정 저장한 건이면 여기서 멈춘다.
  //   클라 166 호출부는 응답을 읽지 않으므로(saveToCloud는 await fetch만 한다) 계약 변경 영향 0.
  if (await hasSameOriginal(userId, origin)) {
    return NextResponse.json({ saved: "already" });
  }

  try {
    const thumb = await makeThumbnail(src);
    if (!thumb) return NextResponse.json({ saved: false });
    const url = await saveHistoryItem(userId, thumb, typeof concept === "string" ? concept : "", origin);
    return url ? NextResponse.json({ saved: true, url }) : NextResponse.json({ saved: false });
  } catch {
    // 저장 실패해도 기존 동작을 깨지 않도록 조용히 실패 처리
    return NextResponse.json({ saved: false });
  }
}
