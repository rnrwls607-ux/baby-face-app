import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// ── base64 사진을 Replicate에 업로드 (일시적 서버오류면 재시도) ──
async function uploadToReplicate(base64: string, attempt = 0): Promise<string> {
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
  if (!res.ok) {
    // 일시적 서버 오류(5xx)면 1.5초 쉬고 최대 2번 더 재시도
    if (res.status >= 500 && attempt < 2) {
      await new Promise(r => setTimeout(r, 1500));
      return uploadToReplicate(base64, attempt + 1);
    }
    throw new Error("Upload failed: " + (await res.text()));
  }
  const data = await res.json();
  return data.urls?.get ?? data.url;
}

// ── 결과 URL 추출 ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUrl(item: any): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item.url === "function") return item.url().href;
  if (item && item.url) return String(item.url);
  return null;
}

// ════════════════════════════════════════════════════════════
// 🔑 모델 격리 지점 — 나중에 Nano Banana 등으로 바꿀 땐 이 함수 안만 교체!
//    바깥(POST 핸들러·업로드·검증)은 그대로 둬도 됩니다.
// ════════════════════════════════════════════════════════════
const PHOTOMAKER_MODEL = "tencentarc/photomaker";

async function generateIdPhotos(imageUrls: string[], gender: "man" | "woman"): Promise<string[]> {
  // 트리거 단어 'img'는 클래스 단어(man/woman) 바로 뒤에 와야 함 (PhotoMaker 규칙)
  const cls = gender === "man" ? "man" : "woman";
  const prompt = `professional ID photo of an asian ${cls} img, wearing a formal black business suit with a white dress shirt, neutral calm expression, looking straight at the camera, clean plain white studio background, soft even studio lighting, sharp focus, realistic high quality headshot`;
  const negativePrompt = "cartoon, anime, 3d, painting, illustration, sketch, smiling with teeth, open mouth, side profile, tilted head, hat, sunglasses, busy background, multiple people, low quality, blurry, distorted face";

  const input: Record<string, unknown> = {
    input_image: imageUrls[0],
    prompt,
    negative_prompt: negativePrompt,
    style_name: "Photographic (Default)",
    num_steps: 18,
    style_strength_ratio: 15, // 낮을수록 본인 닮음 ↑ (증명사진은 닮음 우선)
    num_outputs: 3,           // 여러 장 뽑아 사용자가 고르게
    guidance_scale: 5,
  };
  // 추가 사진(2~3장)은 본인 정확도(ID fidelity)를 높여줌
  if (imageUrls[1]) input.input_image2 = imageUrls[1];
  if (imageUrls[2]) input.input_image3 = imageUrls[2];

  const out: unknown = await replicate.run(PHOTOMAKER_MODEL as `${string}/${string}`, { input });
  const arr = Array.isArray(out) ? out : [out];
  return arr.map(extractUrl).filter((u): u is string => !!u);
}

// ── 메인 POST 핸들러 (모델과 무관한 공통 로직) ────────────────
export async function POST(request: NextRequest) {
  try {
    const { images, gender } = await request.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "본인 사진을 한 장 이상 올려주세요." }, { status: 400 });
    }

    const g: "man" | "woman" = gender === "man" ? "man" : "woman";

    const picked = images.slice(0, 3); // 앞 3장만 사용
    const uploaded = await Promise.all(picked.map((img: string) => uploadToReplicate(img)));

    const urls = await generateIdPhotos(uploaded, g);
    if (!urls.length) throw new Error("이미지를 받지 못했습니다.");

    return NextResponse.json({ output: urls });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("ID Photo Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}   