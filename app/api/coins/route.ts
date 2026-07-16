import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserId } from "../../lib/auth";
import { chargeAllowed, ensureWelcome, getBalance } from "../../lib/coins";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

export async function GET(request: NextRequest) {
  const uid = getUserId(request);
  if (!uid) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  await ensureWelcome(uid);

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
