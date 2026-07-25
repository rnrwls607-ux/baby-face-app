// 🎁 관리자 수동 코인 보정 (2026-07-25) — 미적립 결제 구제용
//
// 왜 필요한가: 토스 결제는 성공했는데 코인이 안 들어가는 경로가 남아 있다.
//   (A) 결제 직후 앱 종료·네트워크 끊김 → charge 호출 자체가 안 됨
//   (B) charge 도중 서버 오류 → 승인은 됐는데 적립 전 중단
//   (F) Redis 일시 장애 → 결제 완료 후 적립 실패
// 이 경로들은 사용자 돈만 나간 상태라 구제 수단이 반드시 있어야 한다.
// 이 API가 그 유일한 수동 창구다.
//
// ★안전 설계:
//   ① dryRun 기본 — confirm:"GRANT" 없으면 "이렇게 적립될 예정"만 반환(실행 0)
//   ② orderId를 주면 중복 보정 차단 — 이미 credited면 거부하고 영수증을 보여준다
//      (같은 결제를 두 번 보정해 코인을 두 배로 주는 사고를 구조적으로 막는다)
//   ③ 관리자 게이트 — COIN_ADMIN_IDS 미설정이면 전원 거부
//   ④ 모든 시도를 [ADMIN] 태그로 로깅 (누가·누구에게·몇 코인·왜)
//   ⑤ /admin 화면에 버튼을 만들지 않는다 — API 직접 호출만(오클릭 방지)
//
// POST /api/admin/grant-coins
//   { uid, coins, reason }                        → dryRun (적립 0)
//   { uid, coins, reason, orderId }               → dryRun + 중복 여부 판정
//   { uid, coins, reason, confirm:"GRANT" }       → 실제 적립
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { adminGate, checkAdmin } from "../../../lib/admin";
import { ORDER_KEY, getBalance, parseOrderRecord, type OrderReceipt } from "../../../lib/coins";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

export async function POST(request: NextRequest) {
  const denied = adminGate(request, "grant-coins");
  if (denied) return denied;
  if (!redis) return NextResponse.json({ error: "Redis 미설정" }, { status: 500 });

  const actor = checkAdmin(request).uid; // 누가 보정했는지 남기기 위해
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid || "").trim();
  const coins = Number(body?.coins);
  const reason = String(body?.reason || "").trim();
  const orderId = String(body?.orderId || "").trim();
  const dryRun = body?.confirm !== "GRANT";

  if (!uid) return NextResponse.json({ error: "uid를 입력하세요" }, { status: 400 });
  if (!Number.isInteger(coins) || coins <= 0 || coins > 1000) {
    return NextResponse.json({ error: "coins는 1~1000 사이 정수여야 합니다" }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: "reason(보정 사유)은 필수입니다" }, { status: 400 });

  const before = await getBalance(uid);

  // ── 안전장치 ②: 같은 결제를 두 번 보정하지 않는다 ──
  let priorReceipt: OrderReceipt | null = null;
  if (orderId) {
    priorReceipt = parseOrderRecord(await redis.get(ORDER_KEY(orderId)));
    if (priorReceipt) {
      console.warn(`[ADMIN][grant-coins] 중복 보정 차단 actor=${actor} uid=${uid} orderId=${orderId} status=${priorReceipt.status}`);
      return NextResponse.json({
        error: "이 주문은 이미 적립 처리된 기록이 있습니다. 중복 보정을 막았습니다.",
        blocked: true, orderId, receipt: priorReceipt, balance: before,
      }, { status: 409 });
    }
  }

  if (dryRun) {
    console.log(`[ADMIN][grant-coins] dryRun actor=${actor} → uid=${uid} +${coins} 사유="${reason}" orderId=${orderId || "(없음)"}`);
    return NextResponse.json({
      dryRun: true, uid, coins, reason, orderId: orderId || null,
      balanceBefore: before, balanceAfter: before + coins,
      orderChecked: !!orderId, orderDuplicate: false,
      note: '적립하지 않았습니다. 실행하려면 body에 confirm:"GRANT"를 넣으세요.',
    });
  }

  // ── 실제 보정 ──
  console.warn(`[ADMIN][grant-coins] ★실행 actor=${actor} → uid=${uid} +${coins} 사유="${reason}" orderId=${orderId || "(없음)"}`);
  const after = await redis.incrby(`coin:${uid}`, coins);
  await redis.lpush(`coinlog:${uid}`, {
    type: "charge", amount: coins, ref: `admin-grant:${reason}`, at: Date.now(),
  });
  await redis.ltrim(`coinlog:${uid}`, 0, 499);

  // orderId가 있으면 영수증을 남겨 이후 중복 보정을 차단한다
  if (orderId) {
    const receipt: OrderReceipt = {
      uid, provider: "admin", productId: "", coins, amount: 0,
      at: Date.now(), status: "credited-by-admin",
    };
    await redis.set(ORDER_KEY(orderId), receipt, { ex: 60 * 60 * 24 * 365 });
  }

  console.warn(`[ADMIN][grant-coins] 완료 uid=${uid} ${before} → ${after}`);
  return NextResponse.json({
    dryRun: false, uid, coins, reason, orderId: orderId || null,
    balanceBefore: before, balanceAfter: after,
    note: "적립했습니다. coinlog에 admin-grant로 기록되어 사후 추적이 가능합니다.",
  });
}
