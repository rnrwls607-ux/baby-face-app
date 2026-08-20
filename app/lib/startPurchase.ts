// 코인 충전 결제 진입 — 시트(402)와 지갑 탭이 공유하는 단일 입구.
//
// 왜 합쳤나: 같은 Toss 호출이 CoinNeededSheet과 CoinWallet에 복제돼 있었다.
// IAP가 들어오면 분기가 두 곳에서 갈라져 한쪽만 고치는 사고가 난다.
//
// ★앱(Capacitor)에서는 Toss를 절대 띄우지 않는다. Play 정책상 앱 안에서 외부 결제를
//   여는 것 자체가 위반이라, 분기가 아니라 차단이다. RC 연동 전까지는 안내만 띄운다.
import { getCoinProduct } from "./products";
import { saveReturnTo } from "./returnTo";
import { rcPurchase, type NativeOutcome } from "./revenuecat";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

type CapacitorGlobal = { isNativePlatform?: () => boolean };

// 기존 관례(saveImage·shareImage·notifyDone)와 같은 판별
function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor?.isNativePlatform?.() === true;
}

export type PurchaseOutcome = "web-toss" | "unknown-product" | NativeOutcome;

/**
 * 충전 결제를 시작한다.
 * @param saveReturn 402 시트 경유일 때만 true — 충전 후 만들던 자리로 돌려보내기 위해 경로를 저장한다.
 *                   지갑 탭 충전은 false(지갑에서 온 사람은 지갑으로 복귀).
 */
export async function startPurchase(
  productId: string,
  opts?: { saveReturn?: boolean }
): Promise<PurchaseOutcome> {
  const product = getCoinProduct(productId);
  if (!product) return "unknown-product";

  // ── 앱: 외부 결제 차단 + Play IAP ──
  // ★Toss는 이 분기에서 절대 열리지 않는다. Play 정책상 앱 안의 외부 결제는
  //   분기가 아니라 위반이라, 여기서 반환하지 못하면 아무 결제도 시작하지 않는다.
  // ★NEXT_PUBLIC_RC_ANDROID_KEY 미설정이면 rcPurchase가 IAP-A와 같은 안내 토스트를
  //   띄우고 "native-pending"으로 돌아온다 — 키를 넣기 전까지 동작 무변화.
  if (isNative()) {
    return await rcPurchase(product.playProductId);
  }

  // ── 웹: 기존 Toss 경로 (자구 보존) ──
  if (opts?.saveReturn) saveReturnTo(window.location.pathname);
  try {
    const { loadTossPayments } = await import("@tosspayments/payment-sdk");
    const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
    const orderId = "coin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await tossPayments.requestPayment("카드", {
      amount: product.price,
      orderId,
      orderName: "MOSPIC " + product.name,
      successUrl: window.location.origin + "/payment/success?flow=coin&productId=" + productId,
      failUrl: window.location.origin + "/payment/fail",
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code !== "USER_CANCEL") {
      alert("결제 중 오류가 발생했어요: " + (err?.message || ""));
    }
  }
  return "web-toss";
}
