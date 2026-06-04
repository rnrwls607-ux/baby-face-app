import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// 🔑 모델 격리 지점: 나중에 모델을 바꾸려면 이 두 줄과 generateOne 함수만 손대면 됨
// 현재: Google Gemini "Nano Banana Pro"
const GEMINI_MODEL = "gemini-3-pro-image"; // 품질 최강. 비용/속도 우선이면 "gemini-3.1-flash-image"
const NUM_OUTPUTS = 1; // 우선 1장 (응답 용량 안전 + Pro 품질 확인용). 나중에 늘릴 수 있음

// data URL 또는 순수 base64 → { mimeType, data }
function parseImage(input: string): { mimeType: string; data: string } {
  const m = input.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: "image/jpeg", data: input };
}

// Gemini로 사진 1장 생성 → base64 PNG data URL 반환 (일시적 5xx면 재시도)
async function generateOne(
  prompt: string,
  images: { mimeType: string; data: string }[],
  attempt = 0
): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    if (res.status >= 500 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return generateOne(prompt, images, attempt + 1);
    }
    throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));
  }

  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter(
    (p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
      p?.inlineData?.data || p?.inline_data?.data
  );
  // '생각용(thought)' 이미지는 빼고 최종 이미지를 선택
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  return `data:image/png;base64,${b64}`;
}

// 🔑 증명사진 생성 엔진
async function generateIdPhotos(imageDataUrls: string[], gender: string): Promise<string[]> {
  const images = imageDataUrls.map(parseImage);
  const genderWord = gender === "man" ? "man" : "woman";
  const prompt = `Using the uploaded photo(s) of the same real person, generate a professional Korean ID/passport-style headshot of this exact ${genderWord}. Front-facing, looking straight at the camera, neutral closed-mouth expression, wearing a dark navy business suit with a clean collared shirt, plain light gray seamless studio background, soft even lighting, head-and-shoulders framing, vertical portrait, sharp focus, photorealistic high-resolution photograph. Critically: keep the person's face, bone structure, eyes, nose, mouth, and overall likeness EXACTLY identical to the uploaded photo(s). Do not beautify, slim, change age, or alter their identity in any way. Output one single clean ID photo with no text.`;

  const settled = await Promise.allSettled(
    Array.from({ length: NUM_OUTPUTS }, () => generateOne(prompt, images))
  );
  const ok = settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value);
  if (ok.length === 0) {
    const firstErr = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(firstErr?.reason?.message || "생성에 실패했습니다.");
  }
  return ok;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(GEMINI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await req.json();
    const images: string[] = body?.images || [];
    const gender: string = body?.gender || "woman";
    if (!images.length) {
      return NextResponse.json({ error: "사진을 한 장 이상 올려주세요." }, { status: 400 });
    }
    const output = await generateIdPhotos(images, gender);
    return NextResponse.json({ output });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("id-photo error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}