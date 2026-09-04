# MOSPIC 컨셉 공장 플레이북 (v2, 2026-09-04)
이 파일은 컨셉 추가·검증·출시 작업의 두뇌다. 컨셉 관련 요청을 받으면 먼저 이 파일 전문을 읽는다. MJ는 비개발자 솔로 창업자이며, 아래 ★2관문에서만 판단한다. 그 외 모든 단계는 사람 확인 없이 자율 진행한다.

## 0. 역할과 관문
- Claude Code = 설계자 + 실행자. spec·프롬프트 작성, 수확, 판정 재료 정리, route·출시·BA 커밋 전부.
- ★MJ 관문 2개 — 여기서만 멈추고 묻는다(v2에서 4개 → 2개로 줄였다):
  G1 채택: 후보 제안 후 "진행/보류/탈락"
  G2 실측 판정: 컨택트 시트(examples/ba/{키}/{키}_시트.png) 경로 + 판정표 제시 → MJ 어휘로 답
- ★G3(상세 승인) 폐지 — G2를 통과하면 상세·썸네일·출시·BA까지 멈추지 않고 자동 진행한다.
  완료 보고에 상세 축소 미리보기를 첨부하고, MJ가 지적하면 ★그 부분만 재렌더한다.
  (상세는 spec의 detail 블록에서 나오므로 카피 한 줄만 고쳐 다시 뽑는 비용이 작다.)
- ★G4(실기기) 폐지 — 라이브 route가 실제로 도는지는 자동 점검으로 대신한다.
  ※2026-09-04 실사 결과 "코인 차감 없이 안전하게 자동 호출할 방법"이 아직 없다(§9 참고).
    그때까지는 launch 완료 보고에 딥링크를 실어 MJ가 원할 때 1회 눌러보는 것으로 둔다.
- MJ 판정 어휘: "좋아/통과/OK"=승인 → 다음 단계 자동 진행 / "괜찮아 좀 부족해"·"외모 더"=한 수 더(§6 처방) / "별론데"=접근 교체 / "버리자"=탈락 확정 / "나중에"=보류(큐 저장, 재론 금지) / "다음꺼"=현재 건 보류하고 방향 전환.
- 관문 외에는 절대 묻지 않는다. 애매하면 합리적 기본값을 택하고 보고에 "판단한 것" 한 줄로 남긴다.

## 1. 헌법 (실사고에서 나온 것 — 위반 = 실패)
1. 프롬프트는 동결 자산. 승인(G2 통과) 후 한 글자 수정 금지. 수정은 새 버전(v+1) + 재수확 + 재판정.
2. 문서 ≠ 코드. 프롬프트·구조·파일명은 실물(route 소스·실제 파일)에서만 확인. 기억 재구성 금지.
3. 프롬프트는 항상 전문. 조립식("복사 후 SCENE 교체") 금지 — SCENE만 단독 투입되는 사고로 오판정이 났다.
4. 티어1 표준 블록은 MOSPIC_외모마스터_v1.md에서 문자 그대로. 요약·의역 금지. SCENE만 신작.
5. 모순 스캔 3축 0건 확인 후 발급: 보정금지↔허용 / 점 보존↔소거 / 나이 유지↔젊게.
6. 금지어·금지물: "무료/0원/공짜", 실명 브랜드·IP·실존 인물·특정 영화/애니, 읽히는 글자(강화 봉쇄 "Every surface BARE… Even illegible text shapes are a failure"), 실존 학교 마크·명찰, 무속·종교 이미지.
7. 얼굴 신원: 아는 사람이 한눈에 알아봐야 한다. 점은 지울 수만 있고 새로 못 그린다. 안경 유지·추가 금지·선글라스 금지.
8. 게이트 전항 통과 시에만 커밋. 하나라도 FAIL → 롤백·보고. "Compiled successfully" 원문 + exit 0.
8-1. ★package.json·lockfile·next.config·네이티브 모듈이 바뀐 커밋은 push 후 node scripts/smoke.mjs PASS까지 미완료다. "Compiled successfully"는 런타임을 보증하지 않는다 — sharp 0.35의 libvips 8.18이 Vercel linux-x64에서 dlopen 실패해 생성·업스케일·코인·로그인 콜백이 23시간 죽었고 빌드는 매번 통과했다. 스모크의 핵심은 ★GET 405다(생성 라우트에 GET 핸들러가 없으므로 모듈이 정상 로드되면 405, 로드가 깨지면 500 text/html이 온다 — POST는 정상적인 입력 검증 실패와 섞여 신호가 되지 못한다).
9. concepts.ts·page.tsx CRLF, key: 앵커, 개행 보존. 템플릿 값(cameraFacing 등)은 매핑표를 따르고 복제하지 않는다. 템플릿의 버그는 신설분에서 고치고 원본은 무접촉 보고.
10. 프로덕션 Redis/Blob 접촉 0. API 호출은 harvest만, 비용 상한 플래그 필수.
11. 2인 컨셉은 성별 칩 필수 + 성별 문구만 파라미터화(buildPrompt) + 세 조합 VM diff 증명.
12. 보류·탈락 컨셉은 MJ가 다시 꺼내기 전까지 재론 금지.

