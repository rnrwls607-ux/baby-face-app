"use client";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
import Upscale4K from "../components/Upscale4K";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import { CONCEPTS, LIVE_COIN_CONCEPTS } from "../lib/concepts";
import { openCoinSheet } from "../lib/coinSheet";
import { openLoginSheet } from "../lib/loginSheet";
import CoinIcon from "../components/CoinIcon";
import { ProCongestionError } from "../components/ProCongestionNote";

export default function FourcutcouplePage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>(["", ""]); // "female" | "male" — 사용자 확정값
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("fourcutcouple");
  const COIN_COST = CONCEPTS.fourcutcouple?.coinCost ?? 0;
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
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 145000); // 서버 내부 컷 140초 + 여유 5초 (Pro 추론형)
    try {
      const [c1, c2] = await Promise.all([compress(images[0]), compress(images[1])]);
      const res = await fetch("/api/fourcutcouple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: c1, image2: c2, gender1: genders[0], gender2: genders[1] }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      // 비로그인(401) → 전역 로그인 유도 시트 (에러칸 중복 표시 금지)
      if (res.status === 401) { openLoginSheet(); return; }
      if (res.status === 402) { openCoinSheet({ need: data.need ?? 0, balance: data.balance ?? 0 }); return; }
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, "커플 네컷", Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  const handleDownload = () => { void saveImage(result, "fourcutcouple.png"); };
  const handleShare = () => { void shareImage(result, "fourcutcouple.png", "MOSPIC에서 만든 사진이에요 · mospic.com"); };
  const canSubmit = !!images[0] && !!images[1] && !!genders[0] && !!genders[1] && !loading;
  const chipStyle = (active: boolean) => ({
    flex: 1, padding: "9px 0", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer",
    border: active ? "1.5px solid #FF4B7C" : "1.5px solid #EFF0F3",
    background: active ? "#FFEAF1" : "#fff",
    color: active ? "#FF4B7C" : "#9B9B9B",
  });
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>커플 네컷</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        <div style={{ background: "#FFEAF1", borderRadius: 16, padding: "16px 18px", marginBottom: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#FF4B7C", margin: "0 0 5px" }}>📸 둘이 함께, 커플 네컷</p>
          <p style={{ fontSize: 12.5, color: "#B36B85", margin: 0, lineHeight: 1.55 }}>두 사람의 사진을 한 장씩 올리면 둘이 함께 찍은 듯한 네컷 스트립을 만들어드려요. 따로 찍은 사진도 OK, 두 얼굴 모두 그대로예요.</p>
        </div>
        {!result && (
          <>
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
                      {([["female", "👩 여성"], ["male", "👨 남성"]] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setGenders(prev => { const next = [...prev]; next[i] = v; return next; })}
                          style={chipStyle(genders[i] === v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: "#BFC3CB", margin: "12px 2px 0", lineHeight: 1.5 }}>💡 각자 얼굴이 정면으로 잘 보이는 밝은 사진일수록 잘 나와요.</p>
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", marginTop: 18, background: canSubmit ? "#FF4B7C" : "#E8E9ED", color: canSubmit ? "#fff" : "#AEB2BA", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(255,75,124,0.32)" : "none" }}>
              {loading ? `만드는 중... (${elapsed}초)` : <>커플 네컷 만들기 ✨{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>📸</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 네 컷을 차례로 찍고 있어요...</p>
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
            <ProCongestionError concept="fourcutcouple" error={error} />
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
          </div>
        )}
        {result && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={result} alt="커플 네컷" style={{ width: "100%", display: "block" }} />
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
