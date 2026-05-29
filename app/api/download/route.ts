import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="우리아기얼굴.png"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "이미지 다운로드 실패" }, { status: 500 });
  }
}