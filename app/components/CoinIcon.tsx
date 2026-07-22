// 브랜드 코인 아이콘 — 앱 아이콘(검정 타일·흰 M)과 한 가족인 솔리드 각인형.
// 그라데이션·광택 없이 원반 + M 모노그램 한 획만 써서 14px에서도 또렷하게 읽힌다.
//
// onColor: 컬러 버튼 위에 얹는 경우(핑크 CTA 등). 원반이 글자색(currentColor)을 따르고
// M은 뚫린 구멍이라 버튼 배경이 비쳐 보인다 → 활성(흰 원반·핑크 M)·비활성(회색) 양쪽에서
// 라벨과 같은 톤으로 자동 정렬된다. 기본값(밝은 배경)은 검정 원반 + 흰 M.
export default function CoinIcon({ size = 16, onColor = false }: { size?: number; onColor?: boolean }) {
  const M_PATH = "M28 72 L28 34 L50 56 L72 34 L72 72";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    "aria-hidden": true as const,
    style: { display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0 } as const,
  };
  if (onColor) {
    return (
      <svg {...common}>
        <mask id="mospicCoinCut">
          <rect width="100" height="100" fill="#fff" />
          <path d={M_PATH} fill="none" stroke="#000" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <circle cx="50" cy="50" r="50" fill="currentColor" mask="url(#mospicCoinCut)" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="50" cy="50" r="50" fill="#191919" />
      <path d={M_PATH} fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
