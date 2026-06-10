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
  const prompt = `You are a professional architectural and interior-visualization retoucher
specializing in industrial spaces. Take this photo of an old, worn-down
factory interior and make it look like the SAME space after a clean, modern
renovation — bright, well-maintained, and appealing to work in.
CRITICAL — preserve the building's structure and viewpoint exactly:
- Keep the exact architectural layout: the position, number, and size of all
  walls, support columns, beams, windows, and doors, plus the ceiling height
  and shape, must stay identical.
- Keep the same camera angle, perspective, and framing. The viewer must
  clearly recognize it as the same room, only renovated — not a different
  building.
- Do NOT move, add, or remove any structural element, and do NOT change the
  room's dimensions or proportions.
Apply a realistic interior renovation:
- Floors: replace cracked, oil-stained, or dirty floors with clean, modern
  industrial flooring (smooth polished concrete or fresh epoxy coating),
  following the existing floor layout.
- Walls & ceiling: repaint in clean, light, neutral tones; remove peeling
  paint, rust, water stains, mold, and grime.
- Lighting: replace dim, yellow, or uneven lighting with bright, even, modern
  LED industrial lighting, and let natural daylight come through the existing
  windows. Make the space feel bright and open.
- Cleanup: remove trash, clutter, debris, and exposed messy wiring, while
  keeping the structural and functional character of an industrial workspace.
- Overall feel: clean, spacious, safe, professional, and inviting.
Final look: photorealistic, high-resolution real-estate / architectural
photography. Realistic materials and lighting, NOT a CGI or 3D-render look.
The same room, freshly renovated.`;
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