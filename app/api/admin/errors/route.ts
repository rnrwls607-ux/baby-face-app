import { NextRequest, NextResponse } from "next/server";
import { adminGate } from "../../../lib/admin";
import { recentErrors, getError } from "../../../lib/errlog";

// 에러 조회 (관리자 전용) — 사용자가 말한 번호로 원인을 찾는 창구.
//   GET /api/admin/errors?limit=50        최근 목록
//   GET /api/admin/errors?uid=123         그 사용자의 최근 50건
//   GET /api/admin/errors?id=abcd1234     단건 상세
// ★비관리자는 adminGate가 403 — 개인정보를 다루므로 접근 시도는 항상 [ADMIN] 로그에 남는다.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = adminGate(request, "errors");
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  if (id) {
    const entry = await getError(id);
    if (!entry) return NextResponse.json({ error: "그 번호의 기록이 없어요(7일 지나면 사라져요)." }, { status: 404 });
    return NextResponse.json({ entry }, { headers: { "Cache-Control": "no-store" } });
  }

  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  const uid = sp.get("uid") || undefined;
  const items = await recentErrors(limit, uid);
  return NextResponse.json({ count: items.length, uid: uid ?? null, items }, { headers: { "Cache-Control": "no-store" } });
}
