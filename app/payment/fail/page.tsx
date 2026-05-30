"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message") || "결제가 취소됐거나 실패했어요.";

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>😢</div>
      <p style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>결제에 실패했어요</p>
      <p style={{ fontSize: 14, color: "#999", margin: "0 0 28px" }}>{message}</p>
      <button onClick={() => router.push("/")}
        style={{ background: "#111", color: "#fff", border: "none", borderRadius: 16, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        홈으로 돌아가기
      </button>
    </div>
  );
}

export default function PaymentFailPage() {
  return <Suspense fallback={<div />}><FailContent /></Suspense>;
}
