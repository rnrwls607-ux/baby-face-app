"use client";
// 상세 화면 비포/애프터 라이브 예시 — 2.5초 간격 크로스페이드(0.6s), 쌍 여럿이면 순환.
// 자산 규칙: public/examples/ba/{key}-before.webp, {key}-after-1.webp (-2…) — 768×1024(3:4), scripts/ba-prep.mjs로 규격화.
// 자산이 없거나 로드 실패한 쌍은 제외하고, 유효 쌍이 0이면 아무것도 렌더하지 않는다 (기존 화면 무변화 폴백).
import { useEffect, useRef, useState } from "react";

type Pair = { before: string; after: string };

export default function BeforeAfterHero({ pairs }: { pairs: Pair[] }) {
  const [valid, setValid] = useState<Pair[] | null>(null); // null=검증 중
  const [idx, setIdx] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 자산 사전 검증 — 깨진 쌍은 조용히 제외 (점멸 방지: 검증 끝나기 전엔 미렌더)
  useEffect(() => {
    let alive = true;
    const check = (src: string) => new Promise<boolean>((resolve) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = src;
    });
    Promise.all(pairs.map(async (p) => (await check(p.before)) && (await check(p.after)) ? p : null))
      .then((r) => { if (alive) setValid(r.filter((p): p is Pair => !!p)); });
    return () => { alive = false; };
  }, [pairs]);

  // 순환 타이머: before(2.5s) → after(2.5s) → 다음 쌍 — 오버레이 닫히면(언마운트) 정리
  useEffect(() => {
    if (!valid || valid.length === 0) return;
    timerRef.current = setInterval(() => {
      setShowAfter((prev) => {
        if (!prev) return true;
        setIdx((i) => (i + 1) % valid.length);
        return false;
      });
    }, 2500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [valid]);

  if (!valid || valid.length === 0) return null;
  const pair = valid[Math.min(idx, valid.length - 1)];

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 18, overflow: "hidden", background: "#F1F2F6" }}>
      <img src={pair.before} alt="" loading="lazy" decoding="async"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: showAfter ? 0 : 1, transition: "opacity 0.6s ease" }} />
      <img src={pair.after} alt="" loading="lazy" decoding="async"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: showAfter ? 1 : 0, transition: "opacity 0.6s ease" }} />
      <span style={{ position: "absolute", left: 12, top: 12, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12, letterSpacing: 0.5 }}>
        {showAfter ? "After" : "Before"}
      </span>
      {valid.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
          {valid.map((_, i) => (
            <span key={i} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, background: i === idx ? "#fff" : "rgba(255,255,255,0.5)", transition: "all .2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
