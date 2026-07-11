"use client";

// 업로드 화면 상단의 ①사진 올리기 ②AI 변환 ③저장 스텝 표시.
// current = 현재 단계 (업로드 화면에서는 보통 1).
const STEPS = [
  { n: 1, label: "사진 올리기" },
  { n: 2, label: "AI 변환" },
  { n: 3, label: "저장" },
];

export default function StepIndicator({ current = 1, accent = "#FF4B7C" }: { current?: number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 4, margin: "14px 0 24px" }}>
      {STEPS.map((s, i) => {
        const active = s.n === current;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%",
              background: active ? accent : "#EAEBEE",
              color: active ? "#fff" : "#B0B4BB",
              fontSize: 11, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{s.n}</span>
            <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "#191919" : "#B0B4BB" }}>{s.label}</span>
            {i < STEPS.length - 1 && <span style={{ width: 16, height: 1, background: "#E2E4E8", margin: "0 4px" }} />}
          </div>
        );
      })}
    </div>
  );
}
