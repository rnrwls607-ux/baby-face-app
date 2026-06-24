import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 🐛 임시 진단용: 배포 런타임에 Blob 토큰이 보이는지 확인 (값은 노출하지 않음)
// 원인 확인 후 즉시 삭제 예정.
export async function GET() {
  const blobKeys = Object.keys(process.env).filter((k) =>
    k.toUpperCase().includes("BLOB")
  );
  return NextResponse.json(
    {
      blobKeys, // 런타임에 실제 존재하는 BLOB 관련 변수 "이름" 목록
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0, // 값 길이만 (내용 X)
      nodeEnv: process.env.NODE_ENV,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
