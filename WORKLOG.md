# 작업 일지 (WORKLOG.md)
> 세션마다 한 줄씩. 최신을 맨 위에. 여기만 보면 1분 안에 복구.
## (다음 세션 템플릿 — 복사해서 위에 채우기)
### 2026-06-16  
- 한 일: 
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:+

## 2026-07-17 (3차) — 레거시 1인 컨셉 대개편: 8종 공식 이식 + 7종 완전체 오픈 + bizprofile 은퇴
- 한 일:
  - [공식 이식] 14532d3(+441/−181): 단일 5종(lifeshot·bizprofile·idol·xmas·graduation) = hanbok CORE 문자단위 이식 / fashion = OUTFIT LOCK(의상 잠금) 전용 / hairstyle = FACE LOCK 라이트 공식(구조 보정 금지, 표면 폴리시만) / era = B방식 5블록(시대별 방화벽: joseon 쪽머리·gyeongseong 빈티지 늙음·retro 최강 방화벽·medieval 서양 글램·future 얼굴 어둠). CRLF 앵커 불일치 2건에서 die-먼저 설계 정상 작동
  - [공정 개선] AI Studio 검증 = 킷 애프터 생산 통합 — 앱 API 비용 0 (코드 프롬프트와 검증팩 문자 일치가 전제)
  - [킷 2라운드 발송] lifeshot·idol·era(5시대 그리드)·fashion(착장 비포 문법)·hairstyle(A형 유틸, 편차=기능)·graduation·xmas — bizprofile 킷은 은퇴로 폐기
  - [bizprofile 은퇴] 40ed633: 홈 카드 주석 숨김. 사유 = 증명 20종·비즈 32종과 포지션 중복(발전시킨 라인의 전신). route·page·URL·씬 블록 보존 — 수요 확인 시 biz-headshot-* 변형 부활 가능
  - [★7종 완전체 오픈] 5f730ac: webp 14개(38.5MB→4.4MB), image+detailImage 7종 첫 연결. xmas 즉시 오픈 결정(기라이브 컨셉 — 11월 드롭 연출 대신)
  - [안경 규칙] GLASSES RULE 전 19컨셉 탑재 확인. 위험군 3종(idol=벗김 압력 최강·era 경성=시대 안경 교체·hairstyle=헤어라인 처리) 안경 비포 검증 예약 — glasses_테스트모델 프롬프트 발급됨
- 다음에 할 것: 폰 검증(7종 + fashion 썸네일 선명도) → goods 프롬프트 실측(킷 전에) → 리디자인 9종 → 수능 응원(10월)
- 주의/메모: 레거시 정렬 완료 — 앱 전체 "완전체 아니면 숨김"(숨김 = goods 미완성·bizprofile 은퇴, 성격 구분). 보정 공식 19컨셉 체제. CORE 기준 원본 = hanbok route(공식 수정 시 hanbok 수정 후 재이식). fashion 썸네일 원본 55KB 유독 작음 — 선명도 확인 필요

## 2026-07-17 (후반) — y2k·halloween 이식 + ★신규 8종 + 상세페이지 10종 오픈 (93종 체제, 숨김 goods 1종)
- 한 일:
  - [y2k 이식] 82213a1: RETRO FIREWALL(복고는 스타일링만, 얼굴은 2026 한국 기준) + 플래시 RELIGHT(디카 직광, 배경 어둑) + 밤거리 네온 씬. 타임스탬프·저화질 금지 이중 방어
  - [halloween 이식] 82213a1: B방식(HALLOWEEN_CORE+FINISH), 3변신 키 vampire·witch·fairy 유지 — 늙음 금지·공포 금지(피·송곳니·컬러렌즈)·"밝은 얼굴 in 무디한 세계" 조명 규칙
  - [신규 8종 배선] 3ee5dd9(+2,290줄, 18파일): hanbok·retro90·hocance·redcarpet·birthday·job(3칩 pilot/doctor/ceo)·sporty(2칩 tennis/golf)·flower — 공통 CORE+씬블록+FINISH 조합. 6곳 배선 전수 grep 통과, 칩 옵션 전달 경로 추적 통과(era 버그 전례 방어)
  - [킷 10종 발송] 컨셉당 3종 세트(①비포 모델 GPT 3명 — "예쁜 사람·평범한 사진" 원칙 ②애프터 생성 계획표+감시 포인트 ③Claude Design 디자인+배치 프롬프트) × 신규8+halloween+y2k 풀리메이크. 색감 컨셉별 차별화(한지 웜·리조트 아쿠아·세피아·블러시·파티 크림·다크 크림슨·트러스트 네이비·올드머니 그린·미드나잇 네온)
  - [★상세페이지 10종 오픈] fbcf7c4: webp 20개 변환(53MB→5.6MB), 신규 8종 image+detailImage 연결, halloween 주석 해제, y2k 같은 파일명 교체(코드 0). 연결×파일 존재 10종 표 전부 통과
  - MOSPIC 93종 완전체, 숨김 goods 1종만. "보이는 건 완전체뿐" 원칙 복원
- 다음에 할 것: 폰 검증(10종 썸네일·상세, halloween 첫 등장, y2k 새 디자인) → goods 킷 → 리디자인 9종(age·figure·illust·interior·menu·nukki·product·restore·upscale) → 추석 라인 점검(1인 한복 오픈으로 데드라인 해소 — 가족한복·한복커플 리프레시 여부 판단)
- 주의/메모: 상세 교체 루틴 = 같은 파일명 webp 덮어넣기(코드 0, PWA 캐시는 앱 재시작). 킬러 섹션 갤러리(3변신·3직업·2종목·4곳)는 반드시 동일 인물. job 고지에 "실제 자격·소속 증명 용도 불가" 추가. 보정 공식 11컨셉의 감시 공통분모 = 늙음·글자·손 왜곡·얼굴 가림

## 2026-07-17 — ★결제 전략 확정(토스 스킵·IAP 단일) + 코인 지갑 1·2단계 + 가격표 확정
- 한 일:
  - [★C 결정 조기 종결] MJ 선언: 토스 안 함, 앱스토어(IAP) 단일 레일 — 33만원 미결제로
    8/14 기한 자연 소멸(재작성 가능), 아이폰 결제 공백은 iOS 출시까지 수용.
    Play 정책상 앱 내 디지털 재화=Play Billing 강제라 정책적으로도 정합.
    토스 어댑터는 관리자 게이트 뒤 휴면 — 수단 중립 설계라 멱등·creditCoins·지갑 UI 전부
    IAP가 물려받고 토스 고유부는 confirm 함수 1개
  - [지갑 1단계] 이용권 탭 → 코인 지갑(잔액+내역 한글화, 비로그인 웰컴 안내)(13b6d42).
    GET /api/coins → {balance, log, canCharge}
  - [지갑 2단계] POST /api/coins/charge 수단 중립 어댑터(toss) + 관리자 게이트
    (COIN_ADMIN_IDS·COIN_CHARGE_OPEN) + ★멱등 EXISTS 선확인→confirm→SET NX 레이스 가드 +
    옛 구매경로 봉인(confirm 410, bonus 실보유 MJ뿐 확인) + 구매 버튼 2곳 제거 (b3f2d0e)
  - [★가격표 확정(MJ)] 1코인=500원 정가 / 단가 원칙: 코인=출력 장수×3
    (1장 3코인=1,500, 3장 컨셉 9코인=4,500) / 런칭 40% 할인(900/2,700/9,000, 취소선+뱃지) /
    웰컴 3코인=무료 1회(1장 컨셉만 체험 가능 — MJ 인지, 상수 조정 가능) /
    "바로 결제"=402 시트에서 필요 상품 맥락 호출로 원장 단일 유지
  - [원장 감사+새 규칙] MJ 계정 "충전 +15"를 coinlog ref(admin-test-topup)로 1분 추적 —
    병행 대화에서 MJ 지시로 로컬 .env.local KV 키 적립. ★로컬 KV 키=프로덕션 DB 직결 확인.
    새 규칙: 프로덕션 데이터 쓰기(Redis/Blob)는 push와 동일하게 사전 승인 후 실행
  - [★스토어 계정 전략 확정] 조직(사업자) 계정 결정 — 개인 계정의 12명×14일 의무 면제
    (구글 정책: 조직 계정 면제 확인). ★"테스터 12명 모집" 과제 의무 해제(자발 QA 3~5명은 선택).
    DUNS 필수 → Apple 개발자 무료 발급(developer.apple.com/kr/support/D-U-N-S/, 범용이라
    iOS 때 재사용) 1순위, 막히면 NICE디앤비(국내 공식, 수수료). ★영문 상호·주소 표기를 정해
    기록 → 구글 결제 프로필과 글자 일치 필수(최다 실패 원인). 계정 유형 전환 불가 — 처음에 확정
  - [원격 모드 정책 판정] Play 4.3 최소기능성: 순수 웹래퍼 반려, 네이티브 기능 얹은
    Capacitor는 통과 분류 — 우리는 갤러리 저장·스플래시(+공유 예정)로 충족. ★웹뷰 안
    웹결제로 디지털 상품 판매=밴 확인 → IAP 단일 결정 정책 재확인. 푸시 알림=보강 백로그
  - [제출 준비도] targetSdk 36(요구 35 초과)/minSdk 24/versionCode 1/keystore 미생성
    (Play App Signing+업로드 키 3중 백업 계획, git 금지)/AAB는 JAVA_HOME=AS JBR 지정으로
    가능 판정. ★빠진 것 2: AI 신고 기능 0(결과화면 링크+설정 항목 구현안), 사업자 정보 표기 0
    (설정 하단 블록, 통판번호 연동). privacy URL ✓ mospic.com/privacy
  - [RevenueCat 스코핑] 미확인 2건 = Capacitor 8 호환 버전 / Plugins 전역 노출(셸 설치 후
    CDP 1분 실측으로 판정). 서버 검증 1후보 = RevenueCat REST 조회(app_user_id=카카오 uid)
  - DUNS 대기 1~4주 작업 큐: ①AI 신고 ②사업자 표기+통판 신고 ③업로드 키+AAB 시험 빌드
    ④RevenueCat 셸 설치+실측 ⑤스토어 자산(스크린샷·512 아이콘·1024×500 피처·설명·
    Data safety 초안). 테스터 모집 항목은 삭제
- 다음에 할 것:
  1. 스토어 준비 착수: Play Console 계정($25, 본인인증 소요) + RevenueCat/Play Billing 스코핑
     (charge 어댑터 provider:"iap" 추가) + AI 신고 버튼 + 통신판매업 신고 요건 확인
  2. 벌크 스위치 준비: 컨셉별 단가표(출력장수×3 자동 산출→MJ 최종 검수) +
     402 시트("이 사진 바로 만들기" + 충전) UI → IAP 개통일에 114개 일괄 전환
  3. [MJ 손] 카카오 REST 키 재발급
  4. 사이드: travel 4차 결과 눈 판정 / OS 스플래시 검정 배경 + @capacitor/share 셸 묶음
- 주의/메모:
  - 코인 탭 라이브 노출 중 — 지갑 자체는 완전체(웰컴 적립=사전 마케팅), 소비처는 벌크 때 열림.
    신경 쓰이면 벌크까지 숨김 가능
  - Play IAP 최소가 요건에 900원 통과 여부 = IAP 등록 때 확인
  - COIN_CHARGE_OPEN은 영영 미설정일 수 있음(웹 충전 안 열면) — 게이트 문구
    "앱에서 충전할 수 있어요" 교체 후보

