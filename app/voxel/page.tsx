"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";

export default function VoxelPage() {
  const router = useRouter();
  const [image, setImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);
  const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result as string); r.onerror = rej;
  });
  const compress = (b64: string): Promise<string> => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const M = 1024; let { width: w, height: h } = img;
      if (w > h) { if (w > M) { h = h * M / w; w = M; } } else { if (h > M) { w = w * M / h; h = M; } }
      c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.9));
    };
    img.src = b64;
  });
  const handleUpload = async (file: File) => { setImage(await toBase64(file)); };
  const handleSubmit = async () => {
    if (!image) { setError("사진을 올려주세요."); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await compress(image);
      const res = await fetch("/api/voxel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, "복셀 아트");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.startsWith("data:") ? result : `/api/download?url=${encodeURIComponent(result)}`;
    a.download = "voxel.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#fff", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 56, borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#111", padding: "4px 8px 4px 0" }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>복셀 아트</span>
      </div>
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: "0 0 4px" }}>사진을 3D 블록(복셀) 아트로 바꿔요</p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, lineHeight: 1.5 }}>사진 한 장을 올리면 작은 큐브로 쌓은 3D 블록 스타일로 변환해드려요.</p>
        </div>
        {!result && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 10 }}>사진</p>
            <label style={{ display: "block", cursor: "pointer", marginBottom: 24 }}>
              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, border: `1.5px ${image ? "solid #D6E0FF" : "dashed #E0E0E0"}`, background: image ? "#fff" : "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 4 }}>
                {image
                  ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <><span style={{ fontSize: 30, color: "#ccc" }}>＋</span><span style={{ fontSize: 12, color: "#bbb" }}>사진 올리기</span></>}
              </div>
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0]); }} />
            </label>
            <button onClick={handleSubmit} disabled={loading || !image}
              style={{ width: "100%", background: loading || !image ? "#F0F0F0" : "#111", color: loading || !image ? "#aaa" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 700, cursor: loading || !image ? "not-allowed" : "pointer" }}>
              {loading ? `만드는 중... (${elapsed}초)` : "복셀 아트 만들기 ✨"}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🧊</div>
            <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>AI가 블록으로 쌓고 있어요...</p>
          </div>
        )}
        {error && (
          <div style={{ background: "#FFF0F3", border: "1px solid #FFD6E0", borderRadius: 12, padding: "12px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}
        {result && (
          <div>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#111", textAlign: "center", margin: "0 0 16px" }}>완성됐어요! ✨</p>
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
              <img src={result} alt="복셀 아트" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#111", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>저장하기</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>다시 만들기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}