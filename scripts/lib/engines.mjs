// scripts/lib/engines.mjs — 컨셉별 엔진 순위. 체크리스트 맨 위에 실린다.
//
// 왜 순위인가
//   MJ는 스튜디오 웹 UI에서 직접 애프터를 만든다. 어느 스튜디오부터 열어야 하는지가
//   매번 판단거리였다 — 1순위에서 먼저 찍어보고 "별로면 2순위"로 내려가면 된다.
//
// 판정 근거 (플레이북 §4 엔진 지도 + 비용)
//   Pro   = 얼굴 중심 화보·장면 재구성        (가장 비쌈)
//   GPT   = 원본 보존 편집(라벨·글자)·광고 문법·오브제화
//   flash = 색·톤·질감 변환                   (가장 쌈)
//   비용: flash < GPT < Pro — 같은 값이면 싼 쪽을 위로 올린다.

export const STUDIO = {
  pro: "Gemini 3 Pro Image (스튜디오)",
  gpt: "웹 ChatGPT",
  flash: "Nano Banana 2",
};

const WHY = {
  person: {
    pro: "얼굴이 결과의 전부인 컨셉 — 장면을 새로 짜면서 얼굴을 살리는 건 Pro가 제일 낫다",
    gpt: "원본 구도를 최대한 지키며 손보는 쪽이면 GPT가 안정적이다",
    flash: "색·톤만 바꾸는 변환이면 flash로 충분하고 가장 싸다",
  },
  duo: {
    pro: "두 얼굴을 섞지 않고 한 장에 합치는 건 Pro만 안정적으로 해낸다",
    gpt: "2인 합성은 GPT가 얼굴을 뭉갤 위험이 크다 — 차선",
    flash: "2인 신원 보존은 flash 범위 밖이다",
  },
  product: {
    gpt: "라벨·로고·글자를 픽셀 그대로 지켜야 하는 컨셉 — 원본 보존은 GPT가 최강이다",
    pro: "광고 연출을 크게 새로 짜야 하면 Pro도 후보다(라벨 왜곡 위험은 감수)",
    flash: "색·질감만 손보는 정도면 flash",
  },
  food: {
    gpt: "음식은 형태·질감이 곧 상품성 — 원본 보존 편집이 안전하다",
    pro: "접시째 새로 연출하는 컨셉이면 Pro",
    flash: "톤·조명만 올리는 보정이면 flash가 가장 싸다",
  },
  pet: {
    gpt: "털·눈 같은 개체 특징을 지키며 오브제화하는 데 GPT가 낫다",
    pro: "배경·장면을 통째로 새로 만드는 컨셉이면 Pro",
    flash: "화풍·색 변환 계열이면 flash",
  },
};

// 기본 순위 — spec의 engine이 1순위다(그게 이미 내린 결정이다).
// 나머지는 inputType의 적합도 순으로 뒤에 붙인다.
const FALLBACK_ORDER = {
  person: ["pro", "gpt", "flash"],
  duo: ["pro", "gpt", "flash"],
  product: ["gpt", "pro", "flash"],
  food: ["gpt", "pro", "flash"],
  pet: ["gpt", "pro", "flash"],
};

/**
 * spec → [{ rank, engine, studio, why }] 3개.
 * ★1순위는 언제나 spec.engine이다 — 순위표가 spec의 결정을 뒤집지 않는다.
 */
export function engineRanking(spec) {
  const type = FALLBACK_ORDER[spec.inputType] ? spec.inputType : "person";
  const base = FALLBACK_ORDER[type];
  const order = [spec.engine, ...base.filter((e) => e !== spec.engine)];
  const why = WHY[type] || WHY.person;
  return order.slice(0, 3).map((e, i) => ({
    rank: i + 1,
    engine: e,
    studio: STUDIO[e] || e,
    why: why[e] || "(근거 미정 — 플레이북 §4 확인)",
  }));
}
