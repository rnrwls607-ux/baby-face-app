import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const GEMINI_MODEL = "gemini-3.5-flash";
const TIMEOUT_MS = 8000;          // 사용자가 업로드 직후 기다리는 순간이라 짧게
const MIN_FACE_RATIO = 0.15;      // 이보다 작으면 얼굴이 너무 작다고 본다

// ─────────────────────────────────────────────────────────────
// 안전 원칙 (최우선)
// 이 API는 어떤 상황에서도 200 OK 만 반환하고, 판단이 불가능하면 pass 한다.
// 멀쩡한 사진을 잘못 막는 것이 최악의 경험이기 때문이다.
// 네트워크 실패·타임아웃·JSON 파싱 실패·API 키 없음 → 전부 pass.
// ─────────────────────────────────────────────────────────────

type GateResult = { result: "hard_fail" | "soft_fail" | "pass"; reasons: string[] };

const PASS: GateResult = { result: "pass", reasons: [] };

function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}

const PROMPT = `You are a photo intake inspector for an AI portrait app.
Look at the image and return ONLY this JSON (no other text, no markdown):
{"face_count": <int>, "is_animal_subject": <bool>, "is_object_or_scene": <bool>, "face_size_ratio": <0.0-1.0>, "both_eyes_visible": <bool>, "extreme_angle": <bool>, "heavy_blur_or_dark": <bool>, "heavy_filter_or_sticker": <bool>, "occluded_by_mask_or_sunglasses": <bool>}
Judge strictly but fairly. face_size_ratio = face height / image's shorter side.
The response must start with { and end with }. No code fences, no greeting, no explanation.`;

type Inspection = {
  face_count?: unknown;
  is_animal_subject?: unknown;
  is_object_or_scene?: unknown;
  face_size_ratio?: unknown;
  both_eyes_visible?: unknown;
  extreme_angle?: unknown;
  heavy_blur_or_dark?: unknown;
  heavy_filter_or_sticker?: unknown;
  occluded_by_mask_or_sunglasses?: unknown;
};

// Gemini 에게 사진을 보여주고 검사 결과 JSON 을 받는다. 실패하면 null.
async function inspect(imageDataUrl: string): Promise<Inspection | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const img = parseImage(imageDataUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: img.mimeType, data: img.data } },
          ] }],
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    console.log(`[validate-photo] status=${res.status} ${Date.now() - t0}ms`);

    if (!res.ok) return null;

    const data = await res.json();
    const respParts = data?.candidates?.[0]?.content?.parts || [];
    const txt: string = respParts.find((p: { text?: string }) => p.text)?.text || "";
    if (!txt) return null;

    // 코드펜스·인사말이 섞여 와도 첫 { 부터 마지막 } 까지만 잘라 파싱한다.
    const clean = txt.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) return null;

    return JSON.parse(clean.slice(start, end + 1)) as Inspection;
  } catch {
    clearTimeout(timer);
    return null;   // 네트워크·타임아웃·파싱 실패 — 전부 조용히 포기
  }
}

// 검사 결과를 사용자에게 보여줄 판정으로 바꾼다.
function judge(v: Inspection): GateResult {
  // 값이 이상하면(숫자가 아님 등) 그 항목은 검사하지 않은 것으로 친다.
  const num = (x: unknown, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? x : fallback);
  const yes = (x: unknown) => x === true;

  const faceCount = num(v.face_count, 1);            // 모르면 1명으로 가정 → 통과 쪽
  const faceRatio = num(v.face_size_ratio, 1);       // 모르면 충분히 크다고 가정 → 통과 쪽

  // hard_fail — 이 사진으론 결과를 만들 수 없다. 하나라도 걸리면 즉시 반환.
  if (faceCount === 0 || yes(v.is_object_or_scene)) {
    return { result: "hard_fail", reasons: ["사람 얼굴이 보이지 않아요"] };
  }
  if (yes(v.is_animal_subject)) {
    return { result: "hard_fail", reasons: ["동물 사진은 사용할 수 없어요"] };
  }
  if (faceCount >= 2) {
    return { result: "hard_fail", reasons: ["여러 명이 나왔어요. 혼자 나온 사진을 올려주세요"] };
  }

  // soft_fail — 만들 수는 있지만 결과가 아쉬울 수 있다. 사유를 모아서 알려준다.
  const reasons: string[] = [];
  if (faceRatio < MIN_FACE_RATIO) reasons.push("얼굴이 너무 작게 나왔어요");
  if (v.both_eyes_visible === false) reasons.push("두 눈이 모두 보이는 사진이 좋아요");
  if (yes(v.extreme_angle)) reasons.push("정면에 가까운 사진이 좋아요");
  if (yes(v.heavy_blur_or_dark)) reasons.push("사진이 흐리거나 어두워요");
  if (yes(v.heavy_filter_or_sticker)) reasons.push("필터나 스티커가 없는 사진이 좋아요");
  if (yes(v.occluded_by_mask_or_sunglasses)) reasons.push("마스크·선글라스를 벗은 사진이 좋아요");

  if (reasons.length > 0) return { result: "soft_fail", reasons };

  return PASS;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image;
    const inputRule: string = body?.inputRule;

    // 이번 단계는 solo_face 만 검사한다. 그 외(pet, multi_face, none, 값 없음)는
    // Gemini 를 부르지 않고 바로 통과 — 비용과 대기 시간을 아낀다.
    if (!image || inputRule !== "solo_face") {
      return NextResponse.json(PASS);
    }

    const inspection = await inspect(image);
    if (!inspection) return NextResponse.json(PASS);   // 판단 불가 → 통과

    return NextResponse.json(judge(inspection));
  } catch (e: unknown) {
    // 예상 못 한 어떤 에러도 사용자를 막지 않는다.
    console.error("validate-photo error:", (e as { message?: string })?.message);
    return NextResponse.json(PASS);
  }
}
