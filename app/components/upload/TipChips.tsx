"use client";
import type { ReactNode } from "react";

// 촬영 팁 아이콘 칩 3개. 페이지는 { icon: "face"|"sun"|..., label } 를 넘긴다.
const ICONS: Record<string, ReactNode> = {
  face: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="11" r="3" /><path d="M7.5 18a4.5 4.5 0 0 1 9 0" />
    </svg>
  ),
  sun: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  eye: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  expand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  level: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" /><circle cx="12" cy="12" r="1.6" /><path d="M6 9.5v5M18 9.5v5" />
    </svg>
  ),
};

export default function TipChips({ tips }: { tips: { icon: string; label: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
      {tips.map((t, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #EFF0F3", borderRadius: 14, padding: "13px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#8A8F99", display: "flex" }}>{ICONS[t.icon] ?? ICONS.face}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#5A6068", textAlign: "center", lineHeight: 1.2 }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
