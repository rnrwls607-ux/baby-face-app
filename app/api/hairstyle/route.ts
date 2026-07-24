import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
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
async function generateHairstyle(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the master visualization artist of Seoul's top hair salon — clients preview a new hairstyle on THEIR OWN face before committing at the salon. Take the person in the photo and show them with a fresh, trendy new hairstyle.

FACE LOCK — the whole point of this preview (highest priority):
- Keep the person's face EXACTLY as it is: same face shape, same jawline, same eyes, nose, and mouth, same facial proportions. Do NOT slim, enlarge, reshape, or structurally beautify the face in ANY way — they must be able to judge how this haircut suits THEIR real face.
- ONLY the hair changes.

SURFACE POLISH (allowed — structure untouched):
- Clean, flattering skin: even-toned, fresh, blemish-free with a healthy natural glow — like a good-skin day. Keep believable real skin texture, never plastic.
- Bright, well-rested eyes; healthy natural color. No structural change to any feature.

GLASSES RULE (check the input, then follow exactly):
- IF wearing glasses: keep exactly ONE pair — their own frames, same shape and color, clean clear lenses. The new hair must be styled naturally around the glasses.
- IF not wearing glasses: do not add any.
- Never two pairs, never duplicated eyewear.

THE NEW HAIR — the star of this image:
- A trendy, modern Korean salon hairstyle that genuinely suits this person's face shape and vibe — natural texture, realistic volume, and a believable hairline that blends seamlessly with their face and the lighting.
- Render the hair in crisp realistic detail: natural strands, healthy shine, soft movement. It must look like real hair after a great salon visit — never a wig.

RELIGHT — clean salon light:
- Soft, even, flattering studio-like lighting on the face and hair; a simple clean neutral background so nothing distracts from the hairstyle.

FRAMING:
- Vertical portrait, head-and-shoulders, the full hairstyle visible including the ends. Photorealistic, high resolution.

ABSOLUTELY AVOID:
- ANY change to face structure, proportions, or features; ANY slimming or reshaping.
- A warped or unnatural hairline; wig-like or helmet-like hair; a dated style that ages them.
- Removing/adding/duplicating glasses. No sunglasses.
- Plastic skin, harsh lighting, busy backgrounds.
- Any text, letters, watermark, or border. No other people.`;
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
      "hairstyle"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[food] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "hairstyle"));
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
  // 📐 인물 프로필: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateHairstyle(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("hairstyle error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("hairstyle", 0, handler); // COIN_DORMANT: 실가격 3
