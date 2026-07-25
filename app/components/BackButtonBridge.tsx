"use client";
// 셸 하드웨어 백버튼 안전망 — @capacitor/app backButton 리스너 (원격 모드: 웹 배포만으로 앱 반영).
// 리스너가 등록되면 Capacitor 기본 back 처리(무확인 즉시 종료)를 대체한다:
//  - canGoBack=true  → window.history.back() 위임 — useBackClose popstate가 오버레이·탭을 한 겹씩 닫음
//  - canGoBack=false(홈 최상단, 갈 곳 없음) → 더블백 종료: 첫 백=토스트+2초 창, 창 안 재백=exitApp
// 웹 브라우저에선 window.Capacitor 부재로 자연 무동작. (@capacitor/* 웹 미설치 — saveImage와 같은 전역+지역 타입 관례)
import { useEffect } from "react";
import { toast } from "../lib/toast";

type AppPlugin = {
  addListener(event: "backButton", cb: (info: { canGoBack: boolean }) => void): unknown;
  exitApp(): Promise<void>;
};
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { App?: AppPlugin };
};

let registered = false; // 모듈 가드 — 리마운트에도 리스너는 문서당 1회

export default function BackButtonBridge() {
  useEffect(() => {
    if (registered) return;
    const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
    const app = cap?.isNativePlatform?.() ? cap.Plugins?.App : undefined;
    if (!app) return; // 웹 브라우저 — 무동작 (가드를 세우지 않아 이후 마운트에서 재확인 무해)
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
  }, []);
  return null;
}
