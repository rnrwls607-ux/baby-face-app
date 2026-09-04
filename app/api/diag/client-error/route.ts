import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getAnyUserId } from "../../../lib/auth";
import { logError } from "../../../lib/errlog";

// 브라우저에서 터진 에러를 접수한다 — app/error.tsx·global-error.tsx가 부른다.
// 사용자에게는 번호(id)만 돌려주고, 사용자는 그 번호를 말하면 된다.
//
// ★남용 방지: 같은 IP 분당 5건까지. 에러 화면이 무한 리마운트되며 Redis를 갉는 사고를 막는다.
// ★본문 4KB 초과 거부 — 스택이 길어도 앞부분이면 원인 판별에 충분하다.

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

const MAX_BODY = 4096;
const RATE_MAX = 5;
const RATE_WINDOW_SEC = 60;

function clientIp(req: NextRequest): string {
  const f = req.headers.get("x-forwarded-for") || "";
  return f.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "본문이 너무 큽니다." }, { status: 413 });
    }

    // 분당 한도 — Redis가 없으면(로컬) 그냥 통과시킨다
    if (redis) {
      try {
        const key = `errrate:${clientIp(request)}`;
        const n = await redis.incr(key);
        if (n === 1) await redis.expire(key, RATE_WINDOW_SEC);
        if (n > RATE_MAX) {
          return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
        }
      } catch { /* 한도 검사 실패는 접수를 막지 않는다 */ }
    }

    let body: { message?: string; stack?: string; path?: string; ua?: string; digest?: string } = {};
    try { body = JSON.parse(raw || "{}"); } catch { /* 깨진 body는 빈 객체로 */ }

    const id = await logError({
      uid: getAnyUserId(request),
      tag: "client",
      message: String(body.message || "(메시지 없음)"),
      route: String(body.path || "").slice(0, 200),
      meta: {
        ...(body.digest ? { digest: String(body.digest).slice(0, 80) } : {}),
        ...(body.stack ? { stack: String(body.stack).slice(0, 1500) } : {}),
        ua: String(body.ua || request.headers.get("user-agent") || "").slice(0, 200),
      },
    });

    return NextResponse.json({ id });
  } catch (e) {
    // 접수 실패가 에러 화면을 또 깨뜨리면 안 된다 — 200으로 조용히 넘긴다
    console.error("[client-error] 접수 실패:", (e as { message?: string })?.message);
    return NextResponse.json({ id: null });
  }
}
