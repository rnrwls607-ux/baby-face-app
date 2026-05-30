import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "bytedance/flux-pulid:8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b";

async function analyzeFaceFeatures(base64: string, role: string): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          {
            type: "text",
            text:
              "Describe this person's facial features in English for a baby face generation prompt. " +
              "List up to 5 heritable features (eye shape, nose shape, face shape, eyebrows, lips). " +
              "Start with '" + role + "'. Output only the feature description.",
          },
        ],
      },
    ],
  });

  const first = response.content[0];
  return first.type === "text" ? first.text.trim() : "";
}

async function uploadBase64ToReplicate(base64: string): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("content", blob, "photo.jpg");

  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: "Token " + process.env.REPLICATE_API_TOKEN },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed: " + (await res.text()));
  const data = await res.json();
  return data.urls?.get ?? data.url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUrl(item: any): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item.url === "function") return item.url().href;
  if (item && item.url) return String(item.url);
  return null;
}

// 429 발생 시 대기 후 재시도
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runOne(input: any): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await replicate.run(MODEL, { input });
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || e?.status === 429) {
        const m = msg.match(/retry_after[^0-9]*(\d+)/);
        const wait = m ? parseInt(m[1]) * 1000 : 12000;
        console.log("429 rate limit, waiting " + wait + "ms");
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(request: NextRequest) {
  try {
    const { image1, image2, gender } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json({ error: "엄마와 아빠 사진이 모두 필요합니다." }, { status: 400 });
    }

    const isBoy = gender === "boy";
    const identityBase64 = isBoy ? image2 : image1;
    const otherBase64 = isBoy ? image1 : image2;
    const otherRole = isBoy ? "mother's" : "father's";

    const [identityUrl, otherFeatures] = await Promise.all([
      uploadBase64ToReplicate(identityBase64),
      analyzeFaceFeatures(otherBase64, otherRole),
    ]);

    console.log("Other features:", otherFeatures);

    const otherPart = otherFeatures ? ", also inheriting " + otherFeatures : "";

    const prompt = isBoy
      ? "portrait photo of a cute Korean baby boy toddler, 2-3 years old, chubby round cheeks, small upturned nose, large innocent eyes, short neat hair, baby fat on face, smooth flawless skin, rosy cheeks, plump lips, round head shape" + otherPart + ", photorealistic, 8k, soft natural lighting, white background, professional baby portrait"
      : "portrait photo of a cute Korean baby girl toddler, 2-3 years old, chubby round cheeks, small button nose, large sparkling eyes, wispy soft hair, baby fat on face, smooth flawless skin, rosy cheeks, plump lips, round head shape" + otherPart + ", photorealistic, 8k, soft natural lighting, white background, professional baby portrait";

    const negative = isBoy
      ? "adult, teenager, old, wrinkles, ugly, blurry, cartoon, anime, low quality, girl, woman, makeup, text, watermark, multiple faces, deformed"
      : "adult, teenager, old, wrinkles, ugly, blurry, cartoon, anime, low quality, boy, man, text, watermark, multiple faces, deformed";

    const input = {
      main_face_image: identityUrl,
      prompt: prompt,
      negative_prompt: negative,
      num_steps: 20,
      start_step: 0,
      guidance: 4,
      true_cfg: 1,
      id_weight: 1.0,
      width: 768,
      height: 768,
    };

    // 3장 순차 생성 (burst=1 rate limit 대응)
    const results = [];
    for (let i = 0; i < 3; i++) {
      const out = await runOne(input);
      results.push(out);
    }

    const urls = results.map(extractUrl).filter(Boolean);
    if (!urls.length) throw new Error("이미지를 받지 못했습니다.");

    return NextResponse.json({ output: urls });

  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error("Error:", err);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
