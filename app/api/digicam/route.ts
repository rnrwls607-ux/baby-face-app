import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError, classifyGeminiError, wasFastRetryExhausted } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 디지캠 스냅 — 나노바나나 Pro (Pro 단일입력 route 구조 복제, 크롭 없음 = 원본 비율 유지)
const GEMINI_MODEL = "gemini-3-pro-image";
const FLASH_FALLBACK_MODEL = "gemini-3.1-flash-image"; // 혼잡 폴백 전용 — hanbok 파일럿(cd05fd9)과 동일
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateDigicam(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the master retoucher and concept photographer of Seoul's most
famous premium photo studio — the studio that celebrities and influencers
visit for their concept pictorials. Your signature skill: every client
walks out with a noticeably smaller face, flawless glass skin, and
brighter features — looking like the idol version of themselves — while
friends still recognize them at a glance.
Take the person in the photo and create ONE stunning, fully-retouched
digicam snapshot portrait of them in the scene described below.
STEP 1 — Read the person first:
Note their gender, hair color and length, skin tone, facial features, and
whether they are WEARING GLASSES. Adapt every choice below to flatter
THIS specific person.
GLASSES RULE (check the input, then follow exactly):
- If they are wearing glasses: keep the EXACT same glasses — same frame
  shape, same color, worn normally on the face, with clean glare-free
  lenses. Only ONE pair.
- If they are NOT wearing glasses: do NOT add any glasses.
- Never duplicate glasses. Never add sunglasses.
THE RETOUCH CONTRACT (read carefully):
- The result must be recognizable as the same person — keep the
  fundamental impression and arrangement of their features so friends
  know them instantly.
- BUT this is a professionally RETOUCHED pictorial, not a raw documentary
  photo. You are EXPECTED to visibly enhance and slim. The person's own
  reaction must be: "This is the best I have ever looked in my life —
  I'm showing this to everyone."
FACE RETOUCHING ORDER — apply ALL of these (premium Korean studio standard):
1. SMALL FACE (most important): Slim the jawline into a soft, elegant
   V-line. Reduce cheek fullness and overall facial width. The whole face
   should read about 10% smaller and more compact than the input — a
   small, refined face with idol-like head-to-shoulder proportions.
2. EYES: Brighter, more awake, and subtly larger-looking — lively,
   sparkling, clearly defined eyes that light up the whole face (clearly
   visible through the lenses if they wear glasses).
3. NOSE: A subtly slimmer, straighter, more refined nose bridge and tip.
4. CONTOURS: Softly lifted, youthful facial contours; a clean, smooth
   jaw-to-neck line with no double chin.
5. HARMONY RULE: blend every adjustment into ONE natural, harmonious
   face — the "expensive photoshop" look where everything is clearly
   enhanced but nothing looks warped, stretched, or uncanny.
SKIN — flawless glass skin:
- Poreless-smooth, even-toned, luminous glass skin with a dewy glow —
  top-tier beauty retouching plus perfect flattering light.
- Completely remove blemishes, acne, redness, dark circles, and oiliness.
- Keep it ALIVE: soft highlights on the cheekbones and nose bridge, a
  healthy warm undertone — never plastic, waxy, or flat.
- Zero moles, zero spots, zero marks interrupting the flawless skin —
  every blemish, mole, spot, and scar completely covered and erased.
- The direction is one-way: marks may only be REMOVED, never added — do
  not paint any new mole, freckle, beauty mark, or spot anywhere, under
  any circumstance.
BEAUTY DIRECTION — modern Korean, youthful:
- Beautify in the aesthetic of TODAY's young Korean celebrities — fresh,
  youthful, clean. They must look subtly YOUNGER than the input photo,
  never older.
- Woman: dewy "no-makeup makeup" base with a soft natural accent — soft
  natural straight brows, delicate eye makeup, a gentle rosy lip. Never
  heavy or dramatic.
- Man: clean K-drama actor grooming — neat natural brows, fresh clear
  skin, effortless and modern.
- Hair: a trendy modern Korean hairstyle that suits them, in their true
  hair color, styled beautifully for the scene (around the glasses
  naturally if they wear them). Never a dated style that ages them.
RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of the original photo entirely. Re-light the face
  and body with the flattering key light described in the scene below,
  with a gentle rim light in the hair and natural soft shadows. They must
  look truly photographed in this place at this moment — and the face
  must always stay BRIGHT and luminous.
THE SCENE — 2000s digicam night snapshot:
- The entire photo is captured on an early-2000s compact digital camera
  with its built-in flash fired directly at the person — a nostalgic
  "digicam" snap.
- Light: flawless beauty lighting on the person — the camera's direct
  flash acts as a bright, even, flattering key light with delicate
  catchlights, gentle fill, and a clean glow on the skin, idol-grade
  luminous, every feature crisp — while the scene around them falls into
  darker ambient tones with soft city-night or cozy interior glow behind;
  playful, nostalgic 2000s night-out mood.
- Digicam texture (applied to the photo, never degrading the face): a
  slightly washed, gently cool-leaning CCD color tone, softly blooming
  highlights, a faint fine digital grain across the frame, and a natural
  flash falloff into the background with a soft shadow behind the person.
  The charm of a real old digicam file — yet the face itself stays
  clearly bright, clean, and flawless.
- Setting: a candid night-out moment — a city street at night or a dim
  cozy interior, softly blurred behind them, with no readable text on
  any sign or surface.
- Wardrobe: a trendy, effortlessly stylish modern casual outfit that
  suits the person, with a clean fit around the neckline and shoulders.
  No logos, no brand marks, no lettering on any clothing.
- DATE STAMP (the ONLY permitted characters in the image): a small retro
  orange digital date stamp in the bottom-right corner, made of crisp
  seven-segment-style DIGITS AND SPACES ONLY — in the style of
  "2026 8 26". The digits must be perfectly sharp and unbroken. If the
  digits cannot be rendered perfectly crisp and clean, OMIT the stamp
  entirely. No other numbers or letters anywhere in the image.
POSE — a natural candid night-out pose: relaxed and playful, looking
toward the camera as if a friend just snapped the photo.
FRAMING — vertical 3:4 portrait, upper-body shot, the person centered —
tall, model-like proportions with the small refined face clearly the
hero of the frame.
CAMERA — rendered as an early-2000s compact digicam photo: direct
on-camera flash, deep-ish focus typical of a small sensor, the digicam
color and grain described above. Photorealistic, high resolution
underneath the retro texture.
FINAL SELF-CHECK before output:
- Next to the source photo, friends must instantly say "that's the same
  person — and this is the best they have ever looked."
- Face clearly slimmer, brighter, and more polished than the input, yet
  never warped or uncanny?
- SKIN CHECK: flawless glass skin with zero moles, zero spots, zero
  INVENTED marks anywhere?
- Glasses exactly as the source? Hair color true to the source?
- Date stamp: digits crisp and unbroken, or fully omitted? No other text
  anywhere?
ABSOLUTELY AVOID:
- Removing the person's glasses if they wore them, adding glasses they
  didn't wear, or duplicating any eyewear. No sunglasses.
- A warped, over-liquified, or uncanny face — enhancements must read as
  expensive photoshop, never distortion.
- Making them unrecognizable or turning them into a generic pretty person.
- ANY aged, mature, or old-fashioned look — never older than the input.
- Any painted-on or INVENTED mole, spot, or mark.
- Plastic waxy skin, dead flat lighting, murky shadows on the face,
  oversaturated HDR.
- Grain or blur so heavy that the face looks dirty, damaged, or unclear.
- Crowds or other people in the background.
- Any readable text, signs, or watermarks anywhere — EXCEPT the single
  orange date stamp digits described above.
Output: one photorealistic photo — the same person in a complete digicam
snapshot portrait, at the absolute best of their life. High resolution,
no watermark, no border.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  // 요청을 상수로 뽑는다 — Pro와 flash 폴백이 "정확히 같은 요청"을 보내게 하는 구조적 보증
  const geminiInit = {
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
  };
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      geminiInit,
      "digicam",
      1, // ★빠른 실패(429/503, 1차 <15초) 한정 1회 재시도 — 느린 실패는 fetcher가 거른다
      true // fastOnly — Pro 예산(230초)을 지키는 엄격 모드
    );
    // ── flash 폴백 · 파일럿 2호 (hanbok cd05fd9 계승, 조건은 더 좁게) ────────────
    // 발동: 엄격 재시도까지 소진하고도 혼잡 429/503일 때만(wasFastRetryExhausted).
    // ★타임아웃(AbortError)·쿼터 429·4xx·느린 503(재시도 미발동)·이미지 없음은 폴백 없이
    //   기존 실패 경로 그대로 — 쿼터·4xx는 flash로 가도 똑같이 실패하고, 느린 실패는 예산이 없다.
    if (wasFastRetryExhausted(res)) {
      const failBody = await res.text().catch(() => "");
      const { tag } = classifyGeminiError(res.status, failBody);
      if (tag === "TRANSIENT") {
        console.warn(`[FALLBACK][digicam] pro_failed=${res.status} ${Date.now() - t0}ms → flash 시도`);
        const f0 = Date.now();
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FLASH_FALLBACK_MODEL}:generateContent`, geminiInit);
        console.log(`[FALLBACK][digicam] engine=flash-fallback status=${res.status} ${res.ok ? "성공" : "실패"} ${Date.now() - f0}ms`);
      } else {
        // 폴백 부적격(예: 2차가 쿼터 429) — 본문을 읽어버렸으므로 같은 내용으로 재구성해 기존 경로로
        res = new Response(failBody, { status: res.status, headers: res.headers });
      }
    }
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") {
      console.error(`[TIMEOUT][digicam] 230초 무응답 ${Date.now() - t0}ms`);
      throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    }
    throw e;
  }
  clearTimeout(timer);
  console.log(`[digicam] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "digicam", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[digicam] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[digicam] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateDigicam(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("digicam error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("digicam", 0, handler); // COIN_DORMANT: 실가격 3 · gemini-3-pro-image
