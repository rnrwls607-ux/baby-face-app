// ────────────────────────────────────────────────────────────
// 이용권 상품 정의 (단일 출처)
// 구매 화면과 결제 확인 서버가 "둘 다 이 파일"을 보게 해서
// 가격이 어긋나거나 악용되는 걸 막습니다.
// ────────────────────────────────────────────────────────────

export interface Product {
  id: string;    // 상품 키 (confirm 서버와 동일해야 함)
  name: string;  // 표시 이름
  uses: number;  // 충전되는 이용 횟수
  price: number; // 가격(원)
}

export const PRODUCTS: Record<string, Product> = {
  "3uses":  { id: "3uses",  name: "3회 이용권",  uses: 3,  price: 2900 },
  "10uses": { id: "10uses", name: "10회 이용권", uses: 10, price: 6900 },
  "30uses": { id: "30uses", name: "30회 이용권", uses: 30, price: 14900 },
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