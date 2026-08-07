// 🩺 Gemini 진단 전용 엔드포인트 (2026-07-25 신설 · 2026-08-08 mode=real 확장)
//
// 왜 만들었나: "지금 요청이 많아요"가 429(쿼터 소진)·503(진짜 혼잡)·401(키 문제)을
// 전부 같은 문구로 덮어버려서, 같은 증상으로 하루에 세 번 헤맸다. 이 route는
// 구글이 실제로 뭐라고 답했는지를 "자르지 않고" 그대로 보여준다 — 30초 안에 원인 판별이 목적.
//
// ★mode=real (2026-08-08): "diag 미니 생성은 24초 성공, 실전 hanbok은 230초 무응답"의
// 격차를 격리하기 위한 실전 재현 실험대. hanbok의 실제 조립 프롬프트(HANBOK_PROMPT import
// — 복사 2벌 금지)와 샘플 입력 사진을 그대로 보내되, 노브 4개로 축을 하나씩 바꿔
// [이미지 유무 × 프롬프트 길이 × 해상도 × 스트리밍] 중 무엇이 230초를 만드는지 잰다.
// 사용자 플로우·코인 경로는 완전히 우회한다.
//
// 보호: ①카카오 로그인 + COIN_ADMIN_IDS 에 내 uid가 있으면 통과(기존 관리자 패턴 재사용)
//       ②또는 ?key=<DIAG_SECRET> 이 환경변수와 일치하면 통과(로그인 없이 쓰는 비상구)
//       둘 다 아니면 404 — 존재 자체를 숨긴다.
// ★API 키 값은 응답·로그 어디에도 출력하지 않는다. 존재 여부와 길이만 보고한다.
//
// 사용법:
//   /api/diag/gemini                 → flash 모델 진단 (기본)
//   /api/diag/gemini?model=pro       → Pro 모델 진단
//   /api/diag/gemini?model=lite      → flash-lite 진단
//   /api/diag/gemini?gen=0           → 무료 메타 조회만 (생성 호출 안 함 = 비용 0)
//   /api/diag/gemini?key=<비밀키>     → 로그인 없이 접근
//   ── mode=real (Pro 고정 · ★성공 시 Pro 1K 1장 비용, 행·거절은 0원) ──
//   /api/diag/gemini?mode=real                → hanbok 실전 프롬프트 + 샘플 사진 (실전 등가)
//   /api/diag/gemini?mode=real&img=0          → 이미지 없이 (t2i A/B)
//   /api/diag/gemini?mode=real&len=short      → 47자 프롬프트로 (길이 A/B)
//   /api/diag/gemini?mode=real&size=1K        → imageSize 명시 (1K|2K|4K — 미지정=실전 동일)
//   /api/diag/gemini?mode=real&stream=1       → streamGenerateContent A/B (★청크 조립은 diag 전용
//                                               — 실전 route는 무접촉, 전환은 판정 후 별도 커밋)
import { NextRequest, NextResponse } from "next/server";
import { classifyGeminiError } from "../../../lib/gemini";
import { getUserId } from "../../../lib/auth";
import { HANBOK_PROMPT } from "../../hanbok/route";

export const runtime = "nodejs";
export const maxDuration = 240; // mode=real·?model=pro가 실전 Pro 부하를 재현 — 자체 컷 230초가 먼저 발동한다

const MODELS: Record<string, string> = {
  flash: "gemini-3.1-flash-image",
  pro: "gemini-3-pro-image",
  lite: "gemini-3.1-flash-lite",
};

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const CUT_MS = 230000; // Vercel 240초 킬보다 먼저 우리가 끊고 TIMEOUT으로 판정한다
const SHORT_PROMPT = "A single small red circle on a white background.";

function allowed(request: NextRequest): boolean {
  // ① 로컬(개발)에서는 무조건 허용 — 설정 0으로 바로 쓸 수 있는 길. dev-login과 같은 취지.
  if (process.env.NODE_ENV !== "production") return true;
  // ② 배포에서는 비밀키 ?key= 또는 관리자 로그인만.
  const secret = process.env.DIAG_SECRET;
  if (secret && request.nextUrl.searchParams.get("key") === secret) return true;
  const uid = getUserId(request);
  if (!uid) return false;
  const admins = (process.env.COIN_ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  return admins.includes(uid); // ★chargeAllowed()를 안 쓰는 이유: 그건 COIN_CHARGE_OPEN=true면
                               //   전체 개방이라 진단 엔드포인트까지 열려버린다.
}

// 230초 자체 컷 fetch — 행(무응답)을 Vercel 킬 전에 TIMEOUT으로 잡아 verdict로 보고한다.
async function timedFetch(url: string, init: RequestInit): Promise<{ res?: Response; ms: number; timeout: boolean; netErr?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, ms: Date.now() - t0, timeout: false };
  } catch (e: unknown) {
    const aborted = (e as { name?: string })?.name === "AbortError";
    return { ms: Date.now() - t0, timeout: aborted, netErr: aborted ? undefined : ((e as Error)?.message || "fetch 실패") };
  } finally {
    clearTimeout(timer);
  }
}

