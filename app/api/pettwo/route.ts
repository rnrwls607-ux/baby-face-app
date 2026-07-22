import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePettwo(image1DataUrl: string, image2DataUrl: string): Promise<string> {
  const img1 = parseImage(image1DataUrl);
  const img2 = parseImage(image2DataUrl);
  const prompt = `TASK
You are RETOUCHING two real photographs of two real pets — NOT generating new animals. You are given 2 input images: Image 1 shows Pet 1, Image 2 shows Pet 2. These two pets live in the same loving home, and their owner booked them a premium pet studio session TOGETHER. Edit their photos into ONE single adorable studio portrait of the two pets side by side. THE HIGHEST PRIORITY, above everything else: each pet in the output must be instantly recognizable as the SAME animal side by side with its own source image — the owner must gasp "that's MY two babies in one photo."

STEP 1 — ROLL CALL (do this before generating anything):
Study each input image and build a locked identity profile:
- Pet 1 = the animal in Image 1. Note its species (dog or cat), breed, size, coat color, fur length and texture, distinctive markings and their EXACT placement, ear shape, eye color, muzzle shape, and whether it wears a collar or accessory.
- Pet 2 = the animal in Image 2. Same detailed profile.
These two profiles are LOCKED. Each pet you render is an EDIT of its own source animal — never a new invention, never influenced by the other pet.

PET IDENTITY LAW — the absolute rules (never violate):
- EXACTLY two pets: Pet 1 and Pet 2 — each appearing exactly once. Never add, remove, duplicate, or merge any animal. No extra animals, no people.
- Each pet is rendered from ITS OWN source image alone: the SAME species, SAME breed, SAME size impression, SAME coat color, SAME markings in the SAME places, SAME ear shape, SAME eye color, SAME face. NEVER mix, blend, swap, or average colors, patterns, or features between the two pets.
- ANTI-CLONE RULE: if the two pets are the same breed or look similar, they must remain exactly as DIFFERENT from each other as they are in the sources — each keeps its own unique markings, face, and size. Never render two copies of one pet.
- SIZE TRUTH: keep the true relative size between the two (a large dog stays clearly larger than a cat; two similar-sized pets stay similar). Never shrink or grow either pet.
- COLLAR RULE per pet: if a pet wears a collar or accessory in its source, keep the SAME one; if not, add nothing. Never move an accessory between the two.

GROOMING — their cutest selves, still themselves:
- Both pets look like they just left the best groomer in Seoul: clean, fluffy, healthy coats with natural shine, bright clear eyes, relaxed happy expressions natural to each animal (a gentle open-mouth smile for a dog, calm bright-eyed poise for a cat — whatever suits each pet).
- Groom and brighten ONLY — never alter breed traits, markings, coat colors, or proportions. No costumes, no bows, no added accessories.

RELIGHT COMPLETELY (this makes it look real):
- Discard the lighting of both original photos entirely. Re-light the two pets together with ONE unified, bright, soft premium studio key light with gentle fill — both faces equally luminous, a delicate rim light on both coats. They must look truly photographed together in this studio at this moment.

COMPOSITION — tight two-pet portrait, faces first:
- The two pets sit or lie close together, side by side — naturally cozy, like two companions who share a home. If sizes differ a lot, the smaller pet sits slightly forward or beside the larger one so BOTH faces stay equally large and clear.
- Framed close so both faces are LARGE in the frame; both faces fully visible, unobstructed, turned toward the camera. Neither pet covers the other's face. Clean natural paw and body positions — correct anatomy, no tangled limbs or merged fur where they touch.

THE SCENE — premium pet studio:
- A clean, timeless pet-studio backdrop in a soft warm tone (light beige or warm ivory seamless paper) with gentle depth, a soft cushion or low bench if it helps the pose — classic, elegant, never cluttered. Nothing competes with the two faces. Completely TEXT-FREE.

STEP 2 — FINAL ROLL CALL (before finishing):
Compare the finished portrait against the sources, check by check:
- Side by side with Image 1, is Pet 1 the exact same animal — same breed, same coat, same markings? Side by side with Image 2, is Pet 2?
- Exactly two pets? No blended colors or swapped patterns? True relative sizes? Clean boundaries where their fur meets — no merging?
- Both faces large, bright, and fully visible? Correct paws, ears, and tails — nothing extra, nothing missing?
Only when every check passes is the portrait complete.

FRAMING:
- A tight two-pet portrait, both faces large and tack-sharp. Shot on an 85mm lens at f/2.8, the backdrop melting into soft creamy bokeh. Photorealistic, high resolution, crisp fur detail.

ABSOLUTELY AVOID:
- A different breed, coat color, size, or marking pattern on either pet; generic "cute pets" replacing THESE pets; two clones of one pet.
- Wrong headcount: a third animal, a missing pet, a duplicated pet, or any person.
- Blended or swapped fur colors and patterns; fur melting together where the two touch; extra or missing paws, ears, or tails.
- Costumes, bows, or accessories not in the sources; moved collars.
- A cartoon or illustrated look; plastic fake fur; murky lighting; one pet in shadow.
- Any text, letters, logos, watermark, or border.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
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
      "pettwo",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[pettwo] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "pettwo", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[pettwo] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[pettwo] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image1: string = body?.image1;
    const image2: string = body?.image2;
    if (!image1 || !image2) return NextResponse.json({ error: "두 아이의 사진을 모두 올려주세요." }, { status: 400 });
    const output = await generatePettwo(image1, image2);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("pettwo error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}