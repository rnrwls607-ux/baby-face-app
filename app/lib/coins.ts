// 코인 원장(Upstash Redis) + withCoin 래퍼. 차감은 "성공 후" — 타임아웃·hard kill로 함수가 죽어도
// 차감 전이라 사용자 손해 0(최악은 서비스가 1회 손해). 실패 시 자동 반환이 반환 로직 없이 충족된다.
// inflight 락은 같은 유저의 병렬 생성 악용 차단용(EX 90 자동 소멸). 이 래퍼가 route 114곳 벌크 교체의 앵커다.
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import { getUserId } from "./auth";

const WELCOME_COINS = 3;
const LOG_MAX = 500;

// 키 네이밍 (order:는 충전 단계에서 멱등 플래그로 사용 예정 — 예약)
const COIN_KEY = (uid: string) => `coin:${uid}`;
const LOG_KEY = (uid: string) => `coinlog:${uid}`;
const WELCOME_KEY = (uid: string) => `welcome:${uid}`;
const INFLIGHT_KEY = (uid: string) => `inflight:${uid}`;
const ORIGINALS_KEY = (uid: string) => `originals:${uid}`;
export const ORDER_KEY = (orderId: string) => `order:${orderId}`;

// 기존 usage route와 동일한 null-safe 관례 — env 미설정(로컬)이면 코인 로직 전체 skip
const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

type CoinLogEntry = {
  type: "welcome" | "charge" | "spend" | "refund";
  amount: number;
  ref?: string;
  id?: string; // spend의 ledgerId — originals:{uid} 항목과 공유 (원본↔차감 감사 연결)
  at: number;
};

// 유료 원본 1장을 Blob에 영구 저장 (originals/{uid}/{ledgerId}_{i}.{ext})
async function putOriginal(uid: string, ledgerId: string, i: number, dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
  if (!m) throw new Error("data URL 형식이 아님");
  const contentType = m[1];
  const ext = contentType.includes("png") ? "png" : "jpg";
  const blob = await put(`originals/${uid}/${ledgerId}_${i}.${ext}`, Buffer.from(m[2], "base64"), {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

async function pushLog(uid: string, entry: CoinLogEntry): Promise<void> {
  if (!redis) return;
  await redis.lpush(LOG_KEY(uid), entry);
  await redis.ltrim(LOG_KEY(uid), 0, LOG_MAX - 1);
}

// 웰컴 코인 3개 1회 지급 — SET NX가 원자적이라 이중지급 불가
export async function ensureWelcome(uid: string): Promise<void> {
  if (!redis) return;
  const first = await redis.set(WELCOME_KEY(uid), 1, { nx: true });
  if (first !== "OK") return;
  await redis.incrby(COIN_KEY(uid), WELCOME_COINS);
  await pushLog(uid, { type: "welcome", amount: WELCOME_COINS, at: Date.now() });
}

export async function getBalance(uid: string): Promise<number> {
  if (!redis) return 0;
  return (await redis.get<number>(COIN_KEY(uid))) ?? 0;
}

// 충전 게이트: COIN_ADMIN_IDS(콤마 구분)에 있거나 COIN_CHARGE_OPEN==="true"면 허용
export function chargeAllowed(uid: string): boolean {
  const admins = (process.env.COIN_ADMIN_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(uid) || process.env.COIN_CHARGE_OPEN === "true";
}

// 충전 적립: INCRBY + charge 로그, 새 잔액 반환 (멱등 확인은 호출부의 order: NX가 담당)
export async function creditCoins(uid: string, coins: number, ref: string): Promise<number> {
  if (!redis) return 0;
  const balance = await redis.incrby(COIN_KEY(uid), coins);
  await pushLog(uid, { type: "charge", amount: coins, ref, at: Date.now() });
  return balance;
}

type RouteHandler = (request: NextRequest, ...args: unknown[]) => Promise<Response>;

export function withCoin(conceptKey: string, cost: number, handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, ...args: unknown[]): Promise<Response> => {
    if (!redis) {
      console.warn(`[coins] Redis 미설정 — ${conceptKey} 코인 로직 skip`);
      return handler(request, ...args);
    }

    const uid = getUserId(request);
    if (!uid) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

    await ensureWelcome(uid);

    const locked = await redis.set(INFLIGHT_KEY(uid), 1, { nx: true, ex: 90 });
    if (locked !== "OK") {
      return NextResponse.json({ error: "진행 중인 생성이 끝나면 다시 시도해주세요" }, { status: 429 });
    }

    try {
      const balance = await getBalance(uid);
      if (balance < cost) {
        return NextResponse.json({ error: "코인이 부족해요", need: cost, balance }, { status: 402 });
      }

      const res = await handler(request, ...args);

      // cost > 0 조건: 0코인 래퍼(upscale·nukki 예정)는 차감·원본 저장 경로를 자동으로 안 탄다
      if (res.status < 400 && cost > 0) {
        const after = await redis.decrby(COIN_KEY(uid), cost);
        if (after < 0) {
          console.warn(`[coins] 잔액 음수 감지 uid=${uid} concept=${conceptKey} after=${after} — 0으로 복원`);
          await redis.set(COIN_KEY(uid), 0);
        }
        const ledgerId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pushLog(uid, { type: "spend", amount: -cost, ref: conceptKey, id: ledgerId, at: Date.now() });

        // ── 유료 원본 영구 저장 (정책: 차감 생성물만 / 표시=1000px 축소본·다운로드=원본 이원화) ──
        // 실패·3초 초과 시 생성·차감은 그대로 유지하고 로그만 남긴다 — 응답 무지연 원칙
        try {
          const body = await res.clone().json();
          const outputs: string[] = Array.isArray(body?.output)
            ? body.output.filter((u: unknown): u is string => typeof u === "string" && u.startsWith("data:image/"))
            : [];
          let originalUrls: string[] | undefined;
          if (outputs.length && process.env.BLOB_READ_WRITE_TOKEN) {
            try {
              originalUrls = await Promise.race([
                Promise.all(outputs.map((u, i) => putOriginal(uid, ledgerId, i, u))),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error("원본 업로드 3초 초과")), 3000)),
              ]);
              await redis.lpush(ORIGINALS_KEY(uid), { id: ledgerId, urls: originalUrls, concept: conceptKey, coins: cost, at: Date.now() });
              await redis.ltrim(ORIGINALS_KEY(uid), 0, 499);
            } catch (err) {
              console.error(`[coins] 원본 저장 실패(생성·차감 유지) uid=${uid} concept=${conceptKey}:`, (err as Error)?.message);
              originalUrls = undefined;
            }
          }
          if (originalUrls) return NextResponse.json({ ...body, originalUrls }, { status: res.status });
          return res;
        } catch {
          return res; // 응답이 JSON이 아니면 원본 저장 없이 그대로 통과
        }
      }
      return res;
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error(`[coins] ${conceptKey} handler 오류:`, err?.message);
      return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
    } finally {
      await redis.del(INFLIGHT_KEY(uid));
    }
  };
}
