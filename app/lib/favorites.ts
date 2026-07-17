// 컨셉 즐겨찾기 저장소 — localStorage 단일 키, SSR 안전(모듈 최상위에서 window 접근 금지).
// 키 체계: conceptForGo(go).key (CONCEPTS 키) — 상세 오버레이(detail.key)와 홈 카드 필터가 같은 키로 만난다.
const STORAGE_KEY = "mospic_favorites";

export function getFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function isFavorite(key: string): boolean {
  return getFavorites().includes(key);
}

// 토글 후의 상태를 반환 (true = 방금 추가됨)
export function toggleFavorite(key: string): boolean {
  const list = getFavorites();
  const idx = list.indexOf(key);
  const added = idx < 0;
  if (added) list.push(key);
  else list.splice(idx, 1);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 저장 불가 환경(프라이빗 모드 등) — 조용히 무시, 세션 내 동작은 상태가 담당
  }
  return added;
}
