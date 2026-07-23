"use client";
import BeforeAfterHero from "../components/BeforeAfterHero";
import { BA_LIVE } from "../lib/concepts";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
import { addToHistory } from "../lib/history";
import { useBackClose } from "../lib/useBackClose";
import PreviewCard from "../components/upload/PreviewCard";
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import AdBanner from "../components/AdBanner";

export default function UpscalePage() {
  const [image, setImage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 뒤로가기 → 결과 화면만 닫고 업로드 폼으로 (사진 유지, 앱 이탈 방지)
  useBackClose(!!result, () => setResult(""));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const toBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.readAsDataURL(f);
      r.onload = () => res(r.result as string);
      r.onerror = rej;
    });

  const compress = (b64: string): Promise<string> =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const M = 1024;
        let { width: w, height: h } = img;
        if (w > h) { if (w > M) { h = (h * M) / w; w = M; } }
        else { if (h > M) { w = (w * M) / h; h = M; } }
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        res(c.toDataURL("image/jpeg", 0.92));
      };
      img.src = b64;
    });

  const handlePick = async (f: File) => {
    setResult(""); setError("");
    setImage(await toBase64(f));
  };

  const handleRun = async () => {
    if (!image) { setError("사진을 먼저 올려주세요."); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const c = await compress(image);
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: c, scale: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류가 발생했어요.");
      if (!data.output?.[0]) throw new Error("결과를 받지 못했어요.");
      setResult(data.output[0]);
      void addToHistory(data.output, "고화질 변환 (4K)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => { if (!result) return; void saveImage(result, "mospic_4k.jpg"); };
  const handleShare = () => { if (!result) return; void shareImage(result, "mospic_4k.jpg", "MOSPIC에서 만든 사진이에요 · mospic.com"); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", height: 58, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } window.location.href = "/"; }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919" }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>고화질 변환 (4K)</span>
      </div>

      <div style={{ padding: "8px 20px 100px" }}>
        {!result && (
          <>
            <AdBanner slot="upscale-upload" />
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("upscale") ? (
              <BeforeAfterHero pairs={[1, 2, 3, 4, 5].flatMap(n => [
                { before: `/examples/ba/upscale-before-${n}.webp`, after: `/examples/ba/upscale-after-${n}.webp` },
                { before: `/examples/ba/upscale-before.webp`, after: `/examples/ba/upscale-after-${n}.webp` },
              ])} />
            ) : (
              <PreviewCard image="/details/upscale.webp" caption="고화질 변환, 미리 만나보세요" />
            )}
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <UploadZone
              label="사진"
              images={image ? [image] : []}
              max={1}
              onPick={files => handlePick(files[0])}
              onRemove={() => setImage("")}
              cameraFacing="environment"
            />
            <TipChips tips={[{ icon: "expand", label: "작아도 괜찮아요" }, { icon: "sun", label: "흐려도 괜찮아요" }, { icon: "eye", label: "오래된 사진도" }]} />
            <PrivacyLine />
            <button onClick={handleRun} disabled={loading || !image}
              style={{ width: "100%", marginTop: 18, background: loading || !image ? "#E8E9ED" : "#FF4B7C", color: loading || !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !image ? "not-allowed" : "pointer", boxShadow: loading || !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `변환 중... (${elapsed}초)` : <>고화질로 변환하기 ✨<span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}> · 무료 · 오늘 5회</span></>}
            </button>
          </>
        )}

        {error && (
          <div style={{ background: "#FFF0F3", border: "1px solid #FFD6E0", borderRadius: 12, padding: "12px 16px", marginTop: 14 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 8 }}>
            <AdBanner slot="upscale-result" />
            <StepIndicator current={3} />
            <p style={{ fontSize: 16, fontWeight: 900, color: "#191919", margin: "0 0 10px", textAlign: "center" }}>✨ 4배 고화질로 변환됐어요!</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-4px 0 12px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, border: "1px solid #EEE" }}>
              <img src={result} alt="고화질 결과" style={{ width: "100%", display: "block" }} />
            </div>
            <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", margin: "0 0 14px" }}>※ 저장하면 원본 해상도(최대 4096px)로 받아져요</p>
            <button onClick={handleDownload}
              style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
              PNG 저장
            </button>
            <button onClick={() => { setImage(""); setResult(""); setError(""); }}
              style={{ width: "100%", background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              다른 사진 변환하기
            </button>
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              공유하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}