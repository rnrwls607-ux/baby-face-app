# glam-core — 외모 코어 정본 (2026-09-05)

승인 프롬프트(route에서 VM 추출)에서 슬롯만 마커로 바꾼 정본. 검사기는 scripts/lib/glam-check.mjs.
생성 절차는 WORKLOG 2026-09-05 "외모 드리프트 감사 + 코어 잠금" 참고 — 손으로 옮긴 글자 0.

| 정본 | 원천(승인 컨셉) | 원천 프롬프트 md5 | 정본 md5 | 줄 | 마커 |
|---|---|---|---|---|---|
| v3-core.txt | snowsnap | 575ae443 | 8e87e918 | 124 | 21 |
| v2-core.txt | cinesnap | a3842468 | e1b41827 | 124 | 21 |
| v1-core.txt | digicam | de16c73d | c0c82fb2 | 110 | 21 |

슬롯: {{컨셉명}} · {{헤어꼬리}} · {{SCENE}} · {{POSE}} · {{*}}(장면 전용 SELF-CHECK/AVOID 문항 자리, 0줄 이상)

- v3: 도입 6줄·STEP 1·GLASSES·CONTRACT·RETOUCH INTENSITY·FACE ORDER(18%)·SKIN·BEAUTY DIRECTION(AIM HIGH top idol group)·RELIGHT·FRAMING·CAMERA 골격·SELF-CHECK 공통 5문항·AVOID 공통 9항·Output 골격
- v2: 위와 같되 15% · AIM HIGH "top-tier celebrity visual" · SELF-CHECK 2문항이 "slimmer"
- v1: INTENSITY·AIM HIGH 없음 · 10% · SELF-CHECK 공통 4문항 · AVOID 공통 8항 · Output의 "no text"는 슬롯(digicam 날짜 스탬프 예외)

## Light 줄 뷰티 절 정본 (2026-09-05 MJ 결정)

- v3 = snowsnap 원형 그대로: "a bright, CLEAN, neutral-toned soft key light with delicate catchlights, gentle fill, and a crisp rim light, clearly BEAUTIFYING, idol-grade luminous, **the face glowing warm and fresh**, every feature crisp" — "the face glowing warm and fresh"가 필수 구. 격리 처방(노랑/창백 금지)은 뒤 덧붙임만.
- v2 = cinesnap 계열: "a bright soft key light … clean rim light … the face glowing noticeably brighter and prettier than everything around it, every feature crisp". v3에서 불허.

## 승인 변형 (검사 예외 없음 — 라이브는 그대로, 신규엔 미적용)

| 컨셉 | 층 | 변형 내용 |
|---|---|---|
| monoactor | v3 | 흑백 — 헤어 줄·SELF-CHECK 헤어 문항을 "tone faithfully mapped to monochrome"으로, Light를 45° 조각광(sculpting)으로 재작성 |
| airportsnap | v1.5 | 10%인데 RETOUCH INTENSITY·timid 항목 보유, FRAMING three-quarter(mid-thigh) |
| 라이브 v3 8종 (autumnsnap·trenchlook·examcheer·xmasvintage·campsnap·picnicsnap·fortunecard·poolside) | v3 | Light 절에서 "the face glowing warm and fresh" 구 누락(+NEUTRAL 대문자) — autumnsnap A/B 판정 후 처리 |
| personalcolor | v3 | Light 절이 cinesnap(v2) 문형 |

정본 변경 = MJ 승인 사항. 바꾸면 이 표의 md5를 갱신한다.
