import { NextRequest, NextResponse } from "next/server";
import { fetchGeminiWithRetry, geminiFriendlyError } from "../../lib/gemini";
import { stampAiMetadata } from "../../lib/aiMark";
import { cropToRatio } from "../../lib/crop";
export const runtime = "nodejs";
export const maxDuration = 240; // Pro 추론형 대응 — Fluid Compute 전제
// 펫 라운드 — 나노바나나 Pro (다른 flash route 무영향)
const GEMINI_MODEL = "gemini-3-pro-image-preview";
function parseImage(dataUrl: string): { mimeType: string; data: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return { mimeType: "image/jpeg", data: dataUrl.replace(/^data:.*;base64,/, "") };
  return { mimeType: m[1], data: m[2] };
}
async function generatePetminhwa(imageDataUrl: string): Promise<string> {
  const img = parseImage(imageDataUrl);
  const prompt = `TASK
Transform the input pet photo into a traditional Korean folk painting (Joseon minhwa) portrait — THIS pet as the beloved, dignified subject of a classic Korean painting. The result must feel like a genuine painted artwork on hanji paper, AND the owner must recognize their own pet at first glance. Identity survives the style — that is the whole craft.

PET IDENTITY THROUGH THE PAINTING (most important):
- The painted pet is the EXACT pet from the input photo: same species, same breed, same coat colors, same distinctive markings in the SAME places, same ear shape, same eye color, same face impression — all faithfully translated into painted form.
- Stylize the RENDERING, never the IDENTITY: fur texture may simplify into brushwork, but every patch, stripe, spot, and color stays exactly where it is on THIS animal. A cream pet stays cream; a striped pet keeps its exact stripes.
- The owner's test: "someone painted a masterpiece of MY baby" — never "a generic animal painting."

MINHWA STYLE (commit fully):
- Ground: soft warm hanji (Korean mulberry paper) texture with a gentle aged warmth — the painting sits ON the paper.
- Line: confident, varied dark ink outlines with visible brush character.
- Color: flat, matte mineral-pigment coloring in muted traditional tones — deep red, indigo, ochre, jade green, used tastefully and sparingly; soft shading at most, never glossy digital gradients.
- Spirit: the charming, slightly naive yet dignified soul of Joseon folk painting — like the beloved tiger-and-magpie tradition, but starring THIS pet with warm affection.
- It must read as a PAINTING: no photographic textures remaining anywhere. Yet NOT anime, NOT chibi, NOT western watercolor, NOT oil painting, NOT a photo filter.

COMPOSITION:
- The pet sits proudly at the center — dignified and adorable, body mostly visible, face turned to the viewer and fully clear. It may sit on a simple traditional silk cushion.
- Surround it tastefully with classic minhwa motifs in the margins: peony blossoms, auspicious stylized clouds, a pine branch, perhaps a full moon — decoration frames the pet, never crowds or covers it. The pet is the undisputed protagonist, filling most of the frame.
- Vertical portrait format.

TEXT & SEAL BAN (critical — traditional paintings tempt the model here):
- Absolutely NO calligraphy, NO hanja characters, NO Hangul, NO red seal stamps (nakgwan), NO signatures, NO inscriptions of any kind, anywhere. If a corner feels empty, fill it with a small motif or leave clean paper — never with writing or a seal.

SELF-CHECK before finishing:
- Side by side with the input: is this unmistakably the SAME pet — same markings in the same places, same face? Does it read as genuine minhwa (hanji + ink line + flat pigment), not anime or watercolor? Zero characters, seals, or writing anywhere? Is the pet large, central, and uncrowded? Only then is the painting complete.

ABSOLUTELY AVOID:
- A different or generic animal; changed breed, coat colors, or marking placement; a cute mascot that isn't THIS pet.
- Any text, hanja, Hangul, seal stamps, or signatures.
- Anime/cartoon/chibi style, watercolor wash, western oil texture, 3D render, or leftover photographic texture.
- Clothing or costumes on the pet (this portrait honors the pet as it is).
- Over-decoration crowding the pet; motifs covering the face or body.
- Watermarks, borders, frames.`;
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
      "petminhwa"
    );
  } catch (e: unknown) {
    clearTimeout(timer);
    if ((e as { name?: string })?.name === "AbortError") throw new Error("이미지 생성이 230초를 넘겨 중단했어요. 다시 시도해주세요.");
    throw e;
  }
  clearTimeout(timer);
  console.log(`[petminhwa] model=${GEMINI_MODEL} status=${res.status} ${Date.now() - t0}ms`);
  if (!res.ok) throw new Error(await geminiFriendlyError(res, "petminhwa"));
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgParts = respParts.filter((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p?.inlineData?.data || p?.inline_data?.data);
  const finalParts = imgParts.filter((p: { thought?: boolean }) => !p.thought);
  // 진단 로그 — 200 응답인데 이미지가 없을 때(안전 필터·토큰 중단 등) 원인을 남긴다
  const cand = data?.candidates?.[0];
  console.log(`[petminhwa] finish=${cand?.finishReason || "-"} block=${data?.promptFeedback?.blockReason || "-"} parts=${respParts.length} img=${imgParts.length} ${Date.now() - t0}ms`);
  const chosen = (finalParts.length ? finalParts : imgParts).pop();
  const b64 = chosen?.inlineData?.data || chosen?.inline_data?.data;
  if (!b64) {
    const txt = respParts.find((p: { text?: string }) => p.text)?.text;
    console.error(`[petminhwa] 이미지 없음 — finish=${cand?.finishReason || "-"} text=${(txt || "").slice(0, 500)}`);
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
    if (!image) return NextResponse.json({ error: "사진을 올려주세요." }, { status: 400 });
    const output = await generatePetminhwa(image);
    return NextResponse.json({ output: [output] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("petminhwa error:", err?.message);
    return NextResponse.json({ error: err?.message || "오류가 발생했습니다." }, { status: 500 });
  }
}