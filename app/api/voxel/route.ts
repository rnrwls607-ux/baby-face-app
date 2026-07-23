import { NextRequest, NextResponse } from "next/server";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 장면 전체 재구성이라 여유 있게

// 🔑 모델 격리 지점: 복셀은 GPT 이미지 모델 사용 (블록 세계 표현이 Gemini보다 우수)
const OPENAI_MODEL = "gpt-image-2";

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

  // multipart/form-data 구성 (idstyle과 동일 패턴 — Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  form.append("size", "auto"); // ★원본 구도 보존이 절대 규칙 — 모델이 입력 비율에 맞춰 선택
  form.append("quality", "medium");
  form.append("n", "1");
  const bytes = new Uint8Array(Buffer.from(img.data, "base64"));
  form.append("image[]", new Blob([bytes], { type: img.mimeType }), "photo.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: form,
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[voxel] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[voxel] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // ★크롭 없음 — 원본 구도 보존이 이 컨셉의 절대 규칙
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
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
