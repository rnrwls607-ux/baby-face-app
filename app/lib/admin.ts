// 관리자 게이트 (2026-07-25) — CS 조회·데이터 정리 도구 전용.
//
// ★chargeAllowed()를 재사용하지 않는 이유: 그건 COIN_CHARGE_OPEN==="true"면 전원 통과라
//   충전 개방 스위치를 켜는 순간 남의 개인정보 조회·삭제 API까지 열려버린다.
//   여기는 "COIN_ADMIN_IDS에 명시된 uid"만 통과하는 별도의 엄격한 문이다.
// ★env 미설정(빈 값)이면 전원 거부 — 실수로 열리는 방향이 아니라 잠기는 방향으로 실패한다.
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "./auth";

export type AdminCheck = { ok: boolean; uid: string | null; reason?: string };

export function checkAdmin(request: NextRequest): AdminCheck {
  const uid = getUserId(request);
  if (!uid) return { ok: false, uid: null, reason: "로그인이 필요해요" };
  const admins = (process.env.COIN_ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  // 관리자 목록이 비어 있으면 아무도 통과 못 한다(개방 실수 방지).
  if (admins.length === 0) return { ok: false, uid, reason: "관리자 설정이 없어요" };
  return { ok: admins.includes(uid), uid, reason: admins.includes(uid) ? undefined : "권한이 없어요" };
}

// 게이트 통과 못 하면 403 응답을 돌려준다(통과 시 null).
// ★개인정보를 다루는 도구이므로 접근 시도를 항상 로그에 남긴다.
export function adminGate(request: NextRequest, tool: string): NextResponse | null {
  const { ok, uid, reason } = checkAdmin(request);
  console.log(`[ADMIN][${tool}] 접근 시도 uid=${uid ?? "(비로그인)"} 결과=${ok ? "허용" : "거부:" + reason}`);
  if (!ok) return NextResponse.json({ error: reason || "권한이 없어요" }, { status: 403 });
  return null;
}
