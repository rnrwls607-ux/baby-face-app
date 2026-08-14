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
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";
import BeforeAfterHero from "../components/BeforeAfterHero";
import { BA_LIVE, CONCEPTS, LIVE_COIN_CONCEPTS } from "../lib/concepts";
import { openCoinSheet } from "../lib/coinSheet";
import { openLoginSheet } from "../lib/loginSheet";
import CoinIcon from "../components/CoinIcon";
import { ProCongestionError, ProCongestionHint } from "../components/ProCongestionNote";
import RegenConfirmSheet from "../components/RegenConfirmSheet";
import LoadingSaveNote from "../components/LoadingSaveNote";

// 칩 4종 — key는 route의 SEASON_PROMPTS 키와 반드시 일치해야 한다(불일치 시 봄으로 폴백됨)
const SEASON_OPTIONS = [
  { key: "spring", label: "🌸 봄" },
  { key: "summer", label: "☀️ 여름" },
  { key: "autumn", label: "🍁 가을" },
  { key: "winter", label: "❄️ 겨울" },
];

export default function SeasonPage() {
  const router = useRouter();
  // 코인 게이트 표시·가드 (coinCost는 표시 전용 — 요금의 진실원은 서버 withCoin) — ★스위치 날 벌크 앵커
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("season");
  const COIN_COST = CONCEPTS.season?.coinCost ?? 0;
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
  const [image, setImage] = useState<string>("");
  const [season, setSeason] = useState<string>("spring"); // 기본값 봄 — 칩을 안 골라도 바로 만들 수 있다
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [pendingPick, setPendingPick] = useState<string | null>(null); // 칩 재생성 확인 대기 — 과금 전 1회 확인
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
  // pick: 결과 화면에서 "다른 계절로" 누를 때 그 계절로 바로 재생성 (칩 상태 갱신 포함)
  const handleSubmit = async (pick?: string) => {
    if (!image) { setError("사진을 올려주세요."); return; }
    const chosen = pick || season;
    if (pick) setSeason(pick);
    // 즉시 부족 체크(캐시 기준, 서버 호출 전) — ★스위치 날 벌크 앵커
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 235000); // 서버 내부 컷 230초 + 여유 5초 (Pro 생성 계열)
    try {
      const compressed = await compress(image);
      const res = await fetch("/api/season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed, season: chosen }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      // 비로그인(401) → 전역 로그인 유도 시트 (에러칸 중복 표시 금지)
      if (res.status === 401) { openLoginSheet(); return; }
      // 코인 부족(402) → 전역 충전 유도 시트 (에러칸 중복 표시 금지) — ★스위치 날 벌크 앵커
      if (res.status === 402) { openCoinSheet({ need: data.need ?? 0, balance: data.balance ?? 0 }); return; }
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, "계절 변환", Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const chipStyle = (active: boolean) => ({
    padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer",
    border: active ? "1.5px solid #FF4B7C" : "1.5px solid #EFF0F3",
    background: active ? "#FFEAF1" : "#fff",
    color: active ? "#FF4B7C" : "#9B9B9B",
  });
  const handleDownload = () => { void saveImage(result, "season.png"); };
  const handleShare = () => { void shareImage(result, "season.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#fff", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <LeaveConfirmSheet open={leaveGuard.asking} coin={COIN_GATED && COIN_COST > 0} onStay={leaveGuard.stay} onLeave={leaveGuard.leave} />
      <UploadGuide type="space" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 56, borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#111", padding: "4px 8px 4px 0" }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>계절 변환</span>
      </div>
      <div style={{ padding: "20px 20px 100px" }}>
        {!result && (
          <>
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("season") ? (
              <BeforeAfterHero pairs={[1, 2, 3].flatMap(n => [
                { before: `/examples/ba/season-before-${n}.webp`, after: `/examples/ba/season-after-${n}.webp` },
                { before: `/examples/ba/season-before.webp`, after: `/examples/ba/season-after-${n}.webp` },
              ])} />
            ) : (
              <PreviewCard placeholder="🍂" caption="계절 변환, 미리 만나보세요" />
            )}
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)", marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>어느 계절로 바꿀까요?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {SEASON_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => setSeason(o.key)} style={chipStyle(season === o.key)}>{o.label}</button>
                ))}
              </div>
            </div>
            <UploadZone
              label="사진"
              images={image ? [image] : []}
              max={1}
              onPick={files => handleUpload(files[0])}
              onRemove={() => setImage("")}
              cameraFacing="environment"
            />
            <TipChips tips={[{ icon: "expand", label: "나무·풍경이 보이게" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "eye", label: "흔들리지 않게" }]} />
            <PrivacyLine />
            <ProCongestionHint concept="season" />
            <button onClick={() => handleSubmit()} disabled={loading || !image}
              style={{ width: "100%", marginTop: 18, background: loading || !image ? "#E8E9ED" : "#FF4B7C", color: loading || !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !image ? "not-allowed" : "pointer", boxShadow: loading || !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `만드는 중... (${elapsed}초)` : <>계절 변환 만들기 🍂{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🍂</div>
            <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>AI가 계절을 갈아입히고 있어요...</p>
            <LoadingSaveNote />
          </div>
        )}
        {error && (
          <div style={{ background: "#FFF0F3", border: "1px solid #FFD6E0", borderRadius: 12, padding: "12px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
            <ProCongestionError concept="season" error={error} />
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
          </div>
        )}
        {result && (
          <div>
            <StepIndicator current={3} />
            <p style={{ fontSize: 18, fontWeight: 900, color: "#111", textAlign: "center", margin: "0 0 16px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
              <img src={result} alt="계절 변환" style={{ width: "100%", display: "block" }} />
            </div>
            {/* 다른 계절로 — 사진을 다시 올리지 않고 칩만 눌러 재생성 (이 컨셉의 핵심 재미) */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)", margin: "0 0 12px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>다른 계절로도 만들어볼까요?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {SEASON_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => (COIN_GATED && COIN_COST > 0 ? setPendingPick(o.key) : void handleSubmit(o.key))} disabled={loading} style={chipStyle(season === o.key)}>{o.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>저장하기</button>
              <button onClick={() => { setResult(""); setImage(""); }}
                style={{ flex: 1, background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>다시 만들기</button>
            </div>
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
            <Upscale4K image={result} />
          </div>
        )}
      </div>
      <RegenConfirmSheet open={pendingPick !== null} question="다른 계절로 새로 만들까요?" cost={COIN_COST}
        onCancel={() => setPendingPick(null)}
        onConfirm={() => { const k = pendingPick; setPendingPick(null); if (k) void handleSubmit(k); }} />
    </div>
  );
}
