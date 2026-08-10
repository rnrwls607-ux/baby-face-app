"use client";
// 칩 재생성 확인 시트 — 결과 화면에서 칩 탭 한 번이 곧 과금(재생성)이라 오조작 비용이 크다.
// 확인 1회를 끼워 무단 차감 체감을 없앤다. 최초 생성 버튼(명시적 CTA)은 기존 정책대로 확인 없음.
// 문법: CoinNeededSheet와 동일한 바텀시트 규격(오버레이 0.4 · 라운드 24 · 핸들 · zIndex 130 · useBackClose).
// cost는 호출부가 concepts.ts의 coinCost를 그대로 넘긴다 — 이 파일에 숫자 하드코딩 금지.
import { useBackClose } from "../lib/useBackClose";

export default function RegenConfirmSheet({ open, question, cost, onConfirm, onCancel }: {
  open: boolean;
  question: string;
  cost: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // 뒤로가기 → 시트만 닫기(취소와 동일 — 생성·차감 없음)
  useBackClose(open, onCancel);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>{question}</p>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>코인 {cost}개가 사용돼요</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>취소</button>
          <button onClick={onConfirm}
            style={{ flex: 1.6, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>만들기 · {cost}코인</button>
        </div>
      </div>
    </div>
  );
}
