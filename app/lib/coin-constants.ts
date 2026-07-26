// 서버 의존 0 상수 파일 — 클라 컴포넌트는 반드시 여기서 import한다.
// coins.ts를 클라에서 import하면 @upstash/redis가 번들에 끌려 들어간다(13차 실측:
// 135KB 청크에 Redis SDK가 통째로 포함됐다. 토큰 값은 새지 않았지만 순수 낭비).
//
// 이 파일에는 어떤 import도 두지 않는다 — 그 원칙이 깨지는 순간 같은 오염이 재발한다.

export const WELCOME_COINS = 3;
