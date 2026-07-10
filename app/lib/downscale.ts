// 사진 품질 게이트 판정용 축소 함수 (브라우저에서만 동작).
// 판정은 작은 사진으로 충분하므로 512px / 품질 0.7로 줄여서 보낸다.
//
// 왜 프론트에서 줄이나:
// - Vercel 서버리스 함수의 요청 본문 한도는 4.5MB인데, 폰 사진 원본을
//   base64로 만들면 원본보다 ~33% 커져서 한도를 넘길 수 있다.
// - 512px로 줄이면 한 장이 약 40~80KB가 된다.
//
// 각 페이지의 compress()(1024px, 품질 0.9)는 생성용이라 그대로 두고,
// 판정용으로만 이 함수를 쓴다.

const GATE_MAX_SIZE = 512;
const GATE_QUALITY = 0.7;

export function downscaleForGate(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(dataUrl); return; }

    const img = new Image();

    // 축소에 실패하면 원본을 그대로 돌려준다 — 판정을 막지 않는다.
    img.onerror = () => resolve(dataUrl);

    img.onload = () => {
      try {
        let { width: w, height: h } = img;
        if (w > h) { if (w > GATE_MAX_SIZE) { h = (h * GATE_MAX_SIZE) / w; w = GATE_MAX_SIZE; } }
        else { if (h > GATE_MAX_SIZE) { w = (w * GATE_MAX_SIZE) / h; h = GATE_MAX_SIZE; } }

        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", GATE_QUALITY));
      } catch {
        resolve(dataUrl);
      }
    };

    img.src = dataUrl;
  });
}
