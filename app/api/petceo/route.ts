import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 150; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetceo(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the input pet photo into a hilarious yet premium "CEO at the office" portrait — THIS pet as a dignified company chairman, photographed like an executive profile for a corporate magazine. The comedy comes from the situation being played completely straight: flawless executive styling, serious boardroom atmosphere, and one very important pet in charge.

PET IDENTITY (absolute):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. The owner must instantly recognize their baby behind the big desk.
- Freshly groomed and sharp: clean healthy coat with natural shine, bright confident eyes, a composed dignified expression natural to this animal (a calm self-assured gaze — the look of someone who owns the building).

BODY TRUTH (critical — the anthropomorphism line):
- The pet keeps its OWN natural animal body, proportions, and posture. It sits ON a luxurious executive chair the way a real animal sits — upright and proud on its haunches, front paws resting naturally on the desk edge or chair.
- NEVER a human body with a pet head, never human arms or hands, never standing on two legs, never human-like shoulders under the suit.

EXECUTIVE STYLING (tailored, natural, never covering the face):
- A sharp executive look fitted naturally to its animal form: a crisp white collar with a neat dark necktie OR a small tailored suit-vest draped comfortably over its chest and shoulders — clearly premium pet-wear, sitting naturally on its anatomy, never distorting the body.
- Optionally a pair of thin elegant glasses perched charmingly on its nose — small, never hiding the eyes. Nothing on the head. Ears fully free.
- If the pet wears its own collar in the source, it may remain beneath the styling.

THE OFFICE SET — top-floor chairman's suite:
- A luxurious executive office: a massive dark-wood desk in front of the pet, a high-backed leather chair behind it, floor-to-ceiling windows with a soft-blurred city skyline in golden late-afternoon light, warm wood and brass tones.
- On the desk, a few tasteful props at a comfortable distance: a closed leather notebook, a classic pen, a small potted plant, perhaps a coffee cup. All papers are BLANK; any screens or monitors face away or stay out of frame.
- The scene is elegant and minimal — a magazine-shoot office, never cluttered. The pet is the undisputed center, face large and clearly lit.

TEXT BAN (critical — offices tempt the model everywhere):
- Absolutely NO letters or numbers anywhere: no nameplates, no engraved desk signs, no documents with writing, no whiteboards, no book titles, no monitor screens with content, no logos on anything. If a spot begs for lettering (a nameplate, a certificate), replace it with a plain object or leave it clean.

LIGHT & FINISH:
- Warm, soft, executive-portrait lighting: the pet's face perfectly lit against the glowing window light, a gentle rim on the fur, cinematic shallow depth of field on the skyline.
- Photorealistic premium corporate-portrait photography: crisp fur and fabric detail. NOT a cartoon, NOT an illustration.
- Vertical portrait framing — the pet at the desk, chest-up emphasis, face large and central.

SELF-CHECK before finishing:
- Side by side with the input: exactly the same pet — markings in the same places, same face? Its own animal body on the chair — zero human anatomy? Styling natural, face and ears fully visible? All papers blank, zero letters or numbers anywhere? Premium magazine look, not a cheap meme collage? Only then is the portrait complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or marking placement.
- A human or humanoid body; human hands; standing on two legs; suit shoulders shaped like a person.
- Any letters, numbers, documents with writing, nameplates, logos, or readable screens.
- A big hat or anything covering ears/eyes; costumes distorting anatomy; extra or missing paws or tails.
- Cheap meme collage look; cluttered desk; harsh lighting; cartoon/illustration style; plastic fur.
- Watermarks, borders.`;
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
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "petceo"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 140초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petceo] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petceo"));
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
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetceo(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petceo error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}