import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "nightmareai/real-esrgan";

async function getLatestVersion(token: string): Promise<string> {
  const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("업스케일 모델 정보를 불러오지 못했어요.");
  const data = await r.json();
  const v = data?.latest_version?.id;
  if (!v) throw new Error("업스케일 모델 버전을 찾지 못했어요.");
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const { image, scale } = await req.json();
    if (!image) return NextResponse.json({ error: "이미지가 없어요." }, { status: 400 });

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: "API 토큰이 설정되지 않았어요." }, { status: 500 });

    const version = await getLatestVersion(token);

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=55",
      },
      body: JSON.stringify({
        version,
        input: {
          image,
          scale: scale ?? 4,
          face_enhance: false,
        },
      }),
    });

    let pred = await startRes.json();
    if (!startRes.ok) {
      return NextResponse.json({ error: pred?.detail || "업스케일 요청에 실패했어요." }, { status: 500 });
    }

    const started = Date.now();
    while (
      pred.status !== "succeeded" &&
      pred.status !== "failed" &&
      pred.status !== "canceled" &&
      Date.now() - started < 50000
    ) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      pred = await pollRes.json();
    }

    if (pred.status !== "succeeded") {
      return NextResponse.json({ error: "업스케일에 실패했어요. 다시 시도해주세요." }, { status: 500 });
    }

    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!out) return NextResponse.json({ error: "결과 이미지를 받지 못했어요." }, { status: 500 });

    return NextResponse.json({ output: [out] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "오류가 발생했어요.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}