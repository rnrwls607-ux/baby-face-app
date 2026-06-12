import { NextRequest, NextResponse } from "next/server";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const BASE_RULE = `CRITICAL — keep the exact same pet: same breed, same fur color and
patterns, same unique markings, same eye color, same face. The owner must
instantly recognize their own pet. Do NOT change the pet into a different
animal or a different individual. The costume must fit the pet naturally
and look comfortable — never distorted anatomy.
Vertical portrait framing centered on the pet, premium studio lighting.
Photorealistic, high resolution, sharp fur detail. No text, no watermark,
no border.`;
const COSTUME_PROMPTS: Record<string, string> = {
  royal: `You are a luxury pet costume photographer. Take the pet in this photo
and dress them as adorable royalty — a tiny king, queen, prince, or
princess.
${BASE_RULE}
Costume: an elegant miniature royal outfit — a velvet cape with gold
trim, a small jeweled crown sitting naturally on their head, and a regal
collar. Background: a grand palace-style studio set with rich drapery in
deep warm tones. Majestic but cute mood.`,
  hanbok: `You are a luxury pet costume photographer. Take the pet in this photo
and dress them in a beautiful traditional Korean hanbok.
${BASE_RULE}
Costume: an adorable well-fitted pet hanbok with bright traditional
colors (saekdong sleeves or elegant silk), optionally a tiny traditional
hat. Background: a tasteful traditional Korean studio set with hanji
tones and subtle dancheong accents. Festive holiday mood, like a Lunar
New Year greeting photo.`,
  santa: `You are a luxury pet costume photographer. Take the pet in this photo
and dress them in a cozy Santa Claus outfit.
${BASE_RULE}
Costume: a soft red Santa suit or cape with white fluffy trim and a
little Santa hat sitting naturally on their head. Background: a warm
Christmas studio set — tree with fairy lights, gifts, soft golden bokeh.
Cozy, joyful holiday mood.`,
  wizard: `You are a luxury pet costume photographer. Take the pet in this photo
and dress them as an adorable little wizard.
${BASE_RULE}
Costume: a tiny wizard robe and a pointed wizard hat that fits naturally,
with subtle star or moon details; optionally a small magic wand prop
beside them. Background: a magical study with old books, candles, and
soft floating light particles. Whimsical, enchanting mood.`,
  astronaut: `You are a luxury pet costume photographer. Take the pet in this photo
and dress them as a cute astronaut.
${BASE_RULE}
Costume: a well-fitted white astronaut suit with mission patches; the
helmet is OFF or worn open so the pet's full face stays clearly visible.
Background: a clean spacecraft interior or starry space backdrop with
soft cinematic lighting. Adventurous, adorable mood.`,
};
async function generatePetcostume(imageDataUrl: string, costume: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = COSTUME_PROMPTS[costume] || COSTUME_PROMPTS.royal;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(
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
      }
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 50초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petcostume] model=${GEMINI_MODEL} costume=${costume} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error("Gemini 오류 " + res.status + ": " + (await res.text()).slice(0, 300));
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