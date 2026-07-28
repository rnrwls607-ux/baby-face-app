import { NextRequest, NextResponse } from "next/server";
import { withCoin } from "../../lib/coins";
import { stampAiMetadata } from "../../lib/aiMark";

export const runtime = "nodejs";
export const maxDuration = 240; // GPT 이미지 편집 — 장면 전체 재구성이라 여유 있게
// 생성 불안정 시 gemini-3-pro-image 전환 후보 — MJ 사전 승인 완료

// 🔑 모델 격리 지점: 글램 라인 2차는 GPT 이미지 모델 사용
const OPENAI_MODEL = "gpt-image-2";

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

async function generateAnchorglam(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `You are the styling team preparing a broadcast news anchor for air — hair, makeup, and wardrobe working together on one photo. The person in this photo walks in as herself; she walks out in immaculate on-air anchor styling, photographed in this exact same moment and place. Think of it as a snapshot of an anchor on her way to the studio: composed, credible, camera-ready. Same person, same photo — anchor version.

[SKIN TRUTH v3 — the #1 rule of this entire work]
- DEFAULT SKIN IS CLEAR: unless a mole or mark is CLEARLY visible in the original photo, render that area of skin perfectly clear and unmarked. Marks may ONLY be copied from the original — never invented, never added for "beauty," never imagined out of blur, shadow, or noise.
- ZERO new marks: creating even ONE mole, beauty mark, freckle, spot, or scar that does not exist in the original — on the face, neck, or anywhere — is a critical failure that ruins the entire work.
- When in doubt, leave it out: a missing mark is acceptable; an invented mark is not.
- Every EXISTING mole and mark stays exactly where it is — makeup may soften it slightly, never erase it, never move it.
- The makeup NEVER adds marks: no painted-on beauty marks, no aesthetic freckles, no "charming" moles, under any circumstance.
- Flawless skin still means REAL skin — pores and fine texture remain visible; a wax or 3D-render look is a critical failure.

[IDENTITY FLOOR — the strongest rule, never cross]
- This transformation stacks new hair + broadcast makeup + a suit, so the FACE must anchor the identity absolutely: keep the exact same face structure, face shape, eye character (NEVER add or remove double eyelids), nose character, and every distinctive feature. No reshaping of any kind — jaw, eyes, nose all untouched.
- Anyone who knows them must recognize them INSTANTLY despite the full styling. Do NOT turn them into any real news anchor or celebrity.
- Keep the exact pose, body, hands, expression mood, framing, camera angle, and the entire original background. Do NOT place any props into their hands — no microphone, no papers, no earpiece; the hands stay exactly as the original. Nothing in the scene changes except the person's styling.
- GLASSES RULE: if they wear glasses, keep the EXACT same frames; if they wear none, add none.

[STYLING LICENSE — what the team may transform, boldly]
- HAIR: restyle into the signature Korean news-anchor look — a polished shoulder-length style with a smooth, camera-perfect inward C-curl and clean volume at the crown, or an immaculate neat half-updo if it suits them better. Not a strand out of place, glossy healthy finish, natural hairline.
- MAKEUP: broadcast-grade on-air makeup — a flawless HD-ready semi-matte base that reads clean under studio light, softly defined eyes with a precise fine liner and neat lashes, well-groomed structured brows, a subtle healthy blush, and a composed rose or soft red lip. Polished and trustworthy — camera-ready, never heavy or glittery.
- WARDROBE: replace the outfit with the signature anchor suit — a sharply tailored single-tone jacket in one vivid, television-friendly color (choose what flatters the person: vivid blue, coral red, emerald, or violet) over a simple ivory inner top. Small elegant stud or pearl earrings may be added; a delicate thin necklace is optional. Modest, professional cuts only. ★ABSOLUTELY NO broadcaster logos, no station emblems, no name tags, no lettering anywhere on the clothing.
- The suit must fit the person's actual body and pose naturally, with believable tailoring, crisp fabric, and lighting — as if they were truly wearing it in this photo.

[THE VERDICT LOOK]
- The finished person radiates on-air presence: intelligent, composed, trustworthy, luminous — "she looks like a news anchor about to go on air." Next to the original photo, the transformation must be instant and impressive, while the face says "still unmistakably her."
- This concept is styled for women.

[LIGHT POLISH]
- Keep the original scene and background, but light the person clean and even like a broadcast portrait: soft, flattering, shadow-free illumination on the face with a crisp premium finish; dull color casts removed. The background stays recognizably the same place.

SELF-CHECK before finishing: zero new moles, freckles, or painted marks anywhere? · every original mole still in place? · glasses exactly as the original (or still absent)? · double eyelids and face structure untouched? · same person at a glance, despite the new hair and suit? · hairline natural with the new style? · same pose, same hands with no props added, same background? · suit free of logos, emblems, and lettering? · does it read "news anchor" instantly? Only then is the work complete.

Output: one photorealistic photo, identical in pose and background to the input — the same person in complete news-anchor styling. High resolution, no text, no watermark, no border — and absolutely zero new moles or marks anywhere: default skin is clear.`;

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
  console.log(`[anchorglam] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    console.error(`[anchorglam] OpenAI 오류 ${res.status}: ${errText}`);
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
    const output = await generateAnchorglam(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("anchorglam error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}

export const POST = withCoin("anchorglam", 0, handler); // coinCost 3 — concepts.ts 기준(전종 라이브)
