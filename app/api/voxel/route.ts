import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateVoxel(imageDataUrl: string, target: string): Promise<string> {
  void target;
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PERSON IS UNTOUCHABLE — any person(s) in the photo must remain EXACTLY as in the original photograph: photorealistic, same face, same body, same pose, same clothing, same position, pixel-faithful. The blocky style must NEVER touch, restyle, or leak into the person — not the face, not the hair edges, not the clothing. The contrast between the REAL person and the blocky world is the whole point of this image.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same crop, same subject positions. Only the environment is rebuilt.

Transform this photo into a striking scene where the BACKGROUND and environment are completely rebuilt out of large, clearly identifiable 3D cube blocks — like a blocky 3D sandbox building game.

Background reconstruction:
- Rebuild buildings, walls, structures, terrain, and scenery using big, distinct cubic blocks (stone-like, brick-like, wood-like, grass/dirt, sand, glass cubes) chosen to match the colors and materials of the original scene.
- Keep large structures, architecture, and landscape shapes clearly recognizable — someone who knows the place should still recognize it, now made of blocks.
- Omit small noisy details (text, small signs, distant cars, random clutter) for a clean, bold block look.
- Use large, crisp blocks with visible cube faces and stair-stepped edges; avoid tiny noisy textures.
- Bright sunny daylight, defined blocky shadows, clear blue sky.
- The transition at the person's outline must be clean: the real person stands in front of the blocky world with a crisp, natural edge — no blocky pixels bleeding onto their silhouette, no photorealistic patches left in the background.

First-person game HUD overlay (generic blocky sandbox-game style):
- Add a centered crosshair, a bottom row item hotbar (square slots), simple health and hunger style icon bars above the hotbar, and the player's first-person arm/hand in the lower-right corner.
- Add small coordinate-style text (e.g., "XYZ: 128 / 64 / 256") in a corner.
- Keep the HUD generic — do not copy any specific company's exact logo or trademarked interface.

FINAL SELF-CHECK before output: ① the person must look like they were photographed and pasted from the real world — zero style change on them; ② the background must be fully blocky with no photorealistic leftovers. If either fails, the result is wrong.

High detail, bold, clean. No watermark; no text anywhere except the HUD elements described above. Remember the two absolute rules: the person untouched, the world rebuilt in blocks, in the original composition.`;

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
  console.log(`[voxel] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

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
  return `data:image/png;base64,${b64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const target: string = body?.target || "all";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateVoxel(image, target);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("voxel error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}