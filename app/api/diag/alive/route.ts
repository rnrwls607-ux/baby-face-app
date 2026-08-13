// 🩺 클라 절단 시 함수 생존 실험대 (2026-08-14 신설)
//
// 왜 만들었나: 서버측 히스토리 저장(fd997d5)의 전제는 "클라가 죽어도 Vercel 함수는
// 완주한다"였는데, MJ 실측(생성 중 뒤로가기 → 무차감·무저장)이 이와 모순됐다.
//
// Vercel 공식 문서는 우리 편이다:
//   "Cancellation is opt-in. In your vercel.json, add "supportsCancellation": true"
//   "Any work not wrapped in waitUntil or after will be lost on cancellation.
//    This is why cancellation is opt-in."
// 우리 vercel.json에는 functions 블록 자체가 없다 = 미설정 = 문서대로면 함수는 완주해야 한다.
// 하지만 문서와 실제 런타임이 다를 여지는 남는다 — 그걸 재는 것이 이 route다.
//
// ★생성 엔진 호출 0 = 비용 0. 하는 일은 Redis 마커 2개와 sleep뿐이다.
// ★프로덕션 쓰기는 diag: 접두 키 + TTL 600초 한정 (2026-08-14 MJ 승인).
//
// 사용법:
//   1) 브라우저 탭에서 열기:
//      /api/diag/alive?key=<DIAG_SECRET>&mode=run&id=t1&ms=20000
//   2) 2초쯤 뒤 그 탭을 닫는다(= 클라 절단 재현)
//   3) 25초쯤 뒤 다른 탭에서:
//      /api/diag/alive?key=<DIAG_SECRET>&mode=check&id=t1
//
//   판정 — done이 있으면 절단 후에도 함수가 sleep을 넘겨 완주했다는 뜻:
//     { alive: {...}, done: {...} }  → ★함수 완주. fd997d5 전제가 옳다
//     { alive: {...}, done: null }   → ★함수 사망. 서버 보강이 필요하다
//     { alive: null,  done: null }   → 요청이 서버에 닿지도 않았다(탭을 너무 빨리 닫음)
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserId } from "../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// coins.ts·gateGuard.ts와 동일한 null-safe 관례
const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

const TTL_SEC = 600;              // ★10분 뒤 자동 소멸 — 수동 정리 불필요
const MS_MIN = 1000;
const MS_MAX = 45000;             // maxDuration 60에 여유를 남긴다
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;  // 키 조작 차단

const ALIVE_KEY = (id: string) => `diag:alive:${id}`;
const DONE_KEY = (id: string) => `diag:done:${id}`;

// ★diag/gemini의 allowed()를 자구 그대로 복제한다.
//   저쪽은 export가 아니고, export로 바꾸면 이번 커밋의 수정 허용 범위를 벗어난다.
function allowed(request: NextRequest): boolean {
  // ① 로컬(개발)에서는 무조건 허용 — 설정 0으로 바로 쓸 수 있는 길. dev-login과 같은 취지.
  if (process.env.NODE_ENV !== "production") return true;
  // ② 배포에서는 비밀키 ?key= 또는 관리자 로그인만.
  const secret = process.env.DIAG_SECRET;
  if (secret && request.nextUrl.searchParams.get("key") === secret) return true;
  const uid = getUserId(request);
  if (!uid) return false;
  const admins = (process.env.COIN_ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  return admins.includes(uid);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function GET(request: NextRequest) {
  if (!allowed(request)) {
    // 존재 자체를 숨긴다 (diag/gemini와 동일)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!redis) {
    return NextResponse.json({ ok: false, verdict: "Redis 미설정 — KV_REST_API_URL을 확인하세요." });
  }

  const q = request.nextUrl.searchParams;
  const mode = q.get("mode") || "check";
  const id = q.get("id") || "";
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "id는 영문·숫자·_- 1~40자", got: id }, { status: 400 });
  }

  // ── mode=check : 마커 조회만 (쓰기 없음) ──
  if (mode === "check") {
    const [alive, done] = await Promise.all([
      redis.get(ALIVE_KEY(id)),
      redis.get(DONE_KEY(id)),
    ]);
    const a = alive as { at?: number; ms?: number } | null;
    const d = done as { at?: number } | null;
    const verdict = !a
      ? "요청이 서버에 닿지 않았습니다(탭을 너무 빨리 닫았거나 id가 다릅니다)."
      : d
        ? `★함수 완주 — 클라 절단과 무관하게 ${d.at && a.at ? d.at - a.at : "?"}ms 뒤 done을 썼습니다.`
        : "★done 없음 — 아직 실행 중이거나(대기 시간 미경과) 함수가 죽었습니다. ms 경과 후 다시 check 하세요.";
    return NextResponse.json({ ok: true, mode: "check", id, alive: a, done: d, verdict });
  }

  // ── mode=run : alive 기록 → sleep → done 기록 ──
  if (mode !== "run") {
    return NextResponse.json({ error: "mode는 run|check", got: mode }, { status: 400 });
  }
  const ms = Math.min(MS_MAX, Math.max(MS_MIN, Number(q.get("ms")) || 20000));
  const t0 = Date.now();

  await redis.set(ALIVE_KEY(id), { at: t0, ms }, { ex: TTL_SEC });
  console.log(`[DIAG][alive] run id=${id} ms=${ms} — alive 기록, 대기 시작`);

  await sleep(ms);

  // ★여기가 판정선이다. 클라가 이미 끊겼어도 이 줄이 실행되면 함수는 살아 있었다.
  const t1 = Date.now();
  await redis.set(DONE_KEY(id), { at: t1, elapsed: t1 - t0 }, { ex: TTL_SEC });
  console.log(`[DIAG][alive] run id=${id} — done 기록 (${t1 - t0}ms 경과)`);

  return NextResponse.json({
    ok: true, mode: "run", id, ms, elapsed: t1 - t0,
    verdict: `done 기록 완료. 이 응답이 안 보이게 탭을 닫았어도 mode=check에서 done이 보이면 함수는 완주한 것입니다.`,
  });
}
