import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const BASE_RULE = `TASK
Transform the input pet photo into an adorable premium costume portrait — THIS pet dressed in the complete outfit described below, photographed like a luxury pet studio's costume package. Charming, polished, and unmistakably the owner's own pet.

PET IDENTITY (absolute):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. The owner must gasp "that's OUR baby" at first glance.
- COAT COLOR LOCK (critical): reproduce the pet's EXACT natural coat color at its real brightness and saturation. The costume, clothing, background, and lighting colors must NEVER bleed into or tint the fur. A gray or blue-gray coat (British Shorthair, Russian Blue, Chartreux, Korat, silver tabby) stays a natural cool GRAY — NEVER turned vivid blue. A cream coat stays cream, white stays white, black stays black, orange stays orange, brown stays brown. Any artistic or painting style may add soft shading, but must NEVER shift the actual hue of the fur away from its real-life color — the fur keeps its true color while the outfit and scene keep theirs.
- Freshly groomed: clean, fluffy, healthy coat with natural shine, bright sparkling eyes, a happy relaxed expression natural to this animal. Groom and brighten ONLY — never alter breed traits, markings, colors, or proportions.

BODY TRUTH (critical):
- The pet keeps its OWN natural animal body, proportions, and posture — sitting or lying the way a real animal does. NEVER a human body with a pet head, never human arms, never standing on two legs.

FULL COSTUME LAW (critical):
- Dress the pet in the COMPLETE outfit described below — covering chest, back, and shoulders as tailored premium pet-wear, properly and fully worn, not just a single accessory. It fits naturally over the anatomy: comfortable, believable, never tight, never distorting the body.
- HAT GRAMMAR: any hat, crown, or headpiece sits small and lightly BETWEEN or BEHIND the ears, tilted charmingly back — both eyes and BOTH ears stay fully visible at all times. If it would cover the ears, tilt it further back or make it smaller.
- If the pet wears its own collar in the source, it may remain beneath the costume; never remove it, never add unlisted accessories.

TEXT BAN:
- Absolutely NO letters or numbers anywhere: no writing on patches, tags, or props — all patches and emblems are plain shapes only. If a spot begs for lettering, leave it plain.

LIGHT & FINISH:
- Premium soft studio lighting suited to the scene below — the pet's face perfectly lit, a delicate rim light on the fur.
- Photorealistic, high resolution, sharp fur detail, gentle depth of field. NOT a cartoon, NOT an illustration.
- Vertical portrait framing centered on the pet, face large and clear.

SELF-CHECK before finishing:
- Same pet as the input — markings in the same places, same face? Own animal body? Costume COMPLETE and properly worn (not one accessory)? Headpiece small, both eyes and ears fully visible? Zero letters anywhere? Premium studio look? Only then complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or marking placement; a human or humanoid body; two-legged standing.
- A half-worn outfit or a lone accessory instead of the full costume; anything covering ears or eyes; distorted anatomy.
- Any letters, numbers, or lettered patches; cheap costume-party look; cartoon style; plastic fur; extra or missing paws, ears, tails; watermarks, borders.`;
const COSTUME_PROMPTS: Record<string, string> = {
  royal: `${BASE_RULE}

THE COSTUME — royal:
- A miniature royal outfit worn completely: a rich velvet cape in deep red or royal blue with gold trim and soft fur edging, draped fully over chest, back, and shoulders; a small jeweled crown per the HAT GRAMMAR; optionally a fine jeweled collar.
- SCENE: a grand palace studio set — deep warm drapery, a hint of gold, soft regal lighting. Majestic but adorable.`,
  hanbok: `${BASE_RULE}

THE COSTUME — hanbok:
- An adorable well-fitted pet hanbok worn completely: a luminous silk jeogori with bright saekdong (rainbow-striped) sleeves covering chest and back, neatly tied goreum; optionally a tiny traditional hat per the HAT GRAMMAR.
- SCENE: a tasteful traditional Korean studio set — warm hanji tones, subtle dancheong accents, soft festive lighting. Like a Lunar New Year greeting photo.`,
  santa: `${BASE_RULE}

THE COSTUME — santa:
- A cozy Santa outfit worn completely: a soft red suit or cape with white fluffy trim covering chest, back, and shoulders, with a matching belt detail; a little Santa hat per the HAT GRAMMAR.
- SCENE: a warm Christmas studio set — a softly blurred tree with golden fairy lights, wrapped plain gifts, cozy bokeh. Joyful holiday warmth.`,
  wizard: `${BASE_RULE}

THE COSTUME — wizard:
- An enchanting wizard outfit worn completely: a flowing wizard robe with subtle star-and-moon shapes (plain shapes, no characters) covering chest and back; a pointed wizard hat per the HAT GRAMMAR; a small magic wand resting beside its paws.
- SCENE: a magical study — old books (blank spines), warm candlelight, soft floating light particles. Whimsical and enchanting.`,
  astronaut: `${BASE_RULE}

THE COSTUME — astronaut:
- A well-fitted white astronaut suit worn completely over chest, back, and shoulders, with plain shape patches only; the helmet is OFF, resting beside the pet, so the full face and both ears stay clearly visible.
- SCENE: a clean spacecraft interior or a starry space backdrop with soft cinematic lighting. Adventurous and adorable.`,
};
async function generatePetcostume(imageDataUrl: string, costume: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = COSTUME_PROMPTS[costume] || COSTUME_PROMPTS.royal;
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
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "petcostume"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petcostume] model=${GEMINI_MODEL} costume=${costume} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petcostume"));
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
  // 📐 펫 코스튬: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const costume: string = typeof body?.costume === "string" ? body.costume : "royal";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetcostume(image, costume);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petcostume error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}