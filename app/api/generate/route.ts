import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";

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
  const prompt = `TASK
Image 1 is the MOTHER. Image 2 is the FATHER. Create ONE photorealistic portrait of their future child — a ${childWord}, about 2 to 3 years old. The parents must look at this photo and immediately feel "that's OUR child" — a believable genetic mix of the two specific people in the input, rendered as a real toddler.

STEP 1 — READ BOTH PARENTS CAREFULLY (do this before drawing):
For EACH parent separately, note: eye shape (single/double eyelid, roundness, tilt), eye color, nose shape and bridge, mouth and lip shape, eyebrow shape and thickness, overall face shape and jawline, skin tone, hair color and texture, and any distinctive marks (dimples, prominent cheekbones, a distinctive philtrum). Note the ethnicity of both parents.

FEATURE ALLOCATION LAW (the heart of this task — prevents a generic "average baby"):
- The child must inherit CLEARLY IDENTIFIABLE features from EACH parent, not a blurred average of the two. Distribute the six key features — eye shape, eye color, nose, mouth/lips, eyebrows, face shape — so that at least TWO come recognizably from the mother and at least TWO come recognizably from the father. The remaining features may blend.
- Each inherited feature must be VISIBLE AT A GLANCE: someone who knows both parents should be able to point and say "those are her eyes" and "that's his nose."
- Do NOT clone one parent's face onto a child. Do NOT produce a soft "average" face that resembles neither parent. Do NOT default to a generic idealized cute baby face — the parents' actual distinctive features are the point, even when they are unusual.
- Inherit distinctive marks where natural (dimples, double or single eyelids, a widow's peak).
- Ethnicity and skin tone: a natural blend of the two parents. NEVER change the child's ethnicity to something neither parent has, and never lighten or darken away from the parents' natural range.
- Hair: color and texture drawn from the parents (soft and possibly sparse, as is natural for a toddler).

TODDLER ANATOMY LAW (this must be a REAL toddler, not a shrunken adult):
- True 2-3 year old proportions: a rounder face with full soft cheeks, a proportionally larger cranium, larger eyes relative to the face, a small soft button nose with a low bridge, a small chin and soft undefined jawline, short neck, soft baby skin with no defined bone structure.
- The inherited adult features must be TRANSLATED into toddler form, not pasted on: an adult's sharp nose becomes a small soft nose with the same character; an adult's strong jaw becomes a rounder face with the same impression.
- ABSOLUTELY never an adult face scaled down, never adult proportions, never a defined adult jaw or cheekbones on a baby.

EXPRESSION & PHOTO LOOK:
- A bright, cheerful, natural toddler expression — a genuine soft smile or a curious open look. Alive and candid, never a stiff studio pose.
- Soft natural daylight in a bright, cozy, sunlit room; candid family lifestyle photography; shallow depth of field with a gently blurred background; warm, joyful mood.
- Vertical framing, head and upper body, the child filling most of the frame.
- Photorealistic, high resolution — a real photograph of a real child.

OUTPUT LAW:
- EXACTLY ONE child in EXACTLY ONE image. Never two children, never a collage, never multiple panels, never the parents in the frame.

SELF-CHECK before finishing:
- Can I point to at least two features that clearly came from the mother, and at least two from the father? Is this a real toddler's anatomy (not a small adult)? Is the skin tone and ethnicity a believable blend of these two specific parents? Is there exactly one child? Only then is it complete.

ABSOLUTELY AVOID:
- A generic pretty baby that resembles neither parent; a blurred average face; a copy of only one parent.
- An uncanny "tiny adult" — adult proportions, an adult jawline, or a shrunken adult face.
- Changed ethnicity or skin tone outside the parents' natural range; beautifying away the parents' real distinctive features.
- More than one child; the parents appearing in the image; collages or split panels.
- Cartoon or illustration style; distorted features; extra or missing fingers.
- Any text, letters, numbers, watermark, or border.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000); // 50초 넘으면 중단
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
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
      },
      "generate"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[baby] model=${model} status=${res.status} ${Date.now() - t0}ms`);

  if (!res.ok) throw new Error(await geminiFriendlyError(res, "generate"));

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
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
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

export const POST = withCoin("baby", 0, handler); // COIN_DORMANT: 실가격 3
