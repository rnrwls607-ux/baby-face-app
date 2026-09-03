"use client";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
import Upscale4K from "../components/Upscale4K";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import { useLeaveGuard } from "../lib/useLeaveGuard";
import LeaveConfirmSheet from "../components/LeaveConfirmSheet";
import PreviewCard from "../components/upload/PreviewCard";
import BeforeAfterHero from "../components/BeforeAfterHero";
import { BA_LIVE, CONCEPTS, LIVE_COIN_CONCEPTS } from "../lib/concepts";
import { openCoinSheet } from "../lib/coinSheet";
import { openLoginSheet } from "../lib/loginSheet";
import CoinIcon from "../components/CoinIcon";
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";
import LoadingSaveNote from "../components/LoadingSaveNote";

const STYLE_OPTIONS = [
  { key: "modern", label: "모던" },
  { key: "natural", label: "내추럴" },
  { key: "cozy", label: "코지" },
  { key: "minimal", label: "미니멀" },
  { key: "scandi", label: "스칸디" },
  { key: "vintage", label: "빈티지" },
] as const;

export default function InteriorPage() {
  const router = useRouter();
  const [image, setImage] = useState<string>("");
  const [style, setStyle] = useState<string>("modern");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("interior");
  const COIN_COST = CONCEPTS.interior?.coinCost ?? 0;
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  // 로그인 상태면 잔액 1회 캐시 (즉시 부족 체크용 — 낡은 캐시는 서버 402가 백스톱)
  useEffect(() => {
    if (!COIN_GATED || COIN_COST <= 0) return;
    fetch("/api/coins")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.balance === "number") setCoinBalance(d.balance); })
      .catch(() => { /* 비로그인·실패 시 가드 생략 → 서버가 판정 */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [elapsed, setElapsed] = useState(0);
  // 뒤로가기 → 결과 화면만 닫고 업로드 폼으로 (사진 유지, 앱 이탈 방지)
  useBackClose(!!result, () => setResult(""));
  // 생성 중 뒤로가기 → 앱 이탈 대신 확인 시트 (생성은 계속 진행)
  const leaveGuard = useLeaveGuard(loading);
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);
  const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result as string); r.onerror = rej;
  });
  const compress = (b64: string): Promise<string> => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const M = 1024; let { width: w, height: h } = img;
      if (w > h) { if (w > M) { h = h * M / w; w = M; } } else { if (h > M) { w = w * M / h; h = M; } }
      c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => rej(new Error("사진을 읽지 못했어요. 다른 사진으로 시도해주세요."));
    img.src = b64;
  });
  const handleUpload = async (file: File) => { setImage(await toBase64(file)); };
  const handleSubmit = async () => {
    if (!image) { setError("사진을 올려주세요."); return; }
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await compress(image);
      const res = await fetch("/api/interior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed, style }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) throw new Error("일시적인 오류예요. 잠시 후 다시 눌러주세요.");
      const data = await res.json();
      // 비로그인(401) → 전역 로그인 유도 시트 (에러칸 중복 표시 금지)
      if (res.status === 401) { openLoginSheet(); return; }
      if (res.status === 402) { openCoinSheet({ need: data.need ?? 0, balance: data.balance ?? 0 }); return; }
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      const styleLabel = STYLE_OPTIONS.find(o => o.key === style)?.label || "";
      void addToHistory(data.output, "인테리어 " + styleLabel, Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => { void saveImage(result, "interior.png"); };
  const handleShare = () => { void shareImage(result, "interior.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
  const chipStyle = (active: boolean) => ({
    padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer",
    border: active ? "1.5px solid #FF4B7C" : "1.5px solid #EFF0F3",
    background: active ? "#FFEAF1" : "#fff",
    color: active ? "#FF4B7C" : "#9B9B9B",
  });
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <LeaveConfirmSheet open={leaveGuard.asking} coin={COIN_GATED && COIN_COST > 0} onStay={leaveGuard.stay} onLeave={leaveGuard.leave} />
      <UploadGuide type="space" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>AI 인테리어</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        {!result && (
          <>
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("interior") ? (
              <div style={{ marginBottom: 8 }}>
                <BeforeAfterHero pairs={[1, 2, 3].flatMap(n => [
                  { before: `/examples/ba/interior-before-${n}.webp`, after: `/examples/ba/interior-after-${n}.webp` },
                  { before: `/examples/ba/interior-before.webp`, after: `/examples/ba/interior-after-${n}.webp` },
                ])} />
              </div>
            ) : (
              <PreviewCard image="/details/interior.webp" caption="달라진 우리 집, 미리 만나보세요" placeholder="🛋️" />
            )}
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)", marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>어떤 스타일로 꾸밀까요?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {STYLE_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => setStyle(o.key)} style={chipStyle(style === o.key)}>{o.label}</button>
                ))}
              </div>
            </div>
            <UploadZone
              label="방 사진"
              images={image ? [image] : []}
              max={1}
              onPick={files => handleUpload(files[0])}
              onRemove={() => setImage("")}
              cameraFacing="environment"
              uploadHint="방이 잘 보이는 가로 사진 1장이면 충분해요"
            />
            <TipChips tips={[{ icon: "expand", label: "방 전체 담기" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "level", label: "수평 맞추기" }]} />
            <PrivacyLine />
            <button onClick={handleSubmit} disabled={loading || !image}
              style={{ width: "100%", marginTop: 18, background: loading || !image ? "#E8E9ED" : "#FF4B7C", color: loading || !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !image ? "not-allowed" : "pointer", boxShadow: loading || !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `만드는 중... (${elapsed}초)` : <>인테리어 미리보기 ✨{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🛋️</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 공간을 꾸미고 있어요...</p>
            <LoadingSaveNote />
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
          </div>
        )}
        {result && (
          <div>
            <StepIndicator current={3} />
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="인테리어" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>새 사진으로</button>
            </div>
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
            <Upscale4K image={result} />
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#191919", margin: "0 0 12px" }}>다른 스타일로 더 만들어볼까요?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                {STYLE_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => setStyle(o.key)} style={chipStyle(style === o.key)}>{o.label}</button>
                ))}
              </div>
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: "100%", background: loading ? "#E8E9ED" : "#FF4B7C", color: loading ? "#AEB2BA" : "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 6px 18px rgba(255,75,124,0.3)" }}>
                {loading ? `만드는 중... (${elapsed}초)` : "이 스타일로 다시 만들기 ✨"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}