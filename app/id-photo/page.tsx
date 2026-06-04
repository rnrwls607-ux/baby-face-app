"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IdPhotoPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]); // 1~3장 (슬롯별)
  const [gender, setGender] = useState<"woman" | "man">("woman");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
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

  const handleUpload = async (file: File, index: number) => {
    const b64 = await toBase64(file);
    setImages(prev => { const next = [...prev]; next[index] = b64; return next; });
  };

  const handleSubmit = async () => {
    const valid = images.filter(Boolean);
    if (valid.length === 0) { setError("본인 사진을 한 장 이상 올려주세요."); return; }
    setLoading(true); setError(""); setResults([]); setSelected(0);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await Promise.all(valid.map(compress));
      const res = await fetch("/api/id-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: compressed, gender }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResults(data.output);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    const url = results[selected];
    const a = document.createElement("a");
    a.href = url.startsWith("data:") ? url : `/api/download?url=${encodeURIComponent(url)}`;
    a.download = "id_photo.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#fff", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 56, borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#111", padding: "4px 8px 4px 0" }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>AI 증명사진</span>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: "0 0 4px" }}>본인 사진으로 단정한 증명사진을 만들어요</p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, lineHeight: 1.5 }}>정면·밝은 사진 1~3장을 올리면 정장·흰 배경으로 변환해요. 여러 장일수록 본인과 더 닮게 나와요.</p>
        </div>

        {!results.length && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 10 }}>성별</p>
            <div style={{ display: "flex", gap: 10, background: "#F7F7F7", borderRadius: 14, padding: 4, marginBottom: 20 }}>
              {([["woman", "여성"], ["man", "남성"]] as const).map(([g, label]) => (
                <button key={g} onClick={() => setGender(g)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
                    background: gender === g ? "#fff" : "transparent", color: gender === g ? "#111" : "#aaa",
                    boxShadow: gender === g ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                  {label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 10 }}>본인 사진 (1~3장)</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {[0, 1, 2].map(i => (
                <label key={i} style={{ flex: 1, aspectRatio: "1", cursor: "pointer" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: 14, border: `1.5px ${images[i] ? "solid #FFD6E7" : "dashed #E0E0E0"}`, background: images[i] ? "#fff" : "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 2 }}>
                    {images[i]
                      ? <img src={images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <><span style={{ fontSize: 22, color: "#ccc" }}>＋</span><span style={{ fontSize: 11, color: "#bbb" }}>{i === 0 ? "필수" : "선택"}</span></>}
                  </div>
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0], i); }} />
                </label>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={loading || images.filter(Boolean).length === 0}
              style={{ width: "100%", background: loading || images.filter(Boolean).length === 0 ? "#F0F0F0" : "#111", color: loading || images.filter(Boolean).length === 0 ? "#aaa" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 700, cursor: loading || images.filter(Boolean).length === 0 ? "not-allowed" : "pointer" }}>
              {loading ? `만드는 중... (${elapsed}초)` : "증명사진 만들기 ✨"}
            </button>

            <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
              ※ 본 사진은 AI 생성물로, 여권 등 공적 증명용으로는 사용할 수 없어요.
            </p>
          </>
        )}

        {loading && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>📸</div>
            <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>AI가 증명사진을 만들고 있어요...</p>
          </div>
        )}

        {error && (
          <div style={{ background: "#FFF0F3", border: "1px solid #FFD6E0", borderRadius: 12, padding: "12px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#111", textAlign: "center", margin: "0 0 16px" }}>완성됐어요! 마음에 드는 걸 골라보세요 ✨</p>
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
              <img src={results[selected]} alt="증명사진" style={{ width: "100%", display: "block" }} />
            </div>
            {results.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {results.map((url, i) => (
                  <button key={i} onClick={() => setSelected(i)}
                    style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `3px solid ${selected === i ? "#111" : "transparent"}`, cursor: "pointer", opacity: selected === i ? 1 : 0.5, padding: 0 }}>
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#111", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                저장하기
              </button>
              <button onClick={() => { setResults([]); setImages([]); setSelected(0); }}
                style={{ flex: 1, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                다시 만들기
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              ※ AI 생성물로, 여권 등 공적 증명용으로는 사용할 수 없어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}