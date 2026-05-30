import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function analyzeFaceFeatures(base64: string, role: "mom" | "dad"): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";

  const roleText = role === "mom" ? "mother's" : "father's";

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          {
            type: "text",
            text: `이 사람의 얼굴 특징을 아기 얼굴 생성 프롬프트에 쓸 수 있도록 영어로 짧게 묘사해줘.
눈 모양, 코 모양, 얼굴형, 눈썹, 입술 특징을 5가지 이내로.
앞에 "${roleText}"를 붙여서 출력해줘.
아기에게 유전될 수 있는 특징 위주로 묘사해줘.
다른 설명 없이 특징 묘사만 출력해줘.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0];
  return text.type === "text" ? text.text.trim() : "";
}

async function uploadBase64ToReplicate(base64: string): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: "image/jpeg" });

  const formData = new FormData();
  formData.append("content", blob, "photo.jpg");

  const uploadRes = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    body: formData,
  });

  if (!uploadRes.ok) throw new Error(`업로드 실패: ${await uploadRes.text()}`);

  const data = await uploadRes.json();
  return data.urls?.get ?? data.url;
}

function extractUrl(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.url === "function") return (obj.url() as { href: string }).href;
    if (obj.url) return String(obj.url);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { image1, image2, gender } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json({ error: "엄마와 아빠 사진이 모두 필요합니다." }, { status: 400 });
    }

    const isBoy = gender === "boy";

    // 아들: 아빠 사진 identity + 엄마 특징 프롬프트
    // 딸: 엄마 사진 identity + 아빠 특징 프롬프트
    const identityBase64 = isBoy ? image2 : image1;
    const otherBase64 = isBoy ? image1 : image2;
    const otherRole = isBoy ? "mom" : "dad";

    const [identityUrl, otherFeatures] = await Promise.all([
      uploadBase64ToReplicate(identityBase64),
      analyzeFaceFeatures(otherBase64, otherRole),
    ]);

    console.log(`👶 ${isBoy ? "아들(아빠 identity)" : "딸(엄마 identity)"}`);
    console.log(`🧬 반영된 ${isBoy ? "엄마" : "아빠"} 특징:`, otherFeatures);

    const otherPart = otherFeatures ? `, also inheriting ${otherFeatures}` : "";

    const prompt = isBoy
      ? `portrait photo of a cute Korean baby boy toddler, 2-3 years old, chubby round cheeks, small upturned nose, large innocent eyes, very short neat hair, baby fat on face, smooth flawless baby skin, rosy cheeks, plump lips, round head shape${otherPart}, photorealistic, 8k, soft natural lighting, neutral white background, professional baby portrait photography`
      : `portrait photo of a cute Korean baby girl toddler, 2-3 years old, chubby round cheeks, small button nose, large sparkling innocent eyes, wispy soft hair, baby fat on face, smooth flawless baby skin, rosy cheeks, plump lips, round head shape${otherPart}, photorealistic, 8k, soft natural lighting, neutral white background, professional baby portrait photography`;

    const negativePrompt = isBoy
      ? "adult, teenager, old, wrinkles, ugly, blurry, cartoon, anime, low quality, girl, female, woman, makeup, text, watermark, multiple faces, scary, deformed, bad anatomy"
      : "adult, teenager, old, wrinkles, ugly, blurry, cartoon, anime, low quality, boy, male, man, text, watermark, multiple faces, scary, deformed, bad anatomy";

    // 3장 병렬 생성 (버전 해시 없이 최신 버전 자동 사용)
    const runs = await Promise.all(
      [0, 1, 2].map(() =>
        replicate.run("bytedance/flux-pulid", {
          input: {
            main_face_image: identityUrl,
            prompt,
            negative_prompt: negativePrompt,
            num_steps: 20,
            start_step: 0,
            guidance: 4,
            true_cfg: 1,
            id_weight: 1.0,
            width: 768,
            height: 768,
          },
        })
      )
    );

    const urls = runs.map(extractUrl).filter(Boolean) as string[];

    if (!urls.length) throw new Error("이미지를 받지 못했습니다.");

    return NextResponse.json({ output: urls });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("오류:", err);
    return NextResponse.json(
      { error: err.message || "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
