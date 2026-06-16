import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
const GEMINI_MODEL = "gemini-3.1-flash-image";

const STYLES: Record<string, string> = {
  modern: "modern - clean lines, a neutral palette, sleek contemporary furniture, uncluttered and sophisticated",
  natural: "natural - warm wood tones, linen and cotton textures, plants and greenery, a soft earthy palette",
  cozy: "cozy - warm soft lighting, plush textiles, layered rugs and cushions, snug and inviting",
  minimal: "minimalist - very few well-chosen pieces, lots of open space, a restrained monochrome neutral palette",
  scandi: "scandinavian - light wood, a white and soft-grey palette, simple functional furniture, bright and airy with a hygge feel",
  vintage: "vintage - classic mid-century or retro furniture, warm rich tones, characterful nostalgic decor",
};

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateInterior(imageDataUrl: string, styleKey: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const styleLine = STYLES[styleKey] || STYLES.modern;
  const prompt = `You are an elite interior-design and real-estate staging artist. Take this photo of a room and transform it into a beautifully furnished, styled, magazine-quality interior in a specific style - while keeping it unmistakably the SAME room. Be a confident designer: the result should look professionally styled and aspirational, not a timid edit. Suit a modern Korean home (apartment / villa / house) or commercial space - natural and livable, not oversized or cluttered.

STEP 1 - READ THE ROOM, THEN ADAPT
First identify the room type and its current state, then style it appropriately:
- Room type: living room / bedroom / kitchen / bathroom / entryway / study-office / dining / kids room / commercial space (cafe, shop, office). Furnish and style to fit that purpose.
- Current state:
  - If the room is EMPTY or bare: add a complete, tasteful set of furniture and decor appropriate to the room's purpose (virtual staging).
  - If the room is already FURNISHED but outdated or cluttered: restyle it - replace or rearrange furniture and decor into a clean modern look, declutter, and refresh tired finishes.

=== ABSOLUTE - NEVER CHANGE (lock the room's identity) ===
- Architectural geometry: the exact position, number, size and shape of all walls, windows, doors, ceiling, columns, and built-in structural fixtures (e.g. kitchen counters/cabinets, fixed bathroom fixtures). Keep ceiling height and the room's dimensions and proportions identical.
- Camera angle, perspective, and framing stay identical. The viewer must instantly recognize it as the SAME room, only styled - never a different space.
- Do NOT add, remove, move, or resize any structural element, window, or door.

=== STYLE BOLDLY in this EXACT style ===
- Apply this specific interior style throughout - furniture, palette, materials, and mood: ${styleLine}. Commit fully to this style.
- Furniture and decor: add or replace with realistic, well-proportioned pieces in a balanced, intentional layout with a clear focal point. Ground everything correctly - real scale, contact shadows, matching perspective. Tasteful and livable; do NOT overcrowd the room or add floating or duplicated items.
- Accents: add tasteful touches consistent with the chosen style - a few plants, soft textiles, simple art, layered lighting.
- Surfaces: refresh flooring, walls, and ceiling to clean finishes that suit the style, following the existing surfaces (no structural change).
- Lighting: bright, even, and inviting; balance natural daylight from the existing windows with warm interior lighting. Make it feel airy and welcoming.

PHOTOGRAPHY SPEC (make it look professionally shot)
- Wide interior lens with CORRECTED perspective: vertical lines stay straight, no fisheye bulge, no leaning walls.
- Balanced even exposure (open shadows, controlled highlights), neutral-to-warm white balance, crisp focus. Professional real-estate / interior photography quality.

KEEP IT REAL (anti-fake)
- Photorealistic only. Real materials, real light physics, real reflections and shadows.
- NOT a CGI render, NOT a 3D model, NOT a video-game look, NOT over-smoothed plastic surfaces.
- No people. Do NOT generate fake or garbled text on books, screens, posters, or art - keep wall art simple or abstract or blank, never melted lettering.

OUTPUT
- High-resolution, sharp, and professional. No watermark, no text overlay, no added borders or logos. The same room - beautifully styled and inviting.`;
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
  console.log(`[interior] model=${GEMINI_MODEL} style=${styleKey} status=${res.status} ${Date.now() - t0}ms`);
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
    const style: string = typeof body?.style === "string" ? body.style : "modern";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateInterior(image, style);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("interior error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}