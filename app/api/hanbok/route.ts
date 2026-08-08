import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithFallback, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// A/B 판정(2026-08-08) — 구판 보정 계약(슬리밍 CORE)을 복원하고 SKIN 절에 발명 봉쇄 1줄만 더했다.
// 엔진은 Pro + flash 폴백(cd05fd9) 그대로. 16종 공유 보정 공식 CORE는 무접촉 — 이 파일만 자체 CORE를 갖는다.
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const CORE = `You are the master retoucher and concept photographer of Seoul's most famous premium photo studio — the studio that celebrities and influencers visit for their concept pictorials. Your signature skill: every client walks out with a noticeably smaller face, flawless glass skin, and brighter features — looking like the idol version of themselves — while friends still recognize them at a glance.

Take the person in the photo(s) and create ONE stunning, fully-retouched concept pictorial portrait of them in the scene described below.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color. Render clean, clear lenses with minimal glare so their bright retouched eyes stay clearly visible through them. Do NOT remove them, and do NOT swap them for sunglasses or different frames.
- IF the person is NOT wearing glasses in the input: do not add glasses or sunglasses.
- In ALL cases: never two pairs of glasses, never one pair on the face plus another in the hand or hair, never floating or duplicated eyewear anywhere in the frame.

THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the fundamental impression and arrangement of their features so friends know them instantly.
- BUT this is a professionally RETOUCHED pictorial, not a raw documentary photo. You are EXPECTED to visibly enhance and slim. The person's own reaction must be: "This is the best I have ever looked in my life — I'm showing this to everyone."

FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant V-line. Reduce cheek fullness and overall facial width. The whole face should read about 10% smaller and more compact than the input — a small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively, sparkling, clearly defined eyes that light up the whole face (clearly visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious face — the "expensive photoshop" look where everything is clearly enhanced but nothing looks warped, stretched, or uncanny.

SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow — top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a healthy warm undertone — never plastic, waxy, or flat.
- The direction is one-way: marks may only be REMOVED, never added — do not paint any new mole, freckle, beauty mark, or spot anywhere, under any circumstance.

BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh, youthful, clean. They must look subtly YOUNGER than the input photo, never older.
- Woman: dewy "no-makeup makeup" base with at most the tasteful accent described in the scene below — soft natural straight brows, delicate eye makeup. Never heavy or dramatic.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, styled beautifully for the scene below (around the glasses naturally if they wear them). Never a dated style that ages them.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face and body with the flattering key light described in the scene below, with a gentle rim light in the hair and natural soft shadows. They must look truly photographed in this place at this moment — and the face must always stay BRIGHT and luminous.`;
const SCENE = `THE SCENE — 한복 화보 (royal palace at golden hour):
- An elegant Korean royal palace at golden hour: warm stone walls and a beautiful hanok pavilion with softly blurred dancheong details, gentle late-afternoon sunlight, a few drifting petals or soft foliage for color.
- Key light: warm, soft, low golden sunlight from the front-side — the face bright and glowing against the dignified backdrop.

WARDROBE — premium modern hanbok:
- Woman: an exquisite premium hanbok in a harmonious, luminous color pairing — a soft jewel-tone or pastel silk jeogori with a gracefully flowing skirt, a neat goreum ribbon, a delicate norigae accent. Authentic, refined construction — high-end hanbok studio quality.
- Man: a refined men's hanbok in deep, tasteful tones with a clean, dignified silhouette.
- HAIR NOTE (critical): style the hair MODERN and youthful with the hanbok — soft natural waves or a loose romantic half-up with a delicate binyeo pin accent for a woman; a clean modern style for a man. NEVER a severe, tightly-pulled traditional updo or any styling that ages them. No gat or face-shadowing headpieces.

POSE:
- A graceful, serene pose: standing softly with hands gently gathered, a light poised turn, or a soft gaze toward the camera with a gentle smile.`;
const FINISH = `FRAMING:
- Vertical portrait, eye-level, roughly chest-up to waist-up — tall, model-like proportions with the small refined face clearly the hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Removing the person's glasses if they wore them, adding glasses they didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Plastic waxy skin, dead flat lighting, murky shadows on the face, oversaturated HDR.
- Crowds or other people in the frame, distorted hands, warped architecture.
- Any readable text, letters, logos, watermark, or border anywhere in the image.`;
// 조립 완성본 export — diag mode=real이 실전과 문자 단위 동일한 프롬프트로 재현 실험을 하기 위함.
export const HANBOK_PROMPT = `${CORE}\n\n${SCENE}\n\n${FINISH}`;
async function generateHanbok(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = HANBOK_PROMPT;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  let engine = "pro"; // 폴백 파일럿 — 어느 엔진이 응답했는지 로그에 남긴다
  try {
    ({ res, engine } = await fetchGeminiWithFallback(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "hanbok",
      // ★소프트컷 180초 — Pro 정상 분포(100~200초)의 꼬리만 흘리고 flash에 50초를 남긴다(총예산 230초)
      { softCutMs: 180000, fallbackUrl: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent`, signal: ctrl.signal }
    ));
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[hanbok] engine=${engine} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "hanbok", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[hanbok] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[hanbok] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 인물 화보: 3:4 세로 비율로 크롭 (화보 생성형 관례 유지)
  return await cropToRatio(dataUrl, 3, 4);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHanbok(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("hanbok error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("hanbok", 0, handler); // coinCost 3 — concepts.ts 기준(전종 라이브)
