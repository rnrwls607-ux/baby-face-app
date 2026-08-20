// 앱 내 결제 적립 — RevenueCat 웹훅 수신구.
//
// 왜 웹훅인가(클라 보고 + 서버 검증이 아니라): 우리 쪽에 구글 서비스 계정 키를 두지
// 않아도 되고, RC가 재시도를 대신해 준다. Toss에서 이미 겪은 "결제는 됐는데 코인은
// 안 들어옴" 부류를 그 재시도가 막아준다. 대가는 비동기라는 것 — 클라는 잔액을
// 폴링하고, 늦으면 "곧 완료돼요"로 안내한다(revenuecat.ts).
//
// ★env 게이트: RC_WEBHOOK_AUTH 미설정이면 404. 키를 넣기 전까지 이 route는 없는 것과 같다.
//
// 멱등·영수증·적립은 charge 라우트의 패턴을 그대로 쓴다 — 두 결제 수단이 같은 원장에
// 같은 모양으로 쌓여야 사후 감사가 한 곳에서 끝난다.
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getCoinProductByPlayId } from "../../../lib/products";
import { ORDER_KEY, creditCoins, parseOrderRecord, type OrderReceipt } from "../../../lib/coins";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

// 전자상거래법 제6조 — 계약·대금결제 기록 5년 보존 (charge 라우트와 동일)
const RECEIPT_TTL_SEC = 60 * 60 * 24 * 1826;

// ★소모성 상품만 처리한다. 갱신 구독·환불·이관 등은 우리 상품 구조에 없다.
const HANDLED_TYPE = "NON_RENEWING_PURCHASE";

// 카카오 uid는 숫자 문자열이다(getUserId가 user.id를 String()). RC 익명 id($RCAnonymousID:…)나
// 게스트(g_…)로 온 이벤트는 적립할 계정을 특정할 수 없다.
const KAKAO_UID_RE = /^\d{5,20}$/;

type RcEvent = {
  type?: string;
  id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  price_in_purchased_currency?: number;
};

export async function POST(request: NextRequest) {
  const secret = process.env.RC_WEBHOOK_AUTH;
  // ★미설정 = 이 기능이 아직 없는 상태. 존재 자체를 숨긴다.
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.headers.get("authorization") !== secret) {
    console.warn("[iap-credit] Authorization 불일치 — 거부");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ev: RcEvent = body?.event ?? {};

    // ★그 외 이벤트는 200으로 삼킨다 — 비200이면 RC가 계속 재시도한다(무의미한 재전송 폭주).
    if (ev.type !== HANDLED_TYPE) {
      return NextResponse.json({ ok: true, ignored: ev.type ?? "(no type)" });
    }

    const uid = ev.app_user_id || ev.original_app_user_id || "";
    const playProductId = ev.product_id || "";
    const txId = ev.transaction_id || ev.id || "";

    if (!txId || !playProductId) {
      console.error("[iap-credit] 필수 필드 누락:", { txId: !!txId, playProductId: !!playProductId });
      return NextResponse.json({ ok: true, ignored: "missing-fields" });
    }

    // Play 상품 ID → 우리 상품. 미매핑은 로그만 남기고 삼킨다(테스트 상품·오타 등).
    const product = getCoinProductByPlayId(playProductId);
    if (!product) {
      console.error(`[iap-credit] 미매핑 상품 product_id=${playProductId} tx=${txId}`);
      return NextResponse.json({ ok: true, ignored: "unmapped-product" });
    }

    // ★적립 보류: 계정을 특정할 수 없으면 코인을 아무 데나 넣지 않는다.
    //   결제는 이미 끝났으므로 로그가 곧 수동 보정의 근거가 된다.
    if (!KAKAO_UID_RE.test(uid)) {
      console.error(`[iap-credit] ★적립 보류 — app_user_id가 카카오 uid 형식이 아님: "${uid}" tx=${txId} product=${playProductId} coins=${product.coins}`);
      return NextResponse.json({ ok: true, held: "invalid-app-user-id" });
    }

    if (!redis) {
      console.error("[iap-credit] Redis 미설정 — 적립 불가");
      return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
    }

    // ── 멱등 1차: 이미 처리된 거래면 재적립 없이 반환 (RC 재시도 대응) ──
    const orderId = `iap:${txId}`;
    const prior = parseOrderRecord(await redis.get(ORDER_KEY(orderId)));
    if (prior) {
      return NextResponse.json({ ok: true, duplicated: true, added: prior.coins });
    }

    // ── 멱등 2차: SET NX 레이스 가드 (동시 재전송이 1차를 같이 통과한 경우) ──
    const receipt: OrderReceipt = {
      uid,
      provider: "google_play",
      productId: product.id,
      coins: product.coins,
      amount: Number(ev.price_in_purchased_currency ?? product.price),
      at: Date.now(),
      status: "credited",
    };
    const first = await redis.set(ORDER_KEY(orderId), receipt, { nx: true, ex: RECEIPT_TTL_SEC });
    if (first !== "OK") {
      const raced = parseOrderRecord(await redis.get(ORDER_KEY(orderId)));
      return NextResponse.json({ ok: true, duplicated: true, added: raced?.coins ?? 0 });
    }

    const balance = await creditCoins(uid, product.coins, orderId);
    console.log(`[iap-credit] uid=${uid} ${product.id} +${product.coins} → ${balance} tx=${txId}`);
    return NextResponse.json({ ok: true, added: product.coins, balance });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[iap-credit] 오류:", err?.message);
    // ★500을 돌려줘야 RC가 재시도한다 — 일시 장애로 결제가 유실되면 안 된다.
    return NextResponse.json({ error: err?.message || "처리 중 오류" }, { status: 500 });
  }
}