## 2. 파이프라인 (spec 2파일 → 출시)
specs/{키}.json + specs/{키}.prompt.txt 작성
→ node scripts/harvest.mjs --spec specs/{키}.json   ★수동 기본(외부 호출 0): 비포를 풀에서 깔고 체크리스트를 낸다
→ [MJ] 체크리스트대로 애프터 4장 생성 → 지정 파일명으로 저장
   ★체크리스트 맨 위에 엔진 순위 3줄이 실린다(scripts/lib/engines.mjs) — 1순위 스튜디오에서
   먼저 찍어보고 "별로면 2순위"로 내려간다. 판정 근거는 §4 엔진 지도 + 비용(flash<GPT<Pro).
   1순위는 언제나 spec의 engine이다 — 순위표가 spec의 결정을 뒤집지 않는다.
   ★같은 폴더의 {키}_프롬프트.txt는 복붙 전용 메모장이다(설명 0, 스튜디오 이름 3줄 + 구분선 + 프롬프트 전문).
   MJ가 별말 없으면 1순위 툴로 만든 것으로 간주한다. 2·3순위로 만들었으면 판정 때 한마디 남긴다.
→ 같은 명령 재실행 → 파일 감지 → 컨택트 시트 + 판정표 골격
   (API 수확은 옵션: --dry-run 으로 비용 계획 확인 후 --run --max-cost 3000. 비용이 급할 때만)
→ [G2] 시트 경로 + 판정표 제시, 멈춤
→ 통과: node scripts/new-concept.mjs --spec specs/{키}.json --stage route --run   (자동 커밋·푸시, 홈 잠금)
→ node scripts/detail-page.mjs --spec specs/{키}.json --thumb N   (N = 판정표 최고 컷)
→ ★멈추지 않는다: --stage launch --run → --stage ba --run   (각 자동 커밋·푸시)
→ 완료 보고 — 상세 축소 미리보기 + 딥링크 첨부. MJ가 지적하면 그 부분만 재렌더 후 자산 갱신.
- 한 수 더(G2): §6 처방으로 prompt.txt v+1(문자 수준 삽입, 재포맷 금지) → 기존 애프터를 examples/ba/{키}/_v{n}/로 이동 → harvest --afters --run --force → 재판정. 3회 연속 미달이면 보류 제안.
- 여러 컨셉 배치: 3~4종 단위. spec 전부 먼저 쓰고 harvest를 연속 실행한 뒤 G2를 한 번에 묻는다(시트 N장 + 판정표 1개).
- 엔진 A/B가 필요하면 {키}-flash.json 사본(engine만 다름) + --out examples/ba/_ab/{키}-flash. 비포는 재사용(현재 --src 없음 → 수동 복사).

