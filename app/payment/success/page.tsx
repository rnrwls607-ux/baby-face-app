"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { consumeReturnTo } from "../../lib/returnTo";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [addedUses, setAddedUses] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const isCoinFlow = searchParams.get("flow") === "coin";
  const orderIdParam = searchParams.get("orderId") || "";
  // 402 시트에서 넘어온 경우에만 값이 있다(지갑 충전은 저장하지 않는다).
  // ★렌더 중이 아니라 마운트 시 1회 읽고 즉시 소비한다 — 뒤로가기 재진입에도 중복 발동 0.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => { setReturnTo(consumeReturnTo()); }, []);

  // ★재시도 가능하게 charge 호출을 분리했다. 예전엔 useEffect 안에 묻혀 있어
  //   한 번 실패하면 "홈으로" 말고는 길이 없었고, 홈으로 가는 순간 URL의
  //   paymentKey·orderId가 사라져 영구 미적립이 됐다(결제는 됐는데 코인 0).
  //   charge는 order:{orderId} 멱등이 지키므로 몇 번을 다시 눌러도 중복 적립되지 않는다.
  const runCoinCharge = (paymentKey: string, orderId: string, amount: string, productId: string) => {
    setRetrying(true);
    fetch("/api/coins/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "toss", productId, paymentKey, orderId, amount: Number(amount) }),
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
          setMessage(data.duplicated ? `이미 충전된 결제예요. 현재 잔액 ${data.balance}코인` : `충전 완료! 현재 잔액 ${data.balance}코인`);
          setAddedUses(data.added ?? 0);
        } else {
          setStatus("error");
          setMessage(data.error || "충전 확인에 실패했습니다.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("네트워크 오류로 확인하지 못했어요."); })
      .finally(() => setRetrying(false));
  };

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
      runCoinCharge(paymentKey, orderId, amount, searchParams.get("productId") || "");
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
          {isCoinFlow && returnTo ? (
            /* 402로 막혔던 자리로 복귀 — 만들던 흐름을 이어준다. 지갑은 보조로 내린다.
               replace를 쓰는 이유: 결제 성공 화면을 백스택에 남기면 뒤로가기로 되돌아온다. */
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
              <button onClick={() => router.replace(returnTo)}
                style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.32)" }}>
                이어서 만들기 →
              </button>
              <button onClick={() => router.replace("/?tab=coin")}
                style={{ background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 16, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                코인 지갑 보기
              </button>
            </div>
          ) : (
            <button onClick={() => router.push(isCoinFlow ? "/?tab=coin" : "/")}
              style={{ background: "#111", color: "#fff", border: "none", borderRadius: 16, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              {isCoinFlow ? "코인 지갑으로 →" : "아기 얼굴 만들러가기 →"}
            </button>
          )}
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 56, marginBottom: 20 }}>😢</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>충전을 확인하지 못했어요</p>
          <p style={{ fontSize: 14, color: "#999", margin: "0 0 16px" }}>{message}</p>
          {/* ★결제가 이미 됐을 수 있으므로 화면을 닫으면 안 된다는 걸 먼저 알린다.
              닫는 순간 URL의 결제 정보가 사라져 스스로 복구할 방법이 없어진다. */}
          {isCoinFlow && orderIdParam && (
            <p style={{ fontSize: 13, color: "#FF4B7C", fontWeight: 700, background: "#FFF5F8", border: "1px solid #FFE0EC", borderRadius: 12, padding: "11px 16px", margin: "0 0 22px", lineHeight: 1.5 }}>
              결제가 이미 완료됐을 수 있어요.<br />이 화면을 닫지 말고 아래 &lsquo;다시 시도&rsquo;를 눌러주세요.
            </p>
          )}
          {isCoinFlow && orderIdParam && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300, marginBottom: 18 }}>
              <button onClick={() => {
                const pk = searchParams.get("paymentKey"); const oid = searchParams.get("orderId"); const amt = searchParams.get("amount");
                if (!pk || !oid || !amt) return;
                setStatus("loading"); setMessage("");
                runCoinCharge(pk, oid, amt, searchParams.get("productId") || "");
              }} disabled={retrying}
                style={{ background: retrying ? "#E8E9ED" : "#111", color: retrying ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "15px 0", fontSize: 15, fontWeight: 700, cursor: retrying ? "not-allowed" : "pointer" }}>
                {retrying ? "확인 중..." : "다시 시도"}
              </button>
              <button onClick={() => {
                const subject = encodeURIComponent(`[MOSPIC] 코인 충전 문의 (주문번호 ${orderIdParam})`);
                const body = encodeURIComponent(`주문번호: ${orderIdParam}\n결제는 됐는데 코인이 들어오지 않았습니다.\n\n(아래에 상황을 적어주세요)\n`);
                window.location.href = `mailto:rnrwls159@naver.com?subject=${subject}&body=${body}`;
              }}
                style={{ background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 16, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                문의하기
              </button>
            </div>
          )}
          <button onClick={() => router.push("/")}
            style={{ background: "none", color: "#8A8F98", border: "none", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
