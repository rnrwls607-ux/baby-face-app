import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetroyal(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the input pet photo into a majestic classical royal oil painting portrait — THIS pet as a beloved monarch, painted by a Renaissance court master. The result must feel like a genuine oil painting on canvas, worthy of a gilded frame in a palace gallery, AND the owner must recognize their own pet at first glance. Identity survives the style — that is the whole craft.

PET IDENTITY THROUGH THE PAINTING (most important):
- The painted pet is the EXACT pet from the input photo: same species, same breed, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face impression — all faithfully translated into painted form.
- Stylize the RENDERING, never the IDENTITY: fur may become masterful brushwork, but every patch, stripe, spot, and color stays exactly where it is on THIS animal.
- BODY TRUTH: the pet keeps its OWN natural animal body, proportions, and posture — a real pet sitting regally. NEVER a human body with a pet head, never anthropomorphic arms or posture.
- The owner's test: "someone painted a museum masterpiece of MY baby" — never "a generic royal animal."

OIL PAINTING STYLE (commit fully — this must read as a PAINTING, not a photo):
- Classical European court-portrait technique: visible confident oil brushstrokes, subtle canvas texture, rich layered glazes, a soft varnish glow.
- Chiaroscuro lighting: a warm master light sculpting the face against a deep, dark atmospheric background — like an old-master portrait hall.
- Palette: deep regal tones — burgundy, forest green, umber shadows — with warm golden highlights. Dignified, not gaudy.
- NOT a photograph, NOT a photo filter, NOT 3D render, NOT anime or cartoon — a true classical painting throughout.

ROYAL STYLING (elegant, never covering the pet):
- Drape the pet in a luxurious royal velvet cape or mantle in deep red or royal blue with gold embroidery and a soft fur trim, fitted NATURALLY over its own shoulders and back — comfortable, believable, never distorting its anatomy.
- A small elegant golden crown sits lightly on its head, tilted charmingly to one side — small enough that the ears, eyes, and entire face stay fully visible. Never a helmet, never anything shadowing the face.
- Optionally a fine jeweled collar or medallion chain. Nothing else — regal restraint.

COMPOSITION — a portrait made to be framed:
- Classic royal portrait framing: the pet seated proudly, chest up and head high, filling most of the frame, face turned toward the viewer with calm dignified eyes (and its natural charm — a dog's gentle warmth, a cat's serene poise).
- Background: a dark palace atmosphere — deep drapery folds, the faint suggestion of a column or warm candlelight glow — soft and painterly, never busy, never competing with the pet.
- Vertical portrait format with balanced margins, ready to hang on a wall.

TEXT & CREST BAN (critical — royal portraits tempt the model here):
- Absolutely NO nameplates, NO plaques, NO letters, NO Latin inscriptions, NO monograms, NO writing on medallions or crests, NO signatures, anywhere. Any heraldic or decorative element must be purely pictorial — never containing characters. If a corner feels empty, deepen the atmosphere instead.

SELF-CHECK before finishing:
- Side by side with the input: is this unmistakably the SAME pet — same markings in the same places, same face? Its own animal body, not humanoid? Does it read as a genuine oil painting (brushwork, canvas, chiaroscuro), not a photo? Crown small and face fully visible? Zero letters, plaques, or inscriptions anywhere? Only then is the painting complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, coat colors, or marking placement.
- A human or humanoid body under the pet's head; standing on two legs; human hands.
- Photographic textures, photo-filter look, 3D render, cartoon or anime style.
- A large crown covering ears or face; helmets; costume elements distorting anatomy; extra or missing paws or tails.
- Any text, letters, inscriptions, nameplates, monograms, or signatures.
- Gaudy oversaturated colors; cluttered background; watermarks, borders.`;
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
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: ctrl.signal,
      },
      "petroyal",
      0 // ★재시도 없음 — Pro 생성은 1회 100~200초라 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petroyal] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petroyal", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petroyal] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petroyal] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    const output = await generatePetroyal(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petroyal error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}