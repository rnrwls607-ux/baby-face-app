"use client";
import type { GateState } from "../lib/gate";

// 썸네일 위에 얹는 게이트 상태 표시.
// 부모 <div> 에 position: relative 가 이미 있어서 그 칸에만 덮인다.
// pass 이거나 상태가 없으면 아무것도 그리지 않는다 (지금과 똑같은 화면).
export default function GateBadge({ gate }: { gate?: GateState }) {
  if (!gate || gate.status === "pass") return null;

  const checking = gate.status === "checking";
  const label = checking ? "확인 중…" : `⚠️ ${gate.reasons[0] ?? "확인 필요"}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: checking ? "rgba(0,0,0,0.38)" : "rgba(240,140,0,0.32)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: "none",   // × 버튼을 가리지 않는다
      }}
    >
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(0,0,0,0.62)",
          borderRadius: 6,
          padding: "2px 4px",
          margin: 4,
          textAlign: "center",
          lineHeight: 1.25,
          maxWidth: "92%",
        }}
      >
        {label}
      </span>
    </div>
  );
}
