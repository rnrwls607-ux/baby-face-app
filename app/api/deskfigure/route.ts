import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const DESKFIGURE_PROMPT = `Transform the person in this photo into a HYPER-REALISTIC PHOTOGRAPH of a premium collectible PVC figure of themselves, freshly unboxed and displayed on a modern work desk — as if the owner just opened the box and set their own character figure up for the first time.

THE SCENE — exactly three elements in one photo:
1. THE FIGURE (the hero, razor-sharp focus): a beautifully crafted 1/7-scale PVC figure of the person, standing in a natural confident pose on a simple round display base on the desk. High-end collectible quality: smooth satin-sheen PVC surfaces, crisp hand-painted detail, fine airbrush shading, clean sculpted edges, realistic paint depth.
2. THE OPENED RETAIL BOX: standing beside or behind the figure — its retail packaging box with a large clear plastic display window on the front panel. THE BOX IS ALREADY OPENED AND EMPTY: through the window you can see only the empty molded clear plastic tray inside, shaped to the figure's silhouette, with nothing in it — because the figure has been taken OUT and now stands on the desk. Exactly ONE physical figure exists in the entire photo — the one on the desk. The box's printed artwork (around the window) shows the SAME character as 2D art only.
3. THE MONITOR (softly blurred background): a computer monitor on the same desk showing the 3D digital sculpt of the SAME character in a plain dark viewport — the model only, no interface panels.

IDENTITY (most important): the figure's face must be a recognizable miniature of the person in the photo — same face shape, same facial features, same hairstyle, same age impression, translated faithfully into figure form. Tasteful lifelike figure proportions — NOT extreme chibi, NOT a different person. The character art on the box and the sculpt on the monitor must clearly be this same character.

ABSOLUTE TEXT BAN: Every surface must be completely BARE of text — no letters, no numbers, no logos, no brand marks, no barcodes, no labels on the box, the base, the monitor screen, or anywhere else. Even illegible text-like shapes are a failure. No real toy-company branding of any kind.

PHOTOGRAPHY: a crisp professional macro product shot — the figure in razor-sharp focus, the opened box slightly soft, the monitor and desk falling into creamy background blur. Soft key light with a gentle rim light, realistic soft shadows on the desk surface. Warm, inviting workspace mood.

FINAL LOOK: photorealistic, like a real photo of a real figure on a real desk — NOT a 3D render, NOT a cartoon. High resolution. No text, no watermark, no border.`;

async function generateDeskfigure(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", DESKFIGURE_PROMPT);
  form.append("size", "auto"); // ★원본 비율 보존 — 모델이 입력 비율에 맞춰 선택
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
  console.log(`[deskfigure] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[deskfigure] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음 — 프롬프트가 데스크 매크로 구도를 지정하므로 입력 비율을 그대로 살린다
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

async function handler(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateDeskfigure(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("deskfigure error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("deskfigure", 0, handler); // COIN_DORMANT: 실가격 3 · gpt-image-2
