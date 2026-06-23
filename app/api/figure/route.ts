import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-3.1-flash-image";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateFigure(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `Transform this photo into a HYPER-REALISTIC MACRO PHOTOGRAPH of a premium handcrafted miniature figure diorama — as if a beautifully sculpted collectible model of this exact scene is sitting on a real desk, photographed up close with a real camera.

SCENE PRESERVATION (most important):
- Keep the SAME composition, camera angle, framing, and poses. The viewer must instantly recognize it as the exact same scene, faithfully recreated in miniature.
- People/pets: preserve their RECOGNIZABLE LIKENESS — same face, facial features, hairstyle, expression, and outfit — accurately translated into figure form. Do NOT change who they are. Tasteful, lifelike figure proportions (NOT extreme chibi, NOT a different person).

FIGURE MATERIAL & SCULPT (make it look like a real collectible):
- High-end collectible PVC/resin figure: smooth surfaces with a subtle satin sheen, crisp hand-painted detail, fine visible brush/airbrush shading, clean sculpted edges, tiny realistic highlights on raised areas.
- Believable miniature scale cues: slightly soft sculpted micro-details, gentle seam lines, realistic paint depth.

DIORAMA BASE & SET:
- Place the whole scene on a small detailed diorama base / round display stand with realistic miniature materials (tiny textured ground, mini props, scaled-down environment rebuilt from the original background).
- The base sits on a real wooden desk or tabletop.

MACRO / TILT-SHIFT LOOK (this sells the "tiny real model" illusion):
- Strong shallow depth of field: the figure is razor-sharp in focus while the foreground and background fall off into a soft creamy blur (pronounced tilt-shift / macro bokeh).
- Real studio product-shot lighting: soft key light, gentle rim light, realistic soft shadows on the desk.
- Slightly blurred real-world room/desk in the background to reinforce that this is a physical object on a real table.

FINAL LOOK: a crisp, professional macro product photograph of an adorable, highly detailed figure diorama you'd want to collect. Photorealistic — like a real photo of a real figure, NOT a 3D render, NOT a cartoon. No text, no logos, no watermark, no border.`;

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
  console.log(`[figure] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);

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
    const output = await generateFigure(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("figure error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}