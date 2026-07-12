"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10, borderBottom: "1px solid #EFF0F3" }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>개인정보 처리방침</span>
      </div>
      <div style={{ padding: "18px 18px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#191919", margin: "0 0 6px" }}>준비 중이에요</p>
          <p style={{ fontSize: 13, color: "#9B9B9B", margin: 0, lineHeight: 1.6 }}>개인정보 처리방침 내용을 곧 채워 넣을 예정이에요.</p>
        </div>
      </div>
    </div>
  );
}
