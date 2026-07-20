"use client";
// 상세 화면 비포/애프터 컴팩트 예시 — PreviewCard 풋프린트(16:10·radius 18) 안에 좌우 50:50 분할.
// 좌=Before / 우=After, 쌍이 2개 이상이면 3초마다 좌우가 함께 0.5s 크로스페이드로 다음 쌍 순환(1쌍이면 정지).
// 자산 규칙(다쌍): public/examples/ba/{key}-before-N.webp + {key}-after-N.webp (쌍별 before)
// 하위호환(단쌍): {key}-before.webp 1장 + {key}-after-N.webp — scripts/ba-prep.mjs로 규격화.
// 자산이 없거나 로드 실패한 쌍은 제외하고(같은 after 중복은 첫 유효 후보만), 유효 쌍이 0이면 아무것도 렌더하지 않는다.
import { useEffect, useState } from "react";

type Pair = { before: string; after: string };

export default function BeforeAfterHero({ pairs }: { pairs: Pair[] }) {
  const [valid, setValid] = useState<Pair[] | null>(null); // null=검증 중
  const [idx, setIdx] = useState(0);

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
      .then((r) => {
        if (!alive) return;
        // 같은 after를 가리키는 후보(신규 before-N / 하위호환 before 공유)가 둘 다 유효하면 앞선 것만
        const seen = new Set<string>();
        const deduped = r.filter((p): p is Pair => !!p && !seen.has(p.after) && !!seen.add(p.after));
        setValid(deduped);
      });
    return () => { alive = false; };
  }, [pairs]);

  // 쌍 순환 타이머 (2쌍 이상일 때만) — 언마운트 시 정리
  useEffect(() => {
    if (!valid || valid.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % valid.length), 3000);
    return () => clearInterval(t);
  }, [valid]);

  if (!valid || valid.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", borderRadius: 18, overflow: "hidden", border: "1px solid #EFF0F3", background: "#F1F2F6", marginBottom: 8 }}>
      {/* 쌍 레이어들 — idx 레이어만 보이고 0.5s 크로스페이드 */}
      {valid.map((p, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, display: "flex", opacity: i === idx ? 1 : 0, transition: "opacity 0.5s ease" }}>
          <div style={{ width: "50%", height: "100%", borderRight: "1px solid rgba(255,255,255,0.7)" }}>
            <img src={p.before} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ width: "50%", height: "100%" }}>
            <img src={p.after} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      ))}
      {/* 라벨 칩 — 각 절반 좌상단 초소형 */}
      <span style={{ position: "absolute", left: 8, top: 8, background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 9, letterSpacing: 0.4 }}>Before</span>
      <span style={{ position: "absolute", left: "calc(50% + 8px)", top: 8, background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 9, letterSpacing: 0.4 }}>After</span>
      {/* 점 인디케이터 — 창 안 우하단 초소형 (외부 공간 점유 0) */}
      {valid.length > 1 && (
        <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 4 }}>
          {valid.map((_, i) => (
            <span key={i} style={{ width: i === idx ? 10 : 4, height: 4, borderRadius: 2, background: i === idx ? "#fff" : "rgba(255,255,255,0.55)", transition: "all .2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
