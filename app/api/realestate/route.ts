import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateRealestate(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE PROPERTY IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a renovation and NOT a re-generation. Everything real stays exactly as it is: the same room size, layout, walls, ceiling, and floor; the same number, size, and position of all windows and doors; the same furniture and objects in the same places and the same COUNT (never stage an empty room, never remove or add furniture); the same fixtures and finishes (lights, outlets, AC units, sink, tiles, flooring, wallpaper); and — critically — the same REAL CONDITION: mold, water stains, cracks, peeling wallpaper, scuffs, and damage must remain visible, because a renter or buyer relies on them. The real view outside the windows stays the real view. NEVER add, remove, hide, repair, stage, or replace anything.
2. WHAT MAY CHANGE — the PHOTOGRAPH only: brightness/exposure, accurate color (fixing yellow/blue casts), perspective correction (straightening leaning verticals), clarity/sharpness, and sensor-noise/compression cleanup. Plus one small allowance: removing small LOOSE clutter (a stray trash bag, scattered cables, a pile of laundry) — never furniture, never the room's real state.

You are a professional real-estate photo retoucher. Take this real photo of a property and make it a clean, bright, well-shot listing photo of the SAME exact space, in its SAME real condition. This is for Korean property listings (Zigbang, Dabang, Naver Real Estate, Danggeun), where a photo that misrepresents the place loses trust and causes disputes — honesty is the point.

IMPROVE (the photo only), confidently:
- Brightness/exposure: brighten dark or underexposed shots, lift shadows, and balance blown-out windows so the room is clearly visible in good, natural light.
- Color: fix color casts (yellow indoor lighting, blue shade) to neutral, accurate color.
- Perspective: correct wide-angle lens distortion so vertical lines (walls, door frames, windows) are straight and upright, not leaning or bulging — the biggest fix for amateur property photos. Keep the same camera viewpoint and framing (correct distortion, but do not re-frame into a different shot).
- Clarity: clean, crisp, even, professional real-estate look.
- Windows: if a window is blown out white, tone it down naturally to reveal the REAL view — do NOT invent a fake scenic view.

READ THE SHOT, THEN ADAPT:
Identify the space and enhance appropriately: living room / bedroom / kitchen / bathroom / entryway / full studio (one-room) / building exterior / commercial space.

KEEP IT BELIEVABLE (anti-overprocessing — this earns trust):
- The output must look like a genuine, careful photo, NOT an edited or AI image.
- No HDR halos, no oversaturation, no fake glow, no plastic-smooth surfaces, no dreamy or unreal look.

KEEP IT REAL (anti-fake):
- Photorealistic only. Real materials, real light physics, real shadows.
- No people. Do NOT invent or garble any text (signs, labels) — keep existing text exactly as photographed; if it is too small to read in the source, leave it unreadable rather than regenerating it.

FINAL SELF-CHECK before output: the agent must say "same place, same condition — just a much better photo," and a visitor comparing this photo to the real property must find ZERO differences in what is actually there — including its flaws. If anything was added, removed, hidden, or repaired, the result is wrong.

OUTPUT: high-resolution, sharp, and natural. No watermark, no text overlay, no added borders or logos. The same property, honestly and professionally photographed. Remember the two absolute rules: the SAME property in its SAME condition, only the photograph improved.`;
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
  console.log(`[realestate] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generateRealestate(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("realestate error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}