"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import PreviewCard from "../components/upload/PreviewCard";
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";

type ReceiptItem = { name: string; desc: string; score: number };
type ReceiptData = { petType?: string; items?: ReceiptItem[]; total?: number; summary?: string };

function drawReceipt(d: ReceiptData): string {
  const items = (d.items || []).slice(0, 5);
  const wrap = (t: string, n: number): string[] => {
    const out: string[] = []; let s = (t || "").trim();
    while (s.length > n) { out.push(s.slice(0, n)); s = s.slice(n); }
    if (s) out.push(s);
    return out.length ? out : [""];
  };
  const sumLines = wrap(d.summary || "", 20);
  const W = 480;
  const H = 240 + items.length * 78 + 92 + sumLines.length * 30 + 130;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  const dash = (y: number) => {
    ctx.save(); ctx.strokeStyle = "#D9DCE2"; ctx.lineWidth = 1.5; ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke(); ctx.restore();
  };
  let y = 64;
  ctx.textAlign = "center"; ctx.fillStyle = "#191919";
  ctx.font = "900 30px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("MOSPIC PET", W / 2, y); y += 38;
  ctx.font = "800 21px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillStyle = "#FF4B7C";
  ctx.fillText(`${d.petType || "반려동물"} 관상 영수증`, W / 2, y); y += 30;
  ctx.font = "500 13px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillStyle = "#9B9B9B";
  const now = new Date();
  ctx.fillText(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}  NO.${String(Math.floor(Math.random() * 9000) + 1000)}`, W / 2, y);
  y += 24; dash(y); y += 44;
  for (const it of items) {
    ctx.textAlign = "left"; ctx.fillStyle = "#191919";
    ctx.font = "800 18px 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(String(it.name || ""), 36, y);
    ctx.textAlign = "right"; ctx.fillStyle = "#FF4B7C";
    ctx.font = "900 18px 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(`${Number(it.score) || 0}점`, W - 36, y);
    y += 26;
    ctx.textAlign = "left"; ctx.fillStyle = "#9B9B9B";
    ctx.font = "500 14px 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(String(it.desc || ""), 36, y);
    y += 52;
  }
  y -= 22; dash(y); y += 46;
  ctx.textAlign = "left"; ctx.fillStyle = "#191919";
  ctx.font = "900 21px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("관상 총점", 36, y);
  ctx.textAlign = "right"; ctx.fillStyle = "#FF4B7C";
  ctx.font = "900 26px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText(`${Number(d.total) || 0}점`, W - 36, y);
  y += 26; dash(y); y += 40;
  ctx.textAlign = "center"; ctx.fillStyle = "#191919";
  ctx.font = "700 16px 'Apple SD Gothic Neo', sans-serif";
  for (const line of sumLines) { ctx.fillText(line, W / 2, y); y += 30; }
  y += 8; dash(y); y += 36;
  ctx.fillStyle = "#9B9B9B";
  ctx.font = "italic 800 16px sans-serif";
  ctx.fillText("mospic ✦", W / 2, y); y += 24;
  ctx.font = "500 12px 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("* 재미로 보는 관상이에요", W / 2, y);
  return c.toDataURL("image/png");
}

export default function PetreceiptPage() {
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
      const res = await fetch("/api/petreceipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.result?.items?.length) throw new Error("분석 결과를 받지 못했습니다.");
      const png = drawReceipt(data.result as ReceiptData);
      setResult(png);
      void addToHistory([png], "펫 관상 영수증");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = result.startsWith("data:") ? result : `/api/download?url=${encodeURIComponent(result)}`;
    a.download = "petreceipt.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <UploadGuide type="pet" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>펫 관상 영수증</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        {!result && (
          <>
            <PreviewCard placeholder="🧾" caption="우리 아이 관상 영수증, 미리 만나보세요" />
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <UploadZone
              label="반려동물 사진"
              images={image ? [image] : []}
              max={1}
              onPick={files => handleUpload(files[0])}
              onRemove={() => setImage("")}
              cameraFacing="environment"
            />
            <TipChips tips={[{ icon: "face", label: "얼굴 정면" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "eye", label: "얼굴 또렷하게" }]} />
            <PrivacyLine />
            <button onClick={handleSubmit} disabled={loading || !image}
              style={{ width: "100%", marginTop: 18, background: loading || !image ? "#E8E9ED" : "#FF4B7C", color: loading || !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !image ? "not-allowed" : "pointer", boxShadow: loading || !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `보는 중... (${elapsed}초)` : "관상 보기 ✨"}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🧾</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI 관상가가 얼굴을 살펴보고 있어요...</p>
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
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>관상 영수증 나왔어요! 🧾</p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="펫 관상 영수증" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 보기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
