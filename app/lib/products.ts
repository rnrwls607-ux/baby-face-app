// ────────────────────────────────────────────────────────────
// 이용권 상품 정의 (단일 출처)
// 메인 화면 결제창 + 결제 확인 서버가 "둘 다 이 파일"을 봅니다.
// 가격을 바꾸려면 여기만 고치면 돼요.
// ────────────────────────────────────────────────────────────

export interface Product {
  id: string;    // 상품 키 (confirm 서버와 동일해야 함)
  name: string;  // 표시 이름
  uses: number;  // 충전되는 이용 횟수
  price: number; // 가격(원)
  tag?: string;  // 결제창 라벨 (인기/베스트/최저가 등)
}

export const PRODUCTS: Record<string, Product> = {
  "3uses":  { id: "3uses",  name: "3회 이용권",  uses: 3,  price: 2900,  tag: "인기" },
  "10uses": { id: "10uses", name: "10회 이용권", uses: 10, price: 6900,  tag: "베스트" },
  "30uses": { id: "30uses", name: "30회 이용권", uses: 30, price: 14900, tag: "최저가" },
};

// 화면에 순서대로 보여줄 목록
export const PRODUCT_LIST: Product[] = [
  PRODUCTS["3uses"],
  PRODUCTS["10uses"],
  PRODUCTS["30uses"],
];

export function getProduct(id: string): Product | null {
  return PRODUCTS[id] ?? null;
}

// ────────────────────────────────────────────────────────────
// 코인 충전 상품 (세대교체 — 위 이용권 상품을 대체하는 새 라인)
// 가격표 확정 2026-07-17(MJ): 1코인=500원 정가, 단가=출력장수×3, 런칭 40% 할인
// charge 서버의 금액 검증은 price(할인가) 기준
// ────────────────────────────────────────────────────────────

export interface CoinProduct {
  id: string;          // 상품 키 (charge 서버와 동일해야 함)
  name: string;        // 표시 이름
  coins: number;       // 충전되는 코인 수
  price: number;       // 실판매가(원) — 런칭 할인 적용가
  listPrice: number;   // 정가(원) — 취소선 표시용
  discountPct: number; // 할인율(%)
  badge: string;       // 할인 뱃지 문구
  tag?: string;        // 시트 라벨 (인기/베스트/최저가 등)
  playProductId: string; // Play Console 관리형 상품 ID (IAP)
}

// ★playProductId 명명 규칙: Play 상품 ID는 소문자·숫자·언더스코어만 되고, 한 번 만들면
//   삭제가 안 된다(비활성화만 가능). 내부 키(coin3)와 1:1로 읽히면서 규칙에도 맞는 형태로 잡았다.
//   Play Console에 이 값 그대로 등록해야 한다 — 한 글자라도 다르면 상품을 못 찾는다.
export const COIN_PRODUCTS: Record<string, CoinProduct> = {
  coin3:  { id: "coin3",  name: "코인 3개",  coins: 3,  price: 900,  listPrice: 1500,  discountPct: 40, badge: "런칭 기념 40%", tag: "인기",   playProductId: "coin_3" },
  coin9:  { id: "coin9",  name: "코인 9개",  coins: 9,  price: 2700, listPrice: 4500,  discountPct: 40, badge: "런칭 기념 40%", tag: "베스트", playProductId: "coin_9" },
  coin30: { id: "coin30", name: "코인 30개", coins: 30, price: 9000, listPrice: 15000, discountPct: 40, badge: "런칭 기념 40%", tag: "최저가", playProductId: "coin_30" },
};

export const COIN_PRODUCT_LIST: CoinProduct[] = [
  COIN_PRODUCTS["coin3"],
  COIN_PRODUCTS["coin9"],
  COIN_PRODUCTS["coin30"],
];

export function getCoinProduct(id: string): CoinProduct | null {
  return COIN_PRODUCTS[id] ?? null;
}

// Play 상품 ID → 내부 코인 상품 (IAP 적립 라우트가 영수증의 productId로 우리 상품을 찾을 때 쓴다)
export function getCoinProductByPlayId(playProductId: string): CoinProduct | null {
  return COIN_PRODUCT_LIST.find((p) => p.playProductId === playProductId) ?? null;
}
