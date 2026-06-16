import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateCar(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a professional automotive photo retoucher working on used-car listing photos for Korean marketplaces (Danggeun, Encar, KB Chachacha). Take this real photo and turn it into a clean, clear, well-lit, trustworthy listing photo of the SAME exact car, at the SAME real place, in the SAME real condition. This is careful enhancement, NOT a makeover - it must still look like a genuine photo someone took, and the car must still look like a real USED car, never a brand-new or repainted one.

=== THE CORE OF THIS JOB: wash off ALL dirt, change NONE of the real condition ===
Dirt and damage are physically different things - treat each one correctly, and be confident about both.

DIRT sits ON TOP of the surface and is temporary. Remove ALL of it, thoroughly and confidently - the car must end up genuinely clean, as if it just came out of a professional hand wash and interior vacuum. Leave no dust, mud, grime, surface film, water spots, streaks, bird droppings, fingerprints, or smudges anywhere on the body, glass, mirrors, wheels, or interior. A still-dusty or still-dirty result is a failure.

DAMAGE is permanent and part of the car itself - cut into the paint, dented into the metal, cracked into the glass. Change NONE of it. Keep every scratch, scuff, swirl mark, stone chip, paint chip, flaking or faded or oxidized paint, dent, ding, crease, rust spot, paint transfer, cracked or foggy light, curb rash, worn tire, and damaged or missing trim or part - exactly as it is. Do nothing that a body shop, dent puller, or repaint would do. Erasing or smoothing a scratch or dent is a failure.

The test of a correct result: a dusty, scratched panel comes out CLEAN, and the scratch on it is now MORE clearly visible than before - clean surface, untouched damage. If dirt was hiding a flaw, washing should reveal the flaw, never erase it.

=== READ THE SHOT, THEN ADAPT ===
Identify vehicle and shot type and enhance appropriately: sedan / SUV / hatchback / van / truck / sports car / motorcycle; full exterior / 3-quarter angle / side profile / interior / engine bay / wheel or detail.

=== ABSOLUTE - NEVER CHANGE ===
- Car identity: exact make, model, generation, body shape, proportions, number of doors, the EXACT paint color and finish, wheel/rim design, badges, emblems, trim, lights, grille. Never a different or newer model.
- The REAL SETTING stays: same location, ground, walls, surroundings. Do NOT move the car or replace the background with a studio, showroom, or any other scene. It must look shot right there.
- Camera viewpoint, perspective, and framing stay essentially the same.
- Do NOT change the odometer reading, model year, trim, or any gauge or screen value.

=== ENHANCE NATURALLY (believable, not flashy) ===
- Lighting: brighten dark or underexposed shots, gently lift shadows, tame harsh glare and blown highlights, even out uneven light - so the car is clearly visible in good, natural-looking light. Think "the same spot on a nicer day," NOT studio lighting.
- Color: correct white balance and color casts (orange garage tint, blue shade) for accurate, clean color, keeping the EXACT paint color.
- Gentle leveling: straighten a tilted horizon and fix mild lens distortion while keeping the same viewpoint. No dramatic re-angle.
- Light tidy: you MAY remove small loose clutter right around the car (a stray hose, trash bag, cone) for a cleaner shot, but keep the real location and surroundings intact and recognizable.

=== KEEP IT BELIEVABLE (anti-overprocessing) ===
- Output must look like a genuine, careful photo, NOT an edited or AI image, and the car must look like a clean USED car, not new.
- Do NOT over-process: no HDR halos, no heavy sharpening, no fake glossy "AI sheen," no plastic-smooth surfaces, no oversaturation, no dreamy or unreal look. Reflections and gloss stay subtle, realistic, and consistent with the real surroundings.

=== KEEP IT REAL (anti-fake) ===
- Photorealistic only. Real paint, metal, glass, rubber; real light physics; real reflections and shadows that match the actual scene.
- NOT a CGI render, NOT a 3D model, NOT a video-game look.
- No people. Do NOT invent or garble text: keep badges and emblems accurate, keep dashboard screens and gauges plausible (never fabricate values), and keep the license plate area either as-is or cleanly blurred - never melted or fake lettering.

OUTPUT
- High-resolution, sharp, and natural. No watermark, no text overlay, no added borders or logos. The same used car at the same place - genuinely clean, with every real flaw intact. Honest and trustworthy.`;
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
  console.log(`[car] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateCar(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("car error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}