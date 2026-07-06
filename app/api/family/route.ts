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
async function generateFamily(imageDataUrls: string[]): Promise<string> {
  const imgs = imageDataUrls.map(parseImage);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. EVERY IDENTITY IS LOCKED INDIVIDUALLY — each person's face must exactly match their own source image, judged one by one. Treat this as ${imgs.length} separate identity-preservation jobs happening in one photo: NEVER mix, blend, average, or swap features between ANY two people. Real family members may naturally resemble each other, but each face must be built ONLY from its own source photo — never nudged toward a "family average." Exactly ${imgs.length} people appear, each exactly once: never add, remove, or duplicate anyone.
2. COMPOSITION — the output is ALWAYS one vertical family portrait with all ${imgs.length} people clearly visible from the waist up, every face unobstructed, at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Each of the ${imgs.length} input images shows ONE member of the same family. Create ONE single photorealistic family studio portrait showing ALL ${imgs.length} of them together in the same photo.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle). Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.

PER-PERSON IDENTITY LOCK (apply to EACH of the ${imgs.length} people separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries.
- AGE IS PART OF IDENTITY: keep each person's apparent age exactly — children stay children at their real age, adults stay their age, seniors stay seniors. Never de-age a grandparent or age up a child.
- Keep each person's TRUE skin tone individually (correct source color casts per person; family members' tones may differ — never unify them).
- Clean natural skin on everyone — do not invent moles or blemishes on anyone; treat shadows, contrast edges, and compression noise as clean skin.

ANTI-BLEND (the #1 failure mode as the group grows):
- The more people in the frame, the stronger the pull toward averaged, similar faces — resist it completely. Each face keeps its own distinct structure, and realistic height/build/age differences between members stay true.

Family studio styling:
- A premium family photo studio shoot: coordinated neat outfits in harmonious tones that suit each person (age-appropriate for children and seniors), natural warm family poses — standing/sitting close together, arms around shoulders, taller members naturally behind or beside shorter ones.
- Clean studio backdrop in a soft tasteful tone, professional soft lighting, gentle depth of field.
- Warm, happy, natural expressions on everyone, eyes toward the camera.
- If hands are visible (arms around shoulders, holding hands), render every hand naturally with the correct number of fingers; if a gesture would look awkward or tangled between people, simplify it.

FINAL SELF-CHECK before output: count the people — exactly ${imgs.length}. Then go face by face: covering everyone else, each person's own family must instantly say "that's them." If the count is wrong, or any face reads as a stranger or a blend of relatives, the result is wrong.

Vertical framing with every person clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: ${imgs.length} people, each exactly themselves, inside the fixed waist-up composition.`;
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
            ...imgs.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } })),
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
  console.log(`[family] model=${GEMINI_MODEL} n=${imgs.length} status=${res.status} ${Date.now() - t0}ms`);
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
  // 📐 커플·가족: 4:5 세로 비율로 크롭
  return await cropToRatio(dataUrl, 4, 5);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const images: string[] = Array.isArray(body?.images) ? body.images.filter(Boolean) : [];
    if (images.length < 2) return NextResponse.json({ error: "가족 사진을 두 장 이상 올려주세요." }, { status: 400 });
    if (images.length > 4) return NextResponse.json({ error: "사진은 최대 4장까지 가능해요." }, { status: 400 });
    const output = await generateFamily(images);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("family error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}