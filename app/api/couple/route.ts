import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
// 2인 라인 파일럿 — 나노바나나 Pro (couple만. 다른 route는 전부 flash 유지)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
// 성별은 사용자 확정값("female"|"male") → 프롬프트 표기(FEMALE|MALE)
const G = (g: string) => (g === "male" ? "MALE" : "FEMALE");
const TWOSHOT_CORE = (G1: string, G2: string) => `TASK
You are RETOUCHING two real photographs of two real people — NOT generating new people. You are given 2 input images: Image 1 shows Person 1, Image 2 shows Person 2. These two people came to Seoul's most famous premium photo studio TOGETHER for the pictorial described in THE SCENE below. Your craft as the studio's master retoucher: everyone walks out looking like THEMSELVES on the best day of their life — flawless skin, perfect light, beautifully styled — visibly upgraded, never altered. Edit their photos into ONE single stunning portrait of the two of them together. THE HIGHEST PRIORITY, above everything else: each output face must be instantly recognizable as the SAME person side by side with their own source image.

STEP 1 — ROLL CALL (do this before generating anything):
Study each input image and build a locked identity profile:
- Person 1 = the person in Image 1. Person 1 is confirmed ${G1} by the user — this is a fixed fact, not your judgment. Note their face shape, eye shape and eyelid type, nose, mouth, skin tone, hairstyle (including gray), and whether they wear glasses.
- Person 2 = the person in Image 2. Person 2 is confirmed ${G2} by the user — this is a fixed fact, not your judgment. Note their face shape, eye shape and eyelid type, nose, mouth, skin tone, hairstyle (including gray), and whether they wear glasses.
These two profiles are LOCKED. Each face you render is an EDIT of its own source face — never a new invention, never influenced by the other person's face.

IDENTITY LAW — the absolute rules (never violate):
- EXACTLY two people: Person 1 and Person 2 — each appearing exactly once. Never add, remove, duplicate, or merge anyone.
- GENDER LOCK (user-confirmed, absolute): Person 1 is ${G1}. Person 2 is ${G2}. Render each person's gender EXACTLY as confirmed — never swap, never reinterpret, never masculinize or feminize anyone against their confirmed gender. Styling, attire, hair, and makeup follow each person's confirmed gender.
- Each face is retouched from THEIR OWN source image alone. NEVER mix, blend, swap, or average features between the two.
- ANTI-CLONE RULE: after retouching, the two faces must remain exactly as DIFFERENT from each other as they are in the sources.
- AGE LAW (one rule for everyone): each person's age impression stays their own — a younger person looks fresh and well-rested (never older), an older person stays gracefully and clearly their own generation (never made younger, never reshaped). Elegantly gray hair stays elegantly gray, beautifully styled.
- GLASSES per person: if a person wears glasses in their input, they wear the SAME glasses (same frames) — exactly one pair, worn normally. If they don't, add none. Never move glasses between the two, never duplicate a pair.

FACE — one gentle standard for everyone (no exceptions, no modes):
1. JAWLINE ONLY: you may refine each person's OWN jawline and under-chin into a subtly softer, cleaner line — a light, natural slimming that reduces heaviness and double-chin shadows. So subtle that their friends couldn't name what changed — they just look great. Their face shape remains unmistakably theirs.
2. EYES: SAME size, SAME shape, SAME eyelid type as the source — enhanced only through light and freshness: bright, awake, lively, with clean sparkling catchlights (clearly visible through lenses if they wear glasses).
3. EVERYTHING ELSE LOCKED: nose, mouth, facial proportions, and bone structure stay EXACTLY as in each person's source. No reshaping of any feature, for anyone, at any age.
4. HARMONY: the few adjustments blend invisibly — each face reads as "them, on their absolute best day," never as altered.

SKIN — the star of this retouch (this is where the beauty lives — absolute):
- Both faces wear a professional camera-ready makeup base: poreless-smooth, perfectly even-toned skin with a dewy luminous glow — soft highlights on the cheekbones and nose bridge, a gentle healthy blush, a healthy warm undertone. Radiant and alive, never plastic, waxy, or matte-caked.
- Coverage is COMPLETE and UNIFORM across face and neck — one clean glowing tone, the way a top makeup artist finishes skin for a photoshoot. Completely remove blemishes, acne, redness, dark circles, and oiliness.
- GUARDRAIL: paint ZERO moles, dark spots, pigmentation, or marks of any kind anywhere on either face or neck — the flawless base has covered everything. Clean luminous skin only.
- Makeup reads age-appropriate and elegant: a female person — a luminous dewy base with soft brows and a soft rosy lip; a male person — clean, fresh, polished grooming. Never heavy, never garish.

THE RETOUCH PROMISE:
- Each result face must pass the side-by-side test with its own source — anyone who knows them names them instantly.
- Within that law, both people glow: perfect skin, perfect light, beautiful styling. Their reaction: "This is the best we've ever looked — and it's completely us."

RELIGHT COMPLETELY (the biggest transformation — this makes it look real):
- Discard the lighting of both original photos entirely. Re-light the two together with ONE unified, soft key light in the mood of THE SCENE below, with gentle fill — both faces equally luminous, no one in shadow, a delicate rim light in both people's hair. They must look truly photographed together in this place at this moment — and both faces must always stay BRIGHT.

COMPOSITION BASE — tight two-shot, faces first:
- The two are close together, framed from roughly the CHEST UP so both faces are as LARGE in the frame as possible. Both faces fully visible, unobstructed, angled toward the camera. Correct relative heights and body scale. Hands natural and relaxed — correct fingers. The warmth and pose follow THE SCENE below.`;
const COUPLE_SCENE = `THE SCENE — 커플 스튜디오 화보 (premium couple pictorial):
- The mood: a warm, romantic, premium couple photoshoot — the kind couples book for anniversaries and profile photos together.
- WARDROBE: a coordinated couple look in harmonious tones of soft white, cream, beige, and light denim-blue — neat knits, shirts, and blouses that flatter each person's build and confirmed gender. Elegant and timeless, like a high-end studio package. Never identical matching "couple uniform" prints, no visible logos or readable text.
- WARMTH: romantic closeness — leaning gently into each other, an arm softly around a shoulder, or hands lightly held; expressions warm, genuinely happy, a little in love. Natural and comfortable, never stiff, never staged.
- BACKDROP: a clean, timeless studio backdrop in a soft warm tone (light beige or warm ivory seamless paper) with gentle depth — classic, elegant, never busy.
- KEY LIGHT MOOD: bright, soft, romantic studio beauty light — warm and flattering.`;
const FINISH = (G1: string, G2: string) => `STEP 2 — FINAL ROLL CALL (before finishing):
Compare the finished portrait against the sources, check by check:
- Side by side with Image 1, is Person 1 instantly the same person — same eyes, same nose, same face, just glowing? Side by side with Image 2, is Person 2?
- GENDER CHECK: is Person 1 clearly ${G1} as confirmed? Is Person 2 clearly ${G2} as confirmed? A swap = failed edit.
- SKIN CHECK: do both faces and necks show one perfectly even, flawless luminous finish — zero moles, spots, or marks anywhere? If anything interrupts the clean finish, cover it before finishing.
- Exactly two people? Two faces still clearly different from each other? No blended features, no moved glasses? No one made younger or older?
Only when every check passes is the portrait complete.

FRAMING:
- A tight two-person portrait from roughly the chest up, both faces large and tack-sharp. Shot on an 85mm lens at f/2.8, the backdrop melting into soft creamy bokeh. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Rendering anyone's gender against the user's confirmation; swapping the two people's genders or styling.
- Reshaping ANY feature beyond the subtle jawline refinement: no enlarged eyes, no changed noses, no new face shapes — for anyone, at any age.
- Any mole, spot, or mark interrupting the flawless skin on either face or neck.
- Any face that fails the side-by-side test; blended, averaged, or swapped features; two faces converging into clones.
- Wrong headcount: a third person, a missing person, or a duplicate.
- Making anyone look younger or older than their source; a warped, over-liquified, or uncanny face.
- Removing, adding, duplicating, or transferring glasses. No sunglasses.
- Warped hands, extra or missing fingers, distorted arms where the two overlap.
- Plastic waxy skin, matte caked makeup, murky lighting, uneven shadows on one face, oversaturated HDR.
- Any text, letters, logos, watermark, or border.`;
function buildPrompt(g1: string, g2: string): string {
  return TWOSHOT_CORE(G(g1), G(g2)) + "\n\n" + COUPLE_SCENE + "\n\n" + FINISH(G(g1), G(g2));
}
async function generateCouple(image1DataUrl: string, image2DataUrl: string, gender1: string, gender2: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = buildPrompt(gender1, gender2);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "", "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: img1.mimeType, data: img1.data } },
            { inline_data: { mime_type: img2.mimeType, data: img2.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "couple"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[couple] model=${GEMINI_MODEL} g1=${gender1} g2=${gender2} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "couple"));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    const gender1: string = typeof body?.gender1 === "string" ? body.gender1 : "female";
    const gender2: string = typeof body?.gender2 === "string" ? body.gender2 : "male";
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateCouple(image1, image2, gender1, gender2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("couple error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
