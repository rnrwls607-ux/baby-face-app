"use client";
import { useEffect, useState } from "react";

// 생성 대기 중 안내 — "나가도 된다"는 보장을 로그인 사용자에게만 알린다.
// ★게스트에는 렌더 0: 서버측 확정 저장은 카카오 uid에만 걸려 있어, 게스트에게
//   같은 말을 하면 거짓말이 된다(게스트는 화면을 나가면 결과가 사라진다).
//
// 로그인 판별은 모듈 캐시로 1회만 조회한다 — 165개 페이지가 각자 부르면
// 생성 대기마다 /api/auth/me가 중복 호출된다.
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function checkLoggedIn(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { cached = !!d?.loggedIn; return cached; })
      .catch(() => { cached = false; return false; })  // 조회 실패 = 안내 안 함(거짓 안내 금지)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export default function LoadingSaveNote() {
  const [show, setShow] = useState(cached === true);
  useEffect(() => {
    let alive = true;
    void checkLoggedIn().then((v) => { if (alive) setShow(v); });
    return () => { alive = false; };
  }, []);
  if (!show) return null;
  return (
    <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#9AA0AA", fontWeight: 500, lineHeight: 1.5 }}>
      완성되면 히스토리에 자동 저장돼요 · 기다리는 동안 화면을 나가셔도 괜찮아요
    </p>
  );
}
