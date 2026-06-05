import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const redis = process.env.KV_REST_API_URL
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN! })
  : null;

// 🔑 모델 (무료=Nano Banana 2, 유료=Pro). 바꾸려면 이 두 줄만.
const MODEL_FREE = "gemini-3.1-flash-image"; // Nano Banana 2
const MODEL_PAID = "gemini-3.1-flash-image"; // (테스트) 빠른 모델

// ── 유저 ID 쿠키 파싱 ──
function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try { return String(JSON.parse(cookie.value).id) || null; } catch { return null; }
}

// data URL → { mimeType, data }
function parseImage(input: string): { mimeType: string; data: string } {
  const m = input.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: "image/jpeg", data: input };
}

// 🔑 아기 얼굴 생성 — 엄마+아빠 사진을 둘 다 Gemini에 넣어 섞음 (일시적 5xx면 재시도)
async function generateBaby(
  momDataUrl: string, dadDataUrl: string, isBoy: boolean, model: string
): Promise<string> {
  const mom = parseImage(momDataUrl);
  const dad = parseImage(dadDataUrl);
  const childWord = isBoy ? "son (a baby boy)" : "daughter (a baby girl)";
  const prompt = `Image 1 is the mother. Image 2 is the father. Generate a single photorealistic portrait of their future child — a ${childWord}, around 2 to 3 years old. The child's face MUST be a natural, believable genetic blend of BOTH parents: mix the eye shape and eye color, nose, mouth, eyebrows, and overall face shape from the mother (image 1) and the father (image 2). Korean toddler. Soft natural daylight, candid lifestyle photo in a bright cozy sunlit room, shallow depth of field, warm cheerful mood. An adorable, healthy, realistic toddler with natural baby skin and proportions. Photorealistic, high detail, NOT a cartoon, NOT an illustration, no text. Output one single image of the child.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000); // 50초 넘으면 중단
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mom.mimeType, data: mom.data } },
              { inline_data: { mime_type: dad.mimeType, data: dad.data } },
            ],
          }],
        }),
        signal: ctrl.signal,
      }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[baby] model=${model} status=${res.status} ${Date.now() - t0}ms`);

  if (!res.ok) throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));

  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter(
    (p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
      p?.inlineData?.data || p?.inline_data?.data
  );
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  return `data:image/png;base64,${b64}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(GEMINI_API_KEY 없음)" }, { status: 500 });
    }
    const { image1, image2, gender } = await request.json();
    if (!image1 || !image2) {
      return NextResponse.json({ error: "엄마와 아빠 사진이 모두 필요합니다." }, { status: 400 });
    }
    const isBoy = gender === "boy";

    // 유료 여부 (bonus uses > 0 이면 프리미엄)
    const userId = getUserId(request);
    const bonusUses = userId && redis ? ((await redis.get<number>("bonus:" + userId)) ?? 0) : 0;
    const isPremium = bonusUses > 0;
    const model = isPremium ? MODEL_PAID : MODEL_FREE;
    console.log(`[Generate] userId=${userId}, isPremium=${isPremium}, model=${model}`);

    // image1 = 엄마, image2 = 아빠
    const url = await generateBaby(image1, image2, isBoy, model);

    return NextResponse.json({ output: [url], isPremium });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Generate Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}