## 3. spec 스키마 — 필수 칸 (하나라도 비면 작성 단계에서 채운다, 실행 후 발견 금지)
key · name · engine(pro|gpt|flash) · inputType(person|product|food|pet|duo) · prompt{source,path} · befores[3](file, prompt) · afters{count:4, map:[1,2,3,1]} · verdicts[4]
route: template("auto"|키) · chipFrom(기존 컨셉 키) · emoji · color · subtitle · description · audience · duo · ★tplName(템플릿 한글명, 예 cheerglam="치어리더") · ★replace([["📣","🚁"]] 템플릿 이모지·문구 잔재 전역 치환)
ba: pairs [[1,1],[2,2],[3,3]] (duo: [[[1,2],1],[[3,4],4]])
detail: layout(ba|2to1|transform) · signature{color,bg,name} · hero{sub,tags[3],image} · pain[3] · solution · pairs[2]{before,after,caption} · points[3]{title,body,chips[3],image|images[2],imageCaption} · ★price{header,offline,mospic} · guide[3] · privacy · aiNotice · cta{copy,button}
- 잔재 검사는 키 어간만 잡는다 — 한글·이모지는 tplName·replace로 막는다. 실행 전 메모리 선조립로 잔재 0 확인.
- ★템플릿 고유 한글 문구는 scripts/lib/templates.mjs의 TEMPLATE_PHRASES 목록이 잡는다(cheerglam: "치어리더"·"여성 스타일링 전용 컨셉이에요"·"📣"). 새 템플릿을 쓰면 그 목록부터 채운다. 대상 고지 줄은 spec의 route.audience가 템플릿과 다르면 자동으로 빠진다.

## 4. 엔진·템플릿 지도
- Pro: 얼굴 중심 화보·장면 재구성. GPT: 원본 보존 편집(제품 라벨·글자), 광고 문법 진할수록, 오브제화(피규어·펠트). flash: 색·톤·질감 변환.
- 스튜디오 등가: Pro↔Gemini 3 Pro Image / flash↔Nano Banana 2 / GPT↔웹 ChatGPT. harvest는 라이브와 같은 API라 등가 그 자체.
- 템플릿 매핑(scripts/lib/templates 실사값): person×pro=cheerglam(cameraFacing user) / person×gpt=gyaru / person×flash=age / product=+product_obj 가이드·environment / food=+food_drink·environment / pet=+portrait_multi / duo×pro=friend(성별 칩).
- 티어 판정: 티어1(풀글램) = 화보·변신·이벤트·인생샷 계열 / 티어2(절제) = 증명·비즈·복원·실사용 / 오브제·사물·장면 컨셉 = 티어 블록 미적용, 단독 프롬프트(IDENTITY 절 + 무글자 봉쇄 필수).

## 5. 프롬프트 작성 규칙
- 티어1 조립 순서: 마스터 TIER 1 블록 문자 그대로 → {컨셉명} 채움 → {SCENE} 신작(부록 A: 조명 역전판 Light 줄 필수, 모자 규칙, 글자 봉쇄) → POSE 1~2줄 → FRAMING/CAMERA/SELF-CHECK/AVOID/Output.
- ★Pro 글램 사다리(승인 변형, 마스터 부록 D 후보): 
  v1 = 마스터 원판(10%, INTENSITY 없음) — flash·일부 Pro(digicam 승인)
  v2 = + RETOUCH INTENSITY 절(CONTRACT 직후) + SMALL FACE "about 15%" + AIM HIGH 줄 — airportsnap·cinesnap·schoolsnap 승인
  v3 = SMALL FACE "about 18%" + AIM HIGH "the stunning visual center of a top idol group — the kind of face that stops the scroll" — personalcolor·monoactor·fortunecard·poolside·snowsnap 승인
  Pro 신규는 v2로 시작, "외모 더"면 v3. 컨셉별 반응이 갈리므로 실측 없이 층 고정 금지.
  RETOUCH INTENSITY 원문:
  RETOUCH INTENSITY — read this as a hard requirement:
  - This is a FULL premium retouch, NOT a subtle natural edit. Push every
    enhancement in the FACE RETOUCHING ORDER below to a clearly VISIBLE
    level — the upgrade from the source must be obvious at first glance.
  - A timid, barely-changed result is a FAILURE. If in doubt between
    "too subtle" and "clearly enhanced", always choose clearly enhanced —
    while keeping the face natural, harmonious, and recognizable.
  AIM HIGH 원문(BEAUTY DIRECTION 2번째 줄): 
  - AIM HIGH: the finished face should read like a top-tier celebrity visual — the kind of face people stop scrolling for — while still being unmistakably this same person.
  SELF-CHECK에 "Is the enhancement CLEARLY visible … A timid result is a failure." / AVOID에 "A timid, under-retouched result…" 짝으로 추가.
