// 🧹 고아 Blob 정리 (2026-07-25)
//
// 고아가 생기는 경로: history/save가 LPUSH 후 LTRIM(0, 499)로 인덱스를 500개로 자르는데,
// 밀려난 항목의 Blob 파일은 지우지 않는다 → 인덱스에 없는 파일이 저장소에 계속 쌓인다.
// 이 route는 "Redis 인덱스에 없는 history/{uid}/ 파일"만 골라 지운다.
//
// ★안전 설계 (사용자 데이터를 지우는 코드이므로 전부 필수):
//   ① dryRun 기본 — 아무 것도 안 지우고 목록만. 실삭제는 {confirm:"DELETE"} 명시 필요
//   ② originals/{uid}/ 는 스캔 대상에서 원천 제외 — 유료 원본은 500 제한과 무관하게 보존
//   ③ 인덱스 조회 실패 → 즉시 중단 (인덱스를 못 읽었다고 전량 고아로 오판하면 전멸)
//   ④ 인덱스가 비었는데 Blob이 있으면 → 삭제하지 않고 보고만 (정상 상황이 아님)
//   ⑤ 경로 소유권 가드 — 반드시 history/{uid}/ 로 시작하는 pathname만 삭제
//
// POST /api/admin/cleanup-orphans
//   body: { uid: "카카오ID" }                    → dryRun (삭제 0건)
//   body: { uid: "카카오ID", confirm: "DELETE" } → 실제 삭제
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { list, del } from "@vercel/blob";
import { adminGate } from "../../../lib/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

type HistoryItem = { url?: string; originalUrl?: string };

export async function POST(request: NextRequest) {
  const denied = adminGate(request, "cleanup-orphans");
  if (denied) return denied;
  if (!redis) return NextResponse.json({ error: "Redis 미설정" }, { status: 500 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob 토큰 미설정" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid || "").trim();
  const dryRun = body?.confirm !== "DELETE";
  if (!uid) return NextResponse.json({ error: "uid를 입력하세요" }, { status: 400 });

  // ── 안전장치 ③: 인덱스를 먼저, 확실히 읽는다. 실패하면 여기서 끝.
  let indexed: HistoryItem[];
  try {
    const raw = await redis.lrange<HistoryItem>(`history:${uid}`, 0, -1);
    if (!Array.isArray(raw)) throw new Error("인덱스가 배열이 아님");
    indexed = raw;
  } catch (e) {
    console.error(`[ADMIN][cleanup-orphans] 인덱스 조회 실패 uid=${uid} — 중단`, (e as Error)?.message);
    return NextResponse.json({ error: "히스토리 인덱스를 읽지 못했습니다. 안전을 위해 중단합니다.", aborted: true }, { status: 500 });
  }

  // 인덱스에 살아있는 URL 집합 (originalUrl도 포함 — 혹시 history/ 아래를 가리켜도 보호)
  const keep = new Set<string>();
  for (const it of indexed) {
    if (it?.url) keep.add(it.url);
    if (it?.originalUrl) keep.add(it.originalUrl);
  }

  // ── 안전장치 ②: prefix를 history/{uid}/ 로 못박아 originals/ 는 애초에 조회하지 않는다.
  const prefix = `history/${uid}/`;
  const blobs: { url: string; pathname: string; size: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) blobs.push({ url: b.url, pathname: b.pathname, size: b.size });
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  // ── 안전장치 ④: 인덱스가 비었는데 파일은 있다 = 비정상. 지우지 말고 보고.
  if (indexed.length === 0 && blobs.length > 0) {
    console.warn(`[ADMIN][cleanup-orphans] uid=${uid} 인덱스 0인데 Blob ${blobs.length}개 — 삭제 중단`);
    return NextResponse.json({
      uid, aborted: true, dryRun: true, indexedCount: 0, blobCount: blobs.length, deleted: 0,
      warning: "히스토리 인덱스가 비어 있는데 파일이 존재합니다. 인덱스 유실 가능성이 있어 삭제하지 않았습니다.",
    });
  }

  // ── 안전장치 ⑤: 경로 소유권 가드 (list prefix로 이미 좁혔지만 이중 확인)
  const orphans = blobs.filter(b => b.pathname.startsWith(prefix) && !keep.has(b.url));
  const totalBytes = orphans.reduce((s, b) => s + (b.size || 0), 0);

  let deleted = 0;
  const failed: string[] = [];
  if (!dryRun && orphans.length > 0) {
    console.warn(`[ADMIN][cleanup-orphans] ★실삭제 시작 uid=${uid} 대상 ${orphans.length}개`);
    for (const b of orphans) {
      try { await del(b.url); deleted++; }
      catch (e) { failed.push(b.pathname); console.warn(`[ADMIN][cleanup-orphans] 삭제 실패 ${b.pathname}:`, (e as Error)?.message); }
    }
  }

  console.log(`[ADMIN][cleanup-orphans] uid=${uid} dryRun=${dryRun} 인덱스=${indexed.length} Blob=${blobs.length} 고아=${orphans.length} 삭제=${deleted}`);
  return NextResponse.json({
    uid, dryRun, aborted: false,
    indexedCount: indexed.length, blobCount: blobs.length,
    orphanCount: orphans.length,
    orphanBytes: totalBytes,
    orphanMB: +(totalBytes / 1048576).toFixed(2),
    deleted, failed,
    orphans: orphans.slice(0, 100).map(b => ({ pathname: b.pathname, size: b.size })),
    note: dryRun ? '삭제하지 않았습니다. 실제로 지우려면 body에 confirm:"DELETE"를 넣으세요.' : "삭제를 실행했습니다.",
  });
}
