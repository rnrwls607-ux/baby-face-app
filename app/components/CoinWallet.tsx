"use client";
// 코인 지갑 (읽기 전용 1단계): 잔액 + 최근 내역 20건. 충전은 다음 단계에서 붙는다.
import { useEffect, useState } from "react";
import { CONCEPTS } from "../lib/concepts";

type CoinLogEntry = { type: "welcome" | "charge" | "spend" | "refund"; amount: number; ref?: string; at: number };

const TYPE_LABEL: Record<CoinLogEntry["type"], string> = {
  welcome: "웰컴 코인",
  spend: "사용",
  charge: "충전",
  refund: "반환",
};

function entryLabel(e: CoinLogEntry): string {
  if (e.type === "spend" && e.ref) {
    const concept = CONCEPTS[e.ref];
    return `${concept ? concept.title : e.ref} 사용`;
  }
  return TYPE_LABEL[e.type] ?? e.type;
}

function formatDate(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function CoinWallet({ loggedIn, onLogin }: { loggedIn: boolean; onLogin: () => void }) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [log, setLog] = useState<CoinLogEntry[]>([]);

  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    fetch("/api/coins")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBalance(typeof d.balance === "number" ? d.balance : 0);
          setLog(Array.isArray(d.log) ? d.log : []);
        }
      })
      .catch(() => { /* 표시 실패해도 화면은 유지 */ })
      .finally(() => setLoading(false));
  }, [loggedIn]);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ padding: "18px 16px 0", textAlign: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#191919" }}>코인</span>
      </div>
      <div style={{ padding: "16px 16px 100px" }}>
        {!loggedIn ? (
          <div style={{ background: "#FFFBE6", border: "1px solid #FEE500", borderRadius: 18, padding: 24, textAlign: "center", marginTop: 8 }}>
            <span style={{ fontSize: 40 }}>🪙</span>
            <p style={{ fontWeight: 700, color: "#111", margin: "10px 0 12px", fontSize: 15 }}>로그인하고 웰컴 코인 3개 받기</p>
            <button onClick={onLogin} style={{ background: "#FEE500", border: "none", borderRadius: 24, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#111" }}>
              카카오로 시작하기
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>🪙</span>
            <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>불러오는 중...</p>
          </div>
        ) : (
          <>
            <div style={{ background: "#FFF5F8", border: "1px solid #FFE0EC", borderRadius: 18, padding: "24px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#999", margin: "0 0 6px", fontWeight: 600 }}>보유 코인</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#191919", margin: 0, lineHeight: 1.1 }}>
                🪙 <span style={{ color: "#FF4B7C" }}>{balance}</span>
              </p>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#191919", margin: "24px 2px 10px" }}>최근 내역</p>
            {log.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>아직 내역이 없어요</p>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 18, overflow: "hidden" }}>
                {log.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: i < log.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#333", margin: 0 }}>{entryLabel(e)}</p>
                      <p style={{ fontSize: 12, color: "#bbb", margin: "2px 0 0" }}>{formatDate(e.at)}</p>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: e.amount > 0 ? "#FF4B7C" : "#666" }}>
                      {e.amount > 0 ? `+${e.amount}` : `−${Math.abs(e.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
