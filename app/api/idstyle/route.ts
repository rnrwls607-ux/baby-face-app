// ⛔ 은퇴 — 홈 노출 없음, 앱 내 링크 0 (URL 직접 접근만 가능). 증명사진 55종이 이 영역을 대체.
//    gpt-image-1은 2026-10-23 OpenAI 종료 예정 → 그 이후 이 route는 동작하지 않음.
//    삭제하지 않고 보존하는 이유: "견본 템플릿에 얼굴만 교체"하는 방식의 유일한 참고 구현
//    (얼굴 여러 장 + 스타일 견본을 image[]로 함께 보내 신원만 옮기는 패턴).
//    되살리려면 아래 4가지가 필요:
//      ① gpt-image-2 이전 (모델명은 바로 아래 OPENAI_MODEL 한 줄이 유일한 격리 지점)
//      ② 파라미터 3개 실측 — input_fidelity 지원 여부 / 다중 image[] 입력 / size 고정값("1024x1536") 수용 여부
//      ③ 배선 8지점 (concepts.ts 유니온·CONCEPTS 블록·conceptForGo, page.tsx GO_CATEGORIES·홈 카드·detail onClick, route, page)
//      ④ 타임아웃 사슬 교정 — 현재 maxDuration 60 < 내부 90s < 클라 100s 로 역전되어 있음(60초에서 함수가 끊김)
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { stampAiMetadata } from "../../lib/aiMark";
import { readFile } from "fs/promises";
import path from "path";
export const runtime = "nodejs";
export const maxDuration = 60;

// 🔑 모델 격리 지점: 증명사진은 GPT 이미지 모델 사용 (얼굴 보존이 Gemini보다 우수)
const OPENAI_MODEL = "gpt-image-1";
const RATIO_W = 3.5;
const RATIO_H = 4.5;

// 📌 스타일 견본 레지스트리: key → public/styles/ 파일명 + 설명
const STYLES: Record<string, { file: string; label: string }> = {
  blueshirt: { file: "idstyle-blueshirt.png", label: "S컬 블루 셔츠" },
};

function parseImage(input: string): { mimeType: string; data: string } {
  const m = input.match(/^data:(.+?);base64,(.*)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: "image/jpeg", data: input };
}

// 견본 파일 읽어서 Buffer로 반환
async function loadStyleBuffer(file: string): Promise<{ buf: Buffer; mime: string }> {
  const full = path.join(process.cwd(), "public", "styles", file);
  const buf = await readFile(full);
  const mime = file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return { buf, mime };
}

// 📐 결과를 3.5:4.5 비율로 크롭 (어깨선 위주: 위 22% / 아래 78%)
async function cropToRatio(dataUrl: string): Promise<string> {
  try {
    const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return dataUrl;
    const img = sharp(Buffer.from(m[2], "base64"));
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return dataUrl;
    const targetRatio = RATIO_W / RATIO_H;
    const curRatio = w / h;
    let cropW = w;
    let cropH = h;
    if (curRatio > targetRatio) cropW = Math.round(h * targetRatio);
    else cropH = Math.round(w / targetRatio);
    const left = Math.round((w - cropW) / 2);
    const top = Math.round((h - cropH) * 0.22);
    const out = await img
      .extract({ left: Math.max(0, left), top: Math.max(0, top), width: cropW, height: cropH })
      .png().toBuffer();
    return await stampAiMetadata(out.toString("base64")); // AI 생성물 비가시 표시
  } catch (e) {
    console.error("[idstyle] crop failed:", (e as { message?: string })?.message);
    return dataUrl;
  }
}

// 🔑 GPT 이미지 편집 호출: 얼굴들 + 견본 → 얼굴 교체된 증명사진
async function generateIdStyle(styleKey: string, faceDataUrls: string[]): Promise<string> {
  const style = STYLES[styleKey] || STYLES.blueshirt;
  const { buf: styleBuf, mime: styleMime } = await loadStyleBuffer(style.file);
  const faces = faceDataUrls.map(parseImage);

  const faceCount = faces.length;
  const prompt = `This is a FACE-PRESERVING ID photo task. You are given ${faceCount} photo(s) of ONE specific real person, followed by ONE style template image (the LAST image).

THE PERSON (most important):
- The first ${faceCount} image(s) are all the SAME real person, shown from different angles and expressions. Study them together to understand this exact person's true face.
- The output MUST show THIS EXACT person's face — the very same individual. Reproduce their real eyes, eye shape, nose, mouth, lips, eyebrows, face shape, jawline, cheekbones, and skin tone faithfully. It must look like a real photo of THIS person, NOT a different or generic "pretty" person who merely resembles them.
- Do NOT invent or imagine a new face. Do NOT beautify, slim, enlarge eyes, or alter their features. Preserve their natural identity exactly, including realistic skin texture.

THE STYLE TEMPLATE (last image) — copy these ONLY:
- Hairstyle, hair length and color; clothing/outfit; background color; composition; head size and position; shoulder-line crop; lighting; camera angle.
- Do NOT copy the template model's face or identity in any way.

RESULT: a Korean ID/passport photo of THE PERSON (from the first ${faceCount} photo(s)), wearing the template's hairstyle and outfit on the template's background. Front-facing, gentle natural closed-mouth smile, soft and friendly. Photorealistic, sharp focus. No text, no watermark, no border.`;

  // multipart/form-data 구성 (Web FormData + Blob)
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  form.append("size", "1024x1536"); // 세로형 (증명사진 비율에 가까움)
  form.append("quality", "high"); // 완성도 우선 (증명사진은 디테일 중요)
  form.append("input_fidelity", "high"); // ⭐ 얼굴 보존 강화
  form.append("n", "1");
  // 얼굴들 먼저, 견본 마지막 (image[] 배열로 여러 장)
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const bytes = new Uint8Array(Buffer.from(f.data, "base64"));
    form.append("image[]", new Blob([bytes], { type: f.mimeType }), `face${i + 1}.png`);
  }
  form.append("image[]", new Blob([new Uint8Array(styleBuf)], { type: styleMime }), "template.png");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
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
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 지연되고 있어요. 잠시 후 다시 시도해주세요. 🙏");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[idstyle] model=${OPENAI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    if (res.status === 429) throw new Error("지금 이용자가 많아요. 잠시 후 다시 시도해주세요. 🙏");
    throw new Error("OpenAI 오류 " + res.status + ": " + errText);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지를 받지 못했습니다. 다시 시도해주세요.");
  const dataUrl = `data:image/png;base64,${b64}`;
  return await cropToRatio(dataUrl);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "서버 설정 오류(OPENAI_API_KEY 없음)" }, { status: 500 });
    }
    const body = await req.json();
    const styleKey: string = body?.style || "blueshirt";
    const faces: string[] = (body?.faces || []).filter(Boolean);
    if (!faces.length) {
      return NextResponse.json({ error: "얼굴 사진을 한 장 이상 올려주세요." }, { status: 400 });
    }
    const output = await generateIdStyle(styleKey, faces);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("idstyle error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}