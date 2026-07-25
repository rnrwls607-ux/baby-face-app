"use client";
// 셸 하드웨어 백버튼 안전망 — @capacitor/app backButton 리스너 (원격 모드: 웹 배포만으로 앱 반영).
// 리스너가 등록되면 Capacitor 기본 back 처리(무확인 즉시 종료)를 대체한다:
//  - canGoBack=true  → window.history.back() 위임 — useBackClose popstate가 오버레이·탭을 한 겹씩 닫음
//  - canGoBack=false(홈 최상단, 갈 곳 없음) → 더블백 종료: 첫 백=토스트+2초 창, 창 안 재백=exitApp
// 웹 브라우저에선 window.Capacitor 부재로 자연 무동작. (@capacitor/* 웹 미설치 — saveImage와 같은 전역+지역 타입 관례)
// ★2026-07-25 재시도 도입: 원격 모드에서 Capacitor 브리지 주입이 초기 이펙트보다 늦으면
// 문서당 1회 시도가 실패해 리스너 없이 기본 동작(무확인 즉시 종료)으로 떨어지던 결함 — 재시도로 방어.
// 이 컴포넌트는 layout에 있어 리마운트가 사실상 없으므로 "다음 마운트에서 재확인"을 기대할 수 없었다.
import { useEffect } from "react";
import { toast } from "../lib/toast";
import { showDiagBadge } from "../lib/useBackClose"; // ★임시 진단(제거 예정) — D5 배지

type AppPlugin = {
  addListener(event: "backButton", cb: (info: { canGoBack: boolean }) => void): unknown;
  exitApp(): Promise<void>;
};
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { App?: AppPlugin };
};

const RETRY_MS = 200;
const RETRY_MAX = 10; // 즉시 1회 + 폴링 10회 = 최대 11번, 약 2초까지 기다린다

let registered = false; // 모듈 가드 — 리마운트에도 리스너는 문서당 1회
let diagShown = false;  // ★임시 진단(제거 예정) — D5는 문서당 1회만

// 브리지가 준비됐으면 리스너를 걸고 true. 아직이면(웹 브라우저 포함) false.
function tryRegister(): boolean {
  if (registered) return true;
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  const app = cap?.isNativePlatform?.() ? cap.Plugins?.App : undefined;
  if (!app) return false; // 아직 주입 전이거나 웹 브라우저 — 호출부가 재시도한다
  registered = true;
  let exitArmed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  app.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) { window.history.back(); return; }
    // 딥링크·직행 진입 시 하드웨어 백이 홈을 못 보고 종료되던 결함 수리
    // (화면 내 ‹ 버튼의 기존 방어와 동작 통일).
    // replace로 가야 홈이 새 바닥 칸이 되고 잔여 가짜 칸이 남지 않는다.
    // pathname === "/" 가드로 무한 폴백 차단 — 홈에서는 아래 더블백 종료 그대로.
    if (window.location.pathname !== "/") { window.location.replace("/"); return; }
    if (exitArmed) { void app.exitApp(); return; }
    exitArmed = true;
    toast("한 번 더 누르면 종료됩니다");
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { exitArmed = false; }, 2000);
  });
  return true;
}

export default function BackButtonBridge() {
  useEffect(() => {
    if (registered) return;
    let tries = 1;
    // ★임시 진단(제거 예정) — 등록 시도가 끝난 시점에 결과를 화면 배지로 1회.
    //   순수 웹 브라우저에서도 "실패"가 뜬다(정상 무동작인데도) — 진단 기간 한정 수용.
    const diag = (msg: string) => { if (!diagShown) { diagShown = true; showDiagBadge(msg); } };
    if (tryRegister()) { diag("D5 브리지등록 OK (시도 1회)"); return; }
    const id = setInterval(() => {
      tries++;
      if (tryRegister()) {
        clearInterval(id);
        diag("D5 브리지등록 OK (시도 " + tries + "회)");
        return;
      }
      if (tries > RETRY_MAX) {
        clearInterval(id); // 전부 실패 — 조용히 포기(웹 브라우저 경로와 동일 무동작)
        diag("D5 브리지등록 실패 Cap=" + !!(window as { Capacitor?: CapacitorGlobal }).Capacitor);
      }
    }, RETRY_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
