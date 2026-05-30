import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// 상품 정의
const PRODUCTS: { [key: string]: { uses: number; name: string } } = {
  "3uses":  { uses: 3,  name: "3회 이용권" },
  "10uses": { uses: 10, name: "10회 이용권" },
  "30uses": { uses: 30, name: "무제한 이용권 (30회)" },
};

function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try {
    const user = JSON.parse(cookie.value);
    return user.id ? String(user.id) : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount, productId } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다." }, { status: 400 });
    }

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
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
    const product = PRODUCTS[productId] || { uses: 3, name: "이용권" };
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
}
