import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getAnyUserId } from "../../lib/auth";
import { chargeAllowed, ensureWelcome, getBalance } from "../../lib/coins";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

export async function GET(request: NextRequest) {
  // 게스트 포함 신원 — 비로그인도 200을 받아야 클라의 즉시 부족 체크(잔액 0)가 발화한다.
  // 401은 쿠키가 전면 차단된 극단 케이스의 안전망으로만 남는다.
  const uid = getAnyUserId(request);
  if (!uid) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  await ensureWelcome(uid); // 게스트면 내부 게이트로 no-op

  // 최근 내역 20건 — 깨진 항목은 조용히 건너뜀
  let log: unknown[] = [];
  if (redis) {
    const raw = await redis.lrange(`coinlog:${uid}`, 0, 19);
    log = raw
      .map((item) => {
        if (typeof item === "string") {
          try { return JSON.parse(item); } catch { return null; }
        }
        return item;
      })
      .filter((item) => item && typeof item === "object");
  }

  return NextResponse.json({ balance: await getBalance(uid), log, canCharge: chargeAllowed(uid) });
}
