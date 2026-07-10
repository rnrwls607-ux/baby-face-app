"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";

const STYLE_KEY = "blueshirt";
const STYLE_LABEL = "S컬 블루 셔츠";
const STYLE_PREVIEW = "/styles/idstyle-blueshirt.png";
const MIN_FACES = 2;
const MAX_FACES = 6;

export default function IdStylePage() {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(true);
  const [faces, setFaces] = useState<string[]>([]);
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
      const M = 768; let { width: w, height: h } = img;
      if (w > h) { if (w > M) { h = h * M / w; w = M; } } else { if (h > M) { w = w * M / h; h = M; } }
      c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = b64;
  });
  // 여러 장 한꺼번에 선택
  const handleUploadMany = async (fileList: FileList) => {
    const incoming = Array.from(fileList);
    const room = MAX_FACES - faces.length;
    const picked = incoming.slice(0, Math.max(0, room));
    const b64s = await Promise.all(picked.map(toBase64));
    setFaces(prev => [...prev, ...b64s].slice(0, MAX_FACES));
  };
  const removeFace = (i: number) => setFaces(prev => prev.filter((_, idx) => idx !== i));
  const handleSubmit = async () => {
    if (faces.length < MIN_FACES) { setError(`사진을 ${MIN_FACES}장 이상 선택해주세요.`); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 100000);
    try {
      const compressed = await Promise.all(faces.map(compress));
      const res = await fetch("/api/idstyle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: STYLE_KEY, faces: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, `증명사진 ${STYLE_LABEL}`);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.startsWith("data:") ? result : `/api/download?url=${encodeURIComponent(result)}`;
    a.download = "idphoto.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const canSubmit = faces.length >= MIN_FACES && !loading;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>증명사진 · {STYLE_LABEL}</span>
      </div>

      {/* 📋 사진 선택 전 가이드 모달 */}
      {showGuide && !result && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "24px 24px 0 0", padding: "26px 22px 22px" }}>
            <p style={{ fontSize: 21, fontWeight: 900, color: "#191919", margin: "0 0 6px" }}>사진 선택 전에 꼭 확인해 주세요!</p>
            <p style={{ fontSize: 14, color: "#9B9B9B", margin: "0 0 20px" }}>이목구비가 잘 보이는 정면 사진이 가장 좋아요 👍</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ aspectRatio: "3/4", borderRadius: 14, background: "#F1F2F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, position: "relative", overflow: "hidden" }}>
                  🙅
                  <span style={{ position: "absolute", top: 8, left: 8, background: "#FF4B7C", color: "#fff", borderRadius: 999, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>✕</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#9B9B9B", textAlign: "center", marginTop: 8, fontWeight: 600 }}>얼굴 일부를 가린 사진</p>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ aspectRatio: "3/4", borderRadius: 14, background: "#EFEAFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, position: "relative", overflow: "hidden", border: "2px solid #FF4B7C" }}>
                  🙂
                  <span style={{ position: "absolute", top: 8, left: 8, background: "#22C55E", color: "#fff", borderRadius: 999, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>✓</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#191919", textAlign: "center", marginTop: 8, fontWeight: 700 }}>이마가 보이는 정면사진</p>
              </div>
            </div>
            <div style={{ background: "#F7F8FA", borderRadius: 12, padding: "13px 15px", marginBottom: 18 }}>
              <p style={{ fontSize: 12.5, color: "#666", margin: 0, lineHeight: 1.6 }}>• AI는 올려주신 사진을 바탕으로 제작하며, <span style={{ color: "#FF4B7C", fontWeight: 700 }}>넣는 사진에 따라 결과물이 바뀝니다.</span></p>
            </div>
            <button onClick={() => setShowGuide(false)}
              style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>확인했어요!</button>
          </div>
        </div>
      )}

      <div style={{ padding: "18px 18px 100px" }}>
        {/* 스타일 미리보기 */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 14, marginBottom: 18, display: "flex", gap: 14, alignItems: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
          <img src={STYLE_PREVIEW} alt={STYLE_LABEL} style={{ width: 76, height: 98, objectFit: "cover", borderRadius: 12, background: "#F1F2F6" }} />
          <div>
            <p style={{ fontSize: 12.5, color: "#9B9B9B", margin: "0 0 3px", fontWeight: 600 }}>청순하고 자연스러운</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "#191919", margin: "0 0 6px" }}>{STYLE_LABEL}</p>
            <p style={{ fontSize: 12, color: "#B36B85", margin: 0, lineHeight: 1.5 }}>이 스타일의 머리·옷·배경은 그대로,<br />얼굴만 내 얼굴로 바뀌어요.</p>
          </div>
        </div>

        {!result && (
          <>
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 4, marginTop: 0 }}>내 얼굴 사진 ({MIN_FACES}~{MAX_FACES}장)</p>
              <p style={{ fontSize: 11.5, color: "#9B9B9B", margin: "0 0 12px", lineHeight: 1.5 }}>정면이 잘 보이는 평소 사진 여러 장을 한 번에 선택하면, 더 닮게 나와요.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {faces.map((f, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1.5px solid #FF4B7C" }}>
                    <img src={f} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => removeFace(i)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 999, border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>✕</button>
                  </div>
                ))}
                {faces.length < MAX_FACES && (
                  <label style={{ aspectRatio: "1", borderRadius: 12, border: "1.5px dashed #D9DCE2", background: "#F1F2F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer" }}>
                    <span style={{ fontSize: 24, color: "#C2C6CE" }}>＋</span>
                    <span style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 600 }}>사진 추가</span>
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={async e => { if (e.target.files?.length) await handleUploadMany(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              <p style={{ fontSize: 11.5, color: faces.length >= MIN_FACES ? "#22C55E" : "#9B9B9B", margin: "12px 2px 0", fontWeight: 600 }}>
                {faces.length}/{MAX_FACES}장 선택됨 {faces.length < MIN_FACES ? `(${MIN_FACES}장 이상 필요)` : "✓"}
              </p>
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", marginTop: 18, background: canSubmit ? "#FF4B7C" : "#E8E9ED", color: canSubmit ? "#fff" : "#AEB2BA", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(255,75,124,0.32)" : "none" }}>
              {loading ? `만드는 중... (${elapsed}초)` : "증명사진 만들기 ✨"}
            </button>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>※ AI 생성물로, 여권 등 공적 증명용으로는 사용할 수 없어요.</p>
          </>
        )}

        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>📸</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 증명사진을 만들고 있어요...</p>
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
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="증명사진" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 만들기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
