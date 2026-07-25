"use client";
import { useState, useEffect } from "react";
import { useBackClose } from "../../lib/useBackClose";

// 업로드 화면 진입 시 뜨는 안내 — 바텀시트 (2026-07-25 리디자인).
//
// 왜 바텀시트인가: 가운데 모달은 만들기 화면을 통째로 가려 "막혔다"는 느낌을 준다.
// 아래에서 올라오는 시트는 위쪽에 업로드 영역이 계속 보여 흐름이 끊기지 않는다.
// 예시 사진은 ★가로 스크롤 캐러셀이라 장수가 늘어도 시트 높이가 그대로다.
//
// ★겁주지 않기: 빨간 X·경고 삼각형을 쓰지 않는다. 피할 예는 회색·저채도로만 낮춘다.
//   (이전 버전은 초록 ✅ / 빨강 ❌ 였는데 경고문처럼 읽혔다)
//
// 기본은 매번 뜨고, "오늘 하루 보지 않기" 를 누른 날에만 안 뜬다.
// type 별로 키가 분리돼, solo_face 와 generic 은 각각 따로 관리된다.
const KEY_PREFIX = "mospic_guide_";

// 로컬 기준 오늘 날짜 YYYY-MM-DD
function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ★예시 사진 슬롯. image를 채우면 그 사진이, 비어 있으면 회색 자리표시가 나온다.
//   규격: 3:4 세로 · 최소 400×533px · webp q85 · 첫 장은 반드시 kind:"good".
type Card = { kind: "good" | "bad"; caption: string; image?: string };
type Guide = { cards: Card[]; checks: string[]; avoid: string[] };

const CONTENT: Record<string, Guide> = {
  solo_face: {
    cards: [
      { kind: "good", caption: "정면 · 밝은 곳" },
      { kind: "bad", caption: "얼굴 가림" },
      { kind: "bad", caption: "너무 어두움" },
    ],
    checks: ["정면 얼굴", "밝은 곳에서", "얼굴이 선명하게", "상반신이 보이게"],
    avoid: ["얼굴 가림", "너무 어두움", "여러 명이 함께", "흐릿하거나 화질 낮음"],
  },
  generic: {
    cards: [
      { kind: "good", caption: "크고 밝게" },
      { kind: "bad", caption: "너무 어두움" },
      { kind: "bad", caption: "흐릿함" },
    ],
    checks: ["대상이 크게", "밝은 곳에서", "선명하게", "배경 단순하게"],
    avoid: ["너무 어두움", "흐릿하거나 화질 낮음", "대상이 작게", "복잡한 배경"],
  },
  pet: {
    cards: [
      { kind: "good", caption: "정면 · 또렷하게" },
      { kind: "bad", caption: "흔들린 사진" },
      { kind: "bad", caption: "얼굴이 작게" },
    ],
    checks: ["얼굴이 또렷하게", "밝은 곳에서", "정면으로", "몸이 잘 보이게"],
    avoid: ["흔들린 사진", "너무 어두움", "얼굴이 작게", "여러 마리 함께"],
  },
  family: {
    cards: [
      { kind: "good", caption: "각자 정면" },
      { kind: "bad", caption: "한 장에 여럿" },
      { kind: "bad", caption: "너무 어두움" },
    ],
    checks: ["각자 정면 얼굴", "밝은 곳에서", "한 명씩 따로", "얼굴이 선명하게"],
    avoid: ["한 장에 여러 명", "얼굴 가림", "너무 어두움", "흐릿한 사진"],
  },
};

