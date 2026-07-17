// 앱 웹뷰에선 navigator.share의 File 공유가 카톡에 이미지로 전달되지 않는다(웹뷰 제한).
// 이 헬퍼가 공유를 한 곳에서 분기한다: 앱(Capacitor)=Filesystem 캐시 저장 후 Share 시트 / 웹=기존 navigator.share 그대로.
// saveImage.ts와 같은 관례 — 타입은 지역 선언, @capacitor 패키지는 웹에 설치하지 않는다.
import { toast } from "./toast";
import { saveImage } from "./saveImage";

type SharePlugin = {
  share(options: { title?: string; text?: string; url?: string; files?: string[] }): Promise<unknown>;
};
type FilesystemPlugin = {
  writeFile(options: { path: string; data: string; directory: string }): Promise<{ uri: string }>;
  getUri(options: { path: string; directory: string }): Promise<{ uri: string }>;
};
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { Share?: SharePlugin; Filesystem?: FilesystemPlugin };
};

// saveImage와 동일: data URL은 그대로, http URL은 프록시 우회
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

function isUserCancel(e: unknown): boolean {
  const err = e as { name?: string; message?: string };
  return err?.name === "AbortError" || /cancel/i.test(err?.message || "");
}

export async function shareImage(url: string, filename: string, text?: string): Promise<boolean> {
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.() === true) {
    try {
      const share = cap.Plugins?.Share;
      const fs = cap.Plugins?.Filesystem;
      if (!share || !fs) throw new Error("Share/Filesystem 플러그인 없음");
      const dataUrl = url.startsWith("data:") ? url : await toDataUrl(url);
      await fs.writeFile({ path: filename, data: dataUrl.split(",")[1], directory: "CACHE" });
      const { uri } = await fs.getUri({ path: filename, directory: "CACHE" });
      await share.share({ text, files: [uri] });
      return true;
    } catch (e) {
      if (isUserCancel(e)) return true;
      console.error("[shareImage] 앱 공유 실패, 웹 경로로 폴백:", e);
      // throw 금지 — 아래 웹 경로로 조용히 폴백
    }
  }
  // 웹 경로: 기존 page.tsx handleShare 로직 이식 (File 공유 → 텍스트 공유 → 링크 복사, 실패 시 저장 폴백)
  const origin = window.location.origin;
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ text, files: [file] });
    else if (navigator.share) await navigator.share({ text, url: origin });
    else { await navigator.clipboard.writeText(text || origin); toast("링크를 복사했어요"); }
    return true;
  } catch (e: unknown) {
    if (isUserCancel(e)) return true;
    return await saveImage(url, filename);
  }
}
