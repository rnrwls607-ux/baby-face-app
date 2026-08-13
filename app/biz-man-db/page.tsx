"use client";
import BeforeAfterHero from "../components/BeforeAfterHero";
import { BA_LIVE, CONCEPTS, LIVE_COIN_CONCEPTS } from "../lib/concepts";
import { openCoinSheet } from "../lib/coinSheet";
import { openLoginSheet } from "../lib/loginSheet";
import CoinIcon from "../components/CoinIcon";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
import Upscale4K from "../components/Upscale4K";
import { useBackClose, backCloseGhostCount } from "../lib/useBackClose";
import { checkPhoto, newPhotoId, type Photo } from "../lib/gate";
import GateBadge from "../components/GateBadge";
import PreviewCard from "../components/upload/PreviewCard";
import StepIndicator from "../components/upload/StepIndicator";
import UploadZone from "../components/upload/UploadZone";
import TipChips from "../components/upload/TipChips";
import PrivacyLine from "../components/upload/PrivacyLine";
import UploadGuide from "../components/upload/UploadGuide";
import LoadingSaveNote from "../components/LoadingSaveNote";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 6;
const ACCENT = "#3B5BA5";

export default function BizManDbPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const images = photos.map(p => p.src);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState("");
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("bizmdb");
  const COIN_COST = CONCEPTS.bizmdb?.coinCost ?? 0;
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
  useBackClose(results.length > 0, () => setResults([]));

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

  const handleUpload = async (files: FileList) => {
    setError("");
    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) { setError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`); return; }
    const picked = Array.from(files).slice(0, remaining);
    const converted = await Promise.all(picked.map(toBase64));
    // 1) 먼저 "확인 중" 상태로 담아 화면에 바로 보여준다.
    const batch: Photo[] = converted.map(src => ({ id: newPhotoId(), src, gate: { status: "checking" } }));
    setPhotos(prev => [...prev, ...batch]);

    // 2) 여러 장을 동시에 판정한다.
    const checks = await Promise.all(batch.map(p => checkPhoto(p.src, "solo_face")));

    const rejected = new Set<string>();
    const passed = new Map<string, Photo["gate"]>();
    const reasons: string[] = [];
    batch.forEach((p, i) => {
      const c = checks[i];
      if (c.ok) passed.set(p.id, c.gate);
      else { rejected.add(p.id); reasons.push(...c.reasons); }
    });

    // 3) 인덱스가 아니라 id 로 찾아 지우고 갱신한다 — 기다리는 동안 사진이
    //    추가·삭제돼도 엉뚱한 사진을 건드리지 않는다.
    setPhotos(prev => prev
      .filter(p => !rejected.has(p.id))
      .map(p => (passed.has(p.id) ? { ...p, gate: passed.get(p.id)! } : p)));

    if (reasons.length) setError([...new Set(reasons)].join(" · "));
  };

  const removeImage = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (images.length < MIN_PHOTOS) { setError(`정면 얼굴 사진을 ${MIN_PHOTOS}장 이상 올려주세요.`); return; }
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResults([]);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await Promise.all(images.map(compress));
      const res = await fetch("/api/biz-man-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      // 비로그인(401) → 전역 로그인 유도 시트 (에러칸 중복 표시 금지)
      if (res.status === 401) { openLoginSheet(); return; }
      if (res.status === 402) { openCoinSheet({ need: data.need ?? 0, balance: data.balance ?? 0 }); return; }
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResults(data.output);
      void addToHistory(data.output, "비즈프로필 (남성·더블브레스티드)", Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleDownload = (url: string, idx: number) => { void saveImage(url, `biz-man-db-${idx + 1}.png`); };
  const handleShare = (url: string, idx: number) => { void shareImage(url, `biz-man-db-${idx + 1}.png`, "MOSPIC에서 만든 사진이에요 · mospic.com"); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <UploadGuide type="solo_face" accent={ACCENT} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (results.length) { setResults([]); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>남성 더블브레스티드</span>
      </div>

      <div style={{ padding: "18px 18px 100px" }}>
        {results.length === 0 && (
          <>
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("bizmdb") ? (
              <BeforeAfterHero pairs={[1, 2, 3, 4, 5, 6].flatMap(n => [
                { before: `/examples/ba/bizmdb-before-${n}.webp`, after: `/examples/ba/bizmdb-after-${n}.webp` },
                { before: `/examples/ba/bizmdb-before.webp`, after: `/examples/ba/bizmdb-after-${n}.webp` },
              ])} />
            ) : (
              <PreviewCard image="/details/bizmdb.webp" caption="남성 더블브레스티드, 미리 만나보세요" accent={ACCENT} />
            )}
            <StepIndicator current={results.length > 0 ? 3 : loading ? 2 : 1} accent={ACCENT} />
            <UploadZone
              label="정면 사진"
              images={images}
              max={MAX_PHOTOS}
              onPick={handleUpload}
              onRemove={removeImage}
              renderBadge={idx => <GateBadge gate={photos[idx]?.gate} />}
              accent={ACCENT}
              cameraFacing="user"
              gridHint="첫 번째 사진이 결과의 기준이 돼요 — 가장 잘 나온 정면 사진을 첫 번째로"
            />
            <TipChips tips={[{ icon: "face", label: "정면 얼굴" }, { icon: "sun", label: "밝은 곳에서" }, { icon: "eye", label: "얼굴 가리지 않게" }]} />
            <PrivacyLine />

            <button onClick={handleSubmit} disabled={loading || images.length < MIN_PHOTOS}
              style={{ width: "100%", marginTop: 18, background: loading || images.length < MIN_PHOTOS ? "#E8E9ED" : "#3B5BA5", color: loading || images.length < MIN_PHOTOS ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || images.length < MIN_PHOTOS ? "not-allowed" : "pointer", boxShadow: loading || images.length < MIN_PHOTOS ? "none" : "0 6px 18px rgba(59,91,165,0.32)" }}>
              {loading ? `만드는 중... (${elapsed}초)` : images.length < MIN_PHOTOS ? `사진을 ${MIN_PHOTOS}장 이상 올려주세요` : <>프로필 3장 만들기 ✨{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}

        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>💼</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 전문가 프로필 3장을 각각 만들고 있어요...</p>
            <p style={{ fontSize: 12, color: "#C2C6CE", marginTop: 4 }}>조금만 기다려주세요 ({elapsed}초)</p>
            <LoadingSaveNote />
          </div>
        )}

        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
          </div>
        )}

        {results.length > 0 && (
          <div>
            <StepIndicator current={3} accent={ACCENT} />
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 6px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", margin: "-6px 0 14px" }}>AI로 생성된 이미지예요<AiReportLink /></p>
            <p style={{ fontSize: 13, color: "#9B9B9B", textAlign: "center", margin: "0 0 18px" }}>마음에 드는 포즈를 저장하세요</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {results.map((url, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#3B5BA5", background: "#EAF3FF", borderRadius: 8, padding: "3px 10px" }}>{idx + 1}번</span>
                  </div>
                  <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                    <img src={url} alt={`프로필 ${idx + 1}`} style={{ width: "100%", display: "block" }} />
                  </div>
                  <button onClick={() => handleDownload(url, idx)}
                    style={{ width: "100%", background: "#3B5BA5", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(59,91,165,0.3)" }}>이 사진 저장하기</button>
                  <button onClick={() => handleShare(url, idx)}
                    style={{ width: "100%", marginTop: 8, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
                  <Upscale4K image={url} />
                </div>
              ))}
            </div>

            <button onClick={() => { setResults([]); setPhotos([]); }}
              style={{ width: "100%", marginTop: 18, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 만들기</button>
          </div>
        )}
      </div>
    </div>
  );
}