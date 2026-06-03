"use client";
import { useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { PRODUCT_LIST } from "../lib/products";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

export default function PaymentPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(productId: string, price: number, name: string) {
    try {
      setLoading(productId);
      const tossPayments = await loadTossPayments(CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });

      // 주문번호: 영문/숫자/-/_ 만, 6~64자
      const orderId = "order_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: price },
        orderId,
        orderName: name,
        successUrl: window.location.origin + "/payment/success?productId=" + productId,
        failUrl: window.location.origin + "/payment/fail",
      });
    } catch (e) {
      // 사용자가 결제창을 닫으면 여기로 와요 (에러 아님)
      console.error(e);
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "40px 20px", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111", textAlign: "center", margin: "0 0 8px" }}>이용권 구매</h1>
      <p style={{ fontSize: 14, color: "#999", textAlign: "center", margin: "0 0 32px" }}>퀄리티 좋은 아기 얼굴을 더 만들어보세요</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PRODUCT_LIST.map((p) => (
          <button
            key={p.id}
            onClick={() => handleBuy(p.id, p.price, p.name)}
            disabled={loading !== null}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#F7F7F7", border: "2px solid #EEE", borderRadius: 16,
              padding: "20px 24px", cursor: loading ? "default" : "pointer",
              opacity: loading && loading !== p.id ? 0.5 : 1,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{p.uses}회 생성</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#FF4B7C" }}>
              {loading === p.id ? "..." : p.price.toLocaleString() + "원"}
            </div>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#BBB", textAlign: "center", marginTop: 28, lineHeight: 1.6 }}>
        결제 후 이용 횟수가 자동 충전됩니다.
      </p>
    </div>
  );
}