"use client";
// 라우트 렌더 에러 화면. 이게 없으면 Next 내장 영문 페이지
// ("A server error occurred. Reload to try again.")가 그대로 사용자에게 뜬다 — 2026-09-03 사고.
//
// ★마운트 시 서버에 에러를 접수해 번호를 받는다. 사용자는 그 번호만 말하면 되고,
//   운영자는 /admin/errors 에서 같은 번호로 원인을 찾는다.
import { useEffect, useState } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    // 접수 실패가 이 화면을 또 깨뜨리면 안 된다 — 전부 삼킨다.
    fetch("/api/diag/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message || "(메시지 없음)",
        digest: error?.digest,
        stack: error?.stack,
        path: typeof window !== "undefined" ? window.location.pathname + window.location.search : "",
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    })
      .then((r) => r.json())
      .then((d) => setId(d?.id ?? null))
      .catch(() => {});
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#191919", display: "grid", placeItems: "center", padding: 24, fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
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
  );
}
