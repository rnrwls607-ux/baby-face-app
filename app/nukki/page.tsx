"use client";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import PreviewCard from "../components/upload/PreviewCard";
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";
import AdBanner from "../components/AdBanner";
import BeforeAfterHero from "../components/BeforeAfterHero";
import { BA_LIVE } from "../lib/concepts";

export default function NukkiPage() {
  const router = useRouter();
  const [image, setImage] = useState<string>("");
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
  const handleDownload = () => { void saveImage(result, "nukki.png"); };
  const handleShare = () => { void shareImage(result, "nukki.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
  const checker = {
    backgroundImage: "linear-gradient(45deg,#dfe2e7 25%,transparent 25%),linear-gradient(-45deg,#dfe2e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dfe2e7 75%),linear-gradient(-45deg,transparent 75%,#dfe2e7 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
    backgroundColor: "#fff",
  } as const;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <UploadGuide type="product_obj" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>배경 제거</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        {!result && !loading && (
          <>
            <AdBanner slot="nukki-upload" />
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("nukki") ? (
              <div style={{ marginBottom: 8 }}>
                <BeforeAfterHero pairs={[1, 2, 3].flatMap(n => [
                  { before: `/examples/ba/nukki-before-${n}.webp`, after: `/examples/ba/nukki-after-${n}.webp` },
                  { before: `/examples/ba/nukki-before.webp`, after: `/examples/ba/nukki-after-${n}.webp` },
                ])} />
              </div>
            ) : (
              <PreviewCard image="/details/nukki.webp" caption="배경 제거, 미리 만나보세요" />
            )}
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <UploadZone
              label="사진"
              images={image ? [image] : []}
              max={1}
              onPick={files => handleUpload(files[0])}
              onRemove={() => setImage("")}
            />
            <TipChips tips={[{ icon: "expand", label: "대상 크게" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "eye", label: "배경과 구분되게" }]} />
            <PrivacyLine />

            <button onClick={handleSubmit} disabled={!image}
              style={{ width: "100%", marginTop: 18, background: !image ? "#E8E9ED" : "#FF4B7C", color: !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: !image ? "not-allowed" : "pointer", boxShadow: !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              배경 지우기 ✨<span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}> · 무료 · 오늘 5회</span>
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
            <AdBanner slot="nukki-result" />
            <StepIndicator current={3} />
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
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
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
          </div>
        )}
      </div>
    </div>
  );
}