// ── mode=real: hanbok 실전 재현 A/B ──────────────────────────────────────────
type PartLike = { text?: string; thought?: boolean; inlineData?: { data?: string }; inline_data?: { data?: string } };
const partImg = (p: PartLike) => p?.inlineData?.data || p?.inline_data?.data || "";

async function realMode(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const withImg = q.get("img") !== "0";                          // 기본 1 = 실전과 동일
  const len = q.get("len") === "short" ? "short" : "full";       // 기본 full = 실전 프롬프트
  const size = q.get("size");                                    // 미지정 = 실전과 동일(imageConfig 생략)
  const stream = q.get("stream") === "1";                        // 기본 0 = 실전과 동일(단일 응답)
  if (size && !["1K", "2K", "4K"].includes(size)) {
    return NextResponse.json({ error: "size는 1K|2K|4K (대문자)", got: size }, { status: 400 });
  }
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ ok: false, mode: "real", verdict: "GEMINI_API_KEY가 서버에 없습니다." });
  }
  const model = MODELS.pro; // 조사 대상은 Pro 고정

  // 샘플 입력 사진 — 실전(1024px JPEG q0.9)에 준하는 기존 BA 자산(768×960 webp).
  // ★fs 미사용: public/은 Vercel 함수 번들에 트레이스되지 않을 수 있다 → 자기 배포의 정적 URL에서 가져온다.
  let inlinePart: { inline_data: { mime_type: string; data: string } } | null = null;
  let sampleBytes = 0;
  if (withImg) {
    const assetUrl = new URL("/examples/ba/hanbok-before-1.webp", request.nextUrl.origin);
    const a = await fetch(assetUrl).catch(() => null);
    if (!a || !a.ok) {
      return NextResponse.json({ ok: false, mode: "real", verdict: `샘플 이미지 로드 실패(${a ? a.status : "network"}) — ${assetUrl.pathname}` });
    }
    const buf = Buffer.from(await a.arrayBuffer());
    sampleBytes = buf.length;
    inlinePart = { inline_data: { mime_type: "image/webp", data: buf.toString("base64") } };
  }

  const prompt = len === "full" ? HANBOK_PROMPT : SHORT_PROMPT;
  const generationConfig: Record<string, unknown> = { responseModalities: ["IMAGE"] };
  if (size) generationConfig.imageConfig = { imageSize: size };
  const parts: unknown[] = [{ text: prompt }];
  if (inlinePart) parts.push(inlinePart);
  const body = JSON.stringify({ contents: [{ parts }], generationConfig });
  const headers = { "x-goog-api-key": apiKey, "Content-Type": "application/json" };
  const knobs = `img=${withImg ? 1 : 0} len=${len}(${prompt.length}자) size=${size ?? "(미지정)"} stream=${stream ? 1 : 0}`;

  let tag = "OK";
  let detail = "";
  let stats: Record<string, unknown> = {};
  const t0 = Date.now();

  if (!stream) {
    // ── 실전과 동일한 단일 응답 경로 ──
    const r = await timedFetch(`${BASE}/models/${model}:generateContent`, { method: "POST", headers, body });
    if (r.timeout) {
      tag = "TIMEOUT"; detail = "230초 내 무응답(행)";
    } else if (r.netErr || !r.res) {
      tag = "NETWORK"; detail = r.netErr || "fetch 실패";
    } else if (!r.res.ok) {
      const errBody = await r.res.text().catch(() => "");
      tag = classifyGeminiError(r.res.status, errBody).tag;
      detail = `HTTP ${r.res.status}: ${errBody.slice(0, 600)}`;
    } else {
      const data = await r.res.json().catch(() => null);
      const respParts: PartLike[] = data?.candidates?.[0]?.content?.parts || [];
      const imgs = respParts.filter(p => partImg(p));
      const thoughts = imgs.filter(p => p.thought);
      const finals = imgs.filter(p => !p.thought);
      const finalLen = finals.length ? partImg(finals[finals.length - 1]).length : 0;
      stats = { parts: respParts.length, img: imgs.length, thought: thoughts.length, finalKB: Math.round(finalLen * 0.75 / 1024), finish: data?.candidates?.[0]?.finishReason || "-" };
      if (!finals.length) { tag = "NOIMAGE"; detail = "200인데 최종 이미지 없음(안전 필터·중단 의심)"; }
      else detail = `parts=${stats.parts} img=${stats.img}(thought ${stats.thought}) final=${stats.finalKB}KB finish=${stats.finish}`;
    }
    const ms = r.ms;
    const summary = `real ${knobs} → ${tag} ${ms}ms${detail ? " · " + detail : ""}`;
    console.log(`[DIAG][real] ${summary}`);
    return NextResponse.json({ ok: tag === "OK", mode: "real", model, knobs, promptChars: prompt.length, sampleBytes, ms, tag, stats, summary, verdict: summary });
  }

  // ── 스트리밍 A/B (★diag 전용 청크 조립 — 실전 route 무접촉) ──
  // 판정 재료가 되는 3시각: 헤더 도착·첫 청크·마지막 청크. "헤더도 안 옴 / 청크가 흐르다 멎음"을 가른다.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CUT_MS);
  let headerMs = -1, firstChunkMs = -1, chunks = 0, imgN = 0, thoughtN = 0, finalLen = 0, finish = "-";
  try {
    const res = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, { method: "POST", headers, body, signal: ctrl.signal });
    headerMs = Date.now() - t0;
    if (!res.ok || !res.body) {
      const errBody = await res.text().catch(() => "");
      tag = classifyGeminiError(res.status, errBody).tag;
      detail = `HTTP ${res.status}: ${errBody.slice(0, 600)}`;
    } else {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          chunks++;
          if (firstChunkMs < 0) firstChunkMs = Date.now() - t0;
          try {
            const obj = JSON.parse(line.slice(6));
            const ps: PartLike[] = obj?.candidates?.[0]?.content?.parts || [];
            for (const p of ps) {
              const d = partImg(p);
              if (!d) continue;
              imgN++;
              if (p.thought) thoughtN++;
              else finalLen = d.length;
            }
            if (obj?.candidates?.[0]?.finishReason) finish = obj.candidates[0].finishReason;
          } catch { /* 조각난 data 라인은 건너뜀 */ }
        }
      }
      if (!finalLen) { tag = "NOIMAGE"; detail = "스트림 종료인데 최종 이미지 없음"; }
    }
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "AbortError") {
      tag = "TIMEOUT";
      detail = headerMs < 0 ? "230초 내 헤더도 안 옴(연결 무응답)" : `청크 흐르다 멎음(헤더 ${headerMs}ms · 청크 ${chunks}개 후 침묵)`;
    } else {
      tag = "NETWORK"; detail = (e as Error)?.message || "fetch 실패";
    }
  } finally {
    clearTimeout(timer);
  }
  const totalMs = Date.now() - t0;
  stats = { headerMs, firstChunkMs, chunks, img: imgN, thought: thoughtN, finalKB: Math.round(finalLen * 0.75 / 1024), finish };
  if (tag === "OK") detail = `firstChunk=${firstChunkMs}ms chunks=${chunks} img=${imgN}(thought ${thoughtN}) final=${stats.finalKB}KB finish=${finish}`;
  const summary = `real ${knobs} → ${tag} ${totalMs}ms${detail ? " · " + detail : ""}`;
  console.log(`[DIAG][real] ${summary}`);
  return NextResponse.json({ ok: tag === "OK", mode: "real", model, knobs, promptChars: prompt.length, sampleBytes, ms: totalMs, tag, stats, summary, verdict: summary });
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = request.nextUrl.searchParams;
  if (q.get("mode") === "real") return realMode(request);

  const modelKey = q.get("model") || "flash";
  const model = MODELS[modelKey];
  if (!model) {
    return NextResponse.json({ error: `model은 ${Object.keys(MODELS).join("|")} 중 하나`, got: modelKey }, { status: 400 });
  }
  const runGen = q.get("gen") !== "0";

  // ★키 자체는 절대 노출하지 않는다 — 존재 여부와 길이만.
  const apiKey = process.env.GEMINI_API_KEY || "";
  const env = {
    name: "GEMINI_API_KEY",
    present: apiKey.length > 0,
    length: apiKey.length,
    // ★키 값은 한 글자도 내보내지 않는다. 대신 "형식 판정 결과"만 — 키가 바뀌었는지 판별용.
    format: apiKey.startsWith("AIza") ? "AI Studio 표준(AIza…)" : "비표준 형식",
  };
  if (!env.present) {
    return NextResponse.json({
      ok: false, model, env,
      verdict: "GEMINI_API_KEY가 서버에 없습니다. Vercel 환경변수를 확인하세요.",
    });
  }

  const headers = { "x-goog-api-key": apiKey, "Content-Type": "application/json" };

  // ① 메타 조회 — 무료·즉시. 키가 유효한지, 그 모델에 접근 권한이 있는지를 본다.
  const t0 = Date.now();
  let meta: Record<string, unknown>;
  try {
    const res = await fetch(`${BASE}/models/${model}`, { headers });
    const body = await res.text();
    meta = {
      status: res.status,
      ms: Date.now() - t0,
      tag: res.ok ? "OK" : classifyGeminiError(res.status, body).tag,
      body: body.slice(0, 4000), // 자르지 않는 게 원칙이지만 응답 폭주만 방지(4000자)
    };
  } catch (e: unknown) {
    meta = { status: 0, ms: Date.now() - t0, tag: "NETWORK", body: (e as Error)?.message || "fetch 실패" };
  }

  // ② 실제 생성 호출 — 쿼터/과금 소진은 여기서만 드러난다.
  //    쿼터가 막혀 있으면 즉시 거절되므로 비용 0. 성공하면 이미지 1장 값이 나간다.
  //    ★maxDuration 240 승격 후에는 Pro 행도 60초 킬 대신 자체 컷(230초)이 TIMEOUT으로 판정한다.
  let generate: Record<string, unknown> | null = null;
  if (runGen) {
    const r = await timedFetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: SHORT_PROMPT }] }],
        generationConfig: modelKey === "lite" ? {} : { responseModalities: ["IMAGE"] },
      }),
    });
    if (r.timeout) {
      generate = { status: 0, ms: r.ms, tag: "TIMEOUT", body: "230초 내 무응답 — 자체 컷 발동(행)" };
    } else if (r.netErr || !r.res) {
      generate = { status: 0, ms: r.ms, tag: "NETWORK", body: r.netErr || "fetch 실패" };
    } else {
      const body = await r.res.text();
      generate = {
        status: r.res.status,
        ms: r.ms,
        tag: r.res.ok ? "OK" : classifyGeminiError(r.res.status, body).tag,
        // ★성공 시 base64 이미지가 수 MB라 그대로 뱉으면 브라우저가 멈춘다 → 성공이면 요약만.
        body: r.res.ok ? `(성공 — 응답 ${body.length}자, 이미지 수신됨)` : body.slice(0, 4000),
      };
    }
  }

  // ③ 사람이 읽는 결론 — 이게 이 route의 존재 이유다.
  const tags = [meta.tag, generate?.tag].filter(Boolean) as string[];
  let verdict: string;
  if (tags.includes("QUOTA")) {
    verdict = "★쿼터/과금 문제. 구글 AI Studio·Cloud 콘솔에서 이 키의 할당량과 결제 상태를 확인하세요. (우리 코드 문제 아님)";
  } else if (tags.includes("AUTH")) {
    verdict = "★키/권한 문제. GEMINI_API_KEY가 만료·삭제·제한됐거나 이 모델 접근 권한이 없습니다.";
  } else if (tags.includes("CLIENT")) {
    verdict = "요청 형식 문제(4xx). 아래 body의 구글 설명을 확인하세요.";
  } else if (tags.includes("TIMEOUT")) {
    verdict = "★무응답(행) — 230초 내 응답이 없습니다. 쿼터·키 문제가 아니라(그건 즉시 거절) 경로 스톨입니다. mode=real의 stream=1 A/B로 갈라보세요.";
  } else if (tags.includes("TRANSIENT") || tags.includes("SERVER")) {
    verdict = "구글 쪽 일시 오류. 잠시 후 재시도하면 대개 해소됩니다.";
  } else if (tags.includes("NETWORK")) {
    verdict = "네트워크 오류 — 구글에 닿지 못했습니다.";
  } else {
    verdict = "정상. 이 모델은 지금 잘 동작합니다.";
  }

  const ok = !tags.some(t => t !== "OK");
  console.log(`[DIAG][gemini] model=${model} meta=${meta.status} gen=${generate?.status ?? "skip"} verdict=${verdict}`);
  return NextResponse.json({ ok, model, modelKey, env, meta, generate, verdict }, { status: 200 });
}
