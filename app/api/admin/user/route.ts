// 👤 CS용 사용자 조회 (2026-07-25) — ★읽기 전용. 쓰기·삭제 기능 없음.
//
// 용도: "코인이 안 들어왔어요" "사진이 사라졌어요" 같은 문의를 받았을 때
//       그 계정의 실제 상태(잔액·차감 이력·히스토리·유료 원본)를 확인한다.
// 게이트: COIN_ADMIN_IDS에 있는 관리자만 (adminGate). 미설정이면 전원 거부.
// ★개인정보 취급 도구 — 접근·조회 대상 uid를 모두 console에 남긴다.
//
// GET /api/admin/user?uid={카카오ID}
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { adminGate } from "../../../lib/admin";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

const RECENT = 20;
const RETENTION_DAYS = 365; // 약관 제3조 5항: 유료 원본은 생성일로부터 1년 보관

type HistoryItem = { id?: string; url?: string; concept?: string; createdAt?: number; originalUrl?: string };
type OriginalItem = { id?: string; urls?: string[]; concept?: string; coins?: number; at?: number };
type CoinLog = { type?: string; amount?: number; ref?: string; at?: number };

export async function GET(request: NextRequest) {
  const denied = adminGate(request, "user");
  if (denied) return denied;
  if (!redis) return NextResponse.json({ error: "Redis 미설정" }, { status: 500 });

  const uid = (request.nextUrl.searchParams.get("uid") || "").trim();
  if (!uid) return NextResponse.json({ error: "uid를 입력하세요" }, { status: 400 });
  console.log(`[ADMIN][user] 조회 대상 uid=${uid}`);

  const [balance, logRaw, histRaw, origRaw, welcome] = await Promise.all([
    redis.get<number>(`coin:${uid}`),
    redis.lrange<CoinLog>(`coinlog:${uid}`, 0, RECENT - 1),
    redis.lrange<HistoryItem>(`history:${uid}`, 0, -1),
    redis.lrange<OriginalItem>(`originals:${uid}`, 0, -1),
    redis.get(`welcome:${uid}`),
  ]);

  const hist = Array.isArray(histRaw) ? histRaw : [];
  const orig = Array.isArray(origRaw) ? origRaw : [];
  const now = Date.now();
  const expireAt = (at?: number) => (typeof at === "number" ? at + RETENTION_DAYS * 86400_000 : null);

  return NextResponse.json({
    uid,
    exists: welcome !== null || hist.length > 0 || orig.length > 0 || balance !== null,
    coin: {
      balance: balance ?? 0,
      welcomeGiven: welcome !== null,
      recentLog: (Array.isArray(logRaw) ? logRaw : []).map(l => ({
        type: l?.type, amount: l?.amount, ref: l?.ref,
        at: l?.at, atText: l?.at ? new Date(l.at).toISOString() : null,
      })),
    },
    history: {
      count: hist.length,
      capacity: 500, // LTRIM 상한 — 초과분은 인덱스에서 밀려나고 Blob은 고아로 남는다
      recent: hist.slice(0, RECENT).map(h => ({
        id: h?.id, concept: h?.concept, url: h?.url, // ★url은 반환하되 화면에서 이미지로 렌더하지 않는다
        createdAt: h?.createdAt,
        createdAtText: h?.createdAt ? new Date(h.createdAt).toISOString() : null,
        hasOriginal: !!h?.originalUrl,
      })),
    },
    originals: {
      count: orig.length,
      retentionDays: RETENTION_DAYS,
      recent: orig.slice(0, RECENT).map(o => {
        const exp = expireAt(o?.at);
        return {
          id: o?.id, concept: o?.concept, coins: o?.coins, files: o?.urls?.length ?? 0,
          at: o?.at, atText: o?.at ? new Date(o.at).toISOString() : null,
          expireAt: exp, expireAtText: exp ? new Date(exp).toISOString() : null,
          daysLeft: exp ? Math.ceil((exp - now) / 86400_000) : null,
          expired: exp ? exp < now : false,
        };
      }),
      expiredCount: orig.filter(o => { const e = expireAt(o?.at); return e !== null && e < now; }).length,
    },
  });
}
