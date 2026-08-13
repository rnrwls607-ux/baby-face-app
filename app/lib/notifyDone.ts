// 생성 완료 로컬 알림 — 앱(Capacitor)에서 백그라운드일 때만 1발.
//
// 왜: Pro 생성은 100~200초다. 그동안 다른 앱을 쓰다 보면 완성된 걸 모르고 지나친다.
// 서버측 히스토리 확정 저장(2026-08-13)으로 결과는 안전해졌으니, 남은 건 "다 됐다"는 신호뿐이다.
//
// ★웹 브라우저는 발화 0. Notification API를 쓰지 않는다 —
//   탭이 죽으면 콜백 자체가 안 돌아 정작 필요한 순간에 못 가고, 권한 프롬프트만 남기 때문이다.
// ★실패 알림은 보내지 않는다(소음). 완성만 알린다.
// ★이 파일의 어떤 실패도 생성 흐름을 막지 않는다 — 모든 경로가 조용히 반환한다.

type PermStatus = { display: "granted" | "denied" | "prompt" | "prompt-with-rationale" };
type LocalNotificationsPlugin = {
  checkPermissions(): Promise<PermStatus>;
  requestPermissions(): Promise<PermStatus>;
  schedule(options: { notifications: { id: number; title: string; body: string }[] }): Promise<unknown>;
};
type AppPlugin = { getState(): Promise<{ isActive: boolean }> };
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { LocalNotifications?: LocalNotificationsPlugin; App?: AppPlugin };
};

const DENIED_KEY = "mospic_notif_denied"; // 거절 기억 — 재요청 스팸 금지
let asked = false;                        // 세션 내 1회

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor;
}
function native(): boolean {
  const c = cap();
  return !!c?.isNativePlatform?.();
}

// 첫 생성 직전에 1회 호출. 거절해도 생성은 그대로 진행된다(반환값을 아무도 안 본다).
export async function ensureNotifyPermission(): Promise<void> {
  try {
    if (!native() || asked) return;
    asked = true;
    const plugin = cap()?.Plugins?.LocalNotifications;
    if (!plugin) return;
    // ★한 번 거절했으면 다시 묻지 않는다 — 안드로이드는 재요청이 사실상 막히고, 물어봐야 소음이다
    if (localStorage.getItem(DENIED_KEY) === "1") return;
    const cur = await plugin.checkPermissions();
    if (cur.display === "granted") return;
    if (cur.display === "denied") { localStorage.setItem(DENIED_KEY, "1"); return; }
    const res = await plugin.requestPermissions();
    if (res.display !== "granted") localStorage.setItem(DENIED_KEY, "1");
  } catch {
    /* 권한 흐름 실패는 생성과 무관 — 조용히 통과 */
  }
}

// 생성 성공 직후 호출. 앱 + 백그라운드 + 권한 보유일 때만 1발 발화한다.
export async function notifyGenerationDone(): Promise<void> {
  try {
    if (!native()) return; // ★웹 브라우저는 여기서 끝
    const plugins = cap()?.Plugins;
    const notif = plugins?.LocalNotifications;
    const app = plugins?.App;
    if (!notif || !app) return;
    const state = await app.getState();
    if (state?.isActive !== false) return; // 포그라운드면 화면에 결과가 이미 있다
    const perm = await notif.checkPermissions();
    if (perm.display !== "granted") return;
    await notif.schedule({
      notifications: [{
        id: Math.floor(Date.now() % 2147483647),
        title: "MOSPIC ✨",
        body: "사진이 완성됐어요! 히스토리에서 확인해 보세요",
      }],
    });
  } catch {
    /* 알림 실패는 결과에 영향 없음 — 조용히 통과 */
  }
}
