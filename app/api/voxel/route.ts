import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // Pro 생성 계열 대응 — Fluid Compute 전제

// 복셀 — 나노바나나 Pro GA (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateVoxel(imageDataUrl: string, target: string): Promise<string> {
  void target;
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PERSON IS UNTOUCHABLE — any person(s) in the photo must remain EXACTLY as in the original photograph: photorealistic, same face, same body, same pose, same clothing, same position, pixel-faithful. The blocky style must NEVER touch, restyle, or leak into the person — not the face, not the hair edges, not the clothing. The contrast between the REAL person and the blocky world is the entire point of this image.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same crop, same subject positions. Only the environment is rebuilt.

TASK
Transform this photo into a striking scene where the BACKGROUND and environment are completely rebuilt out of large, clearly identifiable 3D cube blocks — a bold, sunlit voxel world with a real person standing inside it.

WORLD RECONSTRUCTION:
- Rebuild buildings, walls, structures, terrain, furniture, and scenery using big, distinct cubic blocks (stone-like, brick-like, wood-like, grass/dirt, sand, glass, metal cubes) chosen to match the colors and materials of the original scene.
- Keep large structures, architecture, and landscape shapes clearly recognizable — someone who knows the place should still recognize it, now made of blocks.
- Omit small noisy details (signs, distant cars, random clutter) for a clean, bold block look.
- Use large, crisp blocks with visible cube faces and stair-stepped edges; strong readable geometry; avoid tiny noisy textures.
- Voxel drama: bright clear daylight, deep saturated blue sky with a few blocky cloud formations, crisp defined block shadows with clean ambient occlusion in the corners, a subtle sense of vast scale extending beyond the frame.
- The transition at the person's outline must be clean: the real person stands in front of the blocky world with a crisp, natural edge — no blocky pixels bleeding onto their silhouette, no photorealistic patches left in the background.

ORIGINALITY LAW (critical — the world must be generically voxel, never a specific game):
- This is a generic voxel/cube-art world. Do NOT reproduce any specific existing video game's signature look: no recognizable branded block textures, no game characters, creatures, mobs, avatars, or mascots from any existing game, no game logos, no branded fonts.
- NO game interface of any kind: no HUD, no heads-up display, no crosshair, no item hotbar or inventory slots, no health/heart icons, no hunger or stamina bars, no minimap, no coordinate readouts, no first-person arm or hand in the corner, no held tools or weapons.
- Design the blocks from the ORIGINAL PHOTO's own colors and materials, not from any game's palette.

TEXT BAN:
- Absolutely NO letters, numbers, words, or symbols anywhere in the image — not on blocks, signs, screens, or as any overlay. Any surface that would carry writing is left blank.

SELF-CHECK before output:
① Does the person look photographed and pasted from the real world — zero style change on them?
② Is the background fully blocky with no photorealistic leftovers?
③ Is the image completely free of any game interface, HUD, hotbar, hearts, hand, crosshair, coordinates, and any text or numbers?
④ Would this read as generic cube art rather than a specific existing game?
If any check fails, the result is wrong.

High detail, bold, clean. No watermark, no border. Remember the two absolute rules: the person untouched, the world rebuilt in blocks, in the original composition.`;

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
      "voxel",
      0 // ★재시도 없음 — Pro 생성은 1회가 길어 두 시도가 예산을 나누면 재시도 중 타임아웃
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[voxel] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

  if (!res.ok) throw new Error(await geminiFriendlyError(res, "voxel"));

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