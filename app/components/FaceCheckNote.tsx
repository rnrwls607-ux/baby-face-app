"use client";
// 얼굴 사전 검사 안내 — 업로드 카드 "바로 아래"에 뜬다 (B안, 2026-08-14 MJ 확정).
//
// 이전 방식(GateBadge 오버레이)의 문제를 그대로 뒤집은 설계다:
//   · 8.5px 글씨 → 11.5px 이상. 이 앱 본문 최소 크기를 지킨다
//   · 오렌지 커튼이 판정 대상인 사진을 덮음 → 사진은 절대 덮지 않는다
//   · reasons[0] 한 줄만 → 사유 전부 표시
//   · hard_fail이 화면 위 분홍칸으로 감 → 사라진 자리 바로 아래에서 이유를 말한다
//   · 결제·서버 오류와 에러칸 공유 → 완전히 다른 칸·다른 색
//   · "확인 중"이 검은 커튼 → 사진 밖 잔잔한 회색 줄
//   · 통과 시 표시 0 → 조용한 확인 한 줄
//   · 다음 행동 없음 → [이 사진 바꾸기] / [다른 사진 고르기]
//   · 토큰 밖 오렌지(#F08C00) → 경고색 #E0A33C 계열로 통일
//
// ★"그대로 진행" 버튼은 두지 않는다. 검사가 막으려는 행동에 버튼을 달아주면
//   안내가 아니라 승인이 된다. 다만 만들기 버튼을 잠그지도 않는다 — soft_fail은
//   "만들 수는 있지만 아쉽다"는 판정이고, 멀쩡한 사진을 잘못 막는 것이 최악이다.
import type { FaceNote } from "../lib/useFaceCheck";

const WARN = "#E0A33C";
const WARN_BG = "#FCF3E2";
const WARN_TX = "#B87A18";
const WARN_BORDER = "#F0E3CB";

type Props = {
  notes: FaceNote[];
  onReplace: (index: number, files: FileList) => void; // soft — 지목된 사진 교체
  onPick: (files: FileList) => void;                   // hard — 새로 고르기
};

export default function FaceCheckNote({ notes, onReplace, onPick }: Props) {
  if (notes.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
      {notes.map((n, i) => {
        if (n.kind === "checking") {
          return (
            <div key={i} style={barStyle("#EDEFF2", "#5A6068")}>
              <span style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#A8AEB8" }} />
                ))}
              </span>
              사진 확인 중이에요
            </div>
          );
        }
        if (n.kind === "ok") {
          return (
            <div key={i} style={barStyle("#E9F6F5", "#3E8E89")}>
              ✓&nbsp;&nbsp;{n.count}장 확인 완료 — 만들 준비 됐어요
            </div>
          );
        }
        if (n.kind === "soft") {
          return (
            <div key={i} style={cardStyle(WARN_BORDER)}>
              <div style={hdrStyle}>
                <span style={{ ...icStyle, background: WARN_BG, color: WARN_TX }}>{n.index + 1}</span>
                <b style={{ fontSize: 13.5, fontWeight: 900, color: "#191919" }}>
                  {n.index + 1}번째 사진, 이대로는 아쉬워요
                </b>
              </div>
              <ReasonList reasons={n.reasons} />
              <PickButton label="이 사진 바꾸기" onPick={(f) => onReplace(n.index, f)} />
            </div>
          );
        }
        // hard — 담기지 못한 사진
        return (
          <div key={i} style={cardStyle("#F0D5D5")}>
            <div style={hdrStyle}>
              <span style={{ ...icStyle, background: "#FBEDED", color: "#B3453F" }}>✕</span>
              <b style={{ fontSize: 13.5, fontWeight: 900, color: "#191919" }}>
                {n.count}장은 담지 못했어요
              </b>
            </div>
            <ReasonList reasons={n.reasons} />
            <PickButton label="다른 사진 고르기" onPick={onPick} />
          </div>
        );
      })}
    </div>
  );
}

function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
      {reasons.map((r, i) => (
        <li key={i} style={{ fontSize: 12, color: "#5A6068", lineHeight: 1.7, paddingLeft: 15, position: "relative" }}>
          <span style={{ position: "absolute", left: 5, top: 9, width: 3, height: 3, borderRadius: "50%", background: "#C2C6CE" }} />
          {r}
        </li>
      ))}
    </ul>
  );
}

// 버튼 자체가 파일 선택창을 연다 — "바꾸기"라고 써놓고 다른 데를 누르게 하지 않는다.
function PickButton({ label, onPick }: { label: string; onPick: (files: FileList) => void }) {
  return (
    <label style={{ display: "block", textAlign: "center", borderRadius: 12, padding: "11px 0", fontSize: 12.5, fontWeight: 800, background: "#191919", color: "#fff", cursor: "pointer" }}>
      {label}
      <input type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) { onPick(e.target.files); e.target.value = ""; } }} />
    </label>
  );
}

const barStyle = (bg: string, color: string) => ({
  display: "flex", alignItems: "center", gap: 8,
  padding: "11px 14px", borderRadius: 14,
  fontSize: 12.5, fontWeight: 700, background: bg, color,
});

const cardStyle = (border: string) => ({
  background: "#fff", border: `1.5px solid ${border}`, borderRadius: 16, padding: "14px 15px",
});

const hdrStyle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 9 } as const;

const icStyle = {
  width: 21, height: 21, borderRadius: 7, fontSize: 11.5, fontWeight: 900,
  display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
} as const;

export { WARN as FACE_WARN_COLOR };
