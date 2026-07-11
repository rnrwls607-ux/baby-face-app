"use client";

// 결과 미리보기 카드 — 회색 카드 안에 "결과 예시" 라벨 + 이미지(또는 플레이스홀더),
// 아래에 흰 캡션 바(✦ + 카피).
// image 가 없으면 placeholder 이모지를 흐리게 보여준다.
export default function PreviewCard({
  image,
  caption,
  placeholder,
  accent = "#FF4B7C",
}: {
  image?: string;
  caption: string;
  placeholder?: string;
  accent?: string;
}) {
  return (
    <div style={{ background: "#EAEAEE", borderRadius: 20, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "rgba(255,255,255,0.9)", color: "#8A8F99", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8 }}>결과 예시</span>
        {image
          ? <img src={image} alt="결과 예시" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 46, opacity: 0.3 }}>{placeholder ?? "🖼️"}</span>}
      </div>
      <div style={{ background: "#fff", margin: "0 10px 10px", borderRadius: 14, padding: "13px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#191919", lineHeight: 1.4 }}>
          <span style={{ color: accent, marginRight: 5 }}>✦</span>{caption}
        </p>
      </div>
    </div>
  );
}
