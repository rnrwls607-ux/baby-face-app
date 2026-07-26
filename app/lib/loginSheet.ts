// 어디서든 openLoginSheet() 한 줄로 로그인 유도 시트를 띄운다.
// coinSheet와 같은 관례: Context/Provider 없이 window 커스텀 이벤트로 <LoginNeededSheet />에 전달.
// 용도: withCoin·withDailyFree가 비로그인에 돌려주는 401을 막다른 에러 박스 대신 로그인 입구로 바꾼다.
export const LOGIN_SHEET_EVENT = "mospic-login-sheet";

export function openLoginSheet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOGIN_SHEET_EVENT));
}
