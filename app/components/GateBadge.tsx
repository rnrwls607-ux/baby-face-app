"use client";
import type { GateState } from "../lib/gate";
import { FACE_WARN_COLOR } from "./FaceCheckNote";

// 썸네일 위 게이트 표시 (B안, 2026-08-14 MJ 확정).
//
// ★사진을 절대 덮지 않는다. 이전 버전은 검사 중엔 검은 커튼(0.38), soft_fail엔
//   오렌지 커튼(0.32)으로 타일을 통째로 가렸다 — 사용자가 뭘 고쳐야 할지 대조하려면
//   그 사진을 봐야 하는데, 바로 그 사진을 가리고 있었다.
//
// 지금 남기는 것은 두 개뿐이다: 문제 사진을 짚는 링 + 아래 안내 카드와 이어주는 번호.
// 사유 문구·다음 행동은 FaceCheckNote(카드 아래)가 맡는다.
// 검사 중은 아무것도 그리지 않는다 — 진행 표시는 카드 아래 잔잔한 줄로 옮겼다.
export default function GateBadge({ gate, index }: { gate?: GateState; index?: number }) {
  if (!gate || gate.status !== "soft_fail") return null;

  return (
    <>
      {/* 부모 타일(radius 12, overflow hidden)의 테두리 위에 겹치는 링 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `2px solid ${FACE_WARN_COLOR}`,
          borderRadius: 11,
          pointerEvents: "none",   // × 버튼을 가리지 않는다
          zIndex: 2,
        }}
      />
      {typeof index === "number" && (
        <span
          style={{
            position: "absolute",
            left: 5,
            bottom: 5,
            zIndex: 3,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: FACE_WARN_COLOR,
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {index + 1}
        </span>
      )}
    </>
  );
}
