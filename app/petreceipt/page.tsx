"use client";
import AiReportLink from "../components/AiReportLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { saveImage } from "../lib/saveImage";
import { shareImage } from "../lib/shareImage";
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
import Upscale4K from "../components/Upscale4K";
import LoadingSaveNote from "../components/LoadingSaveNote";

// ─────────────────────────────────────────────────────────────
// [보존] Canvas 렌더 방식(drawReport) — AI 이미지 방식으로 전환하며 비활성화.
// 고정 앵커라 사진마다 콜아웃이 실제 부위를 못 맞추는 한계로 교체했다.
// 롤백하려면 아래 주석을 해제하고 handleSubmit의 결과 처리만 되돌리면 된다.
//
// type ReceiptItem = { feature?: string; name?: string; desc?: string; score?: number };
// type ReceiptData = { petType?: string; items?: ReceiptItem[]; total?: number; summary?: string };
//
// // 관상 보고서 포스터 — Canvas로 직접 그린다(글자를 코드가 그리므로 한글이 100% 정확).
// // 중앙에 큰 펫 사진, 사진 바깥 여백에 부위별 칩 5개, 칩에서 사진 안 실제 부위로 콜아웃 선.
// // 칩 폭은 measureText로 실측해 텍스트가 절대 잘리지 않는다.
// const KO = "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
//
// // 부위 앵커 — 사진 프레임 기준 상대 좌표(정면 펫 사진의 일반적 위치).
// // side/order: 칩을 놓을 쪽과 위→아래 순서(부위의 세로 순서와 맞춰 선 교차를 없앤다).
// const PARTS: Record<string, { label: string; side: "L" | "R"; order: number; ax: number; ay: number }> = {
//   ears:     { label: "귀",   side: "L", order: 0, ax: 0.20, ay: 0.16 },
//   eyes:     { label: "눈",   side: "L", order: 1, ax: 0.36, ay: 0.40 },
//   cheek:    { label: "광대", side: "L", order: 2, ax: 0.28, ay: 0.58 },
//   forehead: { label: "이마", side: "R", order: 0, ax: 0.52, ay: 0.22 },
//   nose:     { label: "코",   side: "R", order: 1, ax: 0.50, ay: 0.52 },
// };
//
// function loadImg(src: string): Promise<HTMLImageElement> {
//   return new Promise((res, rej) => {
//     const im = new Image();
//     im.onload = () => res(im);
//     im.onerror = () => rej(new Error("이미지를 불러오지 못했어요."));
//     im.src = src;
//   });
// }
//
// async function drawReport(d: ReceiptData, photo: string): Promise<string> {
//   const items = (d.items || []).slice(0, 5);
//   const W = 1080, H = 1260;
//   const c = document.createElement("canvas");
//   c.width = W; c.height = H;
//   const ctx = c.getContext("2d")!;
//   const IVORY = "#F8F2E6", INK = "#2A2723", GOLD = "#C9A961", PINK = "#FF4B7C", GRAY = "#8C867C";
//
//   // 둥근 사각형 경로 (roundRect 미지원 환경 대비 직접 구현)
//   const rr = (x: number, y: number, w: number, h: number, r: number) => {
//     ctx.beginPath();
//     ctx.moveTo(x + r, y);
//     ctx.arcTo(x + w, y, x + w, y + h, r);
//     ctx.arcTo(x + w, y + h, x, y + h, r);
//     ctx.arcTo(x, y + h, x, y, r);
//     ctx.arcTo(x, y, x + w, y, r);
//     ctx.closePath();
//   };
//   // 지정 폭에 들어올 때까지 폰트를 줄인다(잘림 방지 — 줄여도 안 되면 최소 크기로 반환)
//   const fitFont = (text: string, weight: string, maxW: number, start: number, min: number) => {
//     let size = start;
//     while (size > min) {
//       ctx.font = `${weight} ${size}px ${KO}`;
//       if (ctx.measureText(text).width <= maxW) break;
//       size -= 1;
//     }
//     ctx.font = `${weight} ${size}px ${KO}`;
//     return size;
//   };
//
//   ctx.fillStyle = IVORY; ctx.fillRect(0, 0, W, H);
//
//   // ── 헤더
//   ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
//   ctx.fillStyle = INK; ctx.font = `900 62px ${KO}`;
//   ctx.fillText("우리 애 관상 보고서", W / 2, 128);
//   ctx.fillStyle = GRAY; ctx.font = `600 28px ${KO}`;
//   ctx.fillText("AI 관상 분석", W / 2, 178);
//
//   // ── 중앙 펫 사진 (둥근 프레임 + 옅은 그림자)
//   const PW = 460, PH = 580, PX = (W - PW) / 2, PY = 250;
//   ctx.save();
//   ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
//   ctx.fillStyle = "#EAF1F9"; rr(PX, PY, PW, PH, 44); ctx.fill();
//   ctx.restore();
//   try {
//     const im = await loadImg(photo);
//     ctx.save();
//     rr(PX, PY, PW, PH, 44); ctx.clip();
//     const k = Math.max(PW / im.width, PH / im.height);
//     const sw = PW / k, sh = PH / k;
//     ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, PX, PY, PW, PH);
//     ctx.restore();
//   } catch { /* 사진 로드 실패 — 프레임만 남기고 계속 그린다 */ }
//   ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; rr(PX, PY, PW, PH, 44); ctx.stroke();
//
//   // ── 부위별 칩 + 콜아웃 선
//   // 칩은 사진 바깥 여백에만 놓는다: 좌 여백 [28, PX-30], 우 여백 [PX+PW+30, W-28]
//   const GAP = 30, M = 28;
//   const leftMaxW = PX - GAP - M;               // 좌 여백 최대 폭
//   const rightMaxW = W - M - (PX + PW + GAP);   // 우 여백 최대 폭
//   const PAD = 20, CHIP_H = 104, LINE_GAP = 34;
//   const slotsL = [PY + 30, PY + 30 + CHIP_H + LINE_GAP, PY + 30 + (CHIP_H + LINE_GAP) * 2];
//   const slotsR = [PY + 80, PY + 80 + CHIP_H + LINE_GAP];
//
//   for (const it of items) {
//     const meta = PARTS[String(it.feature || "")];
//     if (!meta) continue;
//     const maxW = meta.side === "L" ? leftMaxW : rightMaxW;
//     const innerMax = maxW - PAD * 2;
//     const head = `${it.name || meta.label}`;
//     const score = `${Number(it.score) || 0}점`;
//     const desc = String(it.desc || "");
//     // 폰트: 칩 안쪽 폭에 맞춰 실측 축소 (이름+점수는 한 줄에 나란히)
//     const scoreSize = 22;
//     ctx.font = `900 ${scoreSize}px ${KO}`;
//     const scoreW = ctx.measureText(score).width;
//     const headSize = fitFont(head, "900", innerMax - scoreW - 12, 30, 18);
//     const headW = ctx.measureText(head).width;
//     const descSize = fitFont(desc, "600", innerMax, 22, 14);
//     const descW = ctx.measureText(desc).width;
//     // 칩 폭 = 두 줄 중 긴 쪽 + 패딩 (여백을 넘지 않게 상한)
//     const contentW = Math.max(headW + 12 + scoreW, descW);
//     const chipW = Math.min(maxW, Math.ceil(contentW) + PAD * 2);
//     const x = meta.side === "L" ? Math.max(M, PX - GAP - chipW) : PX + PW + GAP;
//     const y = (meta.side === "L" ? slotsL : slotsR)[meta.order] ?? PY;
//
//     // 콜아웃 선: 칩의 사진쪽 모서리 → 사진 안 부위 앵커 (완만한 L자, 끝에 점)
//     const fromX = meta.side === "L" ? x + chipW : x;
//     const fromY = y + CHIP_H / 2;
//     const toX = PX + PW * meta.ax, toY = PY + PH * meta.ay;
//     const midX = meta.side === "L" ? PX + 16 : PX + PW - 16;
//     ctx.strokeStyle = GOLD; ctx.lineWidth = 1.8;
//     ctx.beginPath();
//     ctx.moveTo(fromX, fromY);
//     ctx.lineTo(midX, fromY);
//     ctx.lineTo(toX, toY);
//     ctx.stroke();
//     ctx.fillStyle = GOLD;
//     ctx.beginPath(); ctx.arc(toX, toY, 6, 0, Math.PI * 2); ctx.fill();
//     ctx.beginPath(); ctx.arc(fromX, fromY, 3.5, 0, Math.PI * 2); ctx.fill();
//
//     // 칩 배경
//     ctx.save();
//     ctx.shadowColor = "rgba(0,0,0,0.06)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
//     ctx.fillStyle = "#FFFFFF"; rr(x, y, chipW, CHIP_H, 24); ctx.fill();
//     ctx.restore();
//     ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6; rr(x, y, chipW, CHIP_H, 24); ctx.stroke();
//     // 칩 텍스트 (이름 왼쪽 / 점수 오른쪽 / 풀이 아랫줄)
//     ctx.textAlign = "left"; ctx.fillStyle = INK;
//     ctx.font = `900 ${headSize}px ${KO}`;
//     ctx.fillText(head, x + PAD, y + 44);
//     ctx.textAlign = "right"; ctx.fillStyle = PINK;
//     ctx.font = `900 ${scoreSize}px ${KO}`;
//     ctx.fillText(score, x + chipW - PAD, y + 44);
//     ctx.textAlign = "left"; ctx.fillStyle = GRAY;
//     ctx.font = `600 ${descSize}px ${KO}`;
//     ctx.fillText(desc, x + PAD, y + 80);
//   }
//
//   // ── 하단 총점 밴드 (총평이 길면 폰트를 줄여 밴드 안에 맞춘다 — 잘림 금지)
//   const BX = 70, BW = W - BX * 2, BY = PY + PH + 85, BH = 150;
//   ctx.fillStyle = "#FFF6E3"; rr(BX, BY, BW, BH, 44); ctx.fill();
//   ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; rr(BX, BY, BW, BH, 44); ctx.stroke();
//   ctx.textAlign = "center";
//   ctx.fillStyle = INK; ctx.font = `900 46px ${KO}`;
//   ctx.fillText(`총점 ${Number(d.total) || 0}점`, W / 2, BY + 66);
//   const summary = String(d.summary || "");
//   ctx.fillStyle = PINK;
//   fitFont(summary, "800", BW - 80, 28, 16);
//   ctx.fillText(summary, W / 2, BY + 112);
//
//   // ── 푸터
//   ctx.fillStyle = GRAY;
//   ctx.font = "italic 800 26px sans-serif";
//   ctx.fillText("mospic ✦", W / 2, H - 95);
//   ctx.font = `600 21px ${KO}`;
//   ctx.fillText("* 재미로 보는 관상이에요", W / 2, H - 52);
//   return c.toDataURL("image/png");
// }
// ─────────────────────────────────────────────────────────────

