"use client";

// 개인정보 안내 한 줄.
export default function PrivacyLine() {
  return (
    <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, margin: "14px 0 0", fontSize: 11.5, color: "#9AA0AA", fontWeight: 500 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      업로드한 사진은 결과 생성에만 사용돼요
    </p>
  );
}
