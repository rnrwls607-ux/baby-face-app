// 신원(identity) 단일 관문 — kakao_user 쿠키의 서명 발급·검증을 여기서만 한다.
//
// ★2026-08-29 HMAC 서명 도입 (P0-1): 이전에는 쿠키가 평문 JSON이었고 읽는 쪽이
//   JSON.parse만 했다. httpOnly는 JS 읽기를 막을 뿐 사용자가 devtools·프록시로
//   값을 "바꾸는 것"은 못 막는다 → 아무 id나 써넣어 남의 히스토리 열람·웰컴코인
//   무한 파밍·관리자 사칭이 가능했다. 이제 서명 없는/틀린 쿠키는 비로그인이다.
//
// ★쿠키 형식: base64url(payload) + "." + base64url(HMAC-SHA256(그 base64url 문자열))
//   서명 대상은 "인코딩된 문자열 그 자체"다 — JSON 재직렬화 차이(키 순서·공백)로
//   검증이 흔들리는 일을 원천 차단한다.
//
// ★구형(무서명) 쿠키 하위호환은 의도적으로 넣지 않는다. 받아주는 순간 위조도 같이
//   받아주게 되어 이 수술이 무의미해진다. 실사용자가 MJ·테스터뿐인 지금이
//   무통 마이그레이션의 마지막 기회 — 기존 세션은 재로그인 1회로 정리된다.
import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "kakao_user";
const SECRET_MIN_LEN = 32;

// env 미설정 시 동작: "기동 실패"가 아니라 "전원 비로그인".
// ★기존 관례와 같은 방향이다 — RC_WEBHOOK_AUTH 없으면 404(iap-credit),
//   REVIEW_LOGIN_TOKEN 짧으면 404(review-login), COIN_ADMIN_IDS 비면 전원 거부(admin.ts).
//   전부 "열리는 방향"이 아니라 "잠기는 방향"으로 실패한다. 여기도 같다:
//   비밀키가 없으면 서명도 검증도 불가 → 아무도 로그인 상태가 되지 않는다.
function secret(): string | null {
  const s = process.env.AUTH_COOKIE_SECRET || "";
  if (s.length < SECRET_MIN_LEN) {
    // 값은 절대 찍지 않는다 — 미설정/길이 미달 사실만 알린다(review-login 관례).
    console.warn(`[auth] AUTH_COOKIE_SECRET ${s ? `길이 미달(최소 ${SECRET_MIN_LEN}자)` : "미설정"} — 전원 비로그인으로 동작`);
    return null;
  }
  return s;
}

const enc = (s: string): string => Buffer.from(s, "utf8").toString("base64url");
const mac = (body: string, key: string): string => createHmac("sha256", key).update(body).digest("base64url");

export type Identity = { id: string; nickname?: string; profileImage?: string | null; email?: string | null };

// 쿠키에 구울 서명값을 만든다. 비밀키가 없으면 null — 호출부는 로그인을 성립시키지 않는다.
export function signIdentity(user: Identity): string | null {
  const key = secret();
  if (!key) return null;
  const body = enc(JSON.stringify(user));
  return `${body}.${mac(body, key)}`;
}

// 서명 검증 후 payload를 돌려준다. 실패(서명 없음·불일치·비밀키 없음·깨진 JSON) = null.
export function verifyIdentity(value: string | undefined): Identity | null {
  const key = secret();
  if (!key || !value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null; // 구형 평문 쿠키가 여기서 걸린다
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expect = mac(body, key);
  // timingSafeEqual은 길이가 다르면 던진다 — 먼저 거르고, 같을 때만 상수시간 비교.
  if (sig.length !== expect.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return { ...parsed, id: String(parsed.id) } as Identity;
  } catch {
    return null;
  }
}

// 검증된 사용자 객체 — 닉네임·프로필까지 필요한 곳(/api/auth/me)이 쓴다.
export function getUser(request: NextRequest): Identity | null {
  return verifyIdentity(request.cookies.get(COOKIE)?.value);
}

// "카카오 회원인가"를 묻는 판별자 — 결제·탈퇴·관리자 판정처럼 실명 계정이어야 하는 곳.
// ★이 프로젝트의 모든 신원 읽기는 이 함수 하나를 지난다(로컬 복제 금지).
export function getUserId(request: NextRequest): string | null {
  return getUser(request)?.id ?? null;
}

// 게스트 포함 신원 — 카카오 로그인이 있으면 그것이 우선이고, 없을 때만 게스트 쿠키를 쓴다.
// ★이 우선순위 덕분에 기존 로그인 사용자의 키·한도·과금 경로가 1비트도 바뀌지 않는다.
// 형식 검증: proxy가 발급하는 "g_" + UUID 형태만 받는다(임의 문자열 주입 차단).
// ★게스트 쿠키는 서명하지 않는다 — 게스트는 권한이 아니라 "잔액 0 + IP 스코프 한도"라
//   위조해봐야 쿠키를 지우는 것과 같고(withDailyFree가 ip: 스코프로 막는다), 발급 지점인
//   proxy.ts는 이번 수술의 허용 범위 밖이다.
const GUEST_RE = /^g_[0-9a-f-]{36}$/;

export function getAnyUserId(request: NextRequest): string | null {
  const kakao = getUserId(request);
  if (kakao) return kakao;
  const g = request.cookies.get("mospic_guest")?.value;
  return g && GUEST_RE.test(g) ? g : null;
}
