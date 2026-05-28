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

async function analyzeFaceFeatures(base64: string): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  // PNG / JPG / WEBP 자동 감지
  const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 200,
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
눈 모양, 코 모양, 얼굴형, 눈썹 특징만 5가지 이내로.
예시: "father's narrow eyes, high nose bridge, square jawline, thick eyebrows"
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

export async function POST(request: NextRequest) {
  try {
    const { image1, image2 } = await request.json();

    if (!image1) {
      return NextResponse.json({ error: "엄마 사진이 필요합니다." }, { status: 400 });
    }

    console.log("📤 업로드 & 얼굴 분석 중...");
    const [momUrl, dadFeatures] = await Promise.all([
      uploadBase64ToReplicate(image1),
      image2 ? analyzeFaceFeatures(image2) : Promise.resolve(""),
    ]);

    console.log("👨 아빠 특징:", dadFeatures);

    const dadPart = dadFeatures ? `, inheriting ${dadFeatures} from father` : "";
    const prompt = `a cute 3 year old Korean toddler [img]${dadPart}, chubby cheeks, big round eyes, small nose, soft baby skin, photorealistic, professional portrait, warm studio lighting`;

    console.log("📝 프롬프트:", prompt);
    console.log("🎨 모델 실행 중...");

    const output = await replicate.run(
      "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      {
        input: {
          input_image: momUrl,
          prompt,
          negative_prompt: "adult, old, deformed, blurry, cartoon, ugly, low quality",
          style_name: "Photographic (Default)",
          num_outputs: 1,
          guidance_scale: 5,
          num_inference_steps: 20,
          style_strength_ratio: 15,
        },
      }
    );

    const urls = (output as any[])
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.url === "function") return item.url().href;
        if (item?.url) return item.url.href || String(item.url);
        return null;
      })
      .filter(Boolean);

    console.log("✅ 완료:", urls);
    return NextResponse.json({ output: urls });

  } catch (error: any) {
    console.error("❌ 오류:", error);
    return NextResponse.json(
      { error: error.message || "오류가 발생했습니다." },
      { status: 500 }
    );
  }
}