export default function PetreceiptPage() {
  const router = useRouter();
  // 코인 게이트 표시·가드 (coinCost는 표시 전용 — 요금의 진실원은 서버 withCoin) — ★스위치 날 벌크 앵커
  const COIN_GATED = LIVE_COIN_CONCEPTS.includes("petreceipt");
  const COIN_COST = CONCEPTS.petreceipt?.coinCost ?? 0;
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
    // 즉시 부족 체크(캐시 기준, 서버 호출 전) — ★스위치 날 벌크 앵커
    if (COIN_GATED && coinBalance !== null && coinBalance < COIN_COST) { openCoinSheet({ need: COIN_COST, balance: coinBalance }); return; }
    setLoading(true); setError(""); setResult("");
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 235000); // 서버 내부 컷 230초 + 여유 5초 (Pro 포스터 생성)
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
      // 비로그인(401) → 전역 로그인 유도 시트 (에러칸 중복 표시 금지)
      if (res.status === 401) { openLoginSheet(); return; }
      // 코인 부족(402) → 전역 충전 유도 시트 (에러칸 중복 표시 금지) — ★스위치 날 벌크 앵커
      if (res.status === 402) { openCoinSheet({ need: data.need ?? 0, balance: data.balance ?? 0 }); return; }
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResult(data.output[0]);
      void addToHistory(data.output, "펫 관상 영수증", Array.isArray(data.originalUrls) ? data.originalUrls : undefined);
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
      <LeaveConfirmSheet open={leaveGuard.asking} coin={COIN_GATED && COIN_COST > 0} onStay={leaveGuard.stay} onLeave={leaveGuard.leave} />
      <UploadGuide type="pet" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (result) { setResult(""); return; } if (window.history.length > 1 + backCloseGhostCount()) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>펫 관상 영수증</span>
      </div>
      <div style={{ padding: "18px 18px 100px" }}>
        {!result && (
          <>
            {/* 결과 예시 — BA_LIVE면 비포/애프터 라이브, 아니면 기존 PreviewCard (무변화 폴백) */}
            {BA_LIVE.includes("petreceipt") ? (
              <BeforeAfterHero pairs={[1, 2, 3].flatMap(n => [
                { before: `/examples/ba/petreceipt-before-${n}.webp`, after: `/examples/ba/petreceipt-after-${n}.webp` },
                { before: `/examples/ba/petreceipt-before.webp`, after: `/examples/ba/petreceipt-after-${n}.webp` },
              ])} />
            ) : (
              <PreviewCard placeholder="🧾" caption="우리 아이 관상 영수증, 미리 만나보세요" />
            )}
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
            <ProCongestionHint concept="petreceipt" />
            <button onClick={handleSubmit} disabled={loading || !image}
              style={{ width: "100%", marginTop: 18, background: loading || !image ? "#E8E9ED" : "#FF4B7C", color: loading || !image ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !image ? "not-allowed" : "pointer", boxShadow: loading || !image ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `보는 중... (${elapsed}초)` : <>관상 보기 ✨{COIN_GATED && COIN_COST > 0 && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> · <CoinIcon size={14} onColor /> {COIN_COST}</span>}</>}
            </button>
          </>
        )}
        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🧾</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI 관상가가 얼굴을 살펴보고 있어요...</p>
            <LoadingSaveNote />
          </div>
        )}
        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
            <ProCongestionError concept="petreceipt" error={error} />
            {COIN_GATED && COIN_COST > 0 && <div style={{ fontSize: 12, color: "#9B9B9B", marginTop: 6, fontWeight: 500 }}>코인은 차감되지 않았어요</div>}
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
            <Upscale4K image={result} />
          </div>
        )}
      </div>
    </div>
  );
}
