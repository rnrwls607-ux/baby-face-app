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
// 코인 충전 상품 (세대교체 — 위 이용권 상품을 대체할 새 라인)
// ★가격 전부 임시가 — 가격표 세션에서 확정 후 교체
// ────────────────────────────────────────────────────────────

export interface CoinProduct {
  id: string;    // 상품 키 (charge 서버와 동일해야 함)
  name: string;  // 표시 이름
  coins: number; // 충전되는 코인 수
  price: number; // 가격(원)
  tag?: string;  // 시트 라벨 (인기/베스트/최저가 등)
}

export const COIN_PRODUCTS: Record<string, CoinProduct> = {
  coin3:  { id: "coin3",  name: "코인 3개",  coins: 3,  price: 2900,  tag: "인기" },
  coin10: { id: "coin10", name: "코인 10개", coins: 10, price: 6900,  tag: "베스트" },
  coin30: { id: "coin30", name: "코인 30개", coins: 30, price: 14900, tag: "최저가" },
};

export const COIN_PRODUCT_LIST: CoinProduct[] = [
  COIN_PRODUCTS["coin3"],
  COIN_PRODUCTS["coin10"],
  COIN_PRODUCTS["coin30"],
];

export function getCoinProduct(id: string): CoinProduct | null {
  return COIN_PRODUCTS[id] ?? null;
}