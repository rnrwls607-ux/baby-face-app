import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../lib/auth";
import { ensureWelcome, getBalance } from "../../lib/coins";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const uid = getUserId(request);
  if (!uid) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  await ensureWelcome(uid);
  return NextResponse.json({ balance: await getBalance(uid) });
}
