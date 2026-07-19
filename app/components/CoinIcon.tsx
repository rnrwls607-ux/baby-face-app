// 브랜드 코인 아이콘 — 로고 팔레트(코랄→민트) 정원 + 흰색 조리개 6엽 심볼.
// 14px에서도 또렷하도록 세부 디테일 없이 굵은 획만 사용, 흰 내부 링으로 경계 확보.
export default function CoinIcon({ size = 16 }: { size?: number }) {
  const blades = Array.from({ length: 6 }, (_, k) => {
    const a1 = (k * 60 * Math.PI) / 180;
    const a2 = ((k * 60 + 28) * Math.PI) / 180;
    return {
      x1: +(12 + 3.1 * Math.cos(a1)).toFixed(2),
      y1: +(12 + 3.1 * Math.sin(a1)).toFixed(2),
      x2: +(12 + 6.9 * Math.cos(a2)).toFixed(2),
      y2: +(12 + 6.9 * Math.sin(a2)).toFixed(2),
    };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0 }}>
      <defs>
        <linearGradient id="mospicCoinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2A48C" />
          <stop offset="1" stopColor="#8FD0CC" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#mospicCoinGrad)" />
      <circle cx="12" cy="12" r="10.7" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      {blades.map((b, i) => (
        <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      ))}
    </svg>
  );
}
