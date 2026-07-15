"use client";
import { useEffect, useRef } from "react";

// state로 여닫는 화면(모달·오버레이·결과 단계)의 뒤로가기 처리 훅.
//
// 동작:
// - 화면이 열리면 같은 URL로 히스토리 한 칸(pushState, 깊이 태그 포함)을 쌓는다.
// - 안드로이드 뒤로가기/iOS 스와이프(popstate)가 오면 앱 이탈 대신 화면을 닫는다.
//   popstate의 state 깊이를 비교해 "후진일 때만, 내려간 만큼만" 닫는다
//   (겹침 순서 보장 + 히스토리 목록으로 여러 칸 점프해도 정합).
// - 앞으로가기로 유령 칸(닫힌 화면의 잔여 칸)에 재진입하면 아무것도 닫지 않고
//   조용히 한 칸 되돌아온다(아래층 화면 오닫힘 방지).
// - X/‹ 버튼 등 코드로 닫힐 때는 history.back()으로 쌓아둔 칸을 소비하고,
//   그때 발생하는 popstate는 무시 가드(ignoreNextPop)로 걸러 이중 닫힘을 막는다.
//
// 유령 칸: 닫힌 화면의 가짜 칸은 forward 히스토리에 남아 history.length를
// 부풀린다(브라우저 스펙상 삭제 불가, 다음 pushState 때 자동 정리됨).
// "history.length > 1"로 이탈 가능 여부를 판단하는 ‹ 버튼은 반드시
// backCloseGhostCount()를 더해서 비교할 것: length > 1 + backCloseGhostCount()
//
// 주의: 페이지 전체 이동(window.location.href)과 화면 닫기를 한 클릭에서
// 같이 하면 back()과 이동이 경합할 수 있다 — 이동하는 분기에서는 화면을
// 닫지 말고 window.location.replace(url)로 이동할 것 (가짜 칸이 목적지로
// 덮여 잔여 칸이 남지 않는다).

type Entry = { close: () => void };

const stack: Entry[] = [];
let ignoreNextPop = 0;
let ghostsAhead = 0; // 현재 포인터 앞(forward)에 남은 가짜 칸 수
let listenerReady = false;

function ensureListener() {
  if (listenerReady || typeof window === "undefined") return;
  listenerReady = true;
  window.addEventListener("popstate", (e: PopStateEvent) => {
    if (ignoreNextPop > 0) {
      ignoreNextPop--;
      return;
    }
    const s = e.state as { __backClose?: number } | null;
    const depth = s && typeof s.__backClose === "number" ? s.__backClose : 0;
    if (depth >= stack.length + 1) {
      // 앞으로가기로 유령 칸에 재진입 → 아무것도 닫지 않고 한 칸 되돌아온다.
      // 가드를 걸지 않아야 여러 칸 점프도 연쇄 bounce로 원위치까지 복귀한다.
      // (되돌아온 칸의 depth는 항상 stack 이하라 닫힘 루프는 돌지 않음 — 안전)
      window.history.back();
      return;
    }
    // 후진: 열린 화면 수보다 낮은 깊이로 내려간 만큼 닫기 (점프 대응)
    while (stack.length > depth) {
      const top = stack.pop();
      ghostsAhead++;
      if (top) top.close();
    }
  });
  // bfcache 복원(뒤로가기로 문서가 통째로 되살아남) 시: 화면 state는 열린 채인데
  // 가짜 칸은 이미 소비/대체된 뒤일 수 있어 어긋난다 → 전부 닫고 카운터 리셋.
  window.addEventListener("pageshow", (e: PageTransitionEvent) => {
    if (!e.persisted) return;
    ignoreNextPop = 0;
    ghostsAhead = 0;
    while (stack.length) {
      const top = stack.pop();
      if (top) top.close();
    }
  });
}

// ‹ 버튼의 "history.length > 1" 휴리스틱 보정용: 유령 칸 수를 돌려준다.
export function backCloseGhostCount(): number {
  return ghostsAhead;
}

export function useBackClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    ensureListener();
    let poppedByBack = false;
    const entry: Entry = {
      close: () => {
        poppedByBack = true;
        onCloseRef.current();
      },
    };
    window.history.pushState({ __backClose: stack.length + 1 }, "");
    ghostsAhead = 0; // pushState가 forward의 유령 칸을 전부 잘라냄
    stack.push(entry);
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      if (!poppedByBack) {
        // 코드로 닫힘(X·‹버튼) → 쌓아둔 칸 소비, 그 popstate는 무시
        ignoreNextPop++;
        ghostsAhead++;
        window.history.back();
      }
    };
  }, [open]);
}
