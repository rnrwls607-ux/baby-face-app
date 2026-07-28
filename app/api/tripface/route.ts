import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 장면 전체 재구성이라 여유 있게

// 🔑 모델 격리 지점: 글램 라인 2차는 GPT 이미지 모델 사용
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateTripface(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are a travel photographer's trusted retoucher, famous for one specialty: rescuing travel photos where the scenery is perfect but the person had a bad hair-and-face day. In the attached photo, keep the amazing background and the whole moment EXACTLY as shot — and gently fix only the person: tidy the wind-blown hair and give the face a fresh, natural, camera-ready polish. Same person, same trip, same moment — just the version where they were having a great day.

[SKIN TRUTH v3 — the #1 rule of this entire work]
- DEFAULT SKIN IS CLEAR: unless a mole or mark is CLEARLY visible in the original photo, render that area of skin perfectly clear and unmarked. Marks may ONLY be copied from the original — never invented, never added for "beauty," never imagined out of blur, shadow, or noise.
- ZERO new marks: creating even ONE mole, beauty mark, freckle, spot, or scar that does not exist in the original — on the face, neck, or anywhere — is a critical failure that ruins the entire work.
- When in doubt, leave it out: a missing mark is acceptable; an invented mark is not.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- The makeup NEVER adds marks: no painted-on beauty marks, no aesthetic freckles, under any circumstance.
- Flawless skin still means REAL skin — pores and fine texture remain visible; a wax or 3D-render look is a critical failure.

[THE SCENE IS SACRED — nothing but the person changes]
- The background, scenery, sky, light direction, time of day, and every object stay EXACTLY as shot — this travel moment is the whole point. Do NOT relight the scene, do NOT beautify the location, do NOT remove or add anything in the background.
- Keep the exact pose, body, hands, expression, framing, and camera angle. Same outfit — you may only smooth obvious wind-crumpled spots on the clothing, never redesign it.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none. Sunglasses in the original stay exactly as they are.

[IDENTITY FLOOR — never cross]
- Anyone who knows them must recognize them INSTANTLY. Keep the exact face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping — jaw, eyes, nose all untouched.

[HAIR RESCUE — the specialty, done with restraint]
- Keep their EXACT hairstyle: same cut, same length, same color, same parting. Do NOT restyle into a different look.
- Only rescue it: settle the wind-blown chaos into how that same style looks on a calm, good-hair day — strands off the face, flyaways tamed, natural volume and shape restored, a healthy soft shine added. A few gentle strands moving naturally in the breeze MAY remain so it still feels like the real outdoor moment — the goal is "her/his usual hair, behaving beautifully," never a salon blowout that ignores the wind.

[FACE POLISH — natural travel-day glow, not a makeover]
- If the person presents as a woman: a light, fresh "no-makeup makeup" — even luminous skin with redness, shine, and tired dullness cleared; subtly brightened eyes with dark circles softened; tidy natural brows; a healthy soft flush; lips with a fresh natural tint. She looks like she did a quick clean makeup that morning — never a full glam.
- If the person presents as a man: natural grooming only — clear even skin, shine controlled, tidy brows, a healthy rested look. Zero visible makeup.
- Squinting from the sun, wind-teared eyes, or a strained expression may be gently relaxed into the natural pleasant version of the SAME expression — never a different expression.
- The face sits in the scene's real light: brightened and flattering, but still clearly lit by that place's sunlight — never a studio face pasted onto a landscape.

[THE VERDICT LOOK]
- The finished photo reads as the same travel shot on a luckier take: the scenery untouched, the person fresh, tidy, and glowing — "this is the one I'm making my profile photo." Next to the original, the fix must be clearly visible yet completely believable — a stranger would never guess it was edited.

[LIGHT POLISH]
- Overall photo finish only: clean natural color, gentle clarity, the person softly flattered within the scene's own light. No filters, no mood change, no sky replacement.

SELF-CHECK before finishing: scan the skin zone by zone — zero invented moles or marks? · every original mole still in place? · glasses/sunglasses exactly as the original? · face structure untouched, same person at a glance? · same hairstyle (only tidied), believable in the outdoor breeze? · background, light, pose, outfit, and expression character all unchanged? · does it look like a real photo, not an edit? Only then is the work complete.

Output: one photorealistic photo, identical in scene, pose, and composition to the input — the same person on their best travel day. High resolution, no text, no watermark, no border — and absolutely zero new moles or marks anywhere: default skin is clear.`;

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
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
  console.log(`[tripface] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[tripface] OpenAI 오류 ${res.status}: ${errText}`);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("이미지를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  // 📐 크롭 없음(그룹B) — 입력 사진의 원래 비율을 그대로 살린다
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
    const output = await generateTripface(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("tripface error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("tripface", 0, handler); // coinCost 3 — concepts.ts 기준(전종 라이브)
