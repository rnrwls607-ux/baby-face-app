"use client";
// 루트 레이아웃까지 깨진 경우의 최후 화면.
// ★여기서는 layout.tsx가 안 돌아가므로 <html>·<body>를 직접 그려야 하고,
//   CSS 변수·폰트도 못 믿으니 스타일을 전부 인라인으로 둔다.
import { useEffect, useState } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/diag/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message || "(메시지 없음)",
        digest: error?.digest,
        stack: error?.stack,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    })
      .then((r) => r.json())
      .then((d) => setId(d?.id ?? null))
      .catch(() => {});
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#fff", color: "#191919", fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>잠시 문제가 생겼어요</h1>
            <p style={{ fontSize: 15, color: "#7C7C7C", lineHeight: 1.6, margin: "0 0 20px" }}>
              다시 시도해도 안 되면 아래 번호와 함께 알려주세요.
            </p>
            <div style={{ background: "#F7F6F4", borderRadius: 12, padding: "14px 16px", marginBottom: 22 }}>
              <span style={{ fontSize: 13, color: "#7C7C7C" }}>번호 </span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".04em" }}>{id ?? "…"}</span>
            </div>
            <button onClick={reset}
              style={{ width: "100%", padding: "15px 0", background: "#FF4F8B", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              다시 시도
            </button>
            <button onClick={() => { window.location.href = "/"; }}
              style={{ width: "100%", padding: "15px 0", marginTop: 10, background: "none", color: "#7C7C7C", border: "1px solid #ECEAE6", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              홈으로
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
