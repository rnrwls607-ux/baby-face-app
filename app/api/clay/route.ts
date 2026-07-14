import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateClay(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — every person, baby, or pet must be instantly recognizable in clay form: the same face, hairstyle, expression, and outfit, lovingly hand-sculpted. Translate the MATERIAL into clay, never the IDENTITY. The rounded clay charm comes from the surface and texture — never from erasing what makes this individual look like themselves.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same poses, same positions, rebuilt as a miniature clay set. Nothing added, nothing removed, nothing moved.

Transform this photo into a single frame from a handcrafted stop-motion clay animation — as if a master clay artist rebuilt this exact scene in plasticine and it was photographed on a real miniature film set. (Generic handcrafted claymation style — do not imitate any specific studio or franchise.)

IDENTITY IN CLAY FORM (highest priority — faces get the finest sculpting):
- For each person: sculpt the FACE with the highest detail of the whole scene — the same face shape and proportions impression, the same eye shape and eyelid type, the same nose and mouth impression, the same eyebrows, the same hairstyle sculpted in clay in their TRUE hair color, and the same outfit with its real colors and patterns. Gentle rounding is the material's charm, but every individual feature stays — someone who knows them must instantly say "that's them in clay!"
- For a BABY: keep the baby's real face impression and hair amount — an adorable clay baby that is clearly THIS baby.
- For a PET: the same breed, body size class, and the same fur colors and unique markings painted faithfully on the clay — clearly THIS pet, never a generic clay animal.
- When several subjects are present, sculpt each one from their own reference — never blend or average between them. Keep the exact same number of subjects.

CLAY MATERIAL (make it feel truly handmade):
- Soft matte plasticine with a subtle sheen; visible gentle fingerprints and tool marks; slightly rounded organic shapes; tiny charming imperfections that read as handcrafted.
- Colors: a warm, softly pastel clay palette that stays FAITHFUL to the real colors — skin tone, hair color, outfit colors, and pet markings all recognizable, never one uniform clay color.

MINIATURE SET & LIGHTING:
- Rebuild the background as a simplified miniature stop-motion set (clay, felt, and cardboard textures) that keeps the original location recognizable.
- Soft, warm film-set studio lighting with gentle real shadows; shallow depth of field like a macro photograph of a physical set — this must look like a REAL photo of a REAL clay diorama, not a 2D cartoon and not a smooth 3D render.

FINAL SELF-CHECK before output: the person (or the pet's owner) must instantly recognize every subject in clay form. If any figure reads as a generic clay doll, the result is wrong.

High resolution, photorealistic render of physical clay. No text, no letters, no logo, no watermark, no border. Remember the two absolute rules: the SAME identities in clay, the SAME composition — only the material changes.`;

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
  console.log(`[clay] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

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
  // 📐 구도 보존 컨셉: 크롭 없이 원본 비율 그대로 반환
  return `data:image/png;base64,${b64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateClay(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("clay error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
