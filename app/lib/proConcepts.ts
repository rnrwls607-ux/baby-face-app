// Pro(gemini-3-pro-image) 엔진을 쓰는 컨셉 목록과 혼잡 판별 — 클라 안내 전용.
//
// 왜 상수인가: 엔진은 서버 route 파일에만 있고 클라 번들은 그 파일을 읽을 수 없다.
// 그래서 목록을 여기 두되, ★손으로 고르지 않는다 — route에서 "gemini-3-pro-image"를
// grep한 결과를 그대로 옮긴 것이고, 게이트에서 route 실측과 자동 대조한다.
// ★새 Pro 컨셉을 만들거나 엔진을 바꾸면 이 배열도 같이 고쳐야 한다(대조 게이트가 잡는다).
// 실측 기준: 2026-08-13 · Pro 29종 / flash 108 / GPT 26.
export const PRO_CONCEPTS: string[] = [
  "campusgrad", "cheerglam", "digicam", "airportsnap", "couple", "coupletravel", "crewglam", "dresswedding",
  "duofamily", "familyhanbok", "familypet", "fixnight", "fourcutcouple", "friend",
  "goldenhour", "guestlook", "hanbok", "hanbokcouple", "idolglam", "petbirthday",
  "petceo", "petgraduation", "petjob", "petmemorial", "petminhwa", "petreceipt",
  "petroyal", "pettwo", "remindwedding", "season", "selfwedding",
  "cinesnap", "schoolsnap",
  "personalcolor", "monoactor", "fortunecard",
  "poolside", "snowsnap", "profileduo",
  "droneview",
  "autumnsnap",
  "trenchlook",
  "examcheer",
  "xmasvintage",
  "campsnap",
  "picnicsnap",
  "partysnap",
  "skisnap",
  "petbouquet",
];

export const isProConcept = (key: string): boolean => PRO_CONCEPTS.includes(key);

// 혼잡성 실패의 문구 신호 — 서버(gemini.ts)와 각 페이지가 실제로 내는 문자열에서 딴 것이다.
//   "요청이 많아요"        TRANSIENT(429 과부하·5xx)
//   "생성이 어려워요"      QUOTA·AUTH(429 한도)
//   "시간이 너무 오래"     클라 타임아웃(235초)
//   "넘겨 중단했어요"      서버 abort(230/140/50초)
//   "만들지 못했어요. 잠시 후" 5xx 일반 — ★콜론판("만들지 못했어요: 본문")은 콘텐츠 거부라 제외
//   "생성에 실패했어요"    route별 failMsg
const CONGESTION_SIGNS = [
  "요청이 많아요",
  "생성이 어려워요",
  "시간이 너무 오래",
  "넘겨 중단했어요",
  "만들지 못했어요. 잠시 후",
  "생성에 실패했어요",
];

// ★동시생성 429("진행 중인 생성이 끝나면…")는 혼잡이 아니라 사용자 본인의 중복 요청이다.
//   원인도 안내도 달라서 반드시 제외한다.
export const isCongestionError = (msg: string): boolean =>
  !!msg && !msg.includes("진행 중인 생성") && CONGESTION_SIGNS.some((s) => msg.includes(s));
