// 사진 사전 검사(validate-photo) 서버 방어 — 일 한도 + 해시 캐시.
//
// 왜 필요한가: validate-photo는 인증·한도·캐시가 전부 0인 완전 공개 라우트였다.
// 바디의 inputRule 체크가 유일한 관문인데 그건 클라가 보내는 값이라 위조가 자유롭다.
// 즉 누구나 임의 이미지를 던져 Gemini 비전 분석을 무료로 받아갈 수 있는 구조였다.
//
// ★이 모듈은 "호출량"만 줄인다. 판정의 관대함(판단 불가 시 pass)은 건드리지 않는다.
//   Redis가 없거나 죽어도 전부 통과시켜 원래 경로로 흘려보낸다 — 방어가 사용자를 막으면 안 된다.
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { getAnyUserId } from "./auth";

// coins.ts와 동일한 null-safe 관례 — env 미설정(로컬)이면 방어 전체 skip
const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

// 6장 × 10회 = 정상 사용자가 하루에 닿을 일이 없는 값. 프록시 어뷰즈만 걸린다.
export const GATE_DAILY_LIMIT = 60;
const COUNT_TTL_SEC = 172800; // 48h — withDailyFree와 동일(자정 경계는 키 교체로 리셋)
const CACHE_TTL_SEC = 86400;  // 24h

// Vercel 엣지가 x-forwarded-for를 재작성하므로 첫 값이 클라이언트 IP다(클라 위조는 덮어써진다).
// coins.ts의 동명 함수와 같은 규칙 — 그쪽은 export가 아니라 여기서 다시 쓴다.
function clientIp(request: NextRequest): string {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

// 로그인 회원은 uid, 게스트(g_ 쿠키)와 쿠키조차 없는 요청은 IP.
// 게스트를 IP로 묶는 이유는 withDailyFree와 같다 — 쿠키 리셋 파밍 차단.
function scopeOf(request: NextRequest): string {
  const uid = getAnyUserId(request);
  if (uid && !uid.startsWith("g_")) return uid;
  return `ip:${clientIp(request)}`;
}

function kstDate(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * 일 한도 소비. 한도를 넘었으면 true(=막아야 함).
 * ★Redis 미설정·장애·타임아웃은 전부 false — 방어 실패가 검사 차단으로 번지지 않는다.
 */
export async function overDailyLimit(request: NextRequest): Promise<boolean> {
  if (!redis) return false;
  try {
    const key = `free:validatephoto:${scopeOf(request)}:${kstDate()}`;
    const used = await redis.incr(key); // INCR 선행 — 재시도 남발에도 안전
    await redis.expire(key, COUNT_TTL_SEC);
    return used > GATE_DAILY_LIMIT;
  } catch {
    return false;
  }
}

// 판정 JSON은 라우트가 만들고 이 모듈은 저장/조회만 한다(형태를 몰라도 되게 unknown).
const cacheKey = (inputRule: string, imageB64: string): string =>
  // ★inputRule을 키에 넣는다 — 같은 사진이라도 규칙이 다르면 판정이 달라질 수 있다.
  `gatecache:${inputRule}:${createHash("sha256").update(imageB64).digest("hex")}`;

/** 같은 사진 재검사 시 Gemini 0콜. 캐시가 없거나 실패하면 null. */
export async function getCachedVerdict(inputRule: string, imageB64: string): Promise<unknown | null> {
  if (!redis) return null;
  try {
    return (await redis.get(cacheKey(inputRule, imageB64))) ?? null;
  } catch {
    return null;
  }
}

/** 판정 결과를 24h 캐시. 실패해도 조용히 넘어간다(응답은 이미 만들어져 있다). */
export async function setCachedVerdict(inputRule: string, imageB64: string, verdict: unknown): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(cacheKey(inputRule, imageB64), verdict, { ex: CACHE_TTL_SEC });
  } catch {
    /* 캐시 저장 실패는 다음 요청에서 Gemini 1콜로 끝난다 — 사용자 영향 0 */
  }
}
