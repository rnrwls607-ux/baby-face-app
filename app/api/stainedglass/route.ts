import { NextRequest, NextResponse } from "next/server";
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

async function generateStainedglass(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform this photo into a luminous stained-glass window artwork — glowing colored glass segments joined by dark lead lines, with light shining through from behind. The subject must remain unmistakably themselves within the glass.

STEP 1 — READ THE PHOTO FIRST:
Identify the subject (a person or a pet) and keep the exact same subject — never replace them. This concept is designed for ONE person or ONE pet.

STEP 2 — PRESERVE COMPOSITION:
Keep the same pose, angle, and framing, adapted into an elegant stained-glass panel composition with the subject as the clear centerpiece.

STEP 3 — PRESERVE IDENTITY (MOST IMPORTANT):
- The lead lines must trace THIS subject's real features: same face shape, same eye shape, same nose and mouth lines, same eyebrows, same hairstyle silhouette.
- FEW LARGE PIECES RULE (critical): keep the face divided into FEW, LARGE glass pieces — facial features drawn as clean dark lead lines, skin as a small number of luminous warm glass panels. NEVER shatter the face into many tiny fragments; a mosaic-like face destroys the likeness.
- GLASSES RULE: if the person wears glasses, render the exact same frame shape in lead line; if they wear none, add none.
- Keep distinctive cues: facial hair, signature expression.
- Anyone who knows them must recognize the portrait from its lines and proportions.
- ★SKIN AND FUR COLOR LOCK (critical — the decorative glass palette must never invade the subject):
  · For a PERSON: the skin glass must stay a natural warm skin tone (soft amber, peach, or ivory glass). NEVER render skin in blue, green, purple, or any decorative color. Hair glass stays their real hair color.
  · For a PET: keep the breed, the markings in the same places, and the EXACT real coat color at true brightness and saturation — whatever that color is (white, cream, gray, blue-gray, black, orange, brown, tabby). A gray or blue-gray coat (British Shorthair, Russian Blue, Chartreux) is a known trap: it must stay a natural cool GRAY glass, NEVER vivid blue. White fur stays white glass, not gold or pink. Orange stays orange, black stays black.
  · The cobalt, emerald, ruby, and amber tones belong to the BACKGROUND and decorative border only — they must never bleed into the subject's skin, hair, or fur.

STEP 4 — APPLY THE STAINED-GLASS STYLE:
- Rich translucent glass colors with visible subtle glass texture (gentle streaks, faint bubbles), each segment glowing as if backlit by soft daylight.
- Confident dark lead came lines of varied thickness joining every segment.
- Background: decorative glass patterns — radiating arcs, floral or geometric motifs in harmonious deep tones (cobalt, amber, emerald, ruby) that make the subject glow by contrast.
- Sacred, luminous, artisan atmosphere.

SELF-CHECK before finishing:
- Is the face built from FEW large glass pieces — recognizable, not shattered into a mosaic?
- Is the skin a natural warm tone (or the pet's fur its exact real color), untouched by the background's cobalt and emerald?
- Glasses handled correctly?
- Does every segment read as real glowing translucent glass with texture — not flat vector shapes?
- Only then is the panel complete.

ABSOLUTELY AVOID:
- Shattering the face into many tiny pieces; a mosaic that erases the likeness.
- Coloring skin or fur in decorative glass tones — especially turning a gray coat vivid blue, or skin blue/green/purple.
- A flat vector look without glass texture or backlight — this must feel like real glowing glass.
- Leftover photographic texture.
- Any text, letters, watermark, or border frame with writing.

Final result: one luminous stained-glass portrait panel, high resolution, light shining through.`;

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
  console.log(`[stainedglass] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[stainedglass] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // ★크롭 없음 — 원본 구도 보존형
  return await stampAiMetadata(b64); // AI 생성물 비가시 표시
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await request.json();
    const image: string = body?.image;
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generateStainedglass(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("stainedglass error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}
