"use client";
// 비로그인(401) 전역 로그인 유도 시트 — CoinNeededSheet와 같은 관례(window 이벤트)로
// 어느 생성 페이지에서든 뜬다. 규격도 402 시트와 동일하다(오버레이 농도·시트 라운드·
// 핸들·타이틀/서브 크기·CTA 색) — 새 색·폰트를 도입하지 않는다.
//
// 왜 필요했나: withCoin·withDailyFree는 비로그인에 401 "로그인이 필요해요"를 준다.
// 그런데 페이지들은 그걸 빨간 에러 박스로만 띄워, 사용자가 로그인 입구를 못 찾는
// 막다른 골목이었다. 히어로 "무료" 탭으로 들어온 nukki·upscale 유입자도 같은 벽을 만났다.
import { useEffect, useState } from "react";
import { LOGIN_SHEET_EVENT } from "../lib/loginSheet";
import { WELCOME_COINS } from "../lib/coin-constants"; // ★coins.ts 금지 — Redis SDK가 클라 번들에 딸려온다
import { useBackClose } from "../lib/useBackClose";

export default function LoginNeededSheet() {
  const [open, setOpen] = useState(false);
  // 뒤로가기 → 시트만 닫기 (페이지 이탈 방지) — 402 시트와 같은 관례
  useBackClose(open, () => setOpen(false));

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(LOGIN_SHEET_EVENT, onOpen);
    return () => window.removeEventListener(LOGIN_SHEET_EVENT, onOpen);
  }, []);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>카카오 로그인이 필요해요</p>
        {/* 코인 수는 서버 상수를 그대로 쓴다 — 여기서 3을 하드코딩하지 않는다 */}
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>첫 로그인 시 웰컴 코인 {WELCOME_COINS}개를 드려요 🎁</p>
        {/* 로그인 후에는 홈으로 돌아온다 — /api/auth/kakao가 returnTo를 받지 않는다(백로그).
            웰컴 모달이 홈에 뜨므로 착지로도 성립한다. */}
        <button onClick={() => { window.location.replace("/api/auth/kakao"); }}
          style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          카카오로 3초 만에 시작하기
        </button>
        <button onClick={() => setOpen(false)}
          style={{ width: "100%", marginTop: 10, background: "#fff", color: "#9B9B9B", border: "none", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
