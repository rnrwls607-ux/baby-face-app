"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";

export default function NukkiPage() {
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
      res(c.toDataURL("image/jpeg", 0.92));
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
      const res = await fetch("/api/nukki", {
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
      void addToHistory(data.output, "배경 제거");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.startsWith("data:") ? result : `/api/download?url=${encodeURIComponent(result)}`;
    a.download = "nukki.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };
  const checker = {
    backgroundImage: "linear-gradient(45deg,#dfe2e7 25%,transparent 25%),linear-gradient(-45deg,#dfe2e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dfe2e7 75%),linear-gradient(-45deg,transparent 75%,#dfe2e7 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
    backgroundColor: "#fff",
  } as const;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>배경 제거</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        <div style={{ background: "#FFEAF1", borderRadius: 16, padding: "16px 18px", marginBottom: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#FF4B7C", margin: "0 0 5px" }}>✂️ 누끼 따서 투명 PNG로</p>
          <p style={{ fontSize: 12.5, color: "#B36B85", margin: 0, lineHeight: 1.55 }}>상품·인물·사물 사진의 배경을 깔끔하게 지워 투명 배경 PNG로 만들어드려요. 상세페이지·디자인·합성에 바로 쓰세요.</p>
        </div>
        {!result && !loading && (
          <>
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>사진</p>
              <label style={{ display: "block", cursor: "pointer" }}>
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, border: image ? "1.5px solid #FF4B7C" : "1.5px dashed #D9DCE2", background: image ? "#fff" : "#F1F2F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 4 }}>
                  {image
                    ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <><span style={{ fontSize: 32, color: "#C2C6CE" }}>＋</span><span style={{ fontSize: 12, color: "#9B9B9B", fontWeight: 600 }}>사진 올리기</span></>}
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0]); }} />
              </label>
              <p style={{ fontSize: 11.5, color: "#9B9B9B", margin: "10px 2px 0", lineHeight: 1.5 }}>💡 피사체가 또렷하고 배경과 잘 구분되는 사진일수록 깔끔해요. 유리·물방울·머리카락 같은 반투명 경계는 완벽하지 않을 수 있어요.</p>
            </div>
            <button onClick={handleSubmit} disabled={!image}
              style={{ width: "100%", marginTop: 18, background: !image ? "#E8E9ED" : "#FF4B7C", color: !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: !image ? "not-allowed" : "pointer", boxShadow: !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              배경 지우기 ✨
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>✂️</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>배경을 지우는 중이에요... ({elapsed}초)</p>
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
          </div>
        )}
        {result && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", ...checker }}>
              <img src={result} alt="배경 제거 결과" style={{ width: "100%", display: "block" }} />
            </div>
            <p style={{ fontSize: 11.5, color: "#9B9B9B", textAlign: "center", margin: "0 0 16px" }}>바둑판 무늬는 투명한 부분이에요 (투명 PNG로 저장돼요)</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>PNG 저장</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다른 사진</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}