// accent는 받기만 하고 쓰지 않는다 — 호출부 65곳이 넘기고 있어 시그니처는 유지하되,
// 확인 버튼은 컨셉 색이 아니라 중립 검정으로 통일했다(핑크는 만들기 CTA 한 곳에만).
export default function UploadGuide({ type }: { type: "solo_face" | "generic" | "pet" | "family"; accent?: string }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // 올라오는 애니메이션용
  const storageKey = KEY_PREFIX + type;
  // 뒤로가기 → 시트만 닫기 (페이지 이탈 방지)
  useBackClose(open, () => setOpen(false));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // 저장된 날짜가 오늘이 아니면(값 없음·지난 날짜 포함) 띄운다.
      if (localStorage.getItem(storageKey) !== todayStr()) setOpen(true);
    } catch {
      /* localStorage 접근 불가(시크릿 모드 등) 시 조용히 넘어간다 */
    }
  }, [storageKey]);

  // 열린 다음 프레임에 transform을 풀어 아래→위로 올라오게 한다
  useEffect(() => {
    if (!open) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const close = () => setOpen(false);

  // "오늘 하루 보지 않기" — 오늘 날짜를 저장해 그날은 안 뜨게 한다.
  const hideToday = () => {
    try {
      localStorage.setItem(storageKey, todayStr());
    } catch {
      /* 저장 실패해도 시트는 닫는다 */
    }
    setOpen(false);
  };

  if (!open) return null;

  const { cards, checks, avoid } = CONTENT[type] ?? CONTENT.generic;

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.42)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 480,
          padding: "10px 18px 20px", maxHeight: "80vh", overflowY: "auto",
          transform: shown ? "translateY(0)" : "translateY(100%)",
          transition: "transform .28s cubic-bezier(.32,.72,0,1)",
        }}
      >
        {/* 드래그 핸들 — 시트라는 걸 알리는 표식 */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E3E5EA", margin: "0 auto 14px" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 900, color: "#191919", letterSpacing: -0.2 }}>생성 전에 확인해 주세요</p>
            <p style={{ margin: 0, fontSize: 12, color: "#8A8F98" }}>예시를 옆으로 넘겨보세요</p>
          </div>
          <button onClick={close} aria-label="닫기"
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#F1F2F5", border: "none", color: "#8A8F98", fontSize: 15, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {/* 예시 캐러셀 — 카드 폭 132px, 세 번째가 살짝 잘려 보여 "더 있다"를 암시 */}
        <div className="hide-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -18px 14px", padding: "0 18px", scrollSnapType: "x proximity" }}>
          {cards.map((c, i) => (
            <div key={i} style={{ flex: "0 0 132px", scrollSnapAlign: "start" }}>
              <div style={{ position: "relative", aspectRatio: "3/4", borderRadius: 12, overflow: "hidden", background: c.kind === "good" ? "#E4E6EA" : "#ECEDF0" }}>
                {c.image ? (
                  <img src={c.image} alt={c.caption} loading="lazy" decoding="async"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: c.kind === "bad" ? 0.72 : 1 }} />
                ) : (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: c.kind === "good" ? "#9AA0AA" : "#B4B9C1" }}>3:4</span>
                )}
                {/* 좋은 예 / 피할 예 — 색이 아니라 명도로만 구분한다 */}
                <span style={{
                  position: "absolute", left: 7, top: 7, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "3px 8px",
                  background: c.kind === "good" ? "#191919" : "rgba(255,255,255,0.92)",
                  color: c.kind === "good" ? "#fff" : "#8A8F98",
                }}>
                  {c.kind === "good" ? "좋은 예" : "피할 예"}
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 600, color: c.kind === "good" ? "#191919" : "#8A8F98", textAlign: "center" }}>{c.caption}</p>
            </div>
          ))}
        </div>

        {/* 권장 항목 — 칩. 개수가 3개든 5개든 줄바꿈으로 자연스럽게 늘어난다 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {checks.map(t => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "#191919", background: "#fff", border: "1px solid #EFF0F3", borderRadius: 999, padding: "6px 11px" }}>
              <span style={{ color: "#8A8F98", fontSize: 10 }}>✓</span>{t}
            </span>
          ))}
        </div>

        {/* 비권장 — 카드로 키우지 않고 한 줄로 눕힌다. 겁주지 않으면서 정보는 남긴다 */}
        <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#9AA0AA", lineHeight: 1.6 }}>
          피해요 · {avoid.join(" · ")}
        </p>

        <button onClick={close}
          style={{ width: "100%", background: "#191919", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          확인했어요
        </button>
        <button onClick={hideToday}
          style={{ display: "block", margin: "11px auto 0", background: "none", border: "none", color: "#9AA0AA", fontSize: 12.5, fontWeight: 500, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
          오늘 하루 보지 않기
        </button>
      </div>
    </div>
  );
}
