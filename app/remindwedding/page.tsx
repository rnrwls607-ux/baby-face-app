"use client";
import BeforeAfterHero from "../components/BeforeAfterHero";
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
import { openCoinSheet } from "../lib/coinSheet";
import { openLoginSheet } from "../lib/loginSheet";
import { BA_LIVE, CONCEPTS, LIVE_COIN_CONCEPTS } from "../lib/concepts";
import CoinIcon from "../components/CoinIcon";
import { ProCongestionError, ProCongestionHint } from "../components/ProCongestionNote";
import StepIndicator from "../components/upload/StepIndicator";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";
import LoadingSaveNote from "../components/LoadingSaveNote";

export default function RemindweddingPage() {
  const router = useRouter();
  // 코인 게이트 표시·가드 (coinCost는 표시 전용 — 요금의 진실원은 서버 withCoin) — ★스위치 날 벌크 앵커
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("remindwedding");
  const COIN_COST = CONCEPTS.remindwedding?.coinCost ?? 0;
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
  const [images, setImages] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>(["", ""]); // "female" | "male" — 사용자 확정값
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
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
  const compress = (b64: string): Promise<string> => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const M = 1536; let { width: w, height: h } = img; // Pro 참조 품질(1024px+) 대응 — couple만 상향
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
    if (!images[0] || !images[1]) { setError("두 분의 사진을 모두 올려주세요."); return; }
    if (!genders[0] || !genders[1]) { setError("두 분의 성별을 선택해주세요."); return; }
    // 즉시 부족 체크(캐시 기준, 서버 호출 전) — ★스위치 날 벌크 앵커
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 145000); // 서버 내부 컷 140초 + 여유 5초 (Pro 추론형)
    try {
      const [c1, c2] = await Promise.all([compress(images[0]), compress(images[1])]);
      const res = await fetch("/api/remindwedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: c1, image2: c2, gender1: genders[0], gender2: genders[1] }),
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
      void addToHistory(data.output, "리마인드 웨딩", Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => { void saveImage(result, "remindwedding.png"); };
  const handleShare = () => { void shareImage(result, "remindwedding.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
  const canSubmit = !!images[0] && !!images[1] && !!genders[0] && !!genders[1] && !loading;
  // 성별 칩 전용 — 여=핑크·남=스카이 컬러 코딩 (이모지 없이 색으로 구분)
  const genderChipStyle = (v: "female" | "male", active: boolean) => ({
    flex: 1, padding: "10px 0", borderRadius: 999, fontSize: 15, fontWeight: 600, letterSpacing: -0.3, cursor: "pointer",
    border: "none", transition: "background 0.15s ease, color 0.15s ease",
    background: v === "female" ? (active ? "#FF4B7C" : "#FFF0F5") : (active ? "#5AA7EA" : "#EBF5FE"),
    color: active ? "#FFFFFF" : v === "female" ? "#E9548A" : "#4E96DC",
    boxShadow: active ? (v === "female" ? "0 3px 10px rgba(255,75,124,0.28)" : "0 3px 10px rgba(90,167,234,0.28)") : "none",
  });
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <LeaveConfirmSheet open={leaveGuard.asking} coin={COIN_GATED && COIN_COST > 0} onStay={leaveGuard.stay} onLeave={leaveGuard.leave} />
      <UploadGuide type="family" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>리마인드 웨딩</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        <div style={{ background: "#FFEAF1", borderRadius: 16, padding: "16px 18px", marginBottom: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#FF4B7C", margin: "0 0 5px" }}>💒 부모님 웨딩사진, 다시 한 번</p>
          <p style={{ fontSize: 12.5, color: "#B36B85", margin: 0, lineHeight: 1.55 }}>두 분의 사진을 한 장씩 올리면 세월의 아름다움이 담긴 리마인드 웨딩 사진을 만들어드려요. 자녀가 드리는 최고의 선물이에요.</p>
        </div>
        {!result && (
          <>
            {/* 결과 예시 — 각자 셀카 → 함께 화보 (2인 라인 전용 구성) */}
            {BA_LIVE.includes("remindwedding") ? (
              <BeforeAfterHero pairs={[1, 2].flatMap(n => [
                { before: `/examples/ba/remindwedding-before-${n}.webp`, after: `/examples/ba/remindwedding-after-${n}.webp` },
                { before: `/examples/ba/remindwedding-before.webp`, after: `/examples/ba/remindwedding-after-${n}.webp` },
              ])} />
            ) : (
              <>
              <div style={{ background: "#fff", borderRadius: 20, padding: 14, marginBottom: 8, boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
                    <span style={{ position: "absolute", left: 6, top: 6, zIndex: 1, background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 9, letterSpacing: 0.4 }}>Before</span>
                    <img src="/examples/remindwedding_b1.webp" alt="" loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 10, display: "block" }} />
                    <img src="/examples/remindwedding_b2.webp" alt="" loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 10, display: "block" }} />
                  </div>
                  <span style={{ fontSize: 20, color: "#FF4B7C", fontWeight: 800, flexShrink: 0 }}>→</span>
                  <div style={{ flex: 2, position: "relative" }}>
                    <span style={{ position: "absolute", left: 8, top: 8, zIndex: 1, background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 9, letterSpacing: 0.4 }}>After</span>
                    <img src="/examples/remindwedding_a.webp" alt="" loading="lazy" decoding="async" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 14, display: "block" }} />
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: "#9B9B9B", textAlign: "center", margin: "10px 0 2px", fontWeight: 600 }}>각자 찍은 사진 두 장이, 리마인드 웨딩 사진으로</p>
              </div>
              </>
            )}
            <StepIndicator current={result ? 3 : loading ? 2 : 1} />
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10, marginTop: 0 }}>두 분 사진 (각 1장) + 성별 선택</p>
              <div style={{ display: "flex", gap: 10 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ flex: 1 }}>
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, border: images[i] ? "1.5px solid #FF4B7C" : "1.5px dashed #D9DCE2", background: images[i] ? "#fff" : "#F1F2F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 3 }}>
                        {images[i]
                          ? <img src={images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <><span style={{ fontSize: 26, color: "#C2C6CE" }}>＋</span><span style={{ fontSize: 12, color: "#9B9B9B", fontWeight: 600 }}>{i === 0 ? "첫 번째 분" : "두 번째 분"}</span></>}
                      </div>
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0], i); }} />
                    </label>
                    {/* 성별 칩 — label 밖 배치(파일 선택 오작동 방지), setter 실호출 (era 버그 전례 방지) */}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      {([["female", "여성"], ["male", "남성"]] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setGenders(prev => { const next = [...prev]; next[i] = v; return next; })}
                          style={genderChipStyle(v, genders[i] === v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <TipChips tips={[{ icon: "face", label: "정면 얼굴" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "eye", label: "얼굴 가리지 않기" }]} />
            <PrivacyLine />
            <ProCongestionHint concept="remindwedding" />
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", marginTop: 18, background: canSubmit ? "#FF4B7C" : "#E8E9ED", color: canSubmit ? "#fff" : "#AEB2BA", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(255,75,124,0.32)" : "none" }}>
              {loading ? `만드는 중... (${elapsed}초)` : <>리마인드 웨딩 만들기 ✨{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>💒</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 두 분의 웨딩 사진을 준비하고 있어요...</p>
            <LoadingSaveNote />
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
            <ProCongestionError concept="remindwedding" error={error} />
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
          </div>
        )}
        {result && (
          <div>
            <StepIndicator current={3} />
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="리마인드 웨딩" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>저장하기</button>
              <button onClick={() => { setResult(""); }}
                style={{ flex: 1, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 만들기</button>
            </div>
            <button onClick={handleShare}
              style={{ width: "100%", marginTop: 10, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
            <Upscale4K image={result} />
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>※ 사진은 유지돼요. &quot;다시 만들기&quot;를 누르면 같은 사진으로 또 만들 수 있어요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
