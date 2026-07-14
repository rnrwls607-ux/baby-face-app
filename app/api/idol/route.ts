import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateIdol(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must still be unmistakably the SAME person, but FULLY TRANSFORMED by professional idol makeup, hair, and styling. The goal is "them, debuting as an idol" — a real person after 3 hours in a top agency's styling room — never a generic pretty idol face and never an existing celebrity. Transform through MAKEUP, HAIR, STYLING, and LIGHTING at full strength; NEVER by reshaping the facial features themselves.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a top K-pop entertainment company's profile photographer and chief stylist. Take the person in this photo and create their "idol debut profile" — the same person, styled and photographed like a K-pop idol.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and even their current grooming — the idol styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY FOUNDATION (what makeup must be built ON TOP OF, never instead of):
- The same face shape and width-to-length ratio, the same jawline and chin, the same cheekbone structure, the same eye SIZE and shape and eyelid type (double eyelid stays double, monolid stays monolid — style the monolid beautifully as monolid idols do), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow position, and the same spacing between all features. Keep the person's natural asymmetries.
- HARD LIMITS: do not enlarge the eyes, do not slim or sharpen the jaw, do not raise or narrow the nose, do not plump the lips, do not shift any facial proportion. Makeup may create the ILLUSION of definition (that is its job) — the underlying structure must not move.
- Keep the apparent age and sex characteristics.

FULL IDOL STYLING (go all in — this is the product):
- Makeup: complete, polished K-pop idol makeup that suits this person — flawless glowing "glass skin" base in their TRUE skin tone (correct source color cast; never lighten or darken their actual tone), defined eyeliner and idol-style eye makeup, softly shaded aegyo-sal if it suits them, groomed and shaped brows, gradient or full idol lip color, subtle face-definition shading and highlight done as visible MAKEUP.
- Hair: a trendy K-pop idol hairstyle and color that suits the person — restyling and recoloring the hair IS allowed and encouraged for this concept (clean salon-grade finish, natural hairline).
- Outfit: stylish stage-ready or photoshoot outfit (modern, tasteful — like an idol profile or album concept photo).
- Set: professional studio lighting with a clean, modern backdrop (soft solid tone or tasteful gradient); flawless but real skin texture — luminous, never plastic.
- Expression: confident, charming idol expression with presence; eyes engaged with the camera. Vertical upper-body framing.

FINAL SELF-CHECK before output: friends must react exactly like this — "no way, is that YOU?! You look like an idol!" It must be surprising (full transformation) AND instantly recognizable (same person). If it looks like a different person or a generic idol, the result is wrong.

Final look: photorealistic, high-resolution idol profile photography. No text, no watermark, no border. Remember the two absolute rules: the SAME facial structure underneath, FULL idol styling on top, inside the SAME fixed composition.`;
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
      "idol"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[idol] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "idol"));
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
  const dataUrl = `data:image/png;base64,${b64}`;
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateIdol(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("idol error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}