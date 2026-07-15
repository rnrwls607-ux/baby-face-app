"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import PreviewCard from "../components/upload/PreviewCard";
import StepIndicator from "../components/upload/StepIndicator";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";

const SLOT_LABELS = ["반려동물 (필수)", "가족 1 (필수)", "가족 2 (선택)", "가족 3 (선택)"];
const MIN_PHOTOS = 2;

export default function FamilypetPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  // 뒤로가기 → 결과 화면만 닫고 업로드 폼으로 (사진 유지, 앱 이탈 방지)
  useBackClose(!!result, () => setResult(""));
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
  const validCount = images.filter(Boolean).length;
  const handleSubmit = async () => {
    if (validCount < MIN_PHOTOS) { setError("반려동물 사진과 가족 사진을 올려주세요."); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const valid = images.filter(Boolean);
      const compressed = await Promise.all(valid.map(compress));
      const res = await fetch("/api/familypet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, "반려동물 가족사진");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.startsWith("data:") ? result : `/api/download?url=${encodeURIComponent(result)}`;
    a.download = "familypet.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };
  const canSubmit = validCount >= MIN_PHOTOS && !loading;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <UploadGuide type="family" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>반려동물과 가족사진</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        {!result && (
          <>
            <PreviewCard placeholder="🐾" caption="반려동물과 가족사진, 미리 만나보세요" />
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>반려동물 1장 + 가족 사진 (한 명당 한 장)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[0, 1, 2, 3].map(i => (
                  <label key={i} style={{ cursor: "pointer" }}>
                    <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, border: images[i] ? "1.5px solid #FF4B7C" : "1.5px dashed #D9DCE2", background: images[i] ? "#fff" : "#F1F2F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 3 }}>
                      {images[i]
                        ? <img src={images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <><span style={{ fontSize: 26, color: "#C2C6CE" }}>＋</span><span style={{ fontSize: 11.5, color: "#9B9B9B", fontWeight: 600 }}>{SLOT_LABELS[i]}</span></>}
                    </div>
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0], i); }} />
                  </label>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: "#BFC3CB", margin: "12px 2px 0", lineHeight: 1.5 }}>💡 각자 얼굴이 정면으로 잘 보이는 밝은 사진일수록 잘 나와요.</p>
            </div>
            <TipChips tips={[{ icon: "face", label: "각자 정면 얼굴" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "expand", label: "한 명씩 나오게" }]} />
            <PrivacyLine />
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", marginTop: 18, background: canSubmit ? "#FF4B7C" : "#E8E9ED", color: canSubmit ? "#fff" : "#AEB2BA", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(255,75,124,0.32)" : "none" }}>
              {loading ? `만드는 중... (${elapsed}초)` : "가족사진 만들기 ✨"}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🐾</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 우리 애와 가족을 한 장에 담고 있어요...</p>
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
          </div>
        )}
        {result && (
          <div>
            <StepIndicator current={3} />
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요</p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="반려동물과 가족사진" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 만들기</button>
            </div>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>※ 사진은 유지돼요. &quot;다시 만들기&quot;를 누르면 같은 사진으로 또 만들 수 있어요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
