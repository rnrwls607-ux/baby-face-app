"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [addedUses, setAddedUses] = useState(0);
  const isCoinFlow = searchParams.get("flow") === "coin";

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const flow = searchParams.get("flow");

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    // ── 코인 충전 흐름 (flow=coin) ──
    if (flow === "coin") {
      const productId = searchParams.get("productId") || "";
      fetch("/api/coins/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "toss", productId, paymentKey, orderId, amount: Number(amount) }),
      })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (ok) {
            setStatus("success");
            setMessage(`충전 완료! 현재 잔액 ${data.balance}코인`);
            setAddedUses(data.added ?? 0);
          } else {
            setStatus("error");
            setMessage(data.error || "충전 확인에 실패했습니다.");
          }
        })
        .catch(() => { setStatus("error"); setMessage("오류가 발생했습니다."); });
      return;
    }

    // ── 기존 이용권 흐름 (보존) ──
    const productId = searchParams.get("productId") || "3uses";
    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), productId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message);
          setAddedUses(data.addedUses);
        } else {
          setStatus("error");
          setMessage(data.error || "결제 확인에 실패했습니다.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("오류가 발생했습니다."); });
  }, [searchParams]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      {status === "loading" && (
        <>
          <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>결제 확인 중...</p>
          <p style={{ fontSize: 14, color: "#999", marginTop: 8 }}>잠시만 기다려주세요</p>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#111", margin: "0 0 8px" }}>결제 완료!</p>
          <p style={{ fontSize: 15, color: "#666", margin: "0 0 24px" }}>{message}</p>
          <div style={{ background: "#F7F7F7", borderRadius: 16, padding: "16px 24px", marginBottom: 28 }}>
            <p style={{ fontSize: 14, color: "#888", margin: "0 0 4px" }}>{isCoinFlow ? "충전된 코인" : "추가된 이용 횟수"}</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: "#FF4B7C", margin: 0 }}>+{addedUses}{isCoinFlow ? "코인" : "회"}</p>
          </div>
          <button onClick={() => router.push(isCoinFlow ? "/?tab=coin" : "/")}
            style={{ background: "#111", color: "#fff", border: "none", borderRadius: 16, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {isCoinFlow ? "코인 지갑으로 →" : "아기 얼굴 만들러가기 →"}
          </button>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 56, marginBottom: 20 }}>😢</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>결제에 실패했어요</p>
          <p style={{ fontSize: 14, color: "#999", margin: "0 0 28px" }}>{message}</p>
          <button onClick={() => router.push("/")}
            style={{ background: "#111", color: "#fff", border: "none", borderRadius: 16, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            홈으로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>로딩 중...</div>}><SuccessContent /></Suspense>;
}
