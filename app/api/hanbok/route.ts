import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithFallback, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 추석 리프레시 — flash 구세대(슬리밍 CORE)에서 Pro 신형(SKIN PERFECTION·무개조)으로 단독 전환.
// 16종 공유 보정 공식 CORE는 무접촉 — 이 파일만 자체 CORE를 갖는다.
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const CORE = `You are the master stylist team and concept photographer of Seoul's most famous premium hanbok studio — hair, makeup, wardrobe, and light working together on one pictorial. Take the person in the photo and create ONE stunning premium hanbok pictorial portrait of them in the scene described below. The scene, wardrobe, and light transform completely — the person stays completely themselves.

STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and whether they are WEARING GLASSES. Adapt every choice below to flatter THIS specific person.

[SKIN PERFECTION — the #1 rule of this entire work]
- Render the skin PERFECTLY CLEAN, clear, and even — a flawless, uniform complexion across the face, neck, and body, like a premium studio profile photo.
- The ONLY marks allowed anywhere are ones CLEARLY visible in the original photo, kept in their exact original spots. Everything else is clean skin — nothing new appears, ever. If unsure whether something is a mark or just shadow/noise, render clean skin.
- Flawless still means REAL: natural pores and fine skin texture remain visible — never waxy, never 3D-render plastic.

[IDENTITY FLOOR — the strongest rule, never cross]
- The scene and wardrobe transform, but the FACE anchors the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched, the face at its REAL size and shape. Any reduction, enlargement, or reshaping of the face or its features is a critical failure.
- Anyone who knows them must recognize them INSTANTLY. Do NOT turn them into any celebrity or a generic pretty person.
- BODY TRUTH: keep their real body as it is — the hanbok is fitted to THEM.

GLASSES RULE (check the input, then follow exactly):
- IF the person is wearing glasses in the input photo: the result MUST also show them wearing glasses — exactly ONE pair, worn normally on the face. Recreate THEIR OWN glasses: same frame shape, thickness, and color. Render clean, clear lenses with minimal glare so their bright retouched eyes stay clearly visible through them. Do NOT remove them, and do NOT swap them for sunglasses or different frames.
- IF the person is NOT wearing glasses in the input: do not add glasses or sunglasses.
- In ALL cases: never two pairs of glasses, never one pair on the face plus another in the hand or hair, never floating or duplicated eyewear anywhere in the frame.

[FLATTERING POLISH — beauty from light, makeup, and styling, never from reshaping]
- Luminous, healthy, camera-ready skin under SKIN PERFECTION above; bright, awake eyes with clean sparkling catchlights — their own eye size and shape, enhanced only by light and freshness (clearly visible through the lenses if they wear glasses).
- Woman: an elegant natural makeup that suits the hanbok — a luminous flawless base, softly defined brows, delicate eye makeup, a gentle rosy lip. Man: clean, polished K-drama actor grooming — neat natural brows, fresh clear skin.
- Age-true: fresh and well-rested, never older than the input, never artificially rejuvenated.

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
- Vertical portrait, eye-level, roughly chest-up to waist-up — tall, model-like proportions with the face clearly the luminous hero of the frame.

CAMERA:
- Shot on an 85mm portrait lens at f/1.8: the person tack-sharp, the background melting into soft creamy bokeh. Bright, clean, film-like color grade. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Oversaturated HDR.
- Crowds or other people in the frame, distorted hands, warped architecture.
- Any readable text, letters, logos, watermark, or border anywhere in the image.`;
const SELF_CHECK = `SELF-CHECK before finishing: skin perfectly clean with only original marks? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched, the face at its real size? · same person at a glance, in full hanbok styling? · does it read "premium hanbok pictorial" instantly? Only then is the work complete.`;
// 조립 완성본 export — diag mode=real이 실전과 문자 단위 동일한 프롬프트로 재현 실험을 하기 위함.
// ★아래 식은 generateHanbok이 쓰던 조립식 그대로다(md5 게이트로 동일성 증명).
export const HANBOK_PROMPT = `${CORE}\n\n${SCENE}\n\n${FINISH}\n\n${SELF_CHECK}`;
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
