import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
const PETJOB_BASE = `TASK
Transform the input pet photo into a premium "pet at work" portrait — THIS pet in the professional uniform and workplace described below, photographed like a heartwarming magazine feature. Played completely straight: real uniform, real workplace, one very professional pet.

PET IDENTITY (absolute):
- The pet is the EXACT animal from the input photo: same species, same breed, same size impression, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face. The owner must instantly recognize their baby on the job.
- COAT COLOR LOCK (critical): the pet's coat must keep its EXACT real-life color, brightness, and saturation — whatever that color is (white, cream, gray, blue-gray, black, orange, brown, tan, tricolor, tabby, or any pattern). This is an absolute rule for EVERY coat color equally. The costume, clothing, background, and lighting colors must NEVER bleed into, tint, or recolor the fur: white fur stays pure white (never tinted gold, pink, or blue by the scene), brown stays brown, orange stays orange, black stays black. A gray or blue-gray coat (British Shorthair, Russian Blue, Chartreux) is a known trap — it stays natural cool GRAY, never vivid blue. Any artistic or painting style may add soft shading, but must NEVER shift the fur's actual hue away from real life — the fur keeps its true color while the outfit and scene keep theirs.
- Freshly groomed: clean healthy coat with natural shine, bright confident eyes, a proud capable expression natural to this animal.

BODY TRUTH (critical):
- The pet keeps its OWN natural animal body, proportions, and posture — sitting or standing the way a real animal does. NEVER a human body with a pet head, never human arms or hands, never standing on two legs.

UNIFORM LAW (critical — full outfit, natural fit):
- Dress the pet in the COMPLETE uniform described below — a full outfit covering chest, back, and shoulders as tailored premium pet-wear, not just a single accessory. The uniform fits naturally over its anatomy: comfortable, believable, never distorting the body, never tight.
- The face and both ears stay fully visible at all times. Nothing shadows the eyes.

TEXT BAN (applies to everything):
- Absolutely NO letters or numbers anywhere: no name tags with writing, no badges with characters, no signs, no labels, no charts or menus with text, no logos. Any tag, badge, or patch must be a plain shape or symbol only. If a spot begs for lettering, leave it plain.

LIGHT & FINISH:
- Bright, warm, professional lighting; the pet's face perfectly lit with a gentle rim on the fur; cinematic shallow depth of field on the workplace background.
- Photorealistic premium photography — crisp fur and fabric detail. NOT a cartoon, NOT an illustration.
- Vertical portrait framing, the pet large and central, chest-up emphasis.

SELF-CHECK before finishing:
- Same pet as the input — markings in the same places, same face? Own animal body, zero human anatomy? COMPLETE uniform properly worn (not just one accessory)? Face and ears fully visible? Zero letters or numbers anywhere? Premium magazine look? Only then complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, colors, or markings; a human or humanoid body; two-legged standing.
- A half-worn outfit or a single accessory instead of the full uniform; anything covering ears or eyes.
- Any letters, numbers, or readable text; logos; badges with characters.
- Cheap costume-party look; cluttered scenes; cartoon style; plastic fur; extra or missing paws or tails; watermarks, borders.`;
const PETJOB_SCENES: Record<string, string> = {
  doctor: `THE JOB — pet doctor:
- UNIFORM: a crisp white doctor's coat fitted over a soft pale-blue scrub top, covering chest and back completely; a small stethoscope draped naturally around the neck. All pocket tags plain.
- WORKPLACE: a bright modern clinic examination room, softly blurred — clean white counter, a hint of medical equipment, warm daylight through a window. All charts, screens, and papers blank or out of frame.
- MOOD: calm, trustworthy, gently attentive — the kindest doctor in town.`,
  firefighter: `THE JOB — pet firefighter:
- UNIFORM: a full firefighter turnout jacket in dark tan-and-yellow with reflective safety stripes, covering chest, back, and shoulders; NO helmet on the head — instead, a small firefighter helmet rests on the ground beside the pet so the face and ears stay fully visible. All patches plain shapes.
- WORKPLACE: in front of a softly blurred red fire truck at the station, warm late-afternoon light, a coiled hose in the background. Truck markings and signs all plain — no letters or numbers.
- MOOD: brave, proud, dependable — chest up like a hero after a job well done.`,
  police: `THE JOB — pet police officer:
- UNIFORM: a neat navy police uniform shirt or vest covering chest and back, with a plain gold shield-shaped badge (no characters) on the chest; a smart police cap sits lightly and slightly back on the head, small enough that eyes and both ears stay fully visible — if the cap would cover the ears, tilt it back further.
- WORKPLACE: a friendly neighborhood street or police station entrance, softly blurred, warm daylight. All signs and car markings plain — no letters or numbers.
- MOOD: alert, upright, adorably dutiful — the neighborhood's most beloved officer.`,
  chef: `THE JOB — pet chef:
- UNIFORM: a classic double-breasted white chef's jacket covering chest and back, with a small neckerchief; a soft white chef's hat sits lightly and slightly tilted on the head, small enough that eyes and both ears stay fully visible.
- WORKPLACE: a warm professional kitchen counter, softly blurred — copper pans hanging, fresh vegetables and a mixing bowl on the counter at a comfortable distance (the pet is not eating or touching food). All menus, labels, and jars plain — no letters.
- MOOD: proud and cheerful — the head chef presenting tonight's special.`,
};
function buildPrompt(job: string): string {
  return PETJOB_BASE + "\n\n" + (PETJOB_SCENES[job] || PETJOB_SCENES.doctor);
}
async function generatePetjob(imageDataUrl: string, job: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = buildPrompt(job);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 230000);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetchGeminiWithRetry(
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
      },
      "petjob",
      1, // 과부하(503/429) 1회 재시도
      60000 // ★단 첫 시도가 60초 안에 떨어진 경우만 — 오래 끌다 실패한 건은 재시도 생략(230초 예산 보호)
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petjob] model=${GEMINI_MODEL} job=${job} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petjob", "생성에 실패했어요. 다른 사진으로 다시 시도해주세요."));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petjob] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petjob] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
    throw new Error(txt ? "이미지를 만들지 못했어요: " + txt.slice(0, 200) : "이미지를 받지 못했습니다.");
  }
  const dataUrl = await stampAiMetadata(b64); // AI 생성물 비가시 표시
  // 📐 펫 단일: 3:4 세로 비율로 크롭
  return await cropToRatio(dataUrl, 3, 4);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const job: string = typeof body?.job === "string" ? body.job : "doctor";
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetjob(image, job);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petjob error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}