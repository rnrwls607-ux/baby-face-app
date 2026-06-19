"use client";
import { useState, useEffect } from "react";

export default function Upscale4K({ image }: { image: string }) {
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const download = (url: string) => {
    const a = document.createElement("a");
    a.href = url.startsWith("data:") ? url : "/api/download?url=" + encodeURIComponent(url);
    a.download = `mospic_4k_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handle = async () => {
    if (!image || loading) return;
    setLoading(true); setError(""); setDone(false);
    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, scale: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류가 발생했어요.");
      if (!data.output?.[0]) throw new Error("결과를 받지 못했어요.");
      download(data.output[0]);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={handle} disabled={loading}
        style={{ width: "100%", background: loading ? "#F0F0F0" : "#191919", color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {loading ? `고화질 변환 중... (${elapsed}초)` : done ? "✓ 4K로 저장됨 · 다시 받기" : "🔍 고화질(4K)로 받기"}
      </button>
      {error && <p style={{ fontSize: 12, color: "#FF4B7C", margin: "8px 2px 0", fontWeight: 600 }}>⚠️ {error}</p>}
      <p style={{ fontSize: 11, color: "#bbb", margin: "6px 2px 0", textAlign: "center" }}>4배 해상도(최대 4096px)로 키워서 저장해요</p>
    </div>
  );
}