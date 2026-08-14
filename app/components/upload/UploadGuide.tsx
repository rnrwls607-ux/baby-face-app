"use client";
import { useState, useEffect } from "react";
import { useBackClose } from "../../lib/useBackClose";

// 업로드 화면 진입 시 뜨는 안내 — 바텀시트 (2026-07-25 리디자인).
//
// 왜 바텀시트인가: 가운데 모달은 만들기 화면을 통째로 가려 "막혔다"는 느낌을 준다.
// 아래에서 올라오는 시트는 위쪽에 업로드 영역이 계속 보여 흐름이 끊기지 않는다.
// 예시 사진은 ★가로 스크롤 캐러셀이라 장수가 늘어도 시트 높이가 그대로다.
//
// ★2026-07-25 방침 변경: 예전엔 "겁주지 않기"로 빨간 X를 금지하고 명도로만 구분했는데,
//   실사진 27장으로 바꾸고 나니 좋은 예와 피할 예가 둘 다 "그냥 사진"으로 보여 구분이 죽었다.
//   이제 ✓/✕ 뱃지 + 피할 예 X 오버레이로 명시한다. 대신 겁주기는 카드 안에만 가두고,
//   시트 본문(권장 칩·"피해요" 한 줄)은 중립 톤 그대로 둔다.
//
// 기본은 매번 뜨고, "오늘 하루 보지 않기" 를 누른 날에만 안 뜬다.
// type 별로 키가 분리돼, solo_face 와 pet 은 각각 따로 관리된다.
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

// 카드 3장 = 좋은 예 1 + 피할 예 2. 캡션은 ★시트마다 다르다 —
// 컨셉이 실제로 겪는 실패("역광"·"플래시 반사"·"차가 잘림")를 그대로 적어야 도움이 된다.
//
// imgType: 사진이 있는 시트만 경로를 준다. null이면 회색 자리표시가 나온다
//   → 사진이 아직 없는 시트를 배선해도 깨진 이미지가 뜨지 않는다.
const cardsFor = (imgType: string | null, caps: readonly [string, string, string]): Card[] =>
  ([["good", caps[0], 1], ["bad", caps[1], 2], ["bad", caps[2], 3]] as const).map(([kind, caption, n]) => ({
    kind: kind as "good" | "bad",
    caption,
    ...(imgType ? { image: `/guide/${imgType}-${n}.webp` } : {}),
  }));

export type GuideType =
  | "solo_face" | "portrait_multi" | "family" | "pet"
  | "food_drink" | "product_obj" | "space" | "vehicle" | "old_photo"
  | "daily_snap" | "any_photo";

