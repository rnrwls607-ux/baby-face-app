import { NextResponse } from "next/server";
import sharp from "sharp";
import { Redis } from "@upstash/redis";
import { list } from "@vercel/blob";

// 헬스 — 배포가 "빌드는 됐는데 런타임이 죽은" 상태인지 밖에서 확인하는 창구.
//
// ★왜 만들었나 (2026-09-02~03 사고)
//   sharp 0.35의 libvips 8.18이 Vercel linux-x64에서 dlopen에 실패해 생성·업스케일·코인·
//   로그인 콜백이 23시간 죽었는데, 빌드는 매번 통과했고 sharp를 안 쓰는 /api/usage는 200이라
//   스모크가 통과했다. 그래서 여기서는 ★모듈을 import만 하지 않고 실제로 태운다 —
//   sharp는 8×8 PNG를 실제로 인코딩해 libvips까지 로드되는지 본다.
//
// ★값은 절대 내보내지 않는다. env는 있음/없음(boolean)만.
// ★검사 하나가 터져도 health 자체는 500이 되면 안 된다 — 개별 try/catch + 5초 컷.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_MIN_LEN = 32; // app/lib/auth.ts와 같은 값 — 여기서 값을 읽지 않고 길이만 본다

// ★필수와 선택을 나눈다. 전부를 필수로 두면 IAP 미개통(RC_*)·스토어 심사용(REVIEW_LOGIN_TOKEN)
//   처럼 "지금은 없는 게 정상"인 키 때문에 health가 늘 503이 되고, 스모크가 상시 FAIL이 되어
//   경보로서 죽는다. 없으면 실제로 기능이 멎는 것만 필수로 둔다.
const ENV_REQUIRED = [
  "AUTH_COOKIE_SECRET",   // 없으면 전원 비로그인
  "KAKAO_CLIENT_ID", "KAKAO_REDIRECT_URI",  // 없으면 로그인 진입 불가
  "KV_REST_API_URL", "KV_REST_API_TOKEN",   // 코인·히스토리 전면 정지
  "BLOB_READ_WRITE_TOKEN",                  // 원본 보존 실패
  "GEMINI_API_KEY", "OPENAI_API_KEY",       // 생성 불가
] as const;
// 있으면 좋지만 없어도 서비스가 도는 것 — 상태만 보고한다(판정에는 안 넣는다).
const ENV_OPTIONAL = [
  "KAKAO_CLIENT_SECRET",        // 카카오 앱 설정에 따라 없을 수 있다(callback이 조건부로 붙인다)
  "NEXT_PUBLIC_RC_ANDROID_KEY", "RC_WEBHOOK_AUTH",  // IAP 미개통
  "REVIEW_LOGIN_TOKEN",         // 스토어 심사 때만
  "COIN_ADMIN_IDS",             // 없으면 관리자 도구가 전원 거부(잠기는 방향)
] as const;
const ENV_KEYS = [...ENV_REQUIRED, ...ENV_OPTIONAL] as const;

type Check = { ok: boolean; ms: number; detail: string };

async function timed(fn: () => Promise<string>, ms = 5000): Promise<Check> {
  const t0 = Date.now();
  try {
    const detail = await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${ms}ms 초과`)), ms)),
    ]);
    return { ok: true, ms: Date.now() - t0, detail };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, detail: String((e as { message?: string })?.message ?? e).slice(0, 200) };
  }
}

export async function GET() {
  const checks: Record<string, Check> = {};

  // ① sharp — import가 아니라 실제 인코딩. 여기서 libvips가 dlopen된다.
  checks.sharp = await timed(async () => {
    const buf = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).png().toBuffer();
    if (!buf?.length) throw new Error("png 버퍼가 비었다");
    return `png ${buf.length}B · sharp ${sharp.versions.sharp} · libvips ${sharp.versions.vips}`;
  });

  // ② redis — ping 1회만. UptimeRobot 5분 주기여도 하루 288명령이라 한도에 부담이 없다.
  checks.redis = await timed(async () => {
    if (!process.env.KV_REST_API_URL) throw new Error("KV_REST_API_URL 미설정");
    const r = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! });
    const pong = await r.ping();
    return `ping=${pong}`;
  });

  // ③ blob — 토큰이 살아 있는지. 1건만 조회한다.
  checks.blob = await timed(async () => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN 미설정");
    const res = await list({ limit: 1 });
    return `blobs=${res.blobs.length}`;
  });

  // ④ env — 있음/없음만. 값은 어디에도 싣지 않는다.
  const env: Record<string, boolean> = {};
  for (const k of ENV_KEYS) env[k] = !!process.env[k];
  const missReq = ENV_REQUIRED.filter((k) => !env[k]);
  const missOpt = ENV_OPTIONAL.filter((k) => !env[k]);
  checks.env = {
    ok: missReq.length === 0,
    ms: 0,
    detail: missReq.length
      ? `필수 미설정: ${missReq.join(", ")}`
      : `필수 ${ENV_REQUIRED.length}개 설정${missOpt.length ? ` · 선택 미설정(정상): ${missOpt.join(", ")}` : ""}`,
  };

  // ⑤ 쿠키 서명 키 길이 — 짧으면 전원 비로그인이 된다(auth.ts가 잠그는 방향)
  const secLen = (process.env.AUTH_COOKIE_SECRET || "").length;
  checks.cookieSecret = {
    ok: secLen >= SECRET_MIN_LEN,
    ms: 0,
    detail: secLen ? `len=${secLen} (최소 ${SECRET_MIN_LEN})` : "미설정",
  };

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      ok,
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7),
      time: new Date().toISOString(),
      checks,
      env,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
