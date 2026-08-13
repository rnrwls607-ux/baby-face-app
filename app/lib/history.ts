import { notifyGenerationDone } from "./notifyDone";
// 생성 결과를 브라우저(IndexedDB)에 안정적으로 저장하는 히스토리
// originalUrl: 유료 생성물의 원본 Blob 주소 (표시=축소본·다운로드=원본 이원화)
// recovered: 생성 중 이탈로 클라 저장이 못 된 건을 서버 originals 인덱스에서 되살린 항목(조회 전용 표시)
export type HistoryItem = { id: string; src: string; concept: string; createdAt: number; originalUrl?: string; recovered?: boolean };

// 로그인 사용자의 클라우드(Blob+Redis) 히스토리 항목
export type CloudHistoryItem = { id: string; url: string; concept: string; createdAt: number; originalUrl?: string; recovered?: boolean };

const DB_NAME = "photoAppDB";
const STORE = "history";

// 로그인 상태면 클라우드(Blob+Redis)에도 저장 시도.
// 비로그인·오프라인·서버 미설정이면 서버가 조용히 무시하므로 기존 동작에 영향 없음.
async function saveToCloud(src: string, concept: string, originalUrl?: string): Promise<void> {
  try {
    await fetch("/api/history/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ src, concept, originalUrl }),
    });
  } catch {
    /* 저장 실패는 무시 (로컬 IndexedDB 저장은 이미 끝난 상태) */
  }
}

// 로그인 사용자의 클라우드 히스토리 목록 불러오기 (비로그인이면 빈 배열)
export async function getCloudHistory(): Promise<CloudHistoryItem[]> {
  try {
    const res = await fetch("/api/history/list", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

// 로그인 사용자의 클라우드 히스토리 개별 삭제 (실패해도 로컬 삭제는 이미 끝난 상태)
export async function deleteCloudHistoryItem(id: string): Promise<void> {
  try {
    await fetch("/api/history/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    /* 삭제 실패는 무시 */
  }
}

// 로그인 사용자의 클라우드 히스토리 전체 삭제 (비로그인이면 서버가 무시)
export async function clearCloudHistory(): Promise<void> {
  try {
    await fetch("/api/history/clear", { method: "POST" });
  } catch {
    /* 삭제 실패는 무시 */
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function downscale(dataUrl: string, max = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          let { width: w, height: h } = img;
          if (w > h) { if (w > max) { h = (h * max) / w; w = max; } }
          else { if (h > max) { w = (w * max) / h; h = max; } }
          c.width = w; c.height = h;
          c.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", quality));
        } catch { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch { resolve(dataUrl); }
  });
}

export async function getHistory(): Promise<HistoryItem[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  try {
    const db = await openDB();
    return await new Promise<HistoryItem[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(((req.result as HistoryItem[]) || []).sort((a, b) => b.createdAt - a.createdAt));
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function addToHistory(srcs: string[], concept: string, originalUrls?: string[]): Promise<number> {
  if (typeof window === "undefined" || !window.indexedDB || !srcs?.length) return 0;
  // 생성 성공 신호 — 앱이 백그라운드면 완료 알림 1발(웹·포그라운드는 발화 0)
  void notifyGenerationDone();
  try {
    const db = await openDB();
    const now = Date.now();
    let count = 0;
    for (let i = 0; i < srcs.length; i++) {
      const small = await downscale(srcs[i]);
      const item: HistoryItem = {
        id: `${now}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        src: small, concept, createdAt: now + i,
        ...(originalUrls?.[i] ? { originalUrl: originalUrls[i] } : {}),
      };
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
      // 로컬 저장 후, 로그인 상태면 클라우드에도 저장 (실패해도 기존 동작 유지)
      await saveToCloud(small, concept, originalUrls?.[i]);
      count++;
    }
    return count;
  } catch { return 0; }
}

// 로컬(IndexedDB) 개별 삭제 — 해당 id가 없어도 조용히 통과 (멱등)
export async function deleteHistoryItem(id: string): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch { /* ignore */ }
}

export async function clearHistory(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}