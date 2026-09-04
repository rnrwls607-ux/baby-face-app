// 에러 기록 — 실패했을 때만 Redis에 남긴다.
//
// 왜 필요한가
//   지금까지 서버 에러는 console.error 323곳뿐이었다. Vercel Hobby 로그는 1시간 보존이라
//   사용자가 "어제 안 됐어요"라고 하면 확인할 방법이 아예 없었다(2026-09-03 감사).
//   그래서 실패 건만 짧은 번호와 함께 남겨, 사용자가 번호를 말하면 바로 찾을 수 있게 한다.
//
// ★설계 원칙
//   1. 기록 실패가 응답을 막지 않는다 — 전부 try/catch로 삼킨다. 로그는 부산물이지 본문이 아니다.
//   2. 성공 경로에서는 한 명령도 쓰지 않는다 — Redis 무료 한도(일 10,000)를 로그가 갉아먹으면 안 된다.
//   3. redis가 없으면(로컬) console.error만 하고 id는 그대로 돌려준다.

import { Redis } from "@upstash/redis";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

const RECENT_KEY = "errlog:recent";
const USER_KEY = (uid: string) => `errlog:${uid}`;
const ERR_KEY = (id: string) => `err:${id}`;
const RECENT_MAX = 500;   // 전역 최근 목록
const USER_MAX = 50;      // 사용자별 목록
const TTL_SEC = 60 * 60 * 24 * 7;  // 상세는 7일

export type ErrEntry = {
  id: string;
  at: number;
  tag: string;
  message: string;
  uid?: string;
  route?: string;
  status?: number;
  meta?: Record<string, unknown>;
};

// 사람이 전화로 불러줄 수 있는 짧은 번호. 충돌해도 상세가 덮일 뿐 응답에 영향이 없다.
const newId = (): string =>
  Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);

/**
 * 에러 1건을 남기고 번호를 돌려준다. ★절대 던지지 않는다.
 */
export async function logError(input: {
  uid?: string | null;
  tag: string;
  message: string;
  route?: string;
  status?: number;
  meta?: Record<string, unknown>;
}): Promise<string> {
  const id = newId();
  const entry: ErrEntry = {
    id,
    at: Date.now(),
    tag: input.tag,
    message: String(input.message ?? "").slice(0, 1000),
    ...(input.uid ? { uid: input.uid } : {}),
    ...(input.route ? { route: input.route } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
  };
  // 로그가 유실돼도 최소한 함수 로그에는 남게 — Redis보다 먼저 찍는다
  console.error(`[errlog] ${id} [${entry.tag}] ${entry.route ?? "-"} ${entry.message.slice(0, 200)}`);
  if (!redis) return id;
  try {
    await redis.set(ERR_KEY(id), entry, { ex: TTL_SEC });
    await redis.lpush(RECENT_KEY, id);
    await redis.ltrim(RECENT_KEY, 0, RECENT_MAX - 1);
    if (entry.uid) {
      await redis.lpush(USER_KEY(entry.uid), id);
      await redis.ltrim(USER_KEY(entry.uid), 0, USER_MAX - 1);
    }
  } catch (e) {
    // 기록 실패는 삼킨다 — 여기서 던지면 원래 에러를 덮어써 원인을 잃는다
    console.error("[errlog] 저장 실패(무시):", (e as { message?: string })?.message);
  }
  return id;
}

/** 관리자 조회용 — 최근 목록(내림차순) */
export async function recentErrors(limit: number, uid?: string): Promise<ErrEntry[]> {
  if (!redis) return [];
  const ids = await redis.lrange<string>(uid ? USER_KEY(uid) : RECENT_KEY, 0, Math.max(0, limit - 1));
  if (!ids.length) return [];
  const rows = await Promise.all(ids.map((id) => redis!.get<ErrEntry>(ERR_KEY(id)).catch(() => null)));
  return rows.filter((r): r is ErrEntry => !!r);
}

/** 관리자 조회용 — 단건 */
export async function getError(id: string): Promise<ErrEntry | null> {
  if (!redis) return null;
  return (await redis.get<ErrEntry>(ERR_KEY(id))) ?? null;
}
