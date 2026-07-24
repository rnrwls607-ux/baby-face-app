import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateIllust(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — every subject must be instantly recognizable in the illustration: the same person(s)/pet(s), just drawn. Simplify the RENDERING, never the IDENTITY.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same crop, same poses, same positions. Nothing moves, nothing is added, nothing is removed.

Transform this photo into a premium hand-drawn digital illustration, keeping the original scene and every subject's identity intact.

STEP 1 — Read the photo first:
Identify what is in the image (a single person, a couple, a group, a pet/animal, a landscape, or an object) and illustrate it accordingly. Keep the exact same number of subjects — never add or remove anyone.

STEP 2 — Preserve composition (do not move anything):
- Keep the same composition, camera angle, framing, crop, and every pose.
- Each subject must stay in the exact same position as in the original photo.

STEP 3 — Preserve identity (MOST IMPORTANT):
- For each person, keep their recognizable likeness: the same face shape and width-to-length proportions, the same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), the same nose and mouth impression, the same hairstyle and hair color, the same expression, and the same outfit — so they are unmistakably the same person, just illustrated.
- FACES GET THE HIGHEST DETAIL: backgrounds may be simplified into clean illustrated shapes, but faces must keep enough drawn detail to stay clearly recognizable. Never let the illustration style blur, average, or "prettify" a face into a generic character.
- Keep each person's natural asymmetries and distinctive cues (dimples, beauty marks that exist in the source) — and do not invent new ones.
- When several people are present, illustrate each one from their own face. NEVER blend, swap, or average features between different people.
- For pets, keep the same breed, fur color/pattern, and markings.

STEP 4 — Apply the illustration style:
- Clean, confident line work with consistent weight.
- Soft painterly shading with smooth cel-style gradients and gentle, warm directional lighting.
- A harmonious, slightly warm color palette with clear soft highlights.
- The polished look of a high-end webtoon, animation key visual, or modern editorial illustration — charming, refined, and intentional.
- Simplify busy background details into clean illustrated shapes, while keeping the location clearly recognizable.

ABSOLUTELY AVOID:
- 3D render / CGI / plastic look.
- Childish doodle, chibi, caricature, or distorted proportions.
- A cheap photo filter — no leftover photographic textures, noise, or realism.
- Any text, letters, watermark, signature, frame, or border.

FINAL SELF-CHECK before output: someone who knows the people in the photo must instantly recognize each of them in the illustration. If any face reads as a generic character, the result is wrong.

Final result: one cohesive, hand-crafted digital illustration with no photo textures remaining. Remember the two absolute rules: same identities, same composition — only the medium changes.`;
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
      "illust"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[illust] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "illust"));
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
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateIllust(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("illust error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("illust", 0, handler); // COIN_DORMANT: 실가격 3