## 2026-07-17 — ★travel 결판·정식 오픈 (v3.1 보정 공식) + 코인 원장 실전 첫 검증
- 한 일:
  - [★travel v3.1 결판] 4차 홀드 깨고 확정. 철학 전환: 기존 "no slimming" 잠금 폐기 → 프리미엄 사진관 보정 공식 = 스몰페이스 ~10%·V라인·눈 또렷·콧대 정리·글라스스킨·RELIGHT(원본 조명 폐기, 씬 광원으로 재조명)·한국 미감·"원본보다 어려 보이게". 닮음 기준은 "지인이 한눈에 알아보는 선" — 미화=기능 원칙의 화보 확장
  - [구조] B방식 교체(9f7245b): BASE_RULE 삭제 → RETOUCH_CORE+FINISH_RULES 신설, TRAVEL_PROMPTS 4종(jeju/europe/beach/citynight) 전부 ${RETOUCH_CORE}+씬블록+${FINISH_RULES} 합성. citynight만 조명 공식 다름(블루아워+상점 불빛 키라이트) — 향후 어두우면 씬 블록만 수술
  - [GLASSES RULE 신설] 안경 쓴 입력=본인 안경 그대로 1쌍 유지 / 없으면 추가 금지 / 2쌍·손에 든 여분 금지. 진화 경로: v1 지중해 RELIGHT → v2 한국 미감(서양 화보풍 금지) → v3 보정 계약(구조 보정 허용) → v3.1 안경
  - [실측] AI Studio 검증 후 앱 4씬 실측 통과 — "잘 나와" 판정
  - [코인] 원장 파이프라인 실전 첫 검증: 웰컴 지급→travel 차감→coinlog 기록 작동 확인. MJ 계정 admin-test-topup 15개 충전
  - [상세페이지] 8장 체제: travel_비포1→4씬(제주=세트1·그리드 겸용/유럽/해변/야경, 그리드는 반드시 동일 인물 — 킬러 메시지 "같은 셀카로 4곳") / 비포2→애프터2 / 비포3→히어로. Claude Design 배치 → travel.png 1005×11762
  - [★정식 오픈] 3f9601b: webp 변환(썸네일 1528→76KB, 상세 4487→614KB), page.tsx 주석 해제+image, concepts.ts detailImage. 은둔버그 6곳 전수 통과. 코인 게이트(withCoin) 걸린 첫 홈 노출 컨셉
- 다음에 할 것: y2k에 RETOUCH_CORE 이식 → halloween 애프터 제작(킷 발송됨) → goods 킷. B대화 전달: 401(로그인 유도 버튼 없음)·402(구매 유도 없음)에 CTA 부착 우선 — 실사용자 노출 시작됨
- 주의/메모: 상세페이지 재료는 컴퓨터 원본 업로드 필수(폰 압축=품질 저하). 코인 게이트 첫 노출이라 비로그인 이탈 반응 관찰 가치. 보정 공식 이식 시 RETOUCH_CORE는 통째로, 씬 블록만 컨셉별 작성

## 2026-07-16 — ★Capacitor 2주차 완료(하루 만에): 이미지 저장 브리지 + 조용한 실패 전면 해소
- 한 일:
  - [★브리지 판정] 원격 모드에서 Capacitor 브리지 주입 실측 확정 — adb+CDP Runtime.evaluate로
    window.Capacitor {platform:"android", native:true} 확인. ★UA에 Capacitor 표식 없음 →
    서버에서 앱/웹 구분 불가, 판별은 클라이언트 isNativePlatform()로만
  - [플러그인 검증] @capacitor-community/media 9.1.0 셸 설치(8bb63ef) → CDP로 savePhoto 실측:
    "Album identifier required" 확인 → getAlbums/createAlbum("MOSPIC")/albumIdentifier 지정으로
    저장 성공. 권한 추가 0 (INTERNET만 — 저장 시 권한 팝업 없음)
  - [⚠️정책 결정 대기] 저장 위치 = Android/media/com.mospic.app/ → 앱 삭제 시 사진 동반 삭제.
    대안 androidGalleryMode:true는 권한 4개(READ_MEDIA_IMAGES 등 Play 민감 권한+심사 소명) 필요 →
    헬퍼 패턴으로 결정 유보(나중에 saveImage.ts 1곳만 교체). 로그인 사용자는 클라우드 히스토리로 복구 가능
  - [헬퍼] app/lib/saveImage.ts 신설 — 앱(Media 플러그인)/웹(기존 a.download) 분기.
    window.Capacitor 전역 직접 호출(@capacitor/core 미설치 = 웹 번들 영향 0), 앨범 lazy 캐시,
    http URL→프록시 fetch→dataURL 변환, 실패 시 실패 토스트(throw 금지), SSR 안전
  - [파일럿] y2k 교체(f36ac4c) → 실기기 통과: 갤러리 저장 ✓ / fileName "y2k..." ✓ / 토스트 ✓
  - [★벌크] 113곳 교체(bf8a101, 112파일 +231/−903): 변종A 43(perl 2-pass) + 변종B 65 + 수동
    4곳(page.tsx 홈·히스토리 / upscale / Upscale4K silent+실패라벨). id-photo는 앵커 불일치로 수동.
    게이트: a.download 잔존 0 · 성공토스트 잔존 0 · build 0
  - [★조용한 실패 전면 해소] a.click() 직후 무조건 성공 토스트 구조 제거 → 결과 기반 토스트로 전환
  - [.jpg 정리] upscale 2곳 .png→.jpg (신규 항목부터. 옛 히스토리 항목명 유지는 의도된 동작)
  - [최종 실측 통과] 히스토리 옛 항목(http URL 경로) 저장 ✓ / 4K 대용량 저장 ✓ / 웹 회귀 ✓
  - [부수 수리] 업스케일 결과 히스토리 미등록은 원래 없던 것(git 이력 확인, 오늘 작업 무관) →
    addToHistory +2줄(475603a). Upscale4K 버튼은 중복 방지로 미추가 — 4K 원본 보존은 코인 Blob 과제 영역
  - [실측 판정 2건] 공유 버튼: 웹뷰 navigator.share 파일 공유 미지원 → 링크 폴백으로 동작 중 →
    백로그(@capacitor/share, 셸 재빌드 필요) / mailto 문의: 정상 동작
  - [★코인 기반+파일럿 프로덕션 통과] 조사 발견: usage 서버 강제 0 = 114 컨셉 사실상
    무제한 무료(API 비용 유출 실존) / 6월 결제 유산 산 코드(confirm 금액검증·Blob 패턴 재사용 가능,
    bonus>0→프리미엄 모델 분기는 NB Pro 차등 훅) / POST route 118개 골격 균일(성공 응답 3종뿐)
  - 설계 확정: 전면 로그인 + 웰컴 3코인(MJ 결정) / ★성공 후 차감(실패·타임아웃·hard kill
    어느 경우든 사용자 손해 0, 최악은 서비스 1회 손해 — 수용) / 인플라이트 락 SET NX EX 90
    (코인 1개로 병렬 N발 악용 차단 + 이중탭 방지, hard kill에도 자동 해제) /
    원장 coin:{uid} INCRBY·DECRBY 원자 연산 / coinlog LPUSH+LTRIM 500 / welcome NX 이중지급 차단
  - 구현(52d29e6, 4파일 +123): lib/auth.ts(getUserId 공용화) + lib/coins.ts(ensureWelcome·
    withCoin 래퍼) + /api/coins 잔액 API + travel 파일럿 — route 교체가
    "POST→handler 개명 + export const POST = withCoin("travel",1,handler)" 2줄 = 벌크 앵커 원형
  - 프로덕션 실측 7항목 전부 통과: 웰컴 3 지급 / 생성 성공 후 차감(3→2) / 동시요청 429 /
    소진 후 402 "코인이 부족해요" / 비로그인 401 / y2k 등 다른 컨셉 무료 격리 / 에러 문구는
    기존 경고칸에 표시(지갑 UI에서 충전 유도로 승격 예정)
  - ★시퀀스 원칙 확정: 벌크 114개 코인 강제는 충전 레일 개통과 동시에 켠다(충전 없이 켜면
    앱 전체가 막다른 길). 파일럿을 y2k가 아닌 travel로 한 이유 = 홈 숨김이라 실사용자 노출 0
- 다음에 할 것:
  1. [★결정 8/14] 토스 33만원 — 재료 완성(로그인+저장 모두 실증, 2주차 1주 조기 완료)
  2. 스토어 준비: Play Console 개인계정($25, 본인인증 며칠 소요 가능 — 조기 시작 권장) +
     클로즈드 테스트 셋업 + AI 콘텐츠 신고 버튼(Play 요구)
  3. [MJ 손] 테스터 12명 모집 (여전한 병목)
  4. 셸 묶음 업데이트(다음 재빌드 때 한 번에): OS 스플래시 검정 배경 흰색화(안드12+ 테마) + @capacitor/share
  5. 코인 다음 단계: 지갑 UI(이용권 탭 → 잔액·내역·402 충전 유도) + 충전 어댑터
     /api/coins/charge(provider: toss|iap, 토스 테스트 모드로 구축, order NX 멱등) →
     기존 confirm·products.ts 개편 → 벌크 114는 결제 개통일에 스위치
  6. 가격표 세션(MJ와): 컨셉별 단가 1~4 + 충전 상품 금액 — MEVU 6,900원 절반 이하 원칙
  7. travel 4차 결과 3장 눈 판정(코인 테스트 부산물 — 히스토리에 있음)
- 주의/메모:
  - 저장 위치 정책(앱 삭제=사진 삭제 수용 여부) 결정 대기 — saveImage.ts 1곳 교체로 전환 가능
  - server.url 프로덕션 비권장은 Ionic 공식 입장(주로 애플 4.7.1) — Play 정책 별도 조사 필요(5주 쓰기 전에)
  - ★원격 모드 배포 흐름 확립: 웹 push → 앱 재시작만으로 반영(재설치 불필요). 단 새 플러그인은 셸 재빌드 필요
  - CDP 검증 루트 확립: adb forward tcp:9222 localabstract:webview_devtools_remote_<PID> →
    Runtime.evaluate(awaitPromise). chrome://inspect는 크롬 내장 adb가 시스템 adb와 충돌 —
    "Discover USB devices" 끄고 시스템 adb만 쓸 것
  - 고객센터 개선 아이디어(MJ): 메일보다 간편한 채널 → 카카오톡 채널 1:1이 한국 표준(비즈앱 전환 때 함께)

