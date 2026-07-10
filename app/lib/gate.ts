// 사진 품질 게이트 — 업로드된 사진 한 장을 판정 API 에 보내 결과를 받는다.
//
// 안전 원칙: 어떤 에러가 나도 통과(pass)시킨다.
// 멀쩡한 사진을 잘못 막는 것이 최악의 경험이므로, 판정이 불가능하면 그냥 담는다.

import { downscaleForGate } from "./downscale";

export type GateState =
  | { status: "checking" }
  | { status: "pass" }
  | { status: "soft_fail"; reasons: string[] };

// 사진 한 장 = 고유 id + 원본 base64 + 판정 상태.
// id 를 두는 이유: 판정이 끝났을 때 배열 인덱스가 아니라 id 로 찾아 갱신하기 위함.
// (판정을 기다리는 동안 사용자가 다른 사진을 지우거나 더 올려도 안 꼬인다.)
export type Photo = { id: string; src: string; gate: GateState };

let seq = 0;
export function newPhotoId(): string {
  seq += 1;
  return `p${Date.now()}_${seq}`;
}

type CheckResult =
  | { ok: true; gate: GateState }        // 담아도 되는 사진 (pass 또는 soft_fail)
  | { ok: false; reasons: string[] };    // hard_fail — 담지 않는다

export async function checkPhoto(dataUrl: string, inputRule: string): Promise<CheckResult> {
  try {
    const small = await downscaleForGate(dataUrl);

    const res = await fetch("/api/validate-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: small, inputRule }),
    });

    const data = await res.json();

    if (data?.result === "hard_fail") {
      return { ok: false, reasons: Array.isArray(data.reasons) ? data.reasons : [] };
    }
    if (data?.result === "soft_fail") {
      return { ok: true, gate: { status: "soft_fail", reasons: Array.isArray(data.reasons) ? data.reasons : [] } };
    }
    return { ok: true, gate: { status: "pass" } };
  } catch {
    return { ok: true, gate: { status: "pass" } };   // 네트워크·파싱 실패 → 통과
  }
}
