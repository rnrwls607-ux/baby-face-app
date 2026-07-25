// ⏳ 유료 원본 1년 만료 파기 (2026-07-25)
//
// ★약관 정합: 개인정보처리방침 제3조 5항 —
//   "유료(코인 차감) 생성물의 원본 이미지는 서비스 제공을 위해 생성일로부터 1년간 보관 후
//    지체 없이 파기하며, 이용자가 해당 항목을 삭제하는 경우 즉시 파기합니다."
//   이 route가 그 "1년 후 파기"를 실행하는 배치다. (즉시 파기 쪽은 history/delete·clear가 담당)
//
// ★참고: 유료 원본이 쌓이기 시작한 지 며칠이라 지금은 대상이 0건이다.
//   1년 뒤에 급히 만들지 않도록 배치를 미리 갖춰두는 것이 목적.
//
// ★안전 설계:
//   ① dryRun 기본 — 실삭제는 {confirm:"DELETE"} 명시 필요
//   ② 실삭제는 uid 단위로만 — 전체 순회는 dryRun에서만 허용(대량 오삭제 방지)
//   ③ 경로 소유권 가드 — originals/{uid}/ 를 포함하는 url만 삭제
//   ④ LREM은 파싱된 객체 그대로 (문자열 재조립 금지 — history/delete와 같은 관례)
//   ⑤ Blob 삭제 실패해도 인덱스는 정리 — 남은 파일은 무해한 고아(cleanup-orphans 대상 아님,
//      originals는 제외되므로 수동 처리). 반대로 인덱스만 남는 상황은 만들지 않는다.
//
// POST /api/admin/purge-expired
//   body: { uid }                      → 해당 uid dryRun
//   body: { uid, confirm:"DELETE" }    → 해당 uid 실제 파기
//   body: { all: true }                → 전체 사용자 dryRun (실삭제 불가)
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { del } from "@vercel/blob";
import { adminGate } from "../../../lib/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

const RETENTION_DAYS = 365;
const RETENTION_MS = RETENTION_DAYS * 86400_000;

type OriginalItem = { id?: string; urls?: string[]; concept?: string; coins?: number; at?: number };

// 만료 대상 추리기 — at이 없는 항목은 판정 불가로 보고 건드리지 않는다(보수적).
function pickExpired(items: OriginalItem[], now: number) {
  return items.filter(o => typeof o?.at === "number" && now - o.at > RETENTION_MS);
}

async function scanUser(uid: string, now: number) {
  const raw = await redis!.lrange<OriginalItem>(`originals:${uid}`, 0, -1);
  const items = Array.isArray(raw) ? raw : [];
  const expired = pickExpired(items, now);
  return {
    uid, total: items.length, expiredCount: expired.length,
    expired: expired.map(o => ({
      id: o.id, concept: o.concept, coins: o.coins, files: o.urls?.length ?? 0,
      at: o.at, atText: o.at ? new Date(o.at).toISOString() : null,
      ageDays: o.at ? Math.floor((now - o.at) / 86400_000) : null,
    })),
    _rawExpired: expired,
  };
}

export async function POST(request: NextRequest) {
  const denied = adminGate(request, "purge-expired");
  if (denied) return denied;
  if (!redis) return NextResponse.json({ error: "Redis 미설정" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid || "").trim();
  const all = body?.all === true;
  const dryRun = body?.confirm !== "DELETE";
  const now = Date.now();

  // ── 안전장치 ②: 전체 순회는 조회만. 실삭제는 uid를 지정해야 한다.
  if (all) {
    if (!dryRun) {
      return NextResponse.json({
        error: "전체 순회는 조회(dryRun)만 가능합니다. 실제 파기는 uid를 지정해 한 명씩 실행하세요.",
      }, { status: 400 });
    }
    // welcome:* 키로 가입 사용자 uid 목록 확보 (원장 생성 시 1회 세팅되는 키)
    const uids: string[] = [];
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, { match: "welcome:*", count: 500 });
      cursor = String(next);
      for (const k of keys as string[]) uids.push(String(k).replace(/^welcome:/, ""));
    } while (cursor !== "0");

    const results = [];
    for (const u of uids) {
      const r = await scanUser(u, now);
      if (r.expiredCount > 0) results.push({ uid: r.uid, total: r.total, expiredCount: r.expiredCount });
    }
    const totalExpired = results.reduce((s, r) => s + r.expiredCount, 0);
    console.log(`[ADMIN][purge-expired] 전체 스캔 사용자=${uids.length} 만료보유=${results.length} 만료항목=${totalExpired}`);
    return NextResponse.json({
      mode: "all", dryRun: true, userCount: uids.length,
      usersWithExpired: results.length, totalExpired, users: results.slice(0, 200),
      retentionDays: RETENTION_DAYS,
      note: '실제 파기는 body {uid, confirm:"DELETE"} 로 한 명씩 실행하세요.',
    });
  }

  if (!uid) return NextResponse.json({ error: "uid를 입력하거나 all:true로 조회하세요" }, { status: 400 });

  const r = await scanUser(uid, now);
  if (dryRun || r.expiredCount === 0) {
    console.log(`[ADMIN][purge-expired] uid=${uid} dryRun=${dryRun} 만료=${r.expiredCount}`);
    return NextResponse.json({
      mode: "user", uid, dryRun: true, retentionDays: RETENTION_DAYS,
      total: r.total, expiredCount: r.expiredCount, expired: r.expired, deleted: 0, blobDeleted: 0,
      note: r.expiredCount === 0 ? "만료 대상이 없습니다." : '실제 파기는 confirm:"DELETE"를 넣으세요.',
    });
  }

  // ── 실제 파기 ──
  console.warn(`[ADMIN][purge-expired] ★실파기 시작 uid=${uid} 대상 ${r.expiredCount}건`);
  const key = `originals:${uid}`;
  let removed = 0, blobDeleted = 0;
  const failed: string[] = [];
  for (const item of r._rawExpired) {
    // ③ 경로 소유권 가드 — 본인 originals 경로만
    for (const url of item.urls || []) {
      if (!url.includes(`/originals/${uid}/`)) { failed.push(url); continue; }
      try { if (process.env.BLOB_READ_WRITE_TOKEN) { await del(url); blobDeleted++; } }
      catch (e) { failed.push(url); console.warn(`[ADMIN][purge-expired] Blob 삭제 실패:`, (e as Error)?.message); }
    }
    // ④ LREM은 저장 원문과 일치해야 하므로 파싱 객체 그대로 (문자열 재조립 금지)
    try { await redis.lrem(key, 1, item); removed++; }
    catch (e) { console.error(`[ADMIN][purge-expired] LREM 실패 id=${item.id}:`, (e as Error)?.message); }
  }

  console.warn(`[ADMIN][purge-expired] uid=${uid} 인덱스제거=${removed} Blob삭제=${blobDeleted} 실패=${failed.length}`);
  return NextResponse.json({
    mode: "user", uid, dryRun: false, retentionDays: RETENTION_DAYS,
    total: r.total, expiredCount: r.expiredCount,
    deleted: removed, blobDeleted, failed,
    note: "약관 제3조 5항(생성일로부터 1년 보관 후 파기)에 따라 파기했습니다.",
  });
}
