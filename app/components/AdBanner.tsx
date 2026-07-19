"use client";
// 광고 슬롯 — 현재 하우스 광고. 실광고는 이 파일에서 SDK 교체(후보: Kakao AdFit 웹 배너 — 웹뷰 호환).
// ★유료 컨셉 화면 배치 금지 원칙 (무료 기능 전용). slot은 지면 식별용 — 실광고 연결 지점.
export default function AdBanner({ slot }: { slot: string }) {
  return (
    <div
      data-ad-slot={slot}
      onClick={() => { window.location.href = "/"; }}
      style={{ position: "relative", width: "100%", height: 76, borderRadius: 18, overflow: "hidden", cursor: "pointer", background: "linear-gradient(120deg, #191919 0%, #3A3A3A 100%)", marginBottom: 14 }}>
      {/* 이미지 실패 시 display:none → 그라데이션 폴백 (텍스트 유지) */}
      <img src="/hero/hero_biz.jpg" alt="" loading="lazy" decoding="async"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 50%" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)" }} />
      <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
        <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: 1 }}>MOSPIC STUDIO</p>
        <p style={{ margin: "3px 0 0", fontSize: 14.5, color: "#fff", fontWeight: 800 }}>사진관 안 가도, 사진관보다 잘 나오게.</p>
      </div>
      <span style={{ position: "absolute", right: 8, top: 8, background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8 }}>AD</span>
    </div>
  );
}
