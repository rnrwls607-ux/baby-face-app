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

type ReceiptItem = { feature?: string; name?: string; desc?: string; score?: number };
type ReceiptData = { petType?: string; items?: ReceiptItem[]; total?: number; summary?: string };

// 관상 보고서 포스터 — Canvas로 직접 그린다(글자를 코드가 그리므로 한글이 100% 정확).
// 가운데 펫 사진 + 부위별 콜아웃 5개(칩 + 얇은 골드 라인) + 하단 총점 밴드.
const KO = "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
// 콜아웃 배치: 좌 3 / 우 2, 사진 위 목표점은 실제 부위 방향(0~1 비율)
const LAYOUT: Record<string, { side: "L" | "R"; slot: number; tx: number; ty: number }> = {
  forehead: { side: "L", slot: 0, tx: 0.46, ty: 0.17 },
  eyes:     { side: "L", slot: 1, tx: 0.34, ty: 0.39 },
  cheek:    { side: "L", slot: 2, tx: 0.26, ty: 0.63 },
  ears:     { side: "R", slot: 0, tx: 0.80, ty: 0.14 },
  nose:     { side: "R", slot: 1, tx: 0.52, ty: 0.56 },
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("이미지를 불러오지 못했어요."));
    im.src = src;
  });
}

async function drawReport(d: ReceiptData, photo: string): Promise<string> {
  const items = (d.items || []).slice(0, 5);
  const W = 1080, H = 1360;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const IVORY = "#FBF6EC", INK = "#2A2723", GOLD = "#C9A227", PINK = "#FF4B7C", GRAY = "#8C867C";

  // 둥근 사각형 경로 (roundRect 미지원 환경 대비 직접 구현)
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const wrap = (t: string, n: number): string[] => {
    const out: string[] = []; let v = (t || "").trim();
    while (v.length > n) { out.push(v.slice(0, n)); v = v.slice(n); }
    if (v) out.push(v);
    return out.length ? out : [""];
  };

  ctx.fillStyle = IVORY; ctx.fillRect(0, 0, W, H);

  // 헤더
  ctx.textAlign = "center";
  ctx.fillStyle = INK; ctx.font = `900 58px ${KO}`;
  ctx.fillText("우리 애 관상 보고서", W / 2, 118);
  ctx.fillStyle = GRAY; ctx.font = `600 27px ${KO}`;
  ctx.fillText("AI 관상 분석", W / 2, 166);

  // 중앙 펫 사진 — 연블루 바탕 + 둥근 프레임 + 옅은 그림자
  const PW = 470, PH = 470, PX = (W - PW) / 2, PY = 240;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#E8F1FB"; rr(PX, PY, PW, PH, 40); ctx.fill();
  ctx.restore();
  try {
    const im = await loadImg(photo);
    ctx.save();
    rr(PX, PY, PW, PH, 40); ctx.clip();
    const k = Math.max(PW / im.width, PH / im.height);
    const sw = PW / k, sh = PH / k;
    ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, PX, PY, PW, PH);
    ctx.restore();
  } catch { /* 사진 로드 실패 — 연블루 프레임만 남기고 계속 그린다 */ }
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(PX, PY, PW, PH, 40); ctx.stroke();

  // 콜아웃 5개 — 칩(이름+풀이+점수) + 부위로 향하는 얇은 골드 라인
  const CW = 268, CH = 116, LX = 34, RX = W - 34 - CW;
  const slotY = [PY + 6, PY + 172, PY + 338];
  for (const it of items) {
    const L = LAYOUT[String(it.feature || "")];
    if (!L) continue;
    const x = L.side === "L" ? LX : RX;
    const y = slotY[L.slot];
    // 라인: 칩 안쪽 모서리 → 사진 위 목표점
    const fromX = L.side === "L" ? x + CW : x;
    const fromY = y + CH / 2;
    const toX = PX + PW * L.tx, toY = PY + PH * L.ty;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(fromX, fromY);
    ctx.lineTo(L.side === "L" ? PX - 14 : PX + PW + 14, fromY);
    ctx.lineTo(toX, toY); ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(toX, toY, 5, 0, Math.PI * 2); ctx.fill();
    // 칩
    ctx.fillStyle = "#FFFFFF"; rr(x, y, CW, CH, 22); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6; rr(x, y, CW, CH, 22); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = INK; ctx.font = `900 30px ${KO}`;
    ctx.fillText(String(it.name || ""), x + 22, y + 46);
    ctx.fillStyle = GRAY; ctx.font = `600 21px ${KO}`;
    ctx.fillText(String(it.desc || ""), x + 22, y + 82);
    ctx.textAlign = "right";
    ctx.fillStyle = PINK; ctx.font = `900 22px ${KO}`;
    ctx.fillText(`${Number(it.score) || 0}점`, x + CW - 20, y + 46);
  }

  // 하단 총점 밴드
  const sum = wrap(String(d.summary || ""), 22);
  const BY = PY + PH + 150, BH = 128 + (sum.length - 1) * 34;
  ctx.fillStyle = "#FFF7E6"; rr(60, BY, W - 120, BH, 40); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(60, BY, W - 120, BH, 40); ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = INK; ctx.font = `900 42px ${KO}`;
  ctx.fillText(`총점 ${Number(d.total) || 0}점`, W / 2, BY + 60);
  ctx.fillStyle = PINK; ctx.font = `800 26px ${KO}`;
  let sy = BY + 104;
  for (const line of sum) { ctx.fillText(line, W / 2, sy); sy += 34; }

  // 푸터
  ctx.fillStyle = GRAY;
  ctx.font = "italic 800 24px sans-serif";
  ctx.fillText("mospic ✦", W / 2, H - 96);
  ctx.font = `600 20px ${KO}`;
  ctx.fillText("* 재미로 보는 관상이에요", W / 2, H - 56);
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
      const png = await drawReport(data.result as ReceiptData, image);
      setResult(png);
      void addToHistory([png], "펫 관상 영수증");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => { void saveImage(result, "petreceipt.png"); };
  const handleShare = () => { void shareImage(result, "petreceipt.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
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
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="펫 관상 영수증" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 보기</button>
            </div>
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
