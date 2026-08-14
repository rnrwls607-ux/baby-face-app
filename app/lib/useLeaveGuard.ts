"use client";
// 생성 중 이탈 가드 — 로딩 중 뒤로가기를 가로채 "계속 기다리기 / 나가기" 확인 시트를 띄운다.
//
// 왜: 생성은 서버에서 계속 돌아가고 완성되면 코인이 사용된다. 로딩 화면에서
// 무심코 누른 뒤로가기가 곧바로 앱을 벗어나면 사용자는 "코인만 날렸다"고 느낀다.
// 한 번 물어보고, 나가더라도 무슨 일이 일어나는지 정직하게 알려주는 게 목적.
//
// 구조(2단 가드 — useBackClose 무개조):
//   1단 useBackClose(loading && idle)  → 뒤로가기 = 시트 열기(asking)
//   2단 useBackClose(asking)           → 시트가 가진 히스토리 칸
// 1단이 칸을 소비당하며 닫히고 곧바로 2단이 새 칸을 쌓으므로, 화면은 그대로 있고
// 이탈만 막힌다. [계속 기다리기]로 돌아오면 1단이 다시 칸을 쌓아 재가드된다.
//
// ★버튼도 반드시 window.history.back()으로 닫는다(직접 setState 금지).
// useBackClose는 "코드로 닫힘"을 감지하면 cleanup에서 back()을 쏘는데, 그 back은
// 비동기라 같은 커밋에서 1단이 쌓는 pushState와 경합해 유령 칸이 남는다.
// 진짜 popstate로 닫으면 칸이 정확히 하나 소비되고 잔여 칸이 0이다.
//
// [나가기]는 router.push("/") 소프트 이동 — location 계열(href/replace)은 문서를
// 갈아엎어 진행 중인 fetch 클로저(then → addToHistory)까지 죽인다. 소프트 이동이면
// 컴포넌트만 언마운트되고 생성·히스토리 저장은 끝까지 완주한다("계속 진행돼요"가 참).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBackClose } from "./useBackClose";

export type LeaveGuard = {
  asking: boolean;
  stay: () => void;
  leave: () => void;
};

export function useLeaveGuard(loading: boolean): LeaveGuard {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "asking" | "gone">("idle");
  // 2단 가드의 popstate가 "되돌아오기"인지 "나가기"인지 가르는 신호.
  // state가 아니라 ref인 이유: 버튼 클릭 → back() → popstate 사이에 리렌더가 없다.
  const leavingRef = useRef(false);

  // 1단: 로딩 중 뒤로가기 → 이탈 대신 확인 시트
  useBackClose(loading && phase === "idle", () => setPhase("asking"));
  // 2단: 시트가 소유한 칸. 뒤로가기·[계속 기다리기]·[나가기]가 모두 여기로 모인다.
  useBackClose(phase === "asking", () => {
    if (leavingRef.current) {
      leavingRef.current = false;
      setPhase("gone");
    } else {
      // 되돌아오기 — loading이 살아 있으면 1단이 곧바로 칸을 다시 쌓는다(재가드).
      setPhase("idle");
    }
  });

  // 생성 완료·실패 → 시트 자동 닫힘 + 상태 리셋.
  // 여기서는 코드로 닫히므로 2단 cleanup의 back()이 쌓아둔 칸을 소비한다
  // (결과 오버레이의 useBackClose가 같은 커밋에서 쌓는 칸과는 깊이 태그로 구분됨).
  useEffect(() => {
    if (loading) return;
    leavingRef.current = false;
    setPhase(p => (p === "asking" ? "idle" : p));
  }, [loading]);

  // 소프트 이동은 popstate 핸들러 안이 아니라 커밋 후에 — 라우터와 경합하지 않는다.
  useEffect(() => {
    if (phase !== "gone") return;
    // ★한 틱 미룬다 — popstate 처리와 같은 틱에 쏜 push는 Next 라우터가 삼킨다(실측:
    //   "push" 호출은 됐는데 URL·history 그대로). 다음 매크로태스크로 넘기면 정상 이동.
    const t = setTimeout(() => router.push("/"), 0);
    return () => clearTimeout(t);
  }, [phase, router]);

  return {
    asking: phase === "asking",
    stay: () => { leavingRef.current = false; window.history.back(); },
    leave: () => { leavingRef.current = true; window.history.back(); },
  };
}
