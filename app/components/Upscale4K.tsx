"use client";
import { useState, useEffect } from "react";
import { saveImage } from "../lib/saveImage";

export default function Upscale4K({ image }: { image: string }) {
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // 새 결과 이미지가 오면 저장 완료 상태 초기화 — 버튼 다시 활성
  useEffect(() => { setDone(false); setFailed(false); setError(""); }, [image]);

  const handle = async () => {
    if (!image || loading || done) return;
    setLoading(true); setError(""); setDone(false); setFailed(false);
    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, scale: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류가 발생했어요.");
      if (!data.output?.[0]) throw new Error("결과를 받지 못했어요.");
      const ok = await saveImage(data.output[0], `mospic_4k_${Date.now()}.jpg`, { silent: true });
      setDone(ok); setFailed(!ok);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={handle} disabled={loading || done}
        style={{ width: "100%", background: loading || done ? "#F0F0F0" : "#191919", color: loading || done ? "#aaa" : "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : done ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {loading ? `고화질 변환 중... (${elapsed}초)` : failed ? "저장 실패 — 다시 시도" : done ? "✓ 4K로 저장됨" : "🔍 고화질(4K)로 받기"}
      </button>
      {error && <p style={{ fontSize: 12, color: "#FF4B7C", margin: "8px 2px 0", fontWeight: 600 }}>⚠️ {error}</p>}
      <p style={{ fontSize: 11, color: "#bbb", margin: "6px 2px 0", textAlign: "center" }}>4배 해상도(최대 4096px)로 키워서 저장해요</p>
    </div>
  );
}