- 따뜻한 광(골든아워·촛불·앰버) 장면: Light 줄을 "얼굴엔 bright CLEAN neutral-toned key light, 따뜻한 광은 BACKGROUND로 격하 + ★must NEVER tint the face yellow" 형태로. 겨울·수영장은 "pale/gray·glare-flattened 금지".
- 2인: 마스터 부록 B(ROLL CALL·per-person·ANTI-CLONE) 문자 그대로. 성별 문구 "Person 1 is a woman."만 파라미터.
- ★비포 조달 규칙(v2에서 확정):
  · 인물(person·duo) = examples/ba/_pool 219장에서 ★자동 배정. 힌트는 "female"/"male"/
    "female-glasses"/"male-glasses", 없으면 기본 [female, female-glasses, male].
    미사용분을 먼저 준다(USED_POOL.txt로 추적) — 컨셉마다 다른 얼굴이 나온다.
  · 사물·음식·펫·랜드마크 = spec의 befores[].pool 에 "custom" → 체크리스트가
    ★"MJ가 ChatGPT에서 생성" 항목 + 비포 프롬프트 전문을 실어준다.
    표준 문형은 아래 줄 그대로: 가상 인물·사물 명시 · 글자 0 · 세로 3:4 · 필터 없음.
  · ★API 비포 생성(harvest --befores --run)은 MJ가 명시적으로 요청할 때만 쓴다.
    기본 경로에서는 돈이 나가지 않는다.
- 비포 프롬프트 표준: "A casual smartphone selfie of a fictional Korean {woman/man} in {her/his} {나이}, {한 줄 인상}, {머리}, plain casual top, taken indoors with ordinary lighting. Slightly imperfect amateur framing, everyday background. Realistic phone-camera quality, vertical orientation. This is a completely fictional person who does not exist. No text, no watermark." 사물은 라벨을 추상 도형으로(글자 0). 여성 2·남성 1이 기본, 안경 모델 1은 정체성 단서 판정용으로 권장.
- 상세 카피 규칙(detail 필드): 서브카피 1줄 / 말풍선 3개(타겟 언어, 이모지 1) / 해결 선언 "MOSPIC {컨셉} — 사진 한 장이면, …" / 대비 캡션 "A가 → B로" / POINT 1 풀세팅·2 "그래도 나는 나"·3 용도 확장(이미지 2장) / 가격 offline은 실제 시세 구체적, mospic은 "합리적인 가격 · 약 1분 · 사진 한 장으로" / 가이드 3 / AI 고지에 컨셉 고유 면책(재미·자체 디자인·실물 아님) / CTA "오늘, …" + "{컨셉} 만들기". 소요시간 "약 1분", "커피 한 잔 값" 금지.

## 6. G2 "한 수 더" 처방표 (마스터 부록 C + 이번 판례)
- 얼굴 어둡다·밋밋 → 조명 역전판 확인, 따뜻한 광 격리
- 살쪄 보임 → CONTOURS / 늙어 보임 → "subtly YOUNGER" + AVOID aged / 머리색 변함 → "true hair color"
- 외모 부족(Pro) → v2→v3 사다리 한 칸. v3에서도 부족하면 조명·씬 교체 후보(oldmoney 판례: 그래도 탈락 가능)
- 글자·간판 유출 → 강화 봉쇄줄 + 해당 소품을 "blank shapes"로 명시
- 구도가 안 나옴(각도·스케일) → 형용사 금지, 기하 앵커(지평선 위치·지면 비율·인물 프레임 비율·실세계 스케일 대비) + SELF-CHECK 문항 (droneview v5 판례)
- 프롬프트에 없는 사물이 등장(드론 기체 등) → "this is the photo TAKEN BY X — X itself is NEVER in the frame" + AVOID
- 다중 셀·스트립 일관성 붕괴 → 프롬프트 문제 아님, 구조 안건 → 보류 제안
- 판마다 들쭉날쭉 → 프롬프트 문제 아님 → 표본 확대·검수 게이트 몫

