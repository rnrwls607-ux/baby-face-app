import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 150; // Pro 추론형 대응 — Fluid Compute 전제 (실측 로그로 확인)
// 2인 라인 Wave 2 — 나노바나나 Pro (2인 CORE 기준 원본 = couple, 공식 수정 시 couple 고치고 재이식)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
// 성별은 사용자 확정값("female"|"male") → 프롬프트 표기(FEMALE|MALE)
const G = (g: string) => (g === "male" ? "MALE" : "FEMALE");
const TWOSHOT_CORE = (G1: string, G2: string) => `TASK
You are RETOUCHING two real photographs of two real people — NOT generating new people. You are given 2 input images: Image 1 shows Person 1, Image 2 shows Person 2. These two people came to Seoul's most famous premium photo studio TOGETHER for the pictorial described in THE SCENE below. Your craft as the studio's master retoucher: everyone walks out looking like THEMSELVES on the best day of their life — flawless skin, perfect light, beautifully styled — visibly upgraded, never altered. Edit their photos into ONE single stunning portrait of the two of them together. THE HIGHEST PRIORITY, above everything else: each output face must be instantly recognizable as the SAME person side by side with their own source image. The output must be THESE two specific people — never a generic stock model face.

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
- HAIR IDENTITY LAW: each person keeps their OWN hair — same color, same length category, same overall silhouette as their source. Styling may polish, add shine, and softly arrange THEIR hair for the scene, but NEVER a different haircut, NEVER a dramatic updo, NEVER added hairpieces or ornaments. Hair is part of identity — if the hair silhouette changes, the person stops looking like themselves.
- AGE LAW (one rule for everyone): each person's age impression stays their own — a younger person looks fresh and well-rested (never older), an older person stays gracefully and clearly their own generation (never made younger). Elegantly gray hair stays elegantly gray, beautifully styled.
- GLASSES per person: if a person wears glasses in their input, they wear the SAME glasses (same frames) — exactly one pair, worn normally. If they don't, add none. Never move glasses between the two, never duplicate a pair.

FACE — one standard for everyone (no modes):
1. SMALL FACE: slim each person's OWN jawline into a soft, elegant version of itself — reduce cheek fullness and facial width so each face reads about 10% smaller and more compact than their input, with clean head-to-shoulder proportions. A refinement of THEIR jaw, never a new jaw — their face shape remains unmistakably theirs. For a visibly older person, apply this gently — refined and lifted, never artificially tight.
2. EYES: SAME size, SAME shape, SAME eyelid type as the source — enhanced only through light and freshness: bright, awake, lively, with clean sparkling catchlights (clearly visible through lenses if they wear glasses).
3. CONTOURS: softly lifted, youthful contours and a clean jaw-to-neck line with no double chin — for both.
4. NOSE & MOUTH LOCKED: nose, mouth, and overall facial proportions stay EXACTLY as in each person's source — no reshaping of any other feature, for anyone, at any age.
5. HARMONY: every adjustment blends into ONE natural, harmonious face per person — the "expensive photoshop" look, never warped, stretched, or uncanny.

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
const SCENES: Record<string, string> = {
  jeju: `THE SCENE — 제주 여행 (Jeju island couple snap):
- The mood: a bright, breezy couple travel snap on Jeju — the photo that makes everyone ask "who took this for you?"
- WARDROBE: fresh comfortable travel looks in light tones — soft knits, linen shirts, a breezy dress or clean casual layers that flatter each person's build and confirmed gender; coordinated, never matching uniforms, no visible logos or readable text.
- WARMTH: romantic and playful — walking close, a light arm around, leaning in laughing; expressions bright and carefree.
- BACKDROP: golden Jeju scenery softly blurred — a canola flower field or a coastal path with the sea sparkling behind, warm afternoon light.
- KEY LIGHT MOOD: bright, warm natural sunlight — both faces glowing.`,
  europe: `THE SCENE — 유럽 여행 (European old town):
