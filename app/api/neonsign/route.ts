import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 화면 전체 재해석이라 여유 있게

// 🔑 모델 격리 지점: 변환 컨셉은 GPT 이미지 모델 사용 (회화 스타일 표현이 우수)
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateNeonsign(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the person in this photo into a glowing neon sign line-art portrait — luminous neon tubes tracing their features, mounted on a dark wall, photographed like a real neon installation. It must look like a photograph of a physical glowing sign, not a digital drawing.

STEP 1 — READ THE PERSON FIRST:
Identify the subject and keep the exact same person. This concept is designed for ONE person.

NEON DESIGN — IDENTITY THROUGH GLOWING LINES (MOST IMPORTANT):
- The neon tubes must trace THIS person's real features as continuous elegant lines: same face outline and jawline, same eye shape, same nose and mouth lines, same eyebrow shape, same hairstyle silhouette and flow.
- DETAIL SUFFICIENCY RULE (critical): use enough line detail that anyone who knows them instantly recognizes the portrait. Never reduce the face to three meaningless curves — the eyes, brows, nose line, lips, jaw, and hair shape all need their own tube lines.
- GLASSES RULE: if they wear glasses, render the exact same frame shape as its own neon tube outline; if they wear none, add none.
- Keep distinctive cues in neon line: facial hair (traced along its real beard shape), signature expression.
- Same gender and age impression as the input.

NEON STYLE:
- 2 to 3 neon colors maximum (for example warm pink + electric blue, or amber + mint), chosen to flatter: one color for the face and features, another for hair and accents.
- Realistic neon glow physics: bright tube cores with soft colored halos bleeding onto the wall, subtle warm flicker, faint reflections on the surface.
- Background: a dark matte wall (deep charcoal, brick, or concrete) so the glow pops; a soft ambient light pool around the sign.
- Visible subtle mounting details (thin tube supports, a faint backing plate edge) for realism — minimal and clean.
- Stylish, modern, late-night studio mood.

TEXT BAN:
- No letters, words, numbers, or symbols anywhere — the neon forms ONLY the portrait, never writing. Any urge to add a name or slogan is refused.

SELF-CHECK before finishing:
- Is the person recognizable from the neon lines alone — jawline, eye shape, brows, hairstyle all traced?
- Glasses and facial hair handled correctly?
- Are there 3 or fewer neon colors, with real glow, halo bleed, and reflections — not flat vector lines?
- Is the background dark enough that the glow reads?
- Zero letters or words anywhere?
- Only then is the shot complete.

ABSOLUTELY AVOID:
- Oversimplifying the face into an unrecognizable squiggle or a generic mask.
- More than 3 neon colors, rainbow chaos, or a bright background that kills the glow.
- Flat vector lines without real glow, halo, and light bleed — this must look photographed.
- Leftover photographic texture of the original face.
- Any text, letters, words, watermark, or border.

Final result: one high-resolution photorealistic shot of a glowing neon line-art portrait on a dark wall, unmistakably this person.`;

  // multipart/form-data 구성 (idstyle과 동일 패턴 — Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  form.append("size", "auto"); // ★원본 구도 보존 — 모델이 입력 비율에 맞춰 선택
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
  console.log(`[neonsign] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[neonsign] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // ★크롭 없음 — 원본 구도 보존형
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
    const output = await generateNeonsign(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("neonsign error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("neonsign", 0, handler); // COIN_DORMANT: 실가격 3
