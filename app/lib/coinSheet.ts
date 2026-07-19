// 어디서든 openCoinSheet({need, balance}) 한 줄로 코인 부족 충전 유도 시트를 띄운다.
// Toast와 같은 관례: Context/Provider 없이 window 커스텀 이벤트로 <CoinNeededSheet />에 전달.
export const COIN_SHEET_EVENT = "mospic-coin-sheet";

export type CoinSheetDetail = { need: number; balance: number };

export function openCoinSheet(detail: CoinSheetDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CoinSheetDetail>(COIN_SHEET_EVENT, { detail }));
}
