"use client";
// 얼굴 사전 검사 상태 훅 — 사진 목록 + 판정 + 안내 문구를 한 곳에서 소유한다.
//
// 왜 훅으로 뽑았나: 이 로직이 65개 페이지에 22줄씩 복제돼 있었다. 판정 규칙이나
// 안내 문구를 한 번 바꾸려면 65곳을 고쳐야 했고, 그중 한 곳만 빠져도 티가 안 난다.
//
// ★hard_fail을 setError로 보내지 않는 것이 이 훅의 핵심 변경이다. 기존에는 사진이
//   말없이 사라지고 이유는 화면 위쪽 결제·서버 오류용 분홍칸에 떴다 — 인과가 끊기고
//   결제 실패와 같은 옷을 입었다. 이제 사라진 자리 바로 아래에서 이유를 말한다.
import { useState } from "react";
import { checkPhoto, newPhotoId, type Photo } from "./gate";

// 업로드 카드 아래에 뜨는 안내. 한 배치에서 hard/soft가 같이 나올 수 있어 배열로 준다.
export type FaceNote =
  | { kind: "checking" }
  | { kind: "ok"; count: number }
  | { kind: "soft"; index: number; reasons: string[] }   // index = 0-based (표시는 +1). 단일 모드는 -1
  | { kind: "hard"; count: number; reasons: string[] };

export function useFaceCheck(inputRule: string = "solo_face") {
  const [photos, setPhotos] = useState<Photo[]>([]);
  // 직전 배치에서 담기지 못한(hard_fail) 사진들 — 목록에 남지 않으므로 따로 들고 있는다.
  const [rejected, setRejected] = useState<{ count: number; reasons: string[] } | null>(null);

  const images = photos.map((p) => p.src);

  const addPhotos = async (srcs: string[]): Promise<void> => {
    setRejected(null); // 새 배치가 시작되면 지난 안내는 치운다
    // 1) 먼저 "확인 중" 상태로 담아 화면에 바로 보여준다.
    const batch: Photo[] = srcs.map((src) => ({ id: newPhotoId(), src, gate: { status: "checking" } }));
    setPhotos((prev) => [...prev, ...batch]);

    // 2) 여러 장을 동시에 판정한다.
    const checks = await Promise.all(batch.map((p) => checkPhoto(p.src, inputRule)));

    const out = new Set<string>();
    const kept = new Map<string, Photo["gate"]>();
    const reasons: string[] = [];
    batch.forEach((p, i) => {
      const c = checks[i];
      if (c.ok) kept.set(p.id, c.gate);
      else { out.add(p.id); reasons.push(...c.reasons); }
    });

    // 3) 인덱스가 아니라 id 로 찾아 지우고 갱신한다 — 기다리는 동안 사진이
    //    추가·삭제돼도 엉뚱한 사진을 건드리지 않는다.
    setPhotos((prev) => prev
      .filter((p) => !out.has(p.id))
      .map((p) => (kept.has(p.id) ? { ...p, gate: kept.get(p.id)! } : p)));

    if (out.size > 0) setRejected({ count: out.size, reasons: [...new Set(reasons)] });
  };

  const removePhoto = (idx: number) => {
    setRejected(null);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // "이 사진 바꾸기" — 지목된 사진을 빼고 새로 고른 사진을 같은 자리에서 검사한다.
  const replacePhoto = async (idx: number, srcs: string[]): Promise<void> => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    await addPhotos(srcs);
  };

  const resetPhotos = () => { setPhotos([]); setRejected(null); };

  // 표시용 안내 목록 — 우선순위: 검사 중 > (담지 못함 + 아쉬운 사진) > 모두 통과
  const notes: FaceNote[] = (() => {
    if (photos.some((p) => p.gate.status === "checking")) return [{ kind: "checking" }];
    const list: FaceNote[] = [];
    if (rejected) list.push({ kind: "hard", count: rejected.count, reasons: rejected.reasons });
    photos.forEach((p, i) => {
      if (p.gate.status === "soft_fail") list.push({ kind: "soft", index: i, reasons: p.gate.reasons });
    });
    if (list.length === 0 && photos.length > 0) list.push({ kind: "ok", count: photos.length });
    return list;
  })();

  return { photos, images, notes, addPhotos, removePhoto, replacePhoto, resetPhotos };
}

// ─────────────────────────────────────────────────────────────
// 단일 업로드(1장) 모드 — 53종 확산용.
//
// 왜 훅을 따로 두나: 이 페이지들은 이미 const [image, setImage] = useState<string>("")
// 를 갖고 있고 handleSubmit·버튼 활성 조건이 전부 그 값을 본다. 사진 소유권을 훅으로
// 옮기면 페이지마다 손댈 곳이 늘어난다. 그래서 이 훅은 "판정만" 들고 있는다.
// ─────────────────────────────────────────────────────────────
type SingleState =
  | null
  | { kind: "checking" }
  | { kind: "pass" }
  | { kind: "soft"; reasons: string[] }
  | { kind: "hard"; reasons: string[] };

export function useFaceCheckSingle(inputRule: string = "solo_face") {
  const [state, setState] = useState<SingleState>(null);

  /** 검사 실행. 반환값 false = hard_fail이라 이 사진은 담으면 안 된다. */
  const check = async (src: string): Promise<boolean> => {
    setState({ kind: "checking" });
    const r = await checkPhoto(src, inputRule);
    if (!r.ok) { setState({ kind: "hard", reasons: r.reasons }); return false; }
    setState(r.gate.status === "soft_fail" ? { kind: "soft", reasons: r.gate.reasons } : { kind: "pass" });
    return true;
  };

  const clear = () => setState(null);

  const notes: FaceNote[] =
    state === null ? []
    : state.kind === "checking" ? [{ kind: "checking" }]
    : state.kind === "pass" ? [{ kind: "ok", count: 1 }]
    : state.kind === "soft" ? [{ kind: "soft", index: -1, reasons: state.reasons }]
    : [{ kind: "hard", count: 1, reasons: state.reasons }];

  return { notes, check, clear };
}
