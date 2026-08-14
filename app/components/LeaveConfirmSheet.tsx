"use client";
// 생성 중 이탈 확인 시트 — useLeaveGuard가 열고 닫는다(순수 표시용).
// 문법: CoinNeededSheet·RegenConfirmSheet와 동일한 바텀시트 규격
// (오버레이 0.4 · 라운드 24 · 핸들 · zIndex 130).
// ★여기서 useBackClose를 부르지 않는다 — 히스토리 칸은 useLeaveGuard의 2단 가드가 소유한다.
//
// 문구 원칙: 차감은 "생성 성공 시점"에 일어난다. 아직 안 나간 코인을 나갔다고
// 말하지 않는다 — 나가도 생성이 계속되고, 완성되면 코인이 사용된다는 사실 그대로.

export default function LeaveConfirmSheet({ open, coin, onStay, onLeave }: {
  open: boolean;
  coin: boolean; // 코인 컨셉(COIN_GATED && COIN_COST > 0) — 무료 도구는 코인 문장을 뺀다
  onStay: () => void;
  onLeave: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onStay(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 8px" }}>사진이 만들어지고 있어요 🎨</p>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px", lineHeight: 1.6 }}>
          {coin
            ? "지금 나가도 생성은 계속 진행돼요. 완성되면 코인이 사용되고, 히스토리에 자동 저장돼요."
            : "지금 나가도 작업은 계속 진행되고, 완성되면 히스토리에 저장돼요."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLeave}
            style={{ flex: 1, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>나가기</button>
          <button onClick={onStay}
            style={{ flex: 1.6, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>계속 기다리기</button>
        </div>
      </div>
    </div>
  );
}
