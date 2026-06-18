import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

// 배경 제거 모델. ★출시(과금) 전 이 모델 페이지의 License 항목 확인.
// 모델 교체 시 이 한 줄만 바꾸면 됨 (입력 image / 출력 투명PNG 형식이면 호환):
//   851-labs/background-remover (현재) · lucataco/remove-bg · codeplugtech/background_remover
const REPLICATE_MODEL = "851-labs/background-remover";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: "서버 설정 오류: REPLICATE_API_TOKEN이 없어요." }, { status: 500 });

    const t0 = Date.now();
    const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=55",
      },
      body: JSON.stringify({ input: { image } }),
    });

    const data = await res.json();
    console.log(`[nukki] http=${res.status} status=${data?.status} ${Date.now() - t0}ms`);
    if (!res.ok) throw new Error("Replicate 오류 " + res.status + ": " + JSON.stringify(data).slice(0, 300));
    if (data?.status === "failed" || data?.error) throw new Error("배경 제거 실패: " + (data?.error || "모델 오류"));

    const out = data?.output;
    const outUrl: string | undefined = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : undefined);
    if (!outUrl) throw new Error("결과 이미지를 받지 못했어요. 다시 시도해주세요.");

    // 투명 PNG를 받아 data URL로 변환 (투명도 유지 + 링크 만료 방지)
    const imgRes = await fetch(outUrl);
    if (!imgRes.ok) throw new Error("결과 이미지를 불러오지 못했어요.");
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

    return NextResponse.json({ output: [dataUrl] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("nukki error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}