- The mood: a romantic stroll through a European old town — honeymoon-photo energy.
- WARDROBE: effortlessly chic travel looks — a light trench or knit, clean tones that flatter each person's confirmed gender; coordinated, no logos or readable text.
- WARMTH: romantic and unhurried — arm in arm or hands lightly joined, soft smiles or a candid laugh.
- BACKDROP: a honey-toned old-town alley — stone facades, cafe awnings, warm shutters melting into soft bokeh. All signage abstract: NO readable text anywhere.
- KEY LIGHT MOOD: soft golden morning light — both faces bright and warm.`,
  beach: `THE SCENE — 해변 리조트 (tropical beach):
- The mood: a glowing vacation snap at a tropical resort beach.
- WARDROBE: light resort wear — a breezy shirt or linen set, a flowing summer dress or clean shorts-and-shirt, per each person's confirmed gender; relaxed and tasteful, never revealing, no logos.
- WARMTH: sun-soaked and affectionate — standing close in the breeze, laughing, an arm gently around.
- BACKDROP: white sand and turquoise water sparkling into bokeh, palm fronds framing soft golden-hour light.
- KEY LIGHT MOOD: warm golden-hour sun — both faces luminous, never squinting-harsh.`,
  citynight: `THE SCENE — 도시 야경 (city night blue hour):
- The mood: a cinematic night-city couple snap — blue hour, warm lights, movie-poster romance.
- WARDROBE: polished evening-casual — a clean jacket or coat, refined tones per each person's confirmed gender; sleek, no logos or readable text.
- WARMTH: close and cinematic — side by side against the glow, or turned toward each other smiling softly.
- BACKDROP: a skyline and warm street lights melting into deep blue-and-amber bokeh. All signs abstract: NO readable text anywhere.
- CRITICAL LIGHTING: both faces stay BRIGHT — a soft flattering key as if lit by a warm storefront glow, delicate rim light in the hair; glass skin glowing against the night, never murky, never hidden in shadow.`,
};
const FINISH = (G1: string, G2: string) => `STEP 2 — FINAL ROLL CALL (before finishing):
Compare the finished portrait against the sources, check by check:
- Side by side with Image 1, is Person 1 instantly the same person — same eyes, same nose, same face, SAME hair silhouette, just glowing? Side by side with Image 2, is Person 2?
- GENDER CHECK: is Person 1 clearly ${G1} as confirmed? Is Person 2 clearly ${G2} as confirmed? A swap = failed edit.
- SKIN CHECK: do both faces and necks show one perfectly even, flawless luminous finish — zero moles, spots, or marks anywhere? If anything interrupts the clean finish, cover it before finishing.
- Exactly two people? Two faces still clearly different from each other? No blended features, no moved glasses? No one made younger or older?
Only when every check passes is the portrait complete.

FRAMING:
- A tight two-person portrait from roughly the chest up, both faces large and tack-sharp. Shot on an 85mm lens at f/2.8, the backdrop melting into soft creamy bokeh. Photorealistic, high resolution.

ABSOLUTELY AVOID (equally important):
- Replacing either face with a generic stock-model face — the output must be THESE two people.
- Changing anyone's haircut, hair length, or hair color; any added hairpieces, ornaments, or dramatic updos.
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
function buildPrompt(g1: string, g2: string, scene: string): string {
  return TWOSHOT_CORE(G(g1), G(g2)) + "\n\n" + (SCENES[scene] || SCENES.jeju) + "\n\n" + FINISH(G(g1), G(g2));
}
async function generateCoupletravel(image1DataUrl: string, image2DataUrl: string, gender1: string, gender2: string, scene: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = buildPrompt(gender1, gender2, scene);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 140000);
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
      "coupletravel"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 140초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[coupletravel] model=${GEMINI_MODEL} g1=${gender1} g2=${gender2} scene=${scene} status=${res.status} ${Date.now() - t0}ms`);
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
    const scene: string = typeof body?.scene === "string" ? body.scene : "jeju";
    if (!image1 || !image2) return NextResponse.json({ error: "두 사람의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generateCoupletravel(image1, image2, gender1, gender2, scene);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("coupletravel error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
