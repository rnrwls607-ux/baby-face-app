// 생성 결과를 브라우저(IndexedDB)에 안정적으로 저장하는 히스토리
export type HistoryItem = { id: string; src: string; concept: string; createdAt: number };

const DB_NAME = "photoAppDB";
const STORE = "history";

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

export async function addToHistory(srcs: string[], concept: string): Promise<number> {
  if (typeof window === "undefined" || !window.indexedDB || !srcs?.length) return 0;
  try {
    const db = await openDB();
    const now = Date.now();
    let count = 0;
    for (let i = 0; i < srcs.length; i++) {
      const small = await downscale(srcs[i]);
      const item: HistoryItem = {
        id: `${now}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        src: small, concept, createdAt: now + i,
      };
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
      count++;
    }
    return count;
  } catch { return 0; }
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