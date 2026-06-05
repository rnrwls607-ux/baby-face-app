// 생성 결과를 브라우저에 저장하는 간단한 히스토리 (기기 저장)
export type HistoryItem = { id: string; src: string; concept: string; createdAt: number };

const KEY = "photo_history_v1";
const MAX = 24;

function downscale(dataUrl: string, max = 720, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        let { width: w, height: h } = img;
        if (w > h) { if (w > max) { h = (h * max) / w; w = max; } }
        else { if (h > max) { w = (w * max) / h; h = max; } }
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch { resolve(dataUrl); }
  });
}

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function trySave(items: HistoryItem[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch { return false; }
}

export async function addToHistory(srcs: string[], concept: string): Promise<void> {
  if (typeof window === "undefined" || !srcs?.length) return;
  const now = Date.now();
  const small = await Promise.all(srcs.map((s) => downscale(s)));
  const items: HistoryItem[] = small.map((src, i) => ({
    id: `${now}_${i}_${Math.random().toString(36).slice(2, 7)}`, src, concept, createdAt: now,
  }));
  let next = [...items, ...getHistory()].slice(0, MAX);
  while (next.length > 1 && !trySave(next)) next = next.slice(0, Math.floor(next.length / 2));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}