import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generateFactory(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TWO ABSOLUTE RULES (these override everything else):
1. THE SPACE'S IDENTITY IS UNTOUCHABLE — the architectural shell and the existing equipment must remain EXACTLY the same place: the same position, number, size, and shape of every wall, support column, beam, window, door, stair, and mezzanine; the same ceiling height and shape; the same room dimensions and proportions; and the same camera angle, perspective, and framing. Existing major equipment and fixed machinery stay in their exact positions with their real shape, type, and COUNT — NEVER invent, add, remove, or upgrade machines, and never move a single structural element. The viewer must instantly recognize it as the SAME space — only renovated.
2. WHAT MAY CHANGE — finishes, lighting, and cleanliness ONLY: floor surface refresh, wall/ceiling repaint, modern lighting, decluttering, and refurbishing the EXISTING equipment's surfaces. This renovation preview is the product — work boldly and decisively HERE, and only here.

You are an elite architectural and real-estate retoucher specializing in INDUSTRIAL and COMMERCIAL spaces (factories, workshops, warehouses, plant offices, building exteriors). Transform this photo of an old, worn, dirty space into the SAME space after a high-end modern renovation — bright, clean, safe, and genuinely appealing. Be bold and decisive: the "after" must look dramatically upgraded, not a timid touch-up.

STEP 1 - READ THE SPACE, THEN ADAPT
First identify what you are looking at, then renovate it appropriately:
- Production floor / workshop: clean modern industrial finish, organized work zones, safe and orderly.
- Warehouse / storage: tidy racking, clear floor lanes, bright high-bay lighting.
- Office / break / meeting area inside the facility: clean modern interior, fresh walls, good lighting.
- Exterior / facade / yard: repaired and repainted cladding, clean signage area, tidy surroundings, bright clear-sky daylight — keeping the real surrounding environment and neighboring buildings exactly as they are.

AGGRESSIVELY UPGRADE (within the allowed zone, boldly):
- Floors: replace cracked, oil-stained, dusty floors with a flawless modern industrial surface — smooth polished concrete or fresh seamless epoxy — with a clean subtle sheen, following the existing floor footprint. Add crisp tidy floor line-markings only where natural for the space type.
- Walls and ceiling: repaint in clean, light, neutral tones; fully remove peeling paint, rust, water stains, mold, cracks, soot, and grime — on the same walls in the same places.
- Lighting: replace dim, yellow, uneven light with bright, even, modern LED lighting, balanced with natural daylight through the existing windows. The space should feel bright, open, and airy.
- Equipment and surfaces: clean and refurbish the existing machines, racks, pipes, and cabling so they look well-maintained — same machines, same type, same count, same positions; bundle and conceal messy exposed wiring.
- Declutter completely: remove trash, debris, clutter, random objects, stains, and any people or photographer reflections — while keeping the genuine functional character of a working industrial space (do not turn a factory into an empty showroom).

PHOTOGRAPHY SPEC (make it look professionally shot):
- Wide architectural lens look with CORRECTED perspective: vertical lines stay straight, no fisheye bulge, no leaning walls.
- Balanced even exposure (open shadows, controlled highlights), neutral 5200-5600K white balance, crisp focus front to back. Professional real-estate / architectural photography quality.

KEEP IT REAL (anti-fake):
- Photorealistic only. Real materials, real light physics, real reflections.
- NOT a CGI render, NOT a 3D model, NOT a video-game look, NOT over-smoothed plastic surfaces.
- Text and signage: keep existing legible signs and labels exactly as written (pixel-faithful); if lettering is too small or damaged to read, leave it simple or blank — NEVER invent, regenerate, or garble text.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY factory — so this is what it would look like renovated," recognizing every column, wall, window, and machine in its exact place. If the structure or equipment changed, the result is wrong.

OUTPUT: high-resolution, sharp, and professional. No watermark, no text overlay, no added borders or logos. Remember the two absolute rules: the SAME space and SAME equipment, boldly renovated finishes.`;
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
  console.log(`[factory] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
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
    const output = await generateFactory(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("factory error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}