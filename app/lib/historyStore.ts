// 클라우드 히스토리 저장 — 서버 공용. /api/history/save(클라 경로)와 withCoin(서버 확정 저장)이 공유한다.
//
// 왜 분리했나: 같은 저장을 두 곳에서 하게 되면서 Blob 경로·Redis 키·상한·썸네일 규격이
// 갈라질 위험이 생겼다. 한 곳에 두면 규격이 갈라질 수 없다.
//
// ★이 모듈의 어떤 실패도 생성·차감을 막아선 안 된다. 호출부가 try/catch로 감싼다.
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import sharp from "sharp";

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

// 사용자당 클라우드에 보관할 최대 개수 (무료 구간 보호) — save 라우트가 쓰던 값 그대로
export const MAX_ITEMS = 500;
export const HISTORY_KEY = (uid: string) => `history:${uid}`;

// 히스토리 목록용 썸네일 규격 — 클라 canvas(긴 변 1000px · JPEG q0.85)와 같은 눈높이.
// 서버에서 만들어야 클라가 죽어도 같은 무게의 목록이 남는다.
const THUMB_MAX = 1000;
const THUMB_QUALITY = 85;

export type HistoryRecord = {
  id: string;
  url: string;
  concept: string;
  createdAt: number;
  originalUrl?: string;
};

// data URL → 1000px q85 JPEG 버퍼. 실패하면 null(호출부가 조용히 스킵).
export async function makeThumbnail(dataUrl: string): Promise<Buffer | null> {
  const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
  if (!m) return null;
  try {
    return await sharp(Buffer.from(m[2], "base64"))
      .rotate() // EXIF 방향 보정 — 캔버스 다운스케일과 결과를 맞춘다
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();
  } catch {
    return null;
  }
}

// ★중복 방지 — 같은 originalUrl을 가진 항목이 이미 있으면 저장하지 않는다.
// 서버 확정 저장이 먼저 끝난 뒤 클라의 saveToCloud가 도착하는 순서를 막는 장치다.
// originalUrl이 없으면(무료·구형 경로) 판정 불가 → false로 두고 기존대로 저장한다.
export async function hasSameOriginal(uid: string, originalUrl?: string): Promise<boolean> {
  if (!redis || !originalUrl || !originalUrl.startsWith("https://")) return false;
  try {
    // 최근 30건만 본다 — 중복은 항상 방금 저장분이라 전량 스캔이 필요 없다
    const recent = await redis.lrange<HistoryRecord>(HISTORY_KEY(uid), 0, 29);
    return (Array.isArray(recent) ? recent : []).some((r) => r?.originalUrl === originalUrl);
  } catch {
    return false; // 조회 실패 시엔 막지 않는다(유실보다 중복이 낫다)
  }
}

// 썸네일 버퍼를 Blob에 올리고 목록에 넣는다. 성공하면 Blob URL, 실패하면 null.
export async function saveHistoryItem(
  uid: string,
  thumb: Buffer,
  concept: string,
  originalUrl?: string
): Promise<string | null> {
  if (!redis || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const blob = await put(`history/${uid}/${id}.jpg`, thumb, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });
    const item: HistoryRecord = {
      id,
      url: blob.url,
      concept,
      createdAt: Date.now(),
      ...(originalUrl && originalUrl.startsWith("https://") ? { originalUrl } : {}),
    };
    await redis.lpush(HISTORY_KEY(uid), item);
    await redis.ltrim(HISTORY_KEY(uid), 0, MAX_ITEMS - 1);
    return blob.url;
  } catch {
    return null;
  }
}