## 2026-07-15 — 신뢰 인프라 3종 + 상세페이지 73종 체제 + AI표시법 대응 + ★mospic.com 이전 + ★결제 전략 갈림길 (07-14 밤~15 통합)
- 한 일:
  - [인프라] Gemini 안정화 — lib/gemini.ts 재시도 1회(429/500/502/503/504)+친화 에러 2종, route 109개 적용(파일럿 532c8af → 확산 a3cae57). validate-photo만 의도 제외
  - [인프라] 뒤로가기 시스템 — app/lib/useBackClose.ts 신설(깊이태그+전역스택+유령칸 보정+bounce+bfcache). 파일럿 15b85ea(적대검증 major 3건: 딥링크 갇힘 / 만들기 체인 가짜 홈칸 누적→110분기 location.replace 전환 / 앞으로가기 미구분) → 확산 feb6255(홈 오버레이 5종+설정 내 replace 6곳)·08c8e87(업로드 110페이지: 단일43+게이트66+upscale특수)·4ed903d(UploadGuide) → 좌초 칸 무반응 수리 f0b6530(전체보기 경유 흐름B + bfcache 이중소비 가드, 새로고침 1회 무반응 덤 해결). 수용 한계 2건: 복귀 홈 이중로드 깜빡임 / 희귀 타이밍 경합
  - [수익화 블로커] 저장 전수 조사 — Gemini/OpenAI/누끼=base64 안전, ★업스케일=만료 URL 실손실 실재, 히스토리=1000px 축소본(로컬 IndexedDB + 로그인 시 Blob/Redis 500장), 원본 화질은 어디에도 안 남음 → 업스케일 영구화 111724f(누끼 방식 이식+JPEG 품질 사다리 90→70, 최후 3000px 축소, 클라우드 저장 살아남). [사소 미처리] 다운로드 파일명 .png→.jpg
  - [수익화 블로커] AI 생성물 표시 3중 체계(AI기본법) — lib/aiMark.ts(XMP IPTC DigitalSourceType=trainedAlgorithmicMedia + EXIF "MOSPIC AI", 실패 시 원본 반환, 실측 79ms/+707B) + crop.ts keepMetadata() 1줄(크롭이 도장 지우는 함정 선제 방어). 파일럿 21469f6 → 확산 a454566(이미지 route 111종 전원: Gemini109·업스케일·누끼·idstyle, 미도장 2개=validate-photo·petreceipt는 이미지 미생산) + 5dddbf6(결과화면 고지 111곳 "AI로 생성된 이미지예요"). 과정서 54파일 CRLF 플립 발견→내용 무결 확인 후 LF 정규화
  - [결정] 코인 3원칙 확정: 결제=로그인 필수 / 유료 생성물 원본 Blob 영구 저장(표시 축소본·다운로드 원본 이원화) / 실패 시 코인 자동 반환
  - [상세페이지] 증명33+비즈32=65종 리디자인 교체(6a8042a, 130파일: webp 65 덮어쓰기+옛 png 65 git rm -f, 코드 0, 338MB→35MB) / car·food·factory 3종(e6c0cbc) / 신규 5종 y2k·roman·clay·luxe·homecafe 썸네일+상세 연결(ef438b5) = 완전체 / 미완성 3종 travel·halloween·goods 홈 카드 주석 숨김(URL 직접 접근 유지) — 운영원칙 "보이는 건 완전체뿐" 확립. 현황: 새 기준 73종 / 리디자인 대기 9종(age·figure·illust·interior·menu·nukki·product·restore·upscale) / 숨김 3종. 킷 7종 발송 완료(goods만 미발송)
  - [travel 수술기] 4차: 1차 잠금 37ca909→2차 SKIN&POLISH→3차 안경1개·chest-up→4차 전면 리셋 프롬프트 제공(TWO ABSOLUTE RULES+STUNNING) — push 미확인, MJ "별로라서 홀드". 결판 절차: push→같은 셀카 재실측(★사진 보여주기)→AI Studio 나노바나나 Pro 비교→필요시 모델 교체. halloween·goods 애프터는 travel 확정까지 홀드
  - [★도메인] mospic.com 이전 완료 — 가비아 구매(만기 2027-07-15)→Vercel 연결(A레코드 @ 216.198.79.1 — 신규 IP)→SSL→구주소 308 리다이렉트. 카카오: 앱 이름 MOSPIC 변경 + Redirect URI·웹 도메인 등록 → 로그인 테스트 성공. 코드 잔재 2곳→window.location.origin(7a0bd58), auth=env 방식·manifest=상대경로라 무수정. og 메타태그 부재 발견(마케팅 때)
  - [★토스+결제 전략] 전자결제 신청서 작성 완료: 기본 결제 패키지 / 카드+카카오페이+토스페이+네이버페이+페이코(계좌이체 제외 — 최저 건당 200원=소액 실효 7~20%) / 플랫폼 아니요·환금성 아니요·5만원 이하·즉시 / 사업자등록증 업로드 → 33만원(가입22+연관리11) 결제 대기, ★기한 2026-08-14, 심사 거절 시 환불. MEVU 정찰: 구글 인앱결제, 증명사진 6,900원 "최다 판매"(코인 가격 기준점)
  - [★방향 선언] MJ: 앱스토어 배포가 본선, 웹은 임시 형태. 인앱결제 감수 — 웹 우선 하이브리드 전략 재고
  - [Capacitor 타당성 조사 완료] 원격 모드(server.url=mospic.com) 하이브리드 — 코드 변경 0, 웹 배포=앱 업데이트 / 1순위 리스크=카카오톡 간편로그인 kakaotalk:// 스킴(1주차 실기기 테스트로 판정, 실패 시 시스템 브라우저 플로우 +1~2주) / 신규 계정=테스터 12명×14일 클로즈드 테스트 의무 / 스토어 앱 내 디지털 재화=Play Billing 강제(RevenueCat 권장, 15%) + AI 콘텐츠 신고 버튼 요구 / 타임라인: 무료 셸 5~6주, IAP 포함 7~9주 / iOS 별개(Play 먼저 = 아이폰 사용자 IAP 결제 불가) / ★핵심 시사점: 코인 원장은 서버(Redis) 중심으로, 결제 수단(Toss/IAP)은 갈아끼우는 부품으로 설계
  - [★Capacitor 1주차 관문 통과] 셸 생성~실기기 카카오 로그인 판정 완료
    · 셸: C:\mospic-app (별도 폴더 — baby-face-app 경로 공백 "Hello G.BOX" 리스크 회피), Capacitor v8.4.2, appId com.mospic.app, 원격 모드 server.url=https://mospic.com, allowNavigation ["*.kakao.com"], 로컬 git 커밋 c545093 (GitHub 푸시 없음)
    · 사전 조사 결과: Capacitor 흔적 0 / output export 없음 / 로그인 경로 새 창 0 / redirect_uri env 방식 → 원격 모드 적합 판정
    · 실기기(갤럭시 Z플립5 SM-F731N) 설치 성공 → ★카카오 로그인 웹뷰 안에서 완결, 앱 재실행 후에도 세션 유지 확인 = 관문 통과
    · ★진짜 원인은 카카오톡 스킴이 아니었음 — Vercel env KAKAO_REDIRECT_URI가 옛 주소(baby-face-app-seven.vercel.app) → 카카오가 옛 도메인으로 리다이렉트 → 허용목록 밖이라 Capacitor가 크롬으로 방출 → 크롬/PWA에서 로그인 완료되던 것. adb logcat으로 ActivityManager START 줄 잡아 확정(kakaotalk://·intent:// 0건)
    · 조치: KAKAO_REDIRECT_URI=https://mospic.com/api/auth/kakao/callback, NEXTAUTH_URL=https://mospic.com 로 재생성(Sensitive OFF) + 캐시 해제 Redeploy
    · 부수 이득: 웹도 308 우회 한 홉 제거 + 로그아웃 리다이렉트 정상화
    · ★타임라인 영향: 카카오 보정(+1~2주) 불필요 → 무료 셸 5~6주 중 상단 리스크 제거
- 다음에 할 것:
  1. [★결정, 8/14 기한] 토스 33만원 — A안 결제(IAP 전 공백기+아이폰용 웹 레일 확보) vs B안 스킵(IAP 직행, 9월 중순까지 매출 0 + 아이폰 장기 결제불가 감수). Capacitor 1주차 관문 결과 보고 판단 권장
  2. Capacitor 1주차: 셸 생성+아이콘/스플래시+원격 모드 → ★실기기 카카오 로그인 테스트(최대 리스크 조기 판정)
  3. 코인 시스템 설계 — 서버 원장 중심·수단 중립(Toss/IAP 겸용). 원칙 내장: 로그인 필수·원본 Blob·실패 자동 반환·환불 약관("현금 환급·양도 불가, 미사용분 결제취소 가능")·사업자 정보 표기. 가격 기준점 MEVU 6,900원
  4. [MJ 손] 테스터 12명 모집 시작(14일 시계가 병목) / 법률 문서 [__] 시행일·대표자명 / (토스 결제 시) 통신판매업 바로신청→면허세 40,500원 위택스
  5. 사이드: travel 결판→y2k·halloween 이식→숨김 3종 해제 / 리디자인 9종(기존 페이지 첨부받아 프롬프트) / goods 킷 / GPT 4종(gpt-image-2 검증 후)
  6. [2주차] 이미지 저장 브리지 — a.download 114곳이 안드로이드 웹뷰에서 data URL 다운로드 미처리. Capacitor 다운로드 리스너 or Filesystem/Media 플러그인 필요. 패턴 균일해 벌크 가능. + navigator.share 1곳(@capacitor/share), mailto 1곳 확인
  7. 셸 마무리: 아이콘·스플래시(현재 Capacitor 기본), 카카오 개발자센터 앱 아이콘이 아직 옛 아기얼굴 → MOSPIC 로고로 교체(동의화면 신뢰도)
- 주의/메모:
  - ★카카오 새 UI 경로(2026 개편): 웹 도메인=[앱>제품 링크 관리], 로그인 Redirect URI=[앱>플랫폼 키]→'대표' 뱃지 REST API 키 카드 클릭 안. [제품설정>카카오로그인>일반]엔 없음, [고급]은 로그아웃용. "REST API 키 추가" 화면은 새 키 생성 함정 — 기존 카드를 눌러 수정할 것
  - 도메인 교체 여파: 기존 사용자는 mospic.com에서 재로그인 필요(클라우드 히스토리 복원됨), 비로그인 로컬 기록은 옛 주소에 묶임
  - 뒤로가기 규칙: 만들기 체인 이동=location.replace 유지(가짜 칸 방지), 새 오버레이 추가 시 useBackClose 훅 1줄
  - 새 컨셉 복제 시 AI 도장·고지 자동 포함됨(route 조립줄 stamp + page 고지 1줄) — 지우지 말 것
  - 상세페이지 교체 공정(루틴): 같은 파일명 PNG를 details에 덮어넣기→컨셉명만 알려주면 일괄 처리(webp 88 변환→덮어쓰기→원료 png 정리). PWA 캐시로 옛 이미지 보이면 앱 재시작
  - 미정리: nn5a git 연결 해제(Vercel — mospic-images Blob 스토어 삭제 금지) / 카카오 로그아웃 리다이렉트 URI mospic 버전(급X) / 카카오 비즈 앱 전환(수익화 때) / GitHub Private / og 메타태그
  - ★도메인 이전 시 env 전수 점검 필수. 웹은 308이 가려줘서 "성공"처럼 보임 — 앱 웹뷰가 리트머스지 역할
  - ★Vercel Sensitive 토글은 URL류 env에 쓰지 말 것(값 되읽기 불가 → 디버깅 차단). 비밀키만 Sensitive
  - Redeploy 시 "Use existing Build Cache" 해제해야 env 반영 확실
  - 셸 재빌드: Android Studio로 C:\mospic-app\android 열고 ▶ (폰 USB 디버깅 ON, 삼성 자동차단의 USB 항목 OFF 필요)
  - C:\mospic-app\logcat.txt 는 임시 산출물 — 삭제 가능

## 2026-07-14 — 신규 컨셉 8종(y2k~goods) 배선 완료 + era·petcostume 칩 버그 수리
- 한 일: 신규 14종 중 Gemini 8종 전부 배선(y2k·roman·clay·luxe·homecafe·travel·halloween·goods, 각 4파일 커밋) + era·petcostume 칩 UI 복구(옵션 setter 미호출로 항상 기본값만 생성되던 버그, 전수 스캔 결과 이 2개뿐)
- ★O2O 메모 (패치 3-4, M11 실물 아크릴 주문 진행 시 필독): goods의 생성물은 "실물처럼 보이는 목업 사진"이지 **인쇄용 도안이 아니다**. 실물 굿즈 주문(M11)을 붙일 때는 고해상 도안·누끼(투명배경 컷팅 패스) 파이프라인이 **별도로 필요** — 현재 goods route 출력물을 그대로 인쇄에 쓸 수 없음.
- 다음에 할 것: 신규 8종 썸네일 webp(전부 이모지 상태) / 보류군은 조건 충족 후(makeup·glasses·haircolor·useditem=gpt-image-2 검증, petswap=Pro 테스트, bodyprofile=맨 마지막)

## 2026-07-05 — 오리지널 증명사진 10종 상세페이지·썸네일 완성 + 컨셉 로드맵 + 보정 프롬프트 + 홈 리디자인 시안
- 한 일:
  - [완성] 오리지널 증명사진 10종 상세페이지 3종 세트(①애프터 파일명 ②Claude Design 디자인 프롬프트 ③사진 배치 프롬프트) 전부 제작 → MJ가 썸네일·상세 PNG 생성 → Claude Code가 image·detailImage 20줄 연결, 빌드 204/204 통과, 커밋 bf9b5bb 배포
    · 여성 5종(woman A/B 모델): idwarmbob 웜브라운단발 / idhime 밀크브라운히메컷 / idashwave 애쉬웨이브 / idlowbun 로우번터틀넥 / idburgundy 버건디오프숄더
    · 남성 5종(남자 A/B 모델 = before_c_* + id_model_man_*): iddandy 댄디베스트 / iddownperm 다운펌화이트셔츠 / idnavysuit 가르마네이비수트 / idbeigeblazer 소프트펌베이지 / idhenley 투블럭헨리넥
    · 이걸로 증명사진 라인 = 성별전용 10종 + 오리지널 10종 = 20종 전부 완성(route+page+홈연결+썸네일+상세)
    · 상세페이지는 mospic-detail-page-prompt 스킬 기반 Template B(결과물 갤러리형). 컨셉별 배경색 톤을 다르게(웜크림·로즈베이지·라벤더그레이·피치·스카이그레이 등), 가격표는 "무료/0원" 금지·"커피 한잔값"·"만들기 누르면 앱에서 안내"로 통일
  - [기획] 컨셉 로드맵 회의 — 성공공식(얼굴유지·색충돌회피·오리지널조합) 재확인 + 파생 3축(같은컨셉×다른스타일 / 같은스타일×다른대상 / 같은대상×다른용도). TOP5 우선순위 도출: ①남성 비즈프로필(여성만 있고 남성 비어있음, 1순위) ②셀프웨딩 화보(고단가) ③부모님 리마인드 웨딩(선물시장·바이럴) ④여름 바다 화보(시즌) ⑤펫 초상화
  - [프롬프트] 사진관 보정 2종 Gemini 프롬프트 작성 — RETOUCH(스튜디오 클린업: 잡티·잔머리·눈밝기·치아·옷주름·배경, 얼굴구조 불변) + BEAUTY_RETOUCH(턱·눈·코 ~5% 은은한 성형급, IDENTITY LOCK "한눈에 같은사람"). 증명·비즈프로필 결과물에 적용용. 입력=결과물 1장(셀카 아님)
  - [프롬프트] 수요 기반 보정 컨셉 10종 작성(각각 Gemini 보정 프롬프트 + GPT 비포 생성 프롬프트) — fixheight 롱다리 / fixhead 소두 / fixslim 슬림 / fixfit 옷태 / fixbody 바디프로필 / fixgroup 단체 / fixbacklight 역광 / fixnight 야간 / fixcrowd 행인지우개 / fixselfie 셀카스튜디오. 전부 "재생성 금지·편집만·신원잠금·~5%·배경선 휘어짐 방지" 원칙
  - [기획] 두 가지 전략 고민 논의 — (1)"안 닮음" 문제를 자기인식 괴리(심리)+실제닮음(입력품질) 둘로 분리, 결정순간 마찰 제로·안내는 이득프레임·결과는 "골라보세요"로 해결 (2)디자인 세련도 레버 순서: 폰트(최대)>여백>색절제>시그니처>사진주인공>일관성
  - [시안] 홈 리디자인 Claude Design 프롬프트 작성 → MJ가 시안 생성(390px 프리미엄 포토갤러리). 결과 훌륭: 오프화이트배경·조용한헤더·히어로카드·블랙시그니처밴드·핑크절제. 95%+ CSS 재현 가능 판정
  - [폰트 적용→보류] layout.tsx를 Pretendard로 교체(Noto 삭제, CDN 링크 추가, themeColor #FF4B7C→#FAFAF8)까지 실제 적용하고 폰트 바뀜 확인 → 단, MJ가 "디자인은 컨셉 더 만든 후에 진행"으로 결정하여 **이 변경은 없던 것으로 보류**(다시 진행 시 재적용)
- 다음에 할 것:
  - [컨셉 대화 전담] 남성 비즈프로필(1순위) → 셀프웨딩 → 부모님 리마인드웨딩 → 여름바다화보 → 펫초상화 순 제작. 보정 10종은 프롬프트 준비됨(이 로그 위 세션 참고), 추후 진행
  - [디자인·기능 대화 전담] 홈 리디자인(시안 확정됨) Pretendard부터 7단계 / 사진관·뷰티 보정 기능 앱에 붙이기 / 안닮음 UX / ★영구저장(결제전 필수) / 토스 결제+코인
  - 상세페이지 스킬로 앞으로 나올 컨셉들 상세페이지도 동일 3종세트 방식 유지
- 주의/메모:
  - ★★★ 대화를 2개로 분리 운영 시작: (A)컨셉 추가 전담 / (B)디자인·기능 전담. 두 대화가 겹치는 파일은 app/page.tsx·app/lib/concepts.ts 뿐(A는 카드·onClick·detailImage 줄 추가, B는 스타일·레이아웃 변경). 규칙: ①한 번에 한 대화만 작업하고 git push로 마무리 후 전환 ②작업 시작 전 미저장(●) 파일 없는지 확인 ③이 두 파일이 양쪽에서 겹치면 한쪽 끝내고 push 후 다른쪽(동시편집 금지)
  - ★ 홈 리디자인 시안에 있는 카드 중 가족웹툰·인테리어·상품사진은 아직 route 없는 "목업용 예시". 실제 코딩 시엔 (a)디자인 틀만 가져오고 카드는 실제 보유 컨셉(증명20종·아기·음식·복셀)으로 채우기 → 새 컨셉은 나중에
  - ★ 사진관 보정/뷰티 보정은 입력이 "결과물 1장"이라 기존 컨셉(셀카 3~6장)과 route 구조 다름. 붙이는 방식 3안: (A)새 유틸 컨셉 카드 (B)결과화면 "보정" 버튼 (C)생성 자동체이닝[비추-비용2배·시간초과]. A부터 추천
  - ★ 보정 컨셉 워크플로: GPT로 비포 생성 → Gemini 보정으로 애프터 → 비포/애프터 쌍(상세페이지는 Template A). 1·2·3번(비율계열)은 배경선 휘어짐, 9번(행인)은 풍경복원 어색함이 최대 리스크
  - 보정 프롬프트 강도조절: 약하면 "about 5%"→"10%", 세면(딴사람)→"3%". Google AI Studio에서 코드 없이 먼저 테스트
  - ★ Pretendard CDN 링크(다시 쓸 때): https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css — layout.tsx <head>에 넣고 body fontFamily 'Pretendard Variable', Pretendard, ... 로. themeColor는 #FAFAF8
  - 홈 리디자인 디자인 토큰: 배경 #FAFAF8(오프화이트), 텍스트 #1A1A1A(오프블랙), 보조 #9B9B9B, 핑크 #FF4B7C(면적 5%이하 뱃지·CTA만), radius 18, 간격 8배수, hairline #EEECE8, 블랙 시그니처밴드 #1A1A1A
  - ⚠️ 카카오 REST키가 자동첨부 초기메모에 계속 노출 중 — 아직 재발급 안 함. 반드시 재발급 필요

## 2026-06-27 — 비즈프로필 장르 정립 + 네이비·블랙 2종 풀 구현
- 한 일:
  - [중요 발견] "비즈프로필 ≠ 증명사진 확장"임을 확정. mevu 레퍼런스 분석 결과 비즈프로필은 별도의 "화보" 장르 → 헤드샷이 아니라 허리~허벅지 프레이밍, 포즈 지정, 옷이 주인공, 미화 허용(화보라 닮음은 일부 양보)
  - [설계 확정] 비즈프로필 = 한 컨셉(옷·배경 고정) 안에서 포즈 3종(① 팔짱 ② 손모음 ③ 3/4 각도)을 독립 호출 각각에 넣어 "포즈 다른 3장" 출력 → 사용자가 선택. 비율 1:1.5(가로3:세로4.5). 이름규칙 biz-{옷}-{배경}
  - [신규 컨셉] biz-navy-gray 완성 = 네이비 정장 + 중간 회색 배경, 한글명 "네이비 정장 프로필"
    · route(app/api/biz-navy-gray/route.ts): buildPrompt(pose) 공통 프롬프트 + POSES 3종, Gemini 독립 동시 3회(Promise.allSettled), 손 처리 문구 포함
    · 화면(app/biz-navy-gray/page.tsx): 갤러리 다중선택 3~6장, "이렇게 찍으면 더 잘 나와요" 입력가이드 박스, 결과 3장 세로나열, addToHistory("비즈프로필 (네이비)"), 색 #3B5BA5
    · 홈 연결 5군데(start타입·CONCEPTS·conceptForGo + 카드·버튼onClick), 카드 tags ["비즈니스"]
    · 상세페이지(Claude Design 템플릿B, 프리미엄 다크 네이비 톤) + 썸네일 → public/cards/biznavy.png, public/details/biznavy.png 연결
    · 테스트 결과: 포즈3·화보프레이밍·정장·손 다 잘 나옴, 닮음 70%(화보 한계+미화 원칙으로 합격). 입력가이드 강화(C안)로 품질 보완
  - [신규 컨셉] biz-black-gray 완성 = 블랙 정장 + 밝은 회색 배경(화이트 배경은 증명사진 느낌이라 거부 → 밝은 회색), 한글명 "블랙 정장 프로필"
    · 네이비에서 옷(BLACK suit)·배경(light neutral gray, mid보다 밝게)·STYLING 제목·조명 끝줄만 교체. start="bizblack", 경로 /biz-black-gray, 색 #2B2F38, emoji 🖤, 카피 "격식을 갖춘 클래식"
    · route·화면·홈 연결 5군데 동일 패턴으로 복제
    · 상세페이지(Claude Design 템플릿B, 블랙·모노톤 시크 톤, 네이비와 구분) + 썸네일 제작, public에 넣고 연결 진행
    · before 모델 A는 "더 예쁜 인물"로 새로 교체(클릭률 목적), 남성·안경 모델은 재활용
  - 커밋: 네이비 썸네일 배포 + black 라우트/페이지 + bizblack onClick 분기 수정까지 포함
- 다음에 할 것:
  - [블랙 마무리] biz-black-gray 썸네일/상세 연결(page.tsx 카드 image, concepts.ts detailImage) 저장·확인 후 배포 → 배포 사이트에서 만들기 버튼·썸네일 최종 확인
  - [비즈 확장] 다음 스타일(그레이 정장/화이트 셔츠만/베이지/라벤더 등) — route 복제 + 옷·배경 프롬프트만 교체
  - [수익화] Toss 코인 충전(Mission 5) + "무조건 3장 보장"(Vercel Pro maxDuration 120 + 재시도 로직)
  - [유형 B/C] 헤어스타일(2~6→2), 커플(→2)·가족(→3)·펫(대상별 칸 분리 UI)
- 주의/메모:
  - ★★★조용한 버그 재발: page.tsx onClick에 bizblack 분기를 넣었는데 "저장(Ctrl+S)을 안 해서" 실제 파일에 반영 안 됨 → 만들기 버튼이 홈으로 빠짐. 코드 넣은 뒤 반드시 Ctrl+S 하고 파일 탭의 ● 표시가 사라졌는지 확인할 것
  - localhost에서 라우팅이 안 되면 Claude Code에게 next build로 빌드 검증시키는 게 가장 확실(눈으로 본 코드 ≠ 실제 저장된 파일일 수 있음)
  - 비즈프로필 닮음 70%는 화보의 구조적 한계(얼굴 작아짐+포즈+각도). 어제 원칙대로 "미화=기능"이라 합격 처리. 더 올리려면 프롬프트 말고 입력가이드(정면·밝은·여러장)로 보완
  - 블랙 정장은 배경이 너무 어두우면 라펠·단추 디테일 뭉개짐 → 배경을 mid보다 밝은 회색으로(블랙이 떠 보이게)
  - 상세페이지 before 사진은 GPT로 만들 때 1번째(메인)를 레퍼런스로 고정하고 2·3장째 생성해야 얼굴 일치(2장째를 레퍼런스로 쓰면 얼굴 흘러감)
  - before 셀카는 네이비/블랙 공용 재활용 가능(biz_before_*), after만 컨셉별로(bizblack_after_*)

## 2026-06-26 — 정리 마무리 + 첫 얼굴 컨셉(증명사진) 풀 구현
- 한 일:
  - [정리] nn5a 프로젝트 git 연결 해제 (push가 baby-face-app 하나로만 가게)
  - [정리] 카카오 배포용 Redirect URI 정리 (거꾸로 된 .../api/auth/callback/kakao 삭제, 올바른 .../api/auth/kakao/callback만 유지)
  - [신규 컨셉] id-skyblue-skyblue 완성 = 증명사진(하늘색 셔츠 + 하늘색 배경), 한글명 "하늘빛 블루 셔츠"
    · API route (app/api/id-skyblue-skyblue/route.ts): 입력 3~6장 받아 Gemini 독립 동시 3회 호출(Promise.allSettled)로 "진짜 다른" 증명사진 3장 출력. 프롬프트는 증명사진용(identity 우선, 얼굴 10% 축소, 점 처리=없는 점 X·있는 점 축소, 3.5:4.5 규격, 하늘색 셔츠+배경).
    · 화면 (app/id-skyblue-skyblue/page.tsx): 갤러리 다중 선택(input multiple, 3~6장 누적) + 썸네일 그리드 미리보기 + 개별 삭제 + "3/6장" 표시 + 정면 얼굴 안내. 결과 3장 세로 나열, 각각 저장. 클라우드 히스토리 자동 연동(addToHistory). 디자인 파랑 #3B82F6 + 핑크 포인트.
    · 홈 연결 5군데: concepts.ts(start 타입에 "idskyblue" 추가 / CONCEPTS에 idskyblue 블록 / conceptForGo에 if문) + page.tsx(카드 한 줄 추가 / 버튼 onClick에 else if → /id-skyblue-skyblue)
    · 카피: "맑고 산뜻한 첫인상 / 하늘빛 블루 셔츠"
    · 상세페이지(Claude Design)·썸네일 제작 → public/details/idskyblue.png, public/cards/idskyblue.png → page.tsx 카드 image, concepts.ts 블록 detailImage 연결
  - 커밋 메시지: (Claude Code가 배포한 커밋 — id-skyblue 컨셉 + 썸네일/상세 연결)
- 다음에 할 것:
  - [수익화 핵심] Toss 코인 충전 연동(Mission 5). 1장당 900원 구상(3장=2700원), 1토큰=300원×3 또는 1토큰=900원. TOSS 키는 baby-face-app에 이미 등록됨.
  - [수익화와 세트] "무조건 3장 보장" 살리기 → Vercel Pro 업그레이드(maxDuration 120초) + route에 재시도 로직(부족분 재호출) 다시 넣기. 지금은 속도 우선(동시 3회, 재시도 X, 타임아웃 55초)이라 가끔 2장 나옴. Hobby 60초 안에선 재시도가 빠듯해 보류.
  - [얼굴 컨셉 확장] id-skyblue-skyblue를 "유형 A 템플릿"으로 복제 → 비즈프로필(3~6장→3장), 헤어스타일(2~6장→2장)
  - [유형 B/C 설계] 커플(→2장)·가족(→3장)·펫+사람(→2장)·펫만(→1장)·베이비(1장→1장). 입력은 대상별로 칸 나눠 UI로 분리(자동 인식 X)
  - [정리] fourcutillust에 잘못 붙은 detailImage 확인(전에 발견, 급하지 않음)
- 주의/메모:
  - ★얼굴 미화 = 버그 아니라 기능. 인물 컨셉 프롬프트에서 "원본 그대로/통통하게" 누르지 말 것. 사용자는 예쁘게 나오길 원함.
  - ★다중 출력은 반드시 "독립 호출"로 — Gemini는 한 대화 연속 생성 시 앞 결과가 묻어나 비슷해짐. 별개 요청 N개로 보내야 진짜 다른 결과.
  - ★다중 출력 최대 3장(요금 1장당 900원과 연결). 3장 제각각 나오는 건 의도된 강점(고르는 재미).
  - ★입력 사진 적합성은 AI 자동 판별 대신 UI 구조(대상별 칸 분리 + 안내 문구)로 해결 — 부작용 적음.
  - 새 컨셉 추가 시 조용한 버그 주의: 카드(page.tsx) + start타입/CONCEPTS/conceptForGo(concepts.ts) + 버튼onClick(page.tsx) 전부 등록해야 동작. 하나 빠져도 빌드는 통과.
  - 썸네일 PNG 없이 image 경로 넣으면 조용히 깨짐 → PNG 먼저 넣고 경로 연결.
  - 새 썸네일은 캐시(브라우저/PWA 서비스워커) 때문에 배포 직후 몇 분간 이모지로 보일 수 있음. 시간 지나면 뜸. 급하면 파일명에 버전(-v1) 붙이기.

## 2026-06-24 — illust·age 상세페이지/썸네일 + 상세페이지 스킬 Claude Design화
WORKLOG.md 맨 위에 이번 작업 정리해줘: 로그인 사용자 클라우드 히스토리(Vercel Blob + Redis) 구현 완료, 기기 간 동기화 작동 확인. 그리고 핵심 교훈(프로젝트가 nn5a/baby-face-app 둘로 갈려 있었던 것, BLOB_READ_WRITE_TOKEN은 코드가 배포되는 프로젝트에 있어야 함)도 남겨줘.
- 스킬 수정(mospic-detail-page-prompt): 제작 도구 Cowork → **Claude Design**으로 전면 교체. + **가로 1080px 잘림 해결책 못박음**: 캔버스 폭 정확히 1080px + 내보내기 **1배율(1x)**(2x가 기본이라 2160px로 커져서 잘렸던 게 원인 추정) + 내보낸 뒤 가로 픽셀 1080 확인. → 앞으로 모든 컨셉 상세페이지가 이 방식.
- illust(일러스트): route 프롬프트 강화(STEP 구조 — ①사진 먼저 읽기(1인/커플/단체/펫/풍경 자동인식·인원수 보존) ②정체성 유지 ③여러 명일 때 얼굴 섞임/평균화 금지 ④웹툰·애니 키비주얼 화풍 가드, 3D·치비·싸구려필터 금지). 배포 완료. before 6장 GPT 프롬프트 + 파일명 체계 + Claude Design 배치 프롬프트 제공.
- illust 상세페이지: Claude Design이 HTML로 뽑음. 단 이미지가 base64 임베드가 아니라 assets/ 파일 10개(after6+before3+로고) 참조 구조 → HTML만으론 렌더 시 깨짐. **PNG 마무리 보류**(이미지 10개 or Design 최종 PNG 올리면 1080px로 마무리).
- age(나이변환): route 프롬프트 강화(노년·아기 둘 다 STEP 구조 + **성별·인종·피부톤 고정** + 노년 과노화/병약 금지·아기 언캐니("애늙은이") 금지). 배포 완료. cropToRatio(3,4) 유지. before 2장(성인 여/남) GPT 프롬프트 + 파일명 체계.
- age 상세페이지: Claude Design 프롬프트 작성(**👴노년 / 👶아기 모드 섹션 분리**, 히어로=아기·지금·노년 3단 트립틱, 밝은 따뜻 파스텔). 제작 완료. 6장(원본2+노년2+아기2) 자리 재활용 구조.
- age 썸네일: **아기|지금|노년 3분할 카드** PIL 제작(핑크 라벨+변화 화살표, 1000×1000). public/cards/age.png.
- 파일명 체계: illust = after_woman/man/couple/family/pet/scene + before_man/woman/couple + mospic-logo / age = age_woman·man_now/old/baby.
- ⭐배운 점: Claude Design HTML export는 이미지를 assets/ 파일 참조로 빼서 HTML만으론 재현 불가(이미지 같이 있어야). 상세 PNG는 Design에서 1x·1080px로 받는 게 정석.
- 다음: ① illust·age 상세 PNG 1080px 검수 → public 저장 → concepts.ts detailImage + page.tsx image 연결 → **흐름 검증(conceptForGo·버튼 onClick 누락 체크)** → 묶어서 배포. ② 영구 이미지 저장 재점검(아래) → Toss 코인 결제.
- 주의: ★영구저장 가정 수정 — 현재 히스토리에 이미지가 (수동저장 안 해도) 저장되고 1시간 만에 안 사라짐. 추정: Gemini 컨셉은 결과가 base64(이미지 자체)라 IndexedDB에 통째 저장→안 만료. Replicate 컨셉(아기·업스케일·누끼)만 URL이라 1시간 만료 위험. + IndexedDB는 기기·브라우저 로컬이라 폰 교체/데이터 삭제 시 사라짐(계정 동기화 아님). → Blob 만들기 전 Replicate route가 URL 반환인지 base64 반환인지 코드 확인 후 범위 결정.

## 2026-06-24 — 미니어처 피규어(figure) 제작 + 새 컨셉 배치 시작
- 방향: 재미·바이럴 계열 3개 배치(피규어 → 일러스트 → 나이변환) 시작. 첫 타자 figure.
- figure 엔진: voxel route 복제(모델·엔드포인트·파싱 검증된 구조 재사용) → 프롬프트만 교체. 모델 gemini-3.1-flash-image.
- 피규어 방향 결정: "디오라마"(책상 위 정교한 모형). cf. 박스 피규어(A) 대신 디오라마(B) 선택.
- 프롬프트 강화(5포인트): 틸트시프트 강하게(피규어만 razor-sharp, 앞뒤 크리미 블러), PVC/레진 새틴 광택+손도색 붓터치, 디오라마 받침대+실제 나무 책상, 닮음 가드 강화(같은 얼굴·이목구비·헤어·옷, 딴사람/과한 치비 금지), 제품컷 조명. "3D렌더·만화 아님" 못박음. → 결과물 퀄 확 좋아짐(받침대·미니 소품·틸트시프트 잘 살아남).
- page.tsx: 이미 존재(디오라마 설명 포함). concepts.ts 블록/타입/conceptForGo, page.tsx 카드/GO_CATEGORIES/버튼도 이미 등록돼 있었음 → route.ts만 새로 만들면 됐음.
- 썸네일: 원본|피규어 좌우분할 카드 제작(전신 사진이라 위/아래 대신 좌우). public/cards/figure.png. page.tsx figure 카드에 image 추가.
- 상세페이지: mospic-detail-page-prompt 스킬로 Cowork 프롬프트 작성(C형 변환, (가) 밝은 파스텔). before 4장 GPT 프롬프트(fig_person/couple/family/pet) + 8장(원본4+피규어4) 슬롯 배치표 제공. 실제 before 4장 + /figure 돌린 피규어 4장 준비 완료.
- 진행: figure route·page·썸네일 완료. 남은 것 = 상세 PNG(Cowork, 1080px 풀폭) 넣고 detailImage 추가 → 그러면 figure 완성.
- 별도 산출물: HANDOFF(인수인계) 문서 작성. 새컨셉_추가_체크리스트.md·working.md는 이전 세션에 작성됨.
- 모델 변경 기록: 이미지 생성 모델이 gemini-2.5-flash-image → gemini-3.1-flash-image로 올라가 있음.
- 다음: figure 상세 마무리 → illust·age 제작. (수익화 전 영구 이미지 저장이 critical 과제로 남아있음.)

## 2026-06-19 — 고화질 변환(업스케일) 컨셉 + "4K로 받기" 버튼
- 컨셉: 작고 흐린 사진 → 4배 해상도(최대 4096px) 업스케일. 생성 AI 아닌 전용 모델. 인쇄·상세페이지·확대용. (업로드 → 변환 → PNG 저장)
- 배경지식: 생성 모델(나노바나나/Gemini, gpt-image-1)은 출력 ~1024px 고정 → 4096px은 "업스케일 단계 추가"로만 가능. 모델에 "4096으로 뽑아줘"는 안 됨.
- 엔진: Replicate nightmareai/real-esrgan, scale 4, face_enhance false. 커뮤니티 모델이라 version 조회 후 /v1/predictions (Prefer: wait=55). 보통 12초 이내.
- 비용: Replicate에서 청구(누끼·포토메이커와 같은 계정·토큰). 장당 약 $0.0025 ≈ 3~4원. replicate.com → Billing/Usage에서 확인.
- 만든 파일: app/api/upscale/route.ts, app/upscale/page.tsx, app/components/Upscale4K.tsx.
- 앱 등록(누끼와 동일 6곳): concepts.ts(start 타입 유니온 + upscale 블록 + conceptForGo 한 줄), page.tsx(GO_CATEGORIES + 홈카드 + 버튼 onClick). 이때 GO_CATEGORIES에 누끼도 추가(이전 누락분 보완).
- "4K로 받기" 버튼: 공용 컴포넌트 Upscale4K.tsx로 분리 → 결과 화면엔 import 1줄 + `<Upscale4K image={결과} />` 1줄만. 아기 얼굴 결과 화면에 적용·작동 확인.
- 디버깅: /upscale 404 = 파일 위치·코드 정상인데 배포 시간차였음 → 강력새로고침(Ctrl+Shift+R)으로 해결.
- ⭐배운 점: 반복 UI는 컴포넌트로 빼면 페이지마다 2줄로 끝. 카드 썸네일/상세 PNG는 없어도 작동(이모지+설명 폴백)이라 나중에 추가 가능.
- 별도 산출물: "새 컨셉 추가 체크리스트" 참고 문서 작성(수정 지점 11곳 + 빠뜨리면 생기는 증상 정리).
- 다음에 할 것: 나머지 컨셉 결과 화면에 "4K로 받기" 2줄씩 추가(추후), upscale 카드 썸네일·상세 PNG 제작, 4K를 코인/결제와 묶기(Mission 5).

## 2026-06-18 — 누끼(배경 제거) 완성
- 컨셉: 상품·인물·사물 사진 배경 제거 → 투명 PNG. 생성 AI 아님, 배경제거 전용(세그멘테이션) 모델. 셀러·디자이너용.
- 엔진: Replicate 851-labs/background-remover, 장당 ~0.5원. 커뮤니티 모델이라 version 조회 후 /v1/predictions 호출 (Prefer: wait=55).
- 만든 파일: app/api/nukki/route.ts, app/nukki/page.tsx, public/cards/nukki.png, public/details/nukki.png.
- 페이지: 업로드 → 생성 → "PNG 저장", 체커보드로 투명 표시. M=1024.
- 상세페이지: A형, 밝고 깔끔(체커보드 모티프), Claude Design 제작 → public/details/nukki.png.
- 디버깅 3건: (1)상세 PNG 오른쪽 잘림 = 1080px인데 700px로 export됨 → 풀폭 재export. (2)카드 누르면 "곧 만나요" = conceptForGo에 nukki 줄 누락 → `if (go==="nukki") return CONCEPTS.nukki;` 추가. (3)"만들기" 누르면 홈으로 튕김 = 버튼 onClick에 nukki 줄 누락 → `else if (detail.start==="nukki") {…"/nukki"}` 추가.
- ⭐배운 점: 새 컨셉은 conceptForGo + page.tsx 버튼 onClick에 "한 줄씩 수동 등록" 필요. 빠져도 빌드 에러 안 나서 함정(준비중 화면/홈 튕김).
- 주의: 851-labs 상업 라이선스 확인 필요. 반투명(유리·머리카락) 가장자리 한계. 진짜 투명 PNG는 앱 "PNG 저장" 버튼으로만(스크린샷 X).
- 다음에 할 것: realestate·car·interior 연결(체크리스트대로), idstyle 보류, Mission 5 토스 결제.

## 2026-06-18 — 메뉴판 비주얼 (menu) 완성
- 컨셉: 대충 찍은 음식 사진 → 배달앱·메뉴판·포스터용 깔끔한 사진. "음식은 그대로, 더 먹음직스럽게"(정직 보정).
- 엔진: Gemini(gemini-2.5-flash-image), 크롭 X.
- 프롬프트 강화: 음식 종류 자동 감지(국물/구이/볶음/튀김/디저트/음료), 재료·양·플레이팅 그대로 유지(없던 음식·양 추가 금지), 잡동사니 제거 + 스튜디오 조명, 텍스트 미삽입.
- 6스타일 옵션: 화이트/우드/다크무드/배달앱/한식상차림/카페감성 (route STYLES 파라미터 + page.tsx 칩 UI, 업로드·결과 화면 양쪽).
- 상세페이지: B형(결과 갤러리), 차콜 프리미엄 → public/details/menu.png.
- 홈 카드 썸네일: 비빔밥 before/after 위·아래 split (그냥 찍은 사진 / 메뉴판용 + 핑크 화살표) → public/cards/menu.png.
- 연결: concepts.ts detailImage + page.tsx 카드 image 추가, 배포 완료.



### 2026-06-16
- 한 일: 복원(restore) 완성 — route 프롬프트 강화 배포 / 상세페이지 통이미지(A형·어르신 친화 밝은 톤)+비포/애프터 / 홈 썸네일(복원 전·후 반반 카드) → details·cards 연결
- 다음에 할 것: 다음 보정형(인테리어·중고차·메뉴판·부동산)
- 주의/메모: 복원=Gemini·그룹B(크롭X). 흑백→컬러 자동(추후 옵션칩 가능). 상세페이지 "사진관 1~5만원"은 실제 시세 확인. 개인정보 문구↔실제 처리 일치 필요.
### 2026-06-16 (이어서)
- 한 일: 인테리어(interior) — route 프롬프트 강화 + 6스타일 파라미터(모던·내추럴·코지·미니멀·스칸디·빈티지) 배포 / 상세페이지 B형(결과물 갤러리, 밝은 매거진 톤) + 결과물 사진 / 홈 썸네일(비포·애프터 반반)
- 다음에 할 것: interior UI 6스타일 칩(age/era 패턴) / details·cards 연결 / 다음 보정형(중고차·메뉴판·부동산)
- 주의/메모: interior=Gemini·그룹B(크롭X)·B형. 6스타일=옵션칩, 출시 전 UI 칩 필수(페이지가 스타일 선택 약속). 상세페이지 "3D 시안 수십만원"은 실제 시세 확인. 스테이징이라 "연출 예시" 고지.
### 2026-06-16 — 중고차 사진 보정 (car)
- 한 일:
  - 컨셉 방향 확정: "정직한 보정" — 먼지·얼룩·조명만 다듬고 흠집·찌그러짐·주행거리는 그대로(허위매물 방지·구매자 신뢰). 스튜디오 배경 합성 X(중고차 구매자는 과한 보정=불신).
  - route 프롬프트 튜닝: 과보정↔소심 시소 끝에 v3 확정 = "먼지 싹 / 흠집 그대로 + 'studio' 단어 제거(분홍코끼리 방지) + 길이 1/3 축소". app/api/car/route.ts (Gemini·크롭X).
  - ★핵심 발견: 결과 안정성은 '입력 사진 화질'이 좌우. 폰 업로드(자동 압축)=배경·마크 바뀜 / 컴퓨터 원본=안정. → app/car/page.tsx 입력 크기 1024→2048 상향.
  - 상세페이지: A형(비포/애프터) + 차콜 프리미엄 톤, "정직한 보정"을 핵심 메시지로. Cowork 제작 프롬프트 + before 사진 프롬프트 5종(히어로/밝기/세차+흠집/색감/흠집 클로즈업) 작성.
  - 썸네일: 비포(진흙 Trax)→애프터(깨끗) 상하 합성, BEFORE(검정)/AFTER(핑크)+화살표. public/cards/car.png.
  - 연결: app/page.tsx car 카드에 image:"/cards/car.png" 완료.
- 다음에 할 것:
  - 상세페이지 Cowork에서 사진 삽입 → 최종 PNG → public/details/car.png + concepts.ts car에 detailImage 추가.
  - 배포 검증(홈 카드 썸네일 / 보정 동작 / 입력 2048 적용).
  - 다음 보정형 컨셉: 메뉴판 / 부동산.
- 주의/메모:
  - car = Gemini · 그룹B(크롭X) · 상세 A형.
  - 차별점 = '정직 보정(흠집 유지)' = 신뢰. 앱에 "흠집은 그대로 유지" 고지 유지.
  - 생성형이라 가끔 배경·마크 흔들림 → 원본 화질 + "다시 만들기"로 커버. 입력 2048 필수.
  - 상세 가격칸의 "출장촬영 시세"는 숫자 단정 말고 '부담'으로 표현(실제 시세 검증 전).


### 2026-06-14
- 한 일:
  - [증명사진 idstyle B방식] 견본 고정+얼굴교체 방식 실험. Gemini→GPT(gpt-image-1, images/edits, input_fidelity high)까지 시도. 옷·배경은 고정되나 얼굴이 "닮은 딴사람"으로 나오는 한계. InstantID/PhotoMaker도 웹테스트했으나 결과 미흡.
    → 결론: 일반 이미지 모델로 얼굴 100% 보존은 구조적 불가 확정. 증명사진 닮음은 보류(추후 face-swap 재검토 or "AI프로필" 포지셔닝). idstyle 코드·OpenAI키는 남겨둠(홈 미연결).
  - [음식 보정 food] 프롬프트 최종 강화본 적용: 음식종류별 자동인식 + 적극보정(먹은자국 복원/오염 제거) + 카메라스펙(100mm macro f/2.8, 5500K) + 김/신선함 신호 + 가짜방지. (배포완료)
  - [음식 상세페이지] 통이미지(약 1000×8000) 방식 채택. page.tsx에 detailImage 분기 추가, concepts.ts food에 detailImage 연결. public/details/food.png.
  - [음식 카드] 홈 썸네일 연결: public/cards/food.png (회 모둠 사진), page.tsx food 카드에 image 필드 추가.
  - [로고] 좌측 상단 로고 텍스트→이미지(public/logo.png, 카메라 마크) 교체. (배포완료)
  - [상품 보정 product] mospic-prompt-upgrade 스킬로 강화. food 패턴 재활용 + 상품6종 자동인식 + 글자·색·진짜특징 보호 가드(ABSOLUTE NO-TOUCH RULES) 추가. 나노바나나 테스트 양호(누끼 깔끔). ※ route.ts 아직 미반영 — 글자많은 상품 최종 테스트 후 반영 예정.
  - [스킬 2개 제작] Cowork용 표준화 자산:
    · mospic-prompt-upgrade: 컨셉 프롬프트 분석·강화·검증 5스텝 체크리스트(유형 A/B/C별)
    · mospic-detail-page-prompt: 컨셉 상세페이지 통이미지 제작 프롬프트 생성(1080px 고정, 3분류 템플릿)
- 다음에 할 것: product 글자상품 최종 테스트→route 반영→배포 / 음식 상세페이지 cowork 실제 제작 / 다음 보정형 컨셉(공장·복원 등) 강화
- 주의/메모:
  · 증명사진 전용 표준(어깨선 크롭/머리75-80%/옷·배경 고정)은 증명사진 계열에만, 다른 컨셉 적용 금지.
  · 한 컨셉 파이프라인: mospic-prompt-upgrade(품질확정) → mospic-detail-page-prompt(소개제작) → cowork 제작 → 자산정리.
  · 자산 폴더 규칙: public/cards/{key}.png, public/details/{key}.png, public/examples/{key}-before/after, test-photos/{key}/
  · 사진 파일 대부분 png. 윈도우 확장자 숨김으로 .png.png 중복 주의.
  - [상품 보정 product] 강화+가드 프롬프트 route.ts 반영 완료(배포). 글자·색·재질 보존 테스트 양호.
    · 향후 글자많은 상품에서 텍스트 깨지면 → GPT(gpt-image-1)로 교체 검토(텍스트 렌더링 우수). 증명사진 idstyle의 images/edits 연동 패턴 재활용 가능.
    - 한 일: 공장(factory) 프롬프트 강화(자동인식·NO-TOUCH/UPGRADE 분리·촬영스펙·글자가드 등 7가지) / 상세페이지 Cowork 제작 프롬프트(A형·차콜 프리미엄) + 비포 3종 프롬프트 생성
- 다음에 할 것: factory 손테스트→route 배포 / Cowork로 상세페이지 PNG 제작→자산정리(details·cards)→concepts.ts·page.tsx 한 줄 연결 / 다음 보정형(복원·인테리어 등)
- 주의/메모: factory는 Gemini 유지·그룹B(크롭X). 상세페이지 비포/애프터는 같은 각도로, 브랜드 없는 사진으로.


### 2026-06-13
- 한 일:  ### 2026-06-13
- 한 일: 인생네컷 컨셉 3개 추가 (배포완료): 인생네컷(실사) / 인생네컷(일러스트) / 커플 네컷
  - 네컷 패턴 첫 시도: 프롬프트에 "4분할 세로 스트립" 명시 + 2:3 크롭
  - fourcut/illust=1장(food복제), fourcutcouple=2장(couple복제)
  - 작동 컨셉 누적: 35개
  - B방식(스타일 고정형) 증명사진 컨셉 신규: app/idstyle (견본 이미지 + 얼굴 교체)
  - public/styles/idstyle-blueshirt.png 견본 1호(S컬 블루셔츠), MOSPIC 전속 여자모델 표준 확정
  - 입력 UX: 사진 선택 전 가이드 모달 + 다중선택(3~6장)
  - 증명사진 전용 표준(어깨선 크롭/머리75-80%/옷·배경 고정)은 증명사진 계열에만 적용 — 다른 컨셉 제외
  - 증명사진 구도 표준 강화(어깨선 크롭/머리75-80%/옅은미소) + 입력 비율 무관 규격화
  - 증명사진 B방식(idstyle) 실험: GPT(gpt-image-1, input_fidelity high)까지 시도했으나 얼굴 닮음 한계로 보류 (홈 미연결, 코드는 남겨둠)
  - 결론: 얼굴 정체성 보존은 GPT/Gemini/InstantID/PhotoMaker 모두 100% 불가 확인 → 추후 face-swap 계열 재검토 또는 "AI 프로필"로 포지셔닝
  - 음식 보정(food) 프롬프트 전면 강화: 음식종류별 맞춤 + 적극보정(먹은자국 복원/오염 제거) + 카메라스펙 + 김/신선함 신호 (배포완료)
  - 좌측 상단 로고를 텍스트→이미지(public/logo.png, 카메라 마크)로 교체 (배포완료)
- 주의/메모: 증명사진 계열 전용 표준(어깨선/머리비율/옷·배경고정)은 다른 컨셉에 적용 안 함. 음식보정 비포/애프터 5쌍으로 상세페이지 통이미지 제작 예정(PENDING).
- 다음에 할 것: 네컷 4분할 품질 확인 → 추모 계열(신중) 또는 품질 일괄점검 / 결제 차감
- 주의/메모: 네컷은 모델이 4칸 분할을 못 지킬 수 있음. 결과 보고 프롬프트 조정 가능성.
- 커밋 메시지:


### 2026-06-12
- 한 일:- 출력 비율 정책(방법3) 도입: lib/crop.ts 공통 크롭 함수 생성
  - 그룹A(인물/얼굴=비율고정): 증명/펫/프로필/네컷 등 → cropToRatio(비율) 적용
  - 그룹B(공간/전체=원본유지): 복셀/음식/공장/상품/복원 → 크롭 안 함
  - 펫에 3.5:4.5 크롭 적용 / 앞으로 그룹A 컨셉은 import 한 줄로 적용
  - 정책 문서: OUTPUT-RATIO.md
  - 새 테마 3개 추가 (배포완료, 그룹B 원본유지): 부동산 매물 / 인테리어 비포애프터 / 중고차 보정
  - api/realestate·interior·car + app/realestate·interior·car (food 복제, 크롭 없음)
  - concepts.ts 등록 3개, page.tsx 분기+홈카드 3개
  - 작동 컨셉 누적: 아기/증명/복셀/음식/공장/펫/상품/복원/부동산/인테리어/중고차 (11개)
  - 카테고리 체계 도입(배포완료): 칩 10개(전체/인기/증명사진/비즈니스/인생샷/헤어뷰티/반려동물/가족커플/사장님/재미추억)
  - GO_CATEGORIES 매핑(복수 카테고리 가능, 펫=반려동물+증명사진)
  - 홈 칩 클릭 → 카드 필터 / 전체보기 → 전체 컨셉 그리드 오버레이(칩 필터 포함, go 중복제거)
  - 분류 기준 문서: CATEGORY.md
  한 일: 새 컨셉 3개 추가 (배포완료): AI 일러스트 / 미니어처 피규어 / 노년·베이비 변환
  - api/illust·figure·age + app/illust·figure·age (food 복제 + 각 프롬프트)
  - illust·figure = 그룹B(원본유지) / age = 그룹A(3:4 크롭, cropToRatio)
  - age는 첫 "모드 선택칩" 컨셉: 👴노년/👶아기 칩 2개 → route에 mode 전달, 프롬프트 분기
  - concepts.ts 등록 3개, page.tsx 분기+GO_CATEGORIES(전부 fun)+홈카드 3개
  - 작동 컨셉 누적: 16개 (아기/증명/복셀/음식/공장/펫/상품/복원/부동산/인테리어/중고차/인생샷/명함/헤어/일러스트/피규어/노년베이비)
    - 새 컨셉 3개 추가 (배포완료): 메뉴판 비주얼 / 패션 룩북 / 아이돌 프로필
  - menu·fashion = 그룹B(원본유지) / idol = 그룹A(3:4 크롭)
  - idol 프롬프트에 실존인물 금지 명시 (초상권 안전선)
  - 작동 컨셉 누적: 19개
  - 시즌물 컨셉 3개 추가 (배포완료): 크리스마스 화보 / AI 졸업사진 / 웨딩 화보
  - 전부 그룹A(3:4 크롭) / 웨딩=가족·커플 칩 첫 입주
  - 작동 컨셉 누적: 22개
  - 펫 심화 2개 추가 (배포완료): 펫 스튜디오 화보(그룹A 3:4) / 펫 관상 영수증
  - 펫 관상 영수증 = 새 패턴: Gemini 텍스트분석(JSON) → 캔버스로 영수증 PNG 직접 그림 (한글 안깨짐)
  - 작동 컨셉 누적: 24개
  - 펫관상 트러블슈팅: 모델명 gemini-3.5-flash로 수정(404 해결) + 503 혼잡 시 자동재시도/예비모델(gemini-2.0-flash) 폴백
  - 교훈: 텍스트 모델은 gemini-3.5-flash, 이미지 모델은 gemini-3.1-flash-image (이름 체계 다름)
  - 중간 난이도 2개 추가 (배포완료): 시대·복장 변신(시대칩 5종) / 펫 코스튬(코스튬칩 5종)
  - 옵션칩 패턴 확립 (id-photo renderOptions 이식) + 결과화면 "다른 옵션으로" 재생성 UX 첫 적용
  - 작동 컨셉 누적: 26개
  - 사진 2장 입력 컨셉 3개 추가 (배포완료): 커플 스튜디오 / 웨딩 한복 커플 / 우정 스냅
  - 듀얼 업로드 패턴 확립 (image1/image2 → 프롬프트에 "Image 1=A, Image 2=B, 섞지 말 것" 명시) + 4:5 크롭 첫 적용
  - 작동 컨셉 누적: 29개
  - 가족 컨셉 3개 추가 (배포완료): 가족 스튜디오 / 한복 명절 / 반려동물과 가족사진
  - 가변 업로드 패턴 확립 (2x2 그리드 4슬롯, 2~4장, images[] 배열 → 프롬프트가 인원수 자동 반영)
  - 작동 컨셉 누적: 32개
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:7. **이미지 route 503 재시도**: 펫관상에만 재시도/폴백 있음. 출시 전 이미지 생성 route 전체에 503 1회 재시도 적용 검토.

### 2026-06-11
- 한 일:- 컨셉 상세페이지 Mevu풍 업그레이드 (배포완료)
  - concepts.ts에 tags/resultCount/heroImage/exampleImages 선택 필드 추가
  - 상세페이지: 태그칩, 세로(4:5) 대표이미지, "이런 느낌으로 만들어드려요", 버튼에 결과물 N장
  - 사진 있으면 사진/없으면 이모지 자동전환 (예시 이미지는 추후 생성해서 채울 예정)
  - 복셀 상세페이지에 실제 결과물 사진 연결 (배포완료)
  - public/examples/voxel-hero.jpg + voxel-1~4.jpg
  - concepts.ts voxel에 heroImage/exampleImages 추가 → 상세페이지 사진 자동전환 확인
  - (교훈: 윈도우 확장자 숨김으로 .jpg.jpg 중복됐던 것 → 확장자 표시 설정함)
  - 새 테마 2개 추가 (배포완료): 상품 사진 보정 / 옛날 사진 복원
  - api/product, api/restore + app/product, app/restore (food 테마 복제 + 각 프롬프트)
  - concepts.ts 등록(product/restore), page.tsx 분기 + 홈 카드 추가
  - 작동 컨셉 누적: 아기/증명/복셀/음식/공장/펫/상품/복원 (8개)
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:


### 2026-06-10
- 한 일:- 새 테마 2개 추가 (배포완료): 음식 사진 보정 / 공장 리모델링
  - api/food/route.ts, api/factory/route.ts (voxel route 복제 + 각 프롬프트)
  - app/food/page.tsx, app/factory/page.tsx (voxel page 복제 + 핑크 토큰)
  - concepts.ts에 food/factory 컨셉 등록, start 타입 확장, conceptForGo 분기 추가
  - page.tsx 상세화면 "프로필 만들기" → /food, /factory 연결
  - 홈 "다양한 AI 사진" 섹션에 카드 2개 추가 (이미지 아직 없음=이모지)
  - 반려동물 증명사진 테마 추가 (배포완료): 정장 입은 강아지/고양이 증명사진
  - api/pet/route.ts, app/pet/page.tsx (음식 테마 복제 + 펫 정장 프롬프트)
  - concepts.ts에 pet 등록, page.tsx "프로필 만들기" 분기 + 기존 반려동물 카드 go:"pet" 연결
  - IDEAS2.md 생성: 커플3/가족4/인생네컷4/반려동물심화4/연예인비주얼4 = 17개 컨셉+프롬프트
  - 연예인 컨셉은 실존인물 X, "아이돌급 비주얼 스타일링"으로 (초상권 안전선)
  - 커플/가족/네컷은 사진 2장+ 입력 → id-photo route 방식 참고 필요 IDEAS.md — 컨셉 19개 + 프롬프트
IDEAS2.md — 컨셉 17개 + 프롬프트
TEST-PHOTOS.md — 36개 테스트 사진 가이드
- 다음에 할 것: 음식/공장 결과물 생기면 public/cards/에 넣고 카드 image 연결
- 커밋 메시지:
- 주의/메모:

### 2026-06-09
- 한 일:- 설정 화면 추가 (배포완료): 헤더 ⚙ 클릭 → 설정 오버레이
  - 약관/개인정보처리방침/고객센터 = 현재 "준비중" alert (URL 생기면 연결만 하면 됨)
  - 현재 버전 1.0.0 표시, 계정정보+사용자ID 복사, 로그아웃, 비로그인 시 카카오 로그인 버튼
  - Mevu 설정화면 벤치마킹, page.tsx에 showSettings 상태로 구현 /- 히스토리 탭 Mevu풍 개선 (배포완료)
  - "히스토리" 제목 + 이미지/모션 두 탭 (historyTab 상태, 모션은 "곧 만나요" 준비중)
  - "앱 삭제하면 결과물 사라져요" 안내, 빈화면 "만들러 가기" 버튼, 핑크 토큰 통일
  - 기존 기능 유지: IndexedDB 저장, 3열 그리드, 크게보기, 저장/전체삭제
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:

### 2026-06-08 (최신)
- 한 일:
  1. 홈 화면(page.tsx) Mevu풍 재디자인 (배포완료)
     - 히어로 풀배너+점인디케이터, 둥근 칩, 알약 NEW/BEST 뱃지, 떠오르는 하단탭, mospic 로고(이탤릭+✦)
     - 핑크 토큰(#FF4B7C) 전체 통일
     - 카드·배너에 image 필드 추가 (있으면 사진, 없으면 이모지)
  2. public/cards/ 폴더 신설 + 실제 결과물 7장 연결 (배포완료)
     - baby.jpg → 히어로배너1 + 인기 BEST 카드
     - idphoto-1.jpg → 인기 NEW 증명사진 카드 + 히어로배너2
     - idphoto-s1~s4.jpg → "이런 스타일은 어때요?" 그리드 4장
     - voxel.png → 복셀 카드 (※확장자 png 주의)
  3. 증명사진 엔진(api/id-photo/route.ts) 대수정 (배포완료, commit c42ec77)
     - 모델 Pro→Flash 전환 (gemini-3.1-flash-image): Pro는 50초 초과로 실패 → Flash로 12초 성공
     - sharp로 결과물 3.5:4.5 비율 강제 크롭 (cropToRatio 함수, 위40%/아래60% 기준)
     - 프롬프트 보강: 얼굴 정체성 유지 강조, 구도/여백/그림자 없음 명시
  4. .env.local 신규 생성 (로컬에서 GEMINI_API_KEY 없어서 생성 실패하던 문제 해결)
- 다음에 할 것:
  - ★ 증명사진 얼굴 변형 문제: Gemini는 "새로 그리기"라 프롬프트로 얼굴 100% 보존 불가
    → face-preserving 방식(길1) 검토 필요 (PhotoMaker 등 Replicate 계열)
  - 히어로배너2(증명사진): 세로사진이라 확대돼 보임 → 가로형 배너 이미지 따로 제작(방법3)
  - 증명사진/복셀 결제 차감 연결 (현재 무제한 무료 = API 비용 새는 중)
- 주의:
  - 로컬 테스트하려면 .env.local 필요. 값은 Vercel Settings>Env Variables에서 가져옴
    (KV_REST_API_URL, KV_REST_API_TOKEN 아직 안 넣음 → 사용횟수 기능 로컬 테스트 시 필요)
  - git push 명령 쓰면 dev 서버 꺼짐(Y) → 다시 쓰려면 npm.cmd run dev 재실행
  - 비율 바꾸려면 route.ts 상단 RATIO_W=3.5, RATIO_H=4.5 숫자만 수정
  - 이미지 저장 시 확장자 중복 주의 (voxel.jpg.png 됐던 사례)


### 2026-06-06 (최신)
- 한 일: 홈 화면(page.tsx) Mevu풍 재디자인 + 카드/배너에 실제 사진 연결
  - 디자인: 히어로 풀배너+점인디케이터, 둥근 칩, 알약 NEW/BEST 뱃지, 떠오르는 하단탭, mospic 로고(이탤릭+✦)
  - 핑크 토큰(#FF4B7C) 전체 통일
  - 카드·배너에 image 필드 추가 (있으면 사진, 없으면 이모지)
  - public/cards/ 폴더 신설, 실제 결과물 7장 연결:
    - baby.jpg → 히어로배너1 + 인기 BEST 카드
    - idphoto-1.jpg → 인기 NEW 증명사진 카드 + 히어로배너2
    - idphoto-s1~s4.jpg → "이런 스타일은 어때요?" 그리드 4장
    - voxel.png → 다양한 AI사진 복셀 카드 (※확장자 png 주의)
  - 배너 사진: objectPosition "center 25%" + 아래 그라데이션 + 흰 글씨(사진 있을 때만)
- 다음에 할 것:
  - 히어로배너2(증명사진): 세로사진이라 확대돼 보임 → 가로형 배너 이미지 따로 만들어 교체 예정(방법3)
  - 남은 이모지 카드: 커플/반려동물/가족/인생샷 (전부 "곧 만나요" 컨셉, 실제 기능 생기면 연결)
  - 증명사진/복셀 결과화면 등 내부화면 Mevu풍 디자인 통일 (id-photo 입력화면은 완료)
- 주의:
  - 이미지 저장 시 확장자 중복 주의 (voxel.jpg.png 처럼 됨 → 이름만 적고 확장자 그대로 두기)
  - 파일명은 영어소문자, public/cards/에 저장 후 image:"/cards/파일명.확장자"로 연결


## (다음 세션 템플릿 — 복사해서 위에 채우기)
### 2026-06-05
- 한 일: "홈 화면 Mevu 스타일 카탈로그 적용" /"중간 점검 — 기능 75%/출시 45%, 다음은 마무리+실거래 준비" / "히스토리 저장·갤러리 기능 추가" / "히스토리 저장 IndexedDB로 전환—안정화" /히스토리 저장 완료(IndexedDB) — 모든 생성 결과 보관/재저장 작동. / "브랜드 MOSPIC로 변경 — 이름·아이콘·매니페스트" /"컨셉 상세+프로필 만들기 흐름 추가" /"증명사진 옵션 선택 기능 추가" /"아기 타임아웃 안전장치 + 뒤로가기 안정화"/ "복셀 아트 컨셉 추가(첫 신규 컨셉)" 
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:



## (다음 세션 템플릿 — 복사해서 위에 채우기)
### 2026-06-04
- 한 일: 결제 가격 products.ts로 통일, 충돌 해결 — 결제 기능 완성 /증명사진 생성 엔진(PhotoMaker) 추가, 모델 격리 /"증명사진 화면(/id-photo) 추가" /"증명사진 생성 흐름 완성, 닮음은 모델 교체 시 개선 예정" /"메인 화면에 증명사진 카드 연결" /"나노바나나 스코핑 완료: 가격·약관·워터마크 확인, 교체 방향 확정" / "나노바나나 무료 품질 테스트 시작" /"나노바나나로 최종 결정, API 키 발급 단계" /"Vercel에 GEMINI_API_KEY 추가" /"Gemini 호출 v1beta로 수정" / "증명사진 Nano Banana 적용 확인" /: "아기 얼굴 Nano Banana로 교체" /: "홈 카탈로그 디자인 틀 시안 제작"
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:


## (다음 세션 템플릿 — 복사해서 위에 채우기)
### 2026-06-03
- 한 일:generate 코드 점검, 무료=PuLID·유료=Gen-4 구조 확인 / 다음: 리서치 3개 돌리기/ Gen-4 참조 태그 버그 수정, 재생성 테스트 /프리셋 구조 1단계 - presets.ts 생성, 아기 컨셉 정의 /결제 B1 - 구매 화면+products.ts, 테스트 결제 흐름 확인 /결제 B1 완료, 구매화면 작동 확인 /결제 B2 - confirm 금액 검증 추가, 보안 구멍 차단
- 커밋 메시지:
- 다음에 할 것:
- 주의/메모:

---

### 2026-06-02
- 한 일: 기억 문서 3개(PROJECT/ROADMAP/WORKLOG) 생성
- 커밋 메시지: docs: 프로젝트 기억 문서 3개 추가
- 다음에 할 것: 리서치 진행 / 기존 id-photo·payment 코드 점검
- 주의/메모: AGENTS.md·CLAUDE.md는 자동생성 안내문이라 그대로 둠. 키는 .env.local 에만.

### 이전 작업 (이미 완료)
- 업로드/성별선택/생성·선택/저장·공유/로딩/Vercel·PWA/카카오로그인/무료3회