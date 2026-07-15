import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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

    // Replicate 결과 URL은 수 시간 뒤 만료된다 — 누끼처럼 서버에서 내려받아
    // data URL로 변환해 반환한다 (히스토리 로컬·클라우드 저장도 이걸로 살아남).
    // 단 4096px 결과는 PNG 그대로면 Vercel 응답 한도(~4.5MB)를 넘으므로
    // JPEG 품질 사다리(90→70)로 재인코딩하고, 그래도 크면 3000px로 줄인다.
    const imgRes = await fetch(out);
    if (!imgRes.ok) return NextResponse.json({ error: "결과 이미지를 불러오지 못했어요." }, { status: 500 });
    const raw = Buffer.from(await imgRes.arrayBuffer());

    const LIMIT = 2_900_000; // 바이너리 기준 ≈ base64 3.9MB (한도 4.5MB 아래 여유)
    let quality = 90;
    let jpeg = await sharp(raw).jpeg({ quality }).toBuffer();
    while (jpeg.length > LIMIT && quality > 70) {
      quality -= 5;
      jpeg = await sharp(raw).jpeg({ quality }).toBuffer();
    }
    if (jpeg.length > LIMIT) {
      // 마지막 안전장치: 3000px(입력 1024px의 약 3배)로 줄여서라도 반드시 전달
      quality = 85;
      jpeg = await sharp(raw)
        .resize(3000, 3000, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    }
    console.log(`[upscale] raw=${raw.length}b jpeg=${jpeg.length}b q=${quality}`);

    const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    return NextResponse.json({ output: [dataUrl] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "오류가 발생했어요.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}