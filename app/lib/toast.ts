// 어디서든 toast("메시지") 한 줄로 하단 알림을 띄운다.
// Context/Provider 없이 window 커스텀 이벤트로 <Toast /> 에 전달한다.
export const TOAST_EVENT = "mospic-toast";

export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
