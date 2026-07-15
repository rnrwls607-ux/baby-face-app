import sharp from "sharp";

// AI 생성물 비가시 표시 (AI기본법 대응 — 눈에 보이는 워터마크 없이 메타데이터로)
//
// 넣는 것:
// - XMP  Iptc4xmpExt:DigitalSourceType = trainedAlgorithmicMedia
//   (IPTC 국제 표준 — Google·Meta가 "AI로 생성됨" 판정에 읽는 필드)
// - EXIF Software = "MOSPIC AI", ImageDescription = 사람이 읽는 백업 표기
//
// ★ 절대 원칙: 표시는 부가 기능, 생성이 본질 — 삽입에 실패하면
//   console.warn만 남기고 원본을 그대로 반환한다. 이 함수 때문에
//   생성 요청이 실패하는 일은 없어야 한다.
//
// ★ 순서 주의: cropToRatio 등 sharp를 한 번 더 거치는 route는 기본
//   동작이 메타데이터 제거라, crop.ts에 keepMetadata()가 함께 있어야
//   도장이 살아남는다 (crop.ts에 적용됨).

export const AI_EXIF = {
  IFD0: {
    Software: "MOSPIC AI",
    ImageDescription: "AI-generated image (AI 생성 이미지) - MOSPIC",
  },
};

export const AI_XMP = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
    Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

// Gemini 등이 준 base64(접두사 없는 원시 b64)를 받아
// 메타데이터를 삽입한 data URL을 돌려준다.
export async function stampAiMetadata(b64: string): Promise<string> {
  try {
    const buf = Buffer.from(b64, "base64");
    const stamped = await sharp(buf)
      .withExif(AI_EXIF)
      .withXmp(AI_XMP)
      .toBuffer();
    return `data:image/png;base64,${stamped.toString("base64")}`;
  } catch (e: unknown) {
    console.warn("[aiMark] 메타데이터 삽입 실패 — 원본 그대로 반환:", (e as { message?: string })?.message);
    return `data:image/png;base64,${b64}`;
  }
}
