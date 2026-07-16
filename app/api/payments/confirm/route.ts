import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getProduct } from "../../../lib/products";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try {
    const user = JSON.parse(cookie.value);
    return user.id ? String(user.id) : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  // ⛔ 410 봉인 (2026-07-17): 이용권(bonus) 체계는 코인으로 세대교체됨 — 충전은 /api/coins/charge.
  // 봉인 시점 bonus 실보유자는 MJ 테스트 계정 1건뿐임을 Redis 전수 조회로 확인. 테스트 키 무료 적립 구멍 차단.
  return NextResponse.json({ error: "이용권 판매가 종료됐어요. 코인 충전을 이용해주세요." }, { status: 410 });
  /* ── 봉인된 옛 본문 (참고용 보존 — 코인 charge 어댑터에 이식됨) ──
  try {
    const { paymentKey, orderId, amount, productId } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // ── 보안 검증: 상품이 유효하고, 낸 금액 == 상품 가격인지 확인 ──
    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "알 수 없는 상품입니다." }, { status: 400 });
    }
    if (Number(amount) !== product.price) {
      console.error("금액 불일치:", { productId, amount, expected: product.price });
      return NextResponse.json({ error: "결제 금액이 상품 가격과 일치하지 않습니다." }, { status: 400 });
    }

    // 토스페이먼츠 결제 확인
    const secretKey = process.env.TOSS_SECRET_KEY!;
    const encoded = Buffer.from(secretKey + ":").toString("base64");

    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: "Basic " + encoded,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json();
      console.error("토스 결제 확인 실패:", err);
      return NextResponse.json({ error: err.message || "결제 확인에 실패했습니다." }, { status: 400 });
    }

    const payment = await tossRes.json();
    console.log("결제 완료:", payment.orderId, payment.amount);

    // 구매 횟수 Redis에 추가
    const bonusKey = "bonus:" + userId;
    const current = (await redis.get<number>(bonusKey)) ?? 0;
    await redis.set(bonusKey, current + product.uses, { ex: 60 * 60 * 24 * 365 }); // 1년

    // 결제 내역 저장
    const historyKey = "payment:" + userId + ":" + orderId;
    await redis.set(historyKey, JSON.stringify({
      orderId,
      amount: payment.amount,
      productId,
      productName: product.name,
      uses: product.uses,
      paidAt: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 365 });

    return NextResponse.json({
      success: true,
      message: `${product.name} 구매 완료!`,
      addedUses: product.uses,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("결제 처리 오류:", err);
    return NextResponse.json({ error: err.message || "결제 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  ── 봉인 끝 ── */
}