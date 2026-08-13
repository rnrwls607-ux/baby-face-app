"use client";
import { isProConcept, isCongestionError } from "../lib/proConcepts";

// Pro 컨셉 전용 혼잡 안내 2종. flash·GPT 컨셉에서는 둘 다 null을 돌려 아무것도 그리지 않는다.

// A — 실패 시. 혼잡성 실패일 때만 뜬다. 아래에 기존 "코인은 차감되지 않았어요" 줄이 이어진다.
export function ProCongestionError({ concept, error }: { concept: string; error: string }) {
  if (!isProConcept(concept) || !isCongestionError(error)) return null;
  return (
    <div style={{ fontSize: 12, color: "#7A7F87", marginTop: 8, fontWeight: 500, lineHeight: 1.55 }}>
      지금 이 컨셉을 찾는 분들이 많아요 🙏 프리미엄 화질 모델이라 혼잡할 때는 생성이 어려울 수 있어요. 잠시 후 다시 시도하시거나, 조금 한가한 시간대에 만들어 보세요.
    </div>
  );
}

// B — 사전 안내. 만들기 버튼 위 PrivacyLine 자리의 스타일을 그대로 쓴다(새 영역 신설 없음).
export function ProCongestionHint({ concept }: { concept: string }) {
  if (!isProConcept(concept)) return null;
  return (
    <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: 11.5, color: "#9AA0AA", fontWeight: 500 }}>
      프리미엄 화질 · 혼잡 시간대엔 생성이 오래 걸리거나 실패할 수 있어요
    </p>
  );
}
