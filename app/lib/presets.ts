// ────────────────────────────────────────────────────────────
// 사진 컨셉(프리셋) 모음
// 새 컨셉을 추가할 땐 이 파일에 객체 하나만 더 넣으면 됩니다.
// (핵심 생성 코드 generate/route.ts 는 건드리지 않아요)
// ────────────────────────────────────────────────────────────

// 한 컨셉(프리셋)이 가져야 할 정보의 "틀"
export interface Preset {
  id: string;           // 고유 키 (영문, 예: "baby")
  name: string;         // 사용자에게 보일 이름
  description: string;  // 짧은 설명
  needsGender: boolean; // 성별 선택이 필요한 컨셉인지

  // 유료(Gen-4) 경로에서 쓸 프롬프트를 만들어주는 함수
  buildGen4Prompt: (opts: { isBoy: boolean }) => string;

  // 무료(FLUX) 경로에서 쓸 프롬프트를 만들어주는 함수
  buildFluxPrompt: (opts: { isBoy: boolean; otherFeatures: string }) => string;

  // 무료(FLUX) 경로에서 피하고 싶은 것들(네거티브 프롬프트)
  fluxNegativePrompt: string;

  // 가격(원) — 나중에 결제 붙일 때 사용 (지금은 자리만 잡아둠)
  price: number;
}

// ── 컨셉 1: 우리 아기 얼굴 ──────────────────────────────────
const babyPreset: Preset = {
  id: "baby",
  name: "우리 아기 얼굴",
  description: "엄마·아빠 사진으로 미래의 아기 얼굴을 생성",
  needsGender: true,

  buildGen4Prompt: ({ isBoy }) => {
    const babyGender = isBoy ? "baby boy" : "baby girl";
    return `A candid lifestyle photograph of an adorable Korean ${babyGender}, around 12 months old, whose facial features are a natural blend of @mom and @dad. The baby is sitting on a soft cream play mat in a cozy, sunlit living room, gentle natural window light, softly blurred warm home background, chubby cheeks, looking toward the camera. Photorealistic candid photo.`;
  },

  buildFluxPrompt: ({ isBoy, otherFeatures }) => {
    const otherPart = otherFeatures ? ", also inheriting " + otherFeatures : "";
    const base = isBoy
      ? "professional studio portrait photo of a real Korean baby boy, exactly 1 year old infant, extremely chubby round baby cheeks, large round baby head, very short wispy hair, tiny baby nose, smooth plump baby skin, baby fat, genuine toddler proportions, white studio background, photorealistic DSLR photo"
      : "professional studio portrait photo of a real Korean baby girl, exactly 1 year old infant, extremely chubby round baby cheeks, large round baby head, very short wispy hair, tiny baby nose, smooth plump baby skin, baby fat, genuine toddler proportions, white studio background, photorealistic DSLR photo";
    return base + otherPart;
  },

  fluxNegativePrompt:
    "cartoon, anime, 3d render, CGI, illustration, toy, doll, oversized eyes, manga, stylized, child, kid, teenager, adult, earrings, makeup, text, watermark, deformed, bad anatomy, low quality",

  price: 0, // 무료 (현재 정책)
};

// ── 모든 프리셋 모음 ────────────────────────────────────────
// ✅ 새 컨셉은 위처럼 객체 하나 만들고, 아래 presets 에 한 줄 추가하면 끝!
export const presets: Record<string, Preset> = {
  baby: babyPreset,
};

// id로 프리셋을 꺼내는 도우미
export function getPreset(id: string): Preset {
  const preset = presets[id];
  if (!preset) throw new Error("알 수 없는 프리셋: " + id);
  return preset;
}