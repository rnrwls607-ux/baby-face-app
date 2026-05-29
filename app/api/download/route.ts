import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("URL이 필요합니다.", { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { "Accept": "image/*" },
    });

    if (!response.ok) {
      return new NextResponse("이미지를 가져올 수 없습니다.", { status: 500 });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "attachment",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new NextResponse("다운로드 실패", { status: 500 });
  }
}