import sharp from "sharp";

// 📐 공통 이미지 크롭 함수
// 생성된 이미지(base64 data URL)를 지정한 가로:세로 비율로 가운데 크롭.
// 실패하면 원본 그대로 반환 (안전장치).
//
// 사용법:
//   import { cropToRatio } from "../../lib/crop";
//   const cropped = await cropToRatio(dataUrl, 3.5, 4.5);  // 증명사진
//   const cropped = await cropToRatio(dataUrl, 3, 4);      // 프로필
//   const cropped = await cropToRatio(dataUrl, 2, 3);      // 인생네컷(세로 스트립)
//
// topBias: 세로로 자를 때 위쪽을 얼마나 남길지 (0~1, 기본 0.4 = 위40%/아래60%, 머리 안 잘리게)
export async function cropToRatio(
  dataUrl: string,
  ratioW: number,
  ratioH: number,
  topBias = 0.4
): Promise<string> {
  try {
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return dataUrl;
    const inputBuf = Buffer.from(m[2], "base64");
    const img = sharp(inputBuf);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return dataUrl;
    const targetRatio = ratioW / ratioH; // 목표 가로/세로
    const curRatio = w / h;
    let cropW = w;
    let cropH = h;
    if (curRatio > targetRatio) {
      // 현재가 더 넓음 → 좌우를 잘라냄
      cropW = Math.round(h * targetRatio);
    } else {
      // 현재가 더 김(세로 김) → 위아래를 잘라냄
      cropH = Math.round(w / targetRatio);
    }
    const left = Math.round((w - cropW) / 2);
    // 세로 크롭은 위쪽 여백을 topBias 비율로 남김 (인물이면 머리 위 공간 확보)
    const top = Math.round((h - cropH) * topBias);
    const out = await img
      .keepMetadata() // AI 표시(EXIF·XMP) 등 메타데이터를 크롭 후에도 보존
      .extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: cropW,
        height: cropH,
      })
      .png()
      .toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch (e) {
    console.error("[crop] failed, returning original:", (e as { message?: string })?.message);
    return dataUrl; // 크롭 실패 시 원본 반환
  }
}