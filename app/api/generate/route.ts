import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

// FLUX PuLID — 무료 사용자 (1장씩 순차)
const FLUX_MODEL = "bytedance/flux-pulid:8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b";

// Runway Gen-4 Image — 유료 사용자 (엄마+아빠 동시 2장 참조)
const GEN4_MODEL = "runwayml/gen4-image";

// ── 유저 ID 쿠키 파싱 ──────────────────────────────────────────
function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try { return String(JSON.parse(cookie.value).id) || null; } catch { return null; }
}

// ── Claude 얼굴 특징 분석 ──────────────────────────────────────
async function analyzeFaceFeatures(base64: string, role: string): Promise<string> {
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
        { type: "text", text: "Describe this person's key heritable facial features in English for baby face generation. List up to 4 features (eye shape, nose, face shape, lips). Start with '" + role + "'. Output only the description." },
      ],
    }],
  });
  const first = response.content[0];
  return first.type === "text" ? first.text.trim() : "";
}

// ── Replicate 파일 업로드 ─────────────────────────────────────
async function uploadToReplicate(base64: string): Promise<string> {
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

// ── URL 추출 ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUrl(item: any): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item.url === "function") return item.url().href;
  if (item && item.url) return String(item.url);
  return null;
}

// ── 429 재시도 래퍼 ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runWithRetry(model: string, input: any): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await replicate.run(model as `${string}/${string}`, { input });
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const msg: string = e?.message ?? "";
      if (msg.includes("429") || e?.status === 429) {
        const m = msg.match(/retry_after[^0-9]*(\d+)/);
        const wait = m ? parseInt(m[1]) * 1000 : 12000;
        console.log("429 rate limit, waiting " + wait + "ms");
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// ── FLUX PuLID 생성 (무료) ────────────────────────────────────
async function generateWithFlux(identityUrl: string, otherFeatures: string, isBoy: boolean): Promise<string[]> {
  const otherPart = otherFeatures ? ", also inheriting " + otherFeatures : "";
  const prompt = isBoy
    ? "professional studio portrait photo of a real Korean baby boy, exactly 1 year old infant, extremely chubby round baby cheeks, large round baby head, very short wispy hair, tiny baby nose, smooth plump baby skin, baby fat, genuine toddler proportions, white studio background, photorealistic DSLR photo" + otherPart
    : "professional studio portrait photo of a real Korean baby girl, exactly 1 year old infant, extremely chubby round baby cheeks, large round baby head, very short wispy hair, tiny baby nose, smooth plump baby skin, baby fat, genuine toddler proportions, white studio background, photorealistic DSLR photo" + otherPart;

  const negative = "cartoon, anime, 3d render, CGI, illustration, toy, doll, oversized eyes, manga, stylized, child, kid, teenager, adult, earrings, makeup, text, watermark, deformed, bad anatomy, low quality";

  const input = {
    main_face_image: identityUrl,
    prompt,
    negative_prompt: negative,
    num_steps: 20,
    start_step: 4,
    guidance: 4,
    true_cfg: 1,
    id_weight: 0.65,
    width: 896,
    height: 896,
  };

  const results: string[] = [];
  for (let i = 0; i < 3; i++) {
    const out = await runWithRetry(FLUX_MODEL, input);
    const url = extractUrl(Array.isArray(out) ? out[0] : out);
    if (url) results.push(url);
  }
  return results;
}

// ── Runway Gen-4 생성 (유료) ──────────────────────────────────
async function generateWithGen4(momUrl: string, dadUrl: string, isBoy: boolean): Promise<string[]> {
  const babyGender = isBoy ? "baby boy" : "baby girl";

  // Gen-4는 [태그] 방식으로 참조 이미지를 프롬프트에 연결
  const prompt = `professional studio portrait photo of a real cute Korean ${babyGender} toddler aged 12-18 months, inheriting facial features from [mom] and [dad], extremely chubby round baby cheeks, plump baby skin, wispy short hair, natural proportional eyes, tiny nose, baby fat on face, genuine infant features, soft studio lighting, white background, photorealistic DSLR photo, 8K resolution, high detail`;

  const input = {
    prompt,
    reference_images: [momUrl, dadUrl],
    ratio: "1:1",
    seed: Math.floor(Math.random() * 999999),
  };

  console.log("[Gen-4] Starting generation with 2 reference images");

  const results: string[] = [];
  for (let i = 0; i < 3; i++) {
    const out = await runWithRetry(GEN4_MODEL, { ...input, seed: Math.floor(Math.random() * 999999) });
    console.log("[Gen-4] Output:", typeof out, JSON.stringify(out)?.slice(0, 200));
    const url = extractUrl(Array.isArray(out) ? out[0] : out);
    if (url) results.push(url);
  }
  return results;
}

// ── 메인 POST 핸들러 ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { image1, image2, gender } = await request.json();

    if (!image1 || !image2) {
      return NextResponse.json({ error: "엄마와 아빠 사진이 모두 필요합니다." }, { status: 400 });
    }

    const isBoy = gender === "boy";

    // 유료 여부 확인 (bonus uses > 0 이면 프리미엄)
    const userId = getUserId(request);
    const bonusUses = userId && redis ? ((await redis.get<number>("bonus:" + userId)) ?? 0) : 0;
    const isPremium = bonusUses > 0;

    console.log(`[Generate] userId=${userId}, bonusUses=${bonusUses}, isPremium=${isPremium}`);

    let urls: string[];

    if (isPremium) {
      // ── 유료: Gen-4 (엄마+아빠 동시 참조) ─────────────────
      console.log("[Gen-4] Premium user — uploading both photos");
      const [momUrl, dadUrl] = await Promise.all([
        uploadToReplicate(image1),
        uploadToReplicate(image2),
      ]);
      urls = await generateWithGen4(momUrl, dadUrl, isBoy);
    } else {
      // ── 무료: FLUX PuLID (identity 1장 + 반대편 특징 텍스트) ─
      console.log("[FLUX] Free user — single identity flow");
      const identityBase64 = isBoy ? image2 : image1;
      const otherBase64   = isBoy ? image1 : image2;
      const otherRole     = isBoy ? "mother's" : "father's";

      const [identityUrl, otherFeatures] = await Promise.all([
        uploadToReplicate(identityBase64),
        analyzeFaceFeatures(otherBase64, otherRole),
      ]);
      console.log("Other features:", otherFeatures);
      urls = await generateWithFlux(identityUrl, otherFeatures, isBoy);
    }

    if (!urls.length) throw new Error("이미지를 받지 못했습니다.");

    return NextResponse.json({
      output: urls,
      isPremium,  // 클라이언트에서 "프리미엄 결과" 표시용
    });

  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error("Generate Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
