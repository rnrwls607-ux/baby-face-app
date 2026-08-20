"use client";
// RevenueCat 브리지 — 앱 내 결제(Play IAP)의 유일한 입구.
//
// ★env 게이트: NEXT_PUBLIC_RC_ANDROID_KEY가 없으면 이 모듈은 통째로 잠긴 상태다.
//   그러면 startPurchase의 네이티브 분기는 IAP-A와 똑같이 "곧 열려요" 토스트로 남는다.
//   = 키를 넣기 전까지 라이브 동작이 1비트도 바뀌지 않는다.
//
// ★플러그인은 셸(C:\mospic-app)에만 설치돼 있고 웹 리포에는 없다. 원격 URL 모드라
//   window.Capacitor.Plugins.Purchases로 직접 부른다 — BackButtonBridge·saveImage와
//   같은 "전역 + 지역 타입 선언" 관례. (capacitor.plugins.json 등록명 = "Purchases")
//
// ★로그인 연동을 auth 흐름에 배선하지 않는 이유: 구매 직전에 /api/auth/me로 uid를
//   확인하고 그때 configure/logIn 한다. 로그아웃 훅을 한 곳이라도 빠뜨리면 RC의
//   appUserID가 이전 사용자로 굳어 남의 계정에 코인이 들어간다 — 그 사고를
//   구조적으로 불가능하게 만드는 편이 낫다.
import { toast } from "./toast";
import { openLoginSheet } from "./loginSheet";

const RC_KEY = process.env.NEXT_PUBLIC_RC_ANDROID_KEY || "";

// 적립은 RC 웹훅이 비동기로 한다 — 구매 직후 잔액이 바로 오르지 않을 수 있다.
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 15000;

type StoreProduct = { identifier: string };
type PurchasesPlugin = {
  configure(o: { apiKey: string; appUserID?: string | null }): Promise<void>;
  logIn(o: { appUserID: string }): Promise<unknown>;
  getProducts(o: { productIdentifiers: string[]; type?: string }): Promise<{ products: StoreProduct[] }>;
  purchaseStoreProduct(o: { product: StoreProduct }): Promise<unknown>;
};
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { Purchases?: PurchasesPlugin };
};

// 키가 설정돼 있어야 IAP가 열린다. 없으면 rcPurchase가 기존 안내 토스트로 폴백한다.
function rcEnabled(): boolean {
  return RC_KEY.length > 0;
}

function plugin(): PurchasesPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.() !== true) return null;
  return cap.Plugins?.Purchases ?? null;
}

// configure는 문서당 1회. 이후 사용자가 바뀌면 logIn으로 갈아탄다.
let configuredFor: string | null = null;

async function ready(p: PurchasesPlugin, uid: string): Promise<void> {
  if (configuredFor === null) {
    await p.configure({ apiKey: RC_KEY, appUserID: uid });
    configuredFor = uid;
    return;
  }
  if (configuredFor !== uid) {
    await p.logIn({ appUserID: uid });
    configuredFor = uid;
  }
}

// 카카오 uid — 웹훅이 app_user_id로 받게 될 값과 같아야 적립이 이 계정으로 간다.
async function kakaoUid(): Promise<string | null> {
  try {
    const r = await fetch("/api/auth/me");
    if (!r.ok) return null;
    const d = await r.json();
    return d?.loggedIn && d?.user?.id ? String(d.user.id) : null;
  } catch {
    return null;
  }
}

async function balance(): Promise<number | null> {
  try {
    const r = await fetch("/api/coins");
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d?.balance === "number" ? d.balance : null;
  } catch {
    return null;
  }
}

export type NativeOutcome =
  | "native-pending"      // env 미설정 — IAP-A와 동일한 안내
  | "native-login-required"
  | "native-unavailable"  // Play에 미등록
  | "native-cancelled"
  | "native-error"
  | "native-credited"     // 폴링으로 잔액 증가 확인
  | "native-pending-credit"; // 구매는 됐고 적립은 웹훅 대기

/**
 * 앱 내 결제 1건. 성공하면 웹훅 적립을 폴링으로 확인해 사용자에게 결과까지 알린다.
 * ★어떤 경로로도 Toss를 열지 않는다 — Play 정책상 앱 안의 외부 결제는 위반이다.
 */
export async function rcPurchase(playProductId: string): Promise<NativeOutcome> {
  const p = plugin();
  if (!p || !rcEnabled()) {
    // 키가 없거나 플러그인이 아직 주입 전 — IAP-A와 같은 자리에 같은 문구
    toast("앱 내 결제를 준비하고 있어요 🚀 곧 열려요");
    return "native-pending";
  }

  // 게스트는 적립 대상이 아니다(웹훅이 카카오 uid로만 적립한다) → 로그인 먼저
  const uid = await kakaoUid();
  if (!uid) {
    openLoginSheet();
    return "native-login-required";
  }

  try {
    await ready(p, uid);
  } catch (e) {
    console.error("[rc] configure/logIn 실패:", (e as Error)?.message);
    toast("결제를 준비하지 못했어요. 잠시 후 다시 시도해 주세요");
    return "native-error";
  }

  // 스토어에 실제로 있는 상품만 구매할 수 있다
  let product: StoreProduct | undefined;
  try {
    const { products } = await p.getProducts({ productIdentifiers: [playProductId], type: "NON_SUBSCRIPTION" });
    product = (products || []).find((x) => x.identifier === playProductId);
  } catch (e) {
    console.error("[rc] getProducts 실패:", (e as Error)?.message);
  }
  if (!product) {
    // ★Play에 아직 등록되지 않은 상품(현재 coin_9·coin_30). 결제를 시작조차 하지 않는다.
    //   버튼을 미리 회색으로 죽이려면 시트·지갑 UI를 손봐야 하는데 이번 범위 밖이라,
    //   누르는 순간 여기서 막고 이유를 말한다 — 잘못 결제되는 경로는 없다.
    toast("이 상품은 아직 준비 중이에요");
    return "native-unavailable";
  }

  const before = (await balance()) ?? 0;

  try {
    await p.purchaseStoreProduct({ product });
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean; message?: string };
    // 취소는 사용자가 의도한 행동이다 — 아무 말도 하지 않는다
    if (err?.userCancelled === true || err?.code === "PURCHASE_CANCELLED_ERROR") return "native-cancelled";
    console.error("[rc] 구매 실패:", err?.code, err?.message);
    toast("결제를 완료하지 못했어요");
    return "native-error";
  }

  // ── 적립 확인 — 결제는 Play가, 적립은 RC 웹훅이 한다(비동기) ──
  toast("코인 적립 확인 중이에요…");
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const now = await balance();
    if (now !== null && now > before) {
      toast(`코인 ${now - before}개가 충전됐어요 · 잔액 ${now}개`);
      return "native-credited";
    }
  }
  // 웹훅이 늦을 뿐 결제는 끝났다 — 사용자를 불안하게 두지 않는다
  toast("적립이 곧 완료돼요 — 잠시 후 코인 탭에서 확인해 주세요");
  return "native-pending-credit";
}
