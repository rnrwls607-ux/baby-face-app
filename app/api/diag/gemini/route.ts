// 🩺 Gemini 진단 전용 엔드포인트 (2026-07-25 신설)
//
// 왜 만들었나: "지금 요청이 많아요"가 429(쿼터 소진)·503(진짜 혼잡)·401(키 문제)을
// 전부 같은 문구로 덮어버려서, 같은 증상으로 하루에 세 번 헤맸다. 이 route는
// 구글이 실제로 뭐라고 답했는지를 "자르지 않고" 그대로 보여준다 — 30초 안에 원인 판별이 목적.
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
import { NextRequest, NextResponse } from "next/server";
import { classifyGeminiError } from "../../../lib/gemini";
import { getUserId } from "../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS: Record<string, string> = {
  flash: "gemini-3.1-flash-image",
  pro: "gemini-3-pro-image",
  lite: "gemini-3.1-flash-lite",
};

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

export async function GET(request: NextRequest) {
  if (!allowed(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = request.nextUrl.searchParams;
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
  const base = "https://generativelanguage.googleapis.com/v1beta";

  // ① 메타 조회 — 무료·즉시. 키가 유효한지, 그 모델에 접근 권한이 있는지를 본다.
  const t0 = Date.now();
  let meta: Record<string, unknown>;
  try {
    const res = await fetch(`${base}/models/${model}`, { headers });
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
  let generate: Record<string, unknown> | null = null;
  if (runGen) {
    const g0 = Date.now();
    try {
      const res = await fetch(`${base}/models/${model}:generateContent`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: "A single small red circle on a white background." }] }],
          generationConfig: modelKey === "lite" ? {} : { responseModalities: ["IMAGE"] },
        }),
      });
      const body = await res.text();
      generate = {
        status: res.status,
        ms: Date.now() - g0,
        tag: res.ok ? "OK" : classifyGeminiError(res.status, body).tag,
        // ★성공 시 base64 이미지가 수 MB라 그대로 뱉으면 브라우저가 멈춘다 → 성공이면 요약만.
        body: res.ok ? `(성공 — 응답 ${body.length}자, 이미지 수신됨)` : body.slice(0, 4000),
      };
    } catch (e: unknown) {
      generate = { status: 0, ms: Date.now() - g0, tag: "NETWORK", body: (e as Error)?.message || "fetch 실패" };
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