const CONTENT: Record<string, Guide> = {
  // ── 사람 ──────────────────────────────────────────────
  solo_face: { // 증명·프로필 등 1인 전용
    cards: cardsFor("solo_face", ["이렇게 올려주세요", "역광·너무 어두워요", "옆모습·얼굴 가림"]),
    checks: ["정면 얼굴", "밝은 곳에서", "얼굴이 선명하게", "상반신이 보이게"],
    avoid: ["얼굴 가림", "역광·너무 어두움", "옆모습·고개 숙임", "흐릿하거나 화질 낮음"],
  },
  portrait_multi: { // 1~2인(+펫) 변환 — ★"여러 명이 함께"를 피하라고 하면 안 된다(2인 정식 지원)
    cards: cardsFor("portrait_multi", ["이렇게 올려주세요", "너무 어두워요", "너무 멀리·얼굴이 작아요"]),
    checks: ["얼굴이 크고 또렷하게", "밝은 곳에서", "한 명 또는 두 명", "표정이 잘 보이게"],
    avoid: ["너무 어두움", "얼굴이 작게 나옴", "얼굴 가림", "흐릿하거나 화질 낮음"],
  },
  family: { // 2인 라인 — 각자 사진을 따로 올리는 방식
    cards: cardsFor("family", ["각자 셀카 한 장씩", "둘이 같이 찍힌 한 장", "너무 어두워요"]),
    checks: ["각자 정면 얼굴", "한 명씩 따로", "밝은 곳에서", "얼굴이 선명하게"],
    avoid: ["한 장에 여러 명", "얼굴 가림", "너무 어두움", "흐릿한 사진"],
  },
  pet: {
    cards: cardsFor("pet", ["정면 얼굴이 또렷하게", "흔들렸어요", "뒷모습·너무 멀리"]),
    checks: ["얼굴이 또렷하게", "정면으로", "밝은 곳에서", "몸이 잘 보이게"],
    avoid: ["흔들린 사진", "뒷모습·옆모습", "얼굴이 작게", "여러 마리 함께"],
  },
  // ── 사물·공간 ─────────────────────────────────────────
  food_drink: {
    cards: cardsFor("food_drink", ["메뉴가 잘 보이게", "플래시가 튀고 어두워요", "너무 멀리서 찍었어요"]),
    checks: ["음식이 크게", "밝은 곳에서", "그릇 전체 담기", "위에서 또는 45도"],
    avoid: ["플래시 반사", "너무 어두움", "너무 멀리서", "그릇이 잘림"],
  },
  product_obj: {
    cards: cardsFor("product_obj", ["제품만 크고 또렷하게", "배경이 어수선해요", "흔들리고 어두워요"]),
    checks: ["제품이 크게", "배경 단순하게", "밝은 곳에서", "전체가 보이게"],
    avoid: ["어수선한 배경", "흔들린 사진", "너무 어두움", "제품이 잘림"],
  },
  space: {
    cards: cardsFor("space", ["공간 전체가 보이게", "한쪽 벽만 좁게 찍혔어요", "너무 어두워요"]),
    checks: ["공간이 넓게", "수평 맞추기", "밝은 곳에서", "모서리가 보이게"],
    avoid: ["한쪽 벽만 찍힘", "기울어진 수평", "너무 어두움", "흐릿한 사진"],
  },
  vehicle: {
    cards: cardsFor("vehicle", ["차 전체가 밝게 보이게", "밤에 어둡게 찍혔어요", "차가 잘리거나 멀어요"]),
    checks: ["차 전체 담기", "밝은 낮에", "수평 맞추기", "앞·옆 45도"],
    avoid: ["밤·어두운 곳", "차가 잘림", "너무 멀리서", "흐릿한 사진"],
  },
  old_photo: { // 복원 — 입력이 "옛날 사진을 찍거나 스캔한 것"이라 규칙이 완전히 다르다
    cards: cardsFor("old_photo", ["옛 사진 정면 촬영·스캔", "액자째 비스듬히·반사광", "사진 일부만 크게"]),
    checks: ["사진 전체 담기", "정면에서 반듯하게", "밝은 곳에서", "그림자 없이"],
    avoid: ["비스듬한 각도", "유리 반사광", "일부만 찍힘", "손가락 가림"],
  },
  // ── 일상 사진 보정·구제 ───────────────────────────────
  daily_snap: { // 장면은 그대로 두고 빛·화질만 손보는 계열 — 입력이 "아무 일상 사진"이다
    // ★fixcrowd(행인 지우개)는 행인이 함께 찍힌 사진이 정상 입력이다 —
    //   이 시트에는 "혼자 나온 사진" 류 문구를 절대 넣지 않는다.
    cards: cardsFor(null, ["이렇게 올려주세요", "심하게 흐릿해요", "화면을 다시 찍었어요"]),
    checks: ["원본 그대로", "인물이 또렷하게", "화면이 흔들리지 않게", "원본 화질이 클수록 좋아요"],
    avoid: ["심하게 흐릿함", "캡처·스크린샷", "과한 필터가 이미 입혀짐", "화면을 다시 찍은 사진"],
  },
  any_photo: { // 화질만 올리는 계열 — 무엇을 찍었든 받는다(사람·사물 가리지 않음)
    cards: cardsFor(null, ["이렇게 올려주세요", "압축으로 뭉개졌어요", "이미 확대해 뭉갰어요"]),
    checks: ["원본 파일 그대로", "가장 큰 크기로", "캡처보다 원본", "무엇을 찍었든 OK"],
    avoid: ["카톡으로 받아 줄어든 사진", "화면 재촬영", "심한 압축 자국", "이미 확대해 뭉갠 사진"],
  },
};

