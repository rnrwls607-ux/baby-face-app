// 코인 충전 — 수단 중립 어댑터의 토스 구현.
// 게이트: COIN_ADMIN_IDS 관리자만 (COIN_CHARGE_OPEN==="true"로 전체 개방 전까지 — 토스 테스트 키 상태).
// 멱등: order:{orderId} SET NX — 같은 주문 재호출은 재적립 없이 현재 잔액만 반환.
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserId } from "../../../lib/auth";
import { getCoinProduct } from "../../../lib/products";
import { ORDER_KEY, chargeAllowed, creditCoins, getBalance, parseOrderRecord, type OrderReceipt } from "../../../lib/coins";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { provider, productId, paymentKey, orderId, amount } = await request.json();

    if (provider !== "toss") {
      return NextResponse.json({ error: "지원하지 않는 결제 수단이에요." }, { status: 400 });
    }
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const uid = getUserId(request);
    if (!uid) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
    if (!redis) return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });

    if (!chargeAllowed(uid)) {
      return NextResponse.json({ error: "충전은 곧 열릴 예정이에요" }, { status: 403 });
    }

    // ── 상품·금액 검증 (기존 confirm 로직 이식) ──
    const product = getCoinProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "알 수 없는 상품입니다." }, { status: 400 });
    }
    if (Number(amount) !== product.price) {
      console.error("[coins/charge] 금액 불일치:", { productId, amount, expected: product.price });
      return NextResponse.json({ error: "결제 금액이 상품 가격과 일치하지 않습니다." }, { status: 400 });
    }

    // ── 멱등 1차: 이미 처리된 주문이면 토스 재승인 시도 없이 즉시 반환 (success 새로고침·재시도 대응) ──
    // ★EXISTS가 아니라 GET으로 읽는다 — 영수증을 그대로 돌려줘야 재시도 화면이
    //   "이미 충전됨(+N코인)"을 사용자에게 보여줄 수 있다. 옛 문자열 형식도 parse가 흡수.
    const prior = parseOrderRecord(await redis.get(ORDER_KEY(orderId)));
    if (prior) {
      return NextResponse.json({
        balance: await getBalance(uid),
        duplicated: true,
        added: prior.coins,
        receipt: prior,
      });
    }

    // ── 토스 서버 승인 ──
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encoded = Buffer.from(secretKey + ":").toString("base64");
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: { Authorization: "Basic " + encoded, "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    if (!tossRes.ok) {
      const err = await tossRes.json();
      console.error("[coins/charge] 토스 승인 실패:", err);
      return NextResponse.json({ error: err.message || "결제 확인에 실패했습니다." }, { status: 400 });
    }

    // ── 멱등 2차: SET NX 레이스 가드 (동시 요청이 1차를 같이 통과한 경우) ──
    // ★값이 곧 영수증이다 — 사후 감사·미적립 판정·관리자 보정의 유일한 1차 근거.
    const receipt: OrderReceipt = {
      uid, provider: "toss", productId: product.id,
      coins: product.coins, amount: Number(amount),
      at: Date.now(), status: "credited",
    };
    const first = await redis.set(ORDER_KEY(orderId), receipt, { nx: true, ex: 60 * 60 * 24 * 365 });
    if (first !== "OK") {
      const raced = parseOrderRecord(await redis.get(ORDER_KEY(orderId)));
      return NextResponse.json({ balance: await getBalance(uid), duplicated: true, added: raced?.coins ?? 0, receipt: raced });
    }

    const balance = await creditCoins(uid, product.coins, orderId);
    console.log(`[coins/charge] uid=${uid} ${productId} +${product.coins} → ${balance}`);
    return NextResponse.json({ balance, added: product.coins });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[coins/charge] 오류:", err?.message);
    return NextResponse.json({ error: err?.message || "결제 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