## 7. 후보 발굴 (G1 재료)
- 겹침 체크: app/lib/concepts.ts 전수 대조 + 파생 3축(같은 컨셉×다른 스타일 / 같은 스타일×다른 대상 / 같은 대상×다른 용도)으로 신규 각도인지 판정.
- 5축 채점: 수요·단가·바이럴·난이도·시즌성. 우선순위 = 수요+단가+바이럴−난이도.
- 시즌 6주 전 출시 원칙. 배치는 바이럴 간판 1 + 저난도 1 + 신규 축 1 조합.
- 탈락·보류 목록(재론 금지): oldmoney·marathon·petid·boxtoy 탈락 / chibisticker 보류 / droneview 진행 중.

## 8. 보고 형식
- ★이모지 표기 — 모든 보고를 이 표기로 쓴다. MJ가 훑어보고 "내가 할 일"만 골라낼 수 있게 한다.
  📖 읽기(배경·설명) / ▶ MJ 할 일 / 🎯 MJ 결정 / ⚠️ 중요 / 💡 추천 / 🤖 자동 완료 / 🕒 나중
- 관문 보고: 시트 경로·판정표(컷별 3~4항목)·비용·"내가 판단한 것" 1줄. 그 외 세부는 WORKLOG.
- 커밋 보고: 게이트 표 + diff 목록 + 해시. 배치 완결 시 WORKLOG 최상단 총결산(scripts/lib/worklog).
- 사고는 원인·조치·재발 방지 3줄로 기록. 자기보고 게이트 금지 — 실행 검사만.

## 9. 백로그 (파이프라인)
★라이브 점검 자동화 — 2026-09-04 인증 실사 결과 "만들지 않음"으로 결론:
  · 세션 발급 경로 3개뿐. kakao/callback=OAuth 왕복 필요(스크립트 불가) /
    dev-login=NODE_ENV production이면 차단 / review-login=가능하나 ★uid가 "review9001" 고정.
  · 관리자 uid 4920083346으로 세션을 만드는 경로는 ★코드에 없다.
  · review-login을 쓰면 ①스토어 심사용 백도어 토큰을 영구히 켜둬야 하고(설계 의도는 심사 후 삭제)
    ②토큰이 로컬 파일로 한 벌 더 복사되며 ③차감 대상이 MJ가 아니라 review9001(웰컴 3코인)이라
    ★컨셉 2개째부터 402로 막힌다.
  · 대안(권장): /api/admin/live-check 신설 — adminGate 통과 후 서버 내부에서 generate 함수를
    직접 호출(withCoin 우회 = 코인 차감 0). MJ가 브라우저에서 버튼 1회. app/ 수정이 필요해
    이번 범위 밖이라 제안만 남긴다.
harvest: --src(비포 재사용 경로) · --force 범위를 스테이지별로 · VM 평가기 lib/prompt.mjs로 통합 / 4호 qc 자동 필터(글자·얼굴 유사도·인원수) / 기존 상세 1080 재생성(spec 채우면 detail-page로) / airportsnap 애프터3=썸네일 중복(무해)
★재출시(refresh) 3건 — 2026-09-03 droneview v6에서 드러남:
1. new-concept에 --stage refresh 신설(프롬프트 교체 + 상세·webp·BA 자산 갱신). 지금은 launch·ba가 멱등이라 우회해야 하고, 우회 절차가 문서에만 있다.
2. spec 재직렬화 버그 — route 스테이지가 prompt.source를 고칠 때 JSON.stringify로 파일 전체를 재포맷한다(droneview에서 +130/-20). 문자 치환으로 바꿀 것.
3. harvest --prompt-file 오버라이드 — 출시된 컨셉은 spec이 source:"route"라 새 프롬프트 버전을 검증할 수 없다. v6 재수확이 v5로 돌아 ₩1,200을 헛썼다.