// accent는 받기만 하고 쓰지 않는다 — 호출부 65곳이 넘기고 있어 시그니처는 유지하되,
// 확인 버튼은 컨셉 색이 아니라 중립 검정으로 통일했다(핑크는 만들기 CTA 한 곳에만).
export default function UploadGuide({ type }: { type: GuideType; accent?: string }) {
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

  const { cards, checks, avoid } = CONTENT[type] ?? CONTENT.solo_face; // 안전망 — 유니온 밖 값이 들어와도 빈 시트가 되지 않는다

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
                  // ★opacity를 걸지 않는다 — 사진 자체가 이미 어둡거나 흐린데 반투명까지 주면
                  //   흰 배경과 섞여 오히려 밝아져서 "어두운 예"가 안 어두워 보인다.
                  <img src={c.image} alt={c.caption} loading="lazy" decoding="async"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: c.kind === "good" ? "#9AA0AA" : "#B4B9C1" }}>3:4</span>
                )}
                {c.kind === "bad" && (
                  // 피할 예 마킹 — ★img에 opacity를 거는 게 아니라 검은 레이어를 위에 덮는다.
                  //   (opacity는 흰 배경과 섞여 어두운 사진을 오히려 밝게 만들었다. 덮기는 항상 어두워진다)
                  <>
                    <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.22)", pointerEvents: "none" }} />
                    {/* 대각선 X — 모서리 라운드(12px)에 잘리지 않게 네 귀퉁이에서 12% 안쪽을 잇는다.
                        preserveAspectRatio="none"이라 3:4로 늘어나며, 선 굵기도 축별로 늘어난다(의도) */}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                      <line x1="12" y1="12" x2="88" y2="88" stroke="#EF4444" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
                      <line x1="88" y1="12" x2="12" y2="88" stroke="#EF4444" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
                    </svg>
                  </>
                )}
                {/* 좋은 예 / 피할 예 — 뱃지 오른쪽에 나란히. X 오버레이보다 위에 있어야 읽힌다 */}
                <span style={{
                  position: "absolute", left: 34, top: 10, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "3px 8px",
                  background: c.kind === "good" ? "#191919" : "rgba(255,255,255,0.92)",
                  color: c.kind === "good" ? "#fff" : "#8A8F98",
                  pointerEvents: "none",
                }}>
                  {c.kind === "good" ? "좋은 예" : "피할 예"}
                </span>
                {/* ✓/✕ 뱃지 — ★img의 형제 레이어라 사진이 안 떠도(회색 자리표시) 뱃지는 남는다 */}
                <span aria-hidden="true" style={{
                  position: "absolute", left: 8, top: 8, width: 22, height: 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
                  background: c.kind === "good" ? "#22C55E" : "#EF4444",
                  boxShadow: "0 1px 4px rgba(0,0,0,.25)",
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                    {c.kind === "good" ? (
                      <polyline points="2.5,6.4 4.9,8.8 9.5,3.4" strokeLinejoin="round" />
                    ) : (
                      <>
                        <line x1="3.2" y1="3.2" x2="8.8" y2="8.8" />
                        <line x1="8.8" y1="3.2" x2="3.2" y2="8.8" />
                      </>
                    )}
                  </svg>
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 600, color: c.kind === "good" ? "#16A34A" : "#DC2626", textAlign: "center" }}>{c.caption}</p>
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
