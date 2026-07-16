// 앱 웹뷰에선 a.download가 조용히 실패한다(다운로드 매니저 미연결) — 그런데도 무조건 성공 토스트가 뜨던 원인.
// 이 헬퍼가 저장을 한 곳에서 분기한다: 앱(Capacitor)=Media 플러그인 갤러리 저장 / 웹=기존 a.download 그대로.
// 저장 114곳 벌크 교체의 앵커 — 저장 동작을 바꿀 일이 생기면 이 파일만 고치면 된다.
import { toast } from "./toast";

type MediaAlbum = { name: string; identifier: string };
type MediaPlugin = {
  getAlbums(): Promise<{ albums: MediaAlbum[] }>;
  createAlbum(options: { name: string }): Promise<void>;
  savePhoto(options: { path: string; albumIdentifier?: string; fileName?: string }): Promise<{ filePath: string }>;
};
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { Media?: MediaPlugin };
};

const ALBUM_NAME = "MOSPIC";
let cachedAlbumId: string | null = null;

// 기존 114곳 몸통의 href 삼항과 동일: data URL은 그대로, http URL은 프록시 우회
function toHref(url: string): string {
  return url.startsWith("data:") ? url : `/api/download?url=${encodeURIComponent(url)}`;
}

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(toHref(url))).blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 앨범 확보: 캐시 → getAlbums에서 찾기 → 없으면 createAlbum 후 재조회
async function ensureAlbum(media: MediaPlugin): Promise<string> {
  if (cachedAlbumId) return cachedAlbumId;
  let albums = (await media.getAlbums()).albums || [];
  let album = albums.find((a) => a.name === ALBUM_NAME);
  if (!album) {
    await media.createAlbum({ name: ALBUM_NAME });
    albums = (await media.getAlbums()).albums || [];
    album = albums.find((a) => a.name === ALBUM_NAME);
  }
  if (!album) throw new Error("앨범 생성 실패");
  cachedAlbumId = album.identifier;
  return cachedAlbumId;
}

export async function saveImage(url: string, filename: string, opts?: { silent?: boolean }): Promise<boolean> {
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.() === true) {
    try {
      const media = cap.Plugins?.Media;
      if (!media) throw new Error("Media 플러그인 없음");
      const dataUrl = url.startsWith("data:") ? url : await toDataUrl(url);
      const albumIdentifier = await ensureAlbum(media);
      await media.savePhoto({ path: dataUrl, albumIdentifier, fileName: filename.replace(/\.[^.]+$/, "") });
      if (!opts?.silent) toast("저장됐어요");
      return true;
    } catch (e) {
      console.error("[saveImage] 갤러리 저장 실패:", e);
      if (!opts?.silent) toast("저장에 실패했어요. 다시 시도해주세요.");
      return false;
    }
  }
  const a = document.createElement("a");
  a.href = toHref(url);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if (!opts?.silent) toast("저장됐어요");
  return true;
}
