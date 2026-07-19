"use client";
// 코인 지갑: 잔액 + 최근 내역 20건 + 충전(서버 canCharge 판정 시에만 노출 — 토스 테스트 키 동안 관리자 전용).
import { useEffect, useState } from "react";
import { CONCEPTS } from "../lib/concepts";
import { COIN_PRODUCT_LIST } from "../lib/products";
import CoinIcon from "./CoinIcon";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

type CoinLogEntry = { type: "welcome" | "charge" | "spend" | "refund"; amount: number; ref?: string; at: number };

const TYPE_LABEL: Record<CoinLogEntry["type"], string> = {
  welcome: "웰컴 코인",
  spend: "사용",
  charge: "충전",
  refund: "반환",
};

// 내역 행 좌측 원형 아이콘칩 — 이모지 금지, 텍스트 글리프만 (충전↑핑크 / 사용↓회색 / 웰컴✦민트 / 반환↺회색)
const TYPE_CHIP: Record<CoinLogEntry["type"], { bg: string; color: string; glyph: string }> = {
  charge: { bg: "#FFF0F3", color: "#FF4B7C", glyph: "↑" },
  spend: { bg: "#F3F4F6", color: "#8A8F98", glyph: "↓" },
  welcome: { bg: "#E9F6F5", color: "#4FA8A2", glyph: "✦" },
  refund: { bg: "#F3F4F6", color: "#8A8F98", glyph: "↺" },
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
  const [canCharge, setCanCharge] = useState(false);
  const [showChargeSheet, setShowChargeSheet] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    fetch("/api/coins")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBalance(typeof d.balance === "number" ? d.balance : 0);
          setLog(Array.isArray(d.log) ? d.log : []);
          setCanCharge(d.canCharge === true);
        }
      })
      .catch(() => { /* 표시 실패해도 화면은 유지 */ })
      .finally(() => setLoading(false));
  }, [loggedIn]);

  const handleCharge = async (productId: string) => {
    const product = COIN_PRODUCT_LIST.find((p) => p.id === productId);
    if (!product) return;
    setPaying(productId);
    try {
      const { loadTossPayments } = await import("@tosspayments/payment-sdk");
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const orderId = "coin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      await tossPayments.requestPayment("카드", {
        amount: product.price,
        orderId,
        orderName: "MOSPIC " + product.name,
        successUrl: window.location.origin + "/payment/success?flow=coin&productId=" + productId,
        failUrl: window.location.origin + "/payment/fail",
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        alert("결제 중 오류가 발생했어요: " + (err?.message || ""));
      }
    } finally {
      setPaying(null);
    }
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ padding: "18px 16px 0", textAlign: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#191919" }}>코인</span>
      </div>
      <div style={{ padding: "16px 16px 100px" }}>
        {!loggedIn ? (
          <div style={{ background: "#FFFBE6", border: "1px solid #FEE500", borderRadius: 18, padding: 24, textAlign: "center", marginTop: 8 }}>
            <CoinIcon size={40} />
            <p style={{ fontWeight: 700, color: "#111", margin: "10px 0 12px", fontSize: 15 }}>로그인하고 웰컴 코인 3개 받기</p>
            <button onClick={onLogin} style={{ background: "#FEE500", border: "none", borderRadius: 24, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#111" }}>
              카카오로 시작하기
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, opacity: 0.5 }}>
            <CoinIcon size={32} />
            <p style={{ fontSize: 13, color: "#8A8F98", margin: 0 }}>불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 잔액 카드 — 흰 카드·정돈 톤, 핑크는 충전하기 버튼 한 곳만 */}
            <div style={{ background: "#fff", border: "1px solid #EFF0F3", borderRadius: 18, padding: "16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <CoinIcon size={40} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "#8A8F98", margin: "0 0 2px", fontWeight: 600 }}>내 코인</p>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#191919", margin: 0, lineHeight: 1.1 }}>{balance}</p>
              </div>
              {/* 충전 입구는 전원 노출 — 결제 가능 여부는 시트 안에서 정직하게 안내 (canCharge) */}
              <button onClick={() => setShowChargeSheet(true)}
                style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                충전하기
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#191919", margin: "24px 2px 8px" }}>최근 내역</p>
            {log.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 13, color: "#8A8F98", margin: 0 }}>아직 내역이 없어요</p>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #EFF0F3", borderRadius: 18, overflow: "hidden" }}>
                {log.map((e, i) => {
                  const chip = TYPE_CHIP[e.type] ?? TYPE_CHIP.spend;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < log.length - 1 ? "1px solid #F5F5F6" : "none" }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", background: chip.bg, color: chip.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{chip.glyph}</span>
                      <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#191919", margin: 0 }}>{entryLabel(e)}</p>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: e.amount > 0 ? "#FF4B7C" : "#8A8F98", margin: 0 }}>
                          {e.amount > 0 ? `+${e.amount}` : `−${Math.abs(e.amount)}`}
                        </p>
                        <p style={{ fontSize: 11, color: "#B6BAC2", margin: "1px 0 0" }}>{formatDate(e.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {showChargeSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowChargeSheet(false); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>코인 충전</p>
            <p style={{ fontSize: 13, color: "#FF4B7C", fontWeight: 700, margin: "0 0 2px" }}>🎉 런칭 기념 40% 할인</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>충전한 코인은 1년간 유효해요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {COIN_PRODUCT_LIST.map((product) => (
                <button key={product.id}
                  onClick={() => { if (canCharge) { setShowChargeSheet(false); handleCharge(product.id); } }}
                  disabled={!canCharge || paying === product.id}
                  style={{ width: "100%", background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", cursor: canCharge ? "pointer" : "default", textAlign: "left", transition: "all .2s", opacity: canCharge ? 1 : 0.55 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, background: product.tag === "베스트" ? "#FF4B7C" : "#111", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                        {product.tag}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{product.name}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#999", margin: 0 }}>코인당 {Math.round(product.price / product.coins).toLocaleString()}원</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "#bbb", margin: "0 0 2px", textDecoration: "line-through" }}>
                      {product.listPrice.toLocaleString()}원
                    </p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#FF4B7C", margin: 0 }}>
                      <span style={{ fontSize: 12, background: "#FFF0F3", color: "#FF4B7C", padding: "2px 6px", borderRadius: 4, fontWeight: 800, marginRight: 6, verticalAlign: "middle" }}>{product.discountPct}%</span>
                      {product.price.toLocaleString()}원
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {!canCharge && (
              <p style={{ fontSize: 13, color: "#999", fontWeight: 600, textAlign: "center", margin: "16px 0 0" }}>충전은 앱 정식 출시와 함께 열려요 🚀</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
