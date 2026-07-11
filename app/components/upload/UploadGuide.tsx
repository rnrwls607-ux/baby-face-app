"use client";
import { useState, useEffect } from "react";

// 업로드 화면 첫 진입 시 1회만 뜨는 안내 모달.
// "확인했어요!" 를 누르면 localStorage 에 기록해 다음부터 안 뜬다.
// type 별로 키가 분리돼, solo_face 와 generic 은 각각 한 번씩 뜬다.
const KEY_PREFIX = "mospic_guide_";

export default function UploadGuide({
  type,
  accent = "#FF4B7C",
}: {
  type: "solo_face" | "generic";
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const storageKey = KEY_PREFIX + type;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      /* localStorage 접근 불가(시크릿 모드 등) 시 조용히 넘어간다 */
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* 저장 실패해도 모달은 닫는다 */
    }
    setOpen(false);
  };

  if (!open) return null;

  const isSolo = type === "solo_face";
  const good = isSolo
    ? { emoji: "🙂", text: "자연스럽게 살짝 웃는 정면 사진" }
    : { emoji: "☀️", text: "대상이 크고 밝게 나온 사진" };
  const bad = isSolo
    ? { emoji: "🫥", text: "얼굴이 작거나 여럿이 나온 사진" }
    : { emoji: "🌫️", text: "어둡고 흐린 사진" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "24px 20px 20px", maxWidth: 360, width: "100%", maxHeight: "86vh", overflowY: "auto" }}>
        <p style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 900, color: "#191919", textAlign: "center" }}>생성 전에 확인해 주세요</p>

        {/* 좋은 예 / 나쁜 예 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={{ background: "#F1FAF3", border: "1px solid #D6EFDD", borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{good.emoji}</div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, color: "#2E9E52" }}>✅ 이렇게</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "#5A6068", lineHeight: 1.4 }}>{good.text}</p>
          </div>
          <div style={{ background: "#FDF1F1", border: "1px solid #F5D9D9", borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{bad.emoji}</div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 800, color: "#D45757" }}>❌ 피해요</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "#5A6068", lineHeight: 1.4 }}>{bad.text}</p>
          </div>
        </div>

        {/* AI 특성 안내 */}
        <div style={{ background: "#F7F8FA", borderRadius: 14, padding: "14px 14px", marginBottom: isSolo ? 14 : 20 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#191919" }}>이런 결과가 나올 수 있어요</p>
          <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#8A8F99", lineHeight: 1.5 }}>AI 특성상 일부 표현이 기대와 다를 수 있어요</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(isSolo ? ["인물 특징 차이", "포즈 차이", "헤어 차이"] : ["색감 차이", "디테일 차이", "배경 차이"]).map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#7A8095", background: "#fff", border: "1px solid #E7E9EE", borderRadius: 8, padding: "4px 9px" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* solo_face 전용: 첫 사진 안내 */}
        {isSolo && (
          <p style={{ margin: "0 0 18px", fontSize: 12, color: "#7A8095", lineHeight: 1.5, textAlign: "center" }}>
            첫 번째 사진이 결과의 기준이 돼요 — 가장 잘 나온 사진을 첫 번째로
          </p>
        )}

        <button onClick={dismiss} style={{ width: "100%", background: accent, color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          확인했어요!
        </button>
      </div>
    </div>
  );
}
