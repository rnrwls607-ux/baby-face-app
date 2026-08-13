"use client";
// 코인 부족(402) 전역 충전 유도 시트 — Toast 관례(window 이벤트)로 어느 route 페이지에서든 뜬다.
// canCharge(서버 판정)면 CoinWallet과 동일한 토스 결제 경로, 아니면 지갑 안내로 폴백.
import { useEffect, useState } from "react";
import { COIN_SHEET_EVENT, type CoinSheetDetail } from "../lib/coinSheet";
import { COIN_PRODUCT_LIST } from "../lib/products";
import { useBackClose } from "../lib/useBackClose";
import { WELCOME_COINS } from "../lib/coin-constants"; // ★coins.ts 금지 — Redis SDK가 클라 번들에 딸려온다
import { saveReturnTo } from "../lib/returnTo";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

export default function CoinNeededSheet() {
  const [detail, setDetail] = useState<CoinSheetDetail | null>(null);
  const [canCharge, setCanCharge] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  // ★기본 true = 소프트 로그인 줄 숨김. 판정 실패 시 이 값이 남아,
  //   이미 로그인한 사람에게 로그인을 권하는 오판이 절대 나지 않는다.
  const [loggedIn, setLoggedIn] = useState(true);
  // 뒤로가기 → 시트만 닫기 (기존 오버레이 관례)
  useBackClose(!!detail, () => setDetail(null));

  useEffect(() => {
    const onOpen = (e: Event) => {
      setDetail((e as CustomEvent<CoinSheetDetail>).detail);
      fetch("/api/coins")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setCanCharge(d?.canCharge === true))
        .catch(() => { /* 판정 실패 시 폴백(지갑 안내) 유지 */ });
      // 게스트 판정 — /api/coins의 canCharge로는 못 가른다(로그인 사용자도 충전 잠금이면 false).
      // 마운트가 아니라 오픈 시 1회만 부른다.
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setLoggedIn(d?.loggedIn !== false))
        .catch(() => { /* 실패 시 기본 true 유지 = 줄 숨김 */ });
    };
    window.addEventListener(COIN_SHEET_EVENT, onOpen);
    return () => window.removeEventListener(COIN_SHEET_EVENT, onOpen);
  }, []);

  if (!detail) return null;

  const handleCharge = async (productId: string) => {
    const product = COIN_PRODUCT_LIST.find((p) => p.id === productId);
    if (!product) return;
    setPaying(productId);
    // 이 시트는 402(코인 부족)로만 열린다 = 뭔가 만들다 막힌 자리다. 충전 후 그 자리로 돌려보낸다.
    // ★지갑 탭 충전은 이 경로를 안 타므로 저장되지 않는다(지갑에서 온 사람은 지갑으로 복귀).
    saveReturnTo(window.location.pathname);
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
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>코인이 부족해요</p>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 2px" }}>필요 {detail.need}코인 · 보유 {detail.balance}코인</p>
        {/* 게스트에게만 보이는 소프트 로그인 줄 — 강요하지 않는다.
            테두리·회색 톤이라 아래 상품 버튼(핑크)보다 시각 위계가 낮다.
            코인 수는 서버 상수를 그대로 쓴다(하드코딩 금지). */}
        {!loggedIn && (
          <div style={{ margin: "12px 0 4px", padding: "12px 14px", border: "1.5px solid #F0F0F0", borderRadius: 14 }}>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 8px", lineHeight: 1.6 }}>
              카카오 로그인하면 웰컴 코인 {WELCOME_COINS}개를 드려요 · 만든 사진도 계정에 보존돼요
            </p>
            <button onClick={() => { window.location.replace("/api/auth/kakao"); }}
              style={{ width: "100%", background: "#fff", color: "#111", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              카카오로 시작하기
            </button>
          </div>
        )}
        <p style={{ fontSize: 13, color: "#FF4B7C", fontWeight: 700, margin: "0 0 16px" }}>🎉 런칭 기념 40% 할인</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {COIN_PRODUCT_LIST.map((product) => (
            <button key={product.id}
              onClick={() => { if (canCharge) { setDetail(null); handleCharge(product.id); } }}
              disabled={paying === product.id}
              style={{ width: "100%", background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", cursor: canCharge ? "pointer" : "default", textAlign: "left", transition: "all .2s" }}>
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
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 10px", fontWeight: 600 }}>충전은 앱 정식 출시와 함께 열려요 🚀</p>
            <button onClick={() => { window.location.replace("/?tab=coin"); }}
              style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              코인 지갑 보기
            </button>
          </div>
        )}
        <button onClick={() => setDetail(null)}
          style={{ width: "100%", marginTop: 10, background: "#fff", color: "#9B9B9B", border: "none", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          닫기
        </button>
      </div>
    </div>
  );
}
