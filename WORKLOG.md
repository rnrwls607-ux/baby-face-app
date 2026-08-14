## 2026-08-14 — 가이드 시트 B: 신규 유형 사진 6장 완성 (daily_snap·any_photo)
- [원료] public/guide/raw/ 6장 전부 1086×1448 = 정확히 3:4 → ★크롭 0, 순수 축소만.
  "크롭에 결함이 잘리는지" 검수 항목은 구조적으로 발생 불가였다
- [변환] guide-prep.mjs의 TYPES에 daily_snap·any_photo 추가(없으면 "알 수 없는 type"으로
  건너뛴다). 죽은 generic 키도 같이 제거 — 커밋 A에서 UploadGuide 별칭이 사라져 무의미.
  600×800 webp q85 6장, 합계 303KB (장당 28~80KB)
- [연결] UploadGuide cardsFor(null…) → "daily_snap"/"any_photo" 2곳. 11유형 × 3장 = 33장
  전부 실존, null 잔재 0
- [★품질 검수 — 2장 재생성 필요] 실제 카드 크기(132px)로 줄인 뒤 확대해 사용자가 보는
  정보량 그대로 검수했다. 4장 통과 / 2장 미달:
  · daily_snap-3(화면 재촬영) — 원본 100%에서는 모아레·픽셀 격자가 선명하지만,
    132px로 줄면 무늬가 평균화돼 사라진다. 카드에서는 "그냥 실내 인물 사진"으로 보인다
  · any_photo-2(압축 뭉갬) — 원본 100%에서는 얼굴 전체가 사각 블록으로 깨져 있는데,
    축소하면 블록이 뭉개져 오히려 매끈해진다. 카드에서는 결함이 안 보인다
  ★사유는 "결함이 없다"가 아니라 "결함이 축소를 못 견딘다"이다. 재생성 지시는
  "블록·무늬를 훨씬 굵게(얼굴 하나에 블록 10~20개 수준) + 넓은 평면에 결함이 깔리게"
- [그래도 투입한 이유] 2026-07-25 방침대로 ✕뱃지·X오버레이·빨간 캡션이 카드 안에 있어
  "피할 예"라는 사실 자체는 전달된다(자리표시 회색칸보다 낫다). 재생성분이 오면
  파일만 덮어쓰면 되고 코드 변경은 0
- [게이트] ①추가 이미지 = guide webp 6장만·그 외 이미지 add 0(원료 png 6장은 미추적
  유지 — public/guide/raw/는 gitignore 대상이 아니라 스테이징만 안 한다)
  ②11유형×3=33장 정합·null 0 ③실측 fixcrowd·upscale 시트에 실사진 3장씩 600×800 렌더·
  자리표시 0·깨진 이미지 0 ④장당 용량 daily_snap 80/30/51KB · any_photo 76/28/38KB
  ⑤"Compiled successfully in 50s"·exit 0
- 커밋 메시지: feat: 가이드 신규 유형 사진 6장 — daily_snap·any_photo 완성
- 다음에 할 것: daily_snap-3·any_photo-2 재생성분 도착 시 같은 파일명으로 덮어쓰기(코드 0).
  ★public/guide/raw/를 .gitignore(/examples/처럼)에 넣을지 검토 — 지금은 수동으로만 막고 있다

## 2026-08-14 — 가이드 시트 A: 유형 재배치 + 무가이드 7종 해소 (21파일)
- [★조사 결론이 전제를 뒤집음] "전 컨셉 동일 세트"인 줄 알았는데 2026-07-25 리디자인으로
  이미 9유형 분기 + 유형별 사진 27장(전량 600×800 webp) 완비였다. 그래서 재설계가 아니라
  "잘못 연결된 유형 옮기기"가 실제 과제 — 새로 찍을 사진은 전량이 아니라 6장뿐
- [상① 얼굴검사 모순 제거 — 가장 심각했던 것] portrait_multi 8종(illust·oilportrait·
  paperart·pendrawing·retroanime·softanime·stainedglass·stitchart)은 시트가 "한 명 또는
  두 명"이라 안내하는데, 전부 useFaceCheckSingle을 쓰고 훅 기본 inputRule이 "solo_face"라
  (useFaceCheck.ts:96) 서버가 2인 사진을 hard_fail로 무조건 차단했다(validate-photo:115
  "여러 명이 나왔어요"). ★가이드가 확실한 실패로 안내하던 상태 → solo_face로 이설
- [상③] goods는 업로드 라벨이 "사람·반려동물 사진"이고 프롬프트도 the person인데 제품
  시트(product_obj)를 띄우고 있었다 → portrait_multi로 이설(사진 재사용, 신규 촬영 0)
- [중④] goldenhour·season·anisky·brickfigure는 라우트가 전부 장면 보존형(입력=아무 일상
  사진)인데 인테리어·매물용 space 시트였다 — "수평 맞추기·모서리가 보이게·한쪽 벽만
  찍힘"이 야외 스냅에 무의미 → 신설 daily_snap으로 이설
- [상② 무가이드 7종 해소] fixbacklight·fixcrowd·fixnight·tripface→daily_snap /
  upscale→any_photo / fourcutcouple→family / idstyle→solo_face.
  ★입력 사진 상태가 결과의 전부인 "구제" 4종에 안내가 0이던 상태였다
- [★fixcrowd 예외 준수] daily_snap 문안에 "혼자·한 명·두 명" 류 문구를 넣지 않았다 —
  행인 지우개는 행인이 함께 찍힌 사진이 정상 입력이라 혼자 문구가 곧 오안내가 된다.
  주석으로 못박음. 실측에서도 시트 본문에 해당 문구 0건 확인
- [사진 없이 선행 가능했던 이유] cardsFor(imgType=null)이 회색 3:4 자리표시를 내주는
  기존 장치 — 신규 2유형을 null로 배선하니 문구는 즉시 살고 사진만 나중에 붙는다.
  실측: img 요청 0건·자리표시 3개·깨진 이미지 0 (404를 부르지 않는다)
- [배선 방식 판단] CONCEPTS에 guideType 필드를 넣지 않고 기존 prop을 유지했다 —
  ★페이지 폴더명과 컨셉 키가 99종 불일치(app/biz-black-gray ↔ bizblack)라 조회를 붙이면
  166페이지에 매핑을 심어야 하고 오배선 위험만 커진다. prop은 접촉 21파일로 끝난다
- [죽은 코드 제거] generic 별칭(CONTENT.generic = CONTENT.food_drink) — 쓰는 페이지 0.
  폴백 대상은 CONTENT.solo_face로 교체(유니온 밖 값이 와도 빈 시트가 되지 않게)
- [게이트] ①type 전수 CONTENT 키 포함·미배선 0/166·generic 잔재 0 ②유형 합계 166
  (solo_face 120·family 12·pet 12·daily_snap 8·space 3·portrait_multi 3·food_drink 3·
  product_obj 2·vehicle 1·old_photo 1·any_photo 1) ③얼굴검사 118종 중 "두 명/여러 명"
  문구 0건 ④null 2유형 자리표시 정상·사진 보유 9유형 자산 누락 0 ⑤실측 3종
  (fixcrowd·illust·upscale) + localStorage 키 분리 확인(daily_snap 숨겨도 solo_face는 뜸)
  ⑥"Compiled successfully in 51s"·exit 0 / diff 21파일
- 커밋 메시지: fix: 업로드 가이드 유형 재배치+무가이드 7종 해소 — 얼굴검사 모순 제거
- 다음에 할 것: 커밋 B — daily_snap·any_photo 사진 6장(600×800 webp q85, public/guide/)
  제작·투입. 코드는 imgType null → 유형명 2곳만 바꾸면 된다

## 2026-08-14 — LeaveGuard: 생성 중 이탈 가드 (166종)
- [왜] 생성은 서버에서 계속 돌고 완성되면 코인이 사용된다. 로딩 화면에서 무심코 누른
  뒤로가기가 곧바로 앱을 벗어나면 사용자는 "코인만 날렸다"고 느낀다. 한 번 물어보고,
  나가더라도 무슨 일이 일어나는지 정직하게 알려준다
- [설계 · 2단 가드] useBackClose 무개조. useLeaveGuard 안에서
  1단 useBackClose(loading && idle) → 뒤로가기 = 시트 열기 /
  2단 useBackClose(asking) = 시트가 소유한 히스토리 칸.
  1단이 칸을 소비당하며 닫히고 2단이 곧바로 새 칸을 쌓아 화면은 그대로, 이탈만 막힌다
- [★버튼도 history.back()으로] 시트 버튼에서 setState로 직접 닫으면 useBackClose가
  "코드로 닫힘"으로 보고 cleanup에서 back()을 쏘는데, 그 back은 비동기라 같은 커밋에서
  1단이 쌓는 pushState와 경합해 유령 칸이 남는다. 진짜 popstate로 닫으면 칸이 정확히
  하나 소비되고 잔여 0 — 실측에서 [계속 기다리기] 반복에도 history.length 9 고정
- [★나가기 = router.push("/") + 한 틱 지연] location 계열은 문서를 갈아엎어 진행 중인
  fetch 클로저(then → addToHistory)까지 죽인다. 소프트 이동이어야 "계속 진행돼요"가 참.
  단 popstate 처리와 같은 틱에 쏜 push는 Next 라우터가 삼킨다(실측: push 호출은 됐는데
  URL·history 그대로) — setTimeout 0으로 다음 매크로태스크에 넘겨야 실제로 이동한다
- [문구 분기] 코인 컨셉(COIN_GATED && COIN_COST>0) 165종: "완성되면 코인이 사용되고,
  히스토리에 자동 저장돼요" · 무료 도구 1종(upscale): 코인 문장 제거.
  ★차감은 성공 시점이라는 사실 그대로 — "이미 나갔다" 식 거짓 표현 금지
- [게이트] ①앵커 사전 스캔 166/166(두 변형 !!result·results.length 모두) → 삽입
  166/166 · 중복 0 · 전 파일 +5/-0 · 표본 3 diff(baby·biz-black-gray·upscale)
  ②실측 시나리오: 로딩 중 back → 시트(경로·history.length 불변) / [계속 기다리기] →
  재가드(back·계속 2회 반복에도 칸 증가 0) / [나가기] → path "/" 소프트 이동 +
  JS 컨텍스트 생존 + 이동 후 mock 완주 → /api/history/save 도달(addToHistory 완주) /
  완료 시 시트 자동 닫힘 + 결과 오버레이 표시, 이후 back = 기존 동작(결과만 닫힘)
  ③문구 코인·무료 각 1회 렌더 확인 ④tsc --noEmit 0 · "Compiled successfully in 50s"
- [알려진 수용] 생성 완료가 시트를 자동으로 닫는 그 순간에 버튼을 누르면 back이 두 번
  나가 한 칸 더 물러설 수 있다(사라지는 버튼을 밀리초 단위로 맞춰 눌러야 재현).
  결과는 "페이지를 벗어남" = 사용자가 누르려던 방향과 같아 수용
- 커밋 메시지: feat: 생성 중 이탈 가드 — 뒤로가기 인터셉트+계속 진행 안내 166종
- 다음에 할 것: 이탈 후 완성분의 히스토리 복귀 동선(홈에서 "방금 완성됐어요" 알림) 검토

## 2026-08-14 — diag: 클라 절단 시 함수 생존 실험 라우트
- [왜] 서버측 히스토리 저장(fd997d5)의 전제("클라가 죽어도 Vercel 함수는 완주")와
  MJ 실측(생성 중 뒤로가기 → 무차감·무저장)이 모순됐다. 원인 규명이 먼저다
- [★문서 근거] Vercel 공식: "Cancellation is opt-in. In your vercel.json, add
  supportsCancellation: true" / "Any work not wrapped in waitUntil or after will be
  lost on cancellation. This is why cancellation is opt-in."
  → 우리 vercel.json에는 functions 블록 자체가 없다(미설정) · waitUntil/after 사용 0 ·
  @vercel/functions 미설치. 문서대로면 함수는 완주해야 한다. 이 route가 그걸 잰다
- [설계] /api/diag/alive?mode=run&id=&ms= → SET diag:alive → sleep → SET diag:done →
  JSON. ?mode=check → { alive, done } + 판정문. ★생성 엔진 호출 0 = 비용 0
- [프로덕션 쓰기] diag: 접두 키 + TTL 600초 한정 (MJ 승인). 수동 정리 불필요
- [가드] diag/gemini의 allowed()를 자구 그대로 복제 — 저쪽은 export가 아니고
  export로 바꾸면 이번 커밋의 수정 허용 범위를 벗어난다. 미인증 404(존재 은닉)
- [방어] id는 [A-Za-z0-9_-]{1,40}만(키 조작 차단) · ms는 1000~45000 클램프
  (maxDuration 60에 여유) · Redis 미설정이면 판정문으로 알리고 종료
- [실측 15케이스] run 2148ms 완주·done 마커 존재·간격 = 대기시간 / check 정상 /
  TTL 598~600s / 없는 id → null / id·mode 검증 400 / ms 클램프 45000 /
  ★엔진 호출 0회 / 테스트 키 DEL 후 잔여 0
- [★남은 선행조건] .env.local에 DIAG_SECRET·COIN_ADMIN_IDS 둘 다 없다. 프로덕션에서
  ?key= 경로를 쓰려면 Vercel 환경변수에 DIAG_SECRET이 있어야 한다(없으면 404).
  관리자 로그인 경로는 COIN_ADMIN_IDS에 uid가 등록돼 있어야 열린다
- [다음 실험 절차] ①탭에서 mode=run&ms=20000 열기 ②2초 뒤 탭 닫기(절단 재현)
  ③25초 뒤 mode=check → done 있으면 완주(전제 옳음, MJ 관찰은 타이밍),
  done 없으면 사망(서버 보강 필요)
- 커밋 메시지: diag: 클라 절단 시 함수 생존 실험 라우트
- 다음에 할 것: MJ가 위 3단계 실험 → 결과에 따라 로딩 중 back 인터셉트(166종) 문구 확정

## 2026-08-14 — FaceCheck-C: 얼굴 사전 검사 53종 확산 (단일 업로드 모드)
- [범위] 실사 (a) 1인 얼굴 53종 — inputRule solo_face 선언 20 + 미선언 33.
  ★선언을 기준으로 삼지 않았다: 같은 문장 틀("사진 한 장이면 ~")의 자매 컨셉인데
  pixelart·popart는 선언, stitchart·oilportrait는 미선언이라 선언 자체가 일관성이 없다.
  판정 기준은 "결과가 그 사람 얼굴에 의존하는가"
- [단일 모드] useFaceCheckSingle 신설 — 65종과 달리 사진 소유권을 훅으로 옮기지 않는다.
  이 페이지들은 이미 const [image, setImage]를 갖고 handleSubmit·버튼 조건이 전부
  그 값을 보기 때문에, 훅은 "판정만" 들고 있는다(페이지 손댈 곳 최소화)
- [문구 분기] FaceCheckNote에 single 프롭 — "n번째"·"n장"을 뺀다(셀 것이 없다).
  통과 "확인 완료 — 만들 준비 됐어요" / soft "이 사진, 이대로는 아쉬워요"(번호 대신 !)
  / hard "이 사진은 쓸 수 없어요". ★65종 다장 문구는 무접촉
- [gridHint] 단일 모드는 max=1이라 UploadZone이 그리드 카드 자체를 안 그린다 —
  "첫 번째 사진이 결과의 기준이 돼요" 줄은 구조적으로 미표시(65종 자구 무접촉)
- [동작] hard_fail = setImage("")로 담지 않고 같은 자리 이유 카드 / soft_fail = 경고
  카드 + [이 사진 바꾸기](label+hidden input, 파일 선택 직결) / ★만들기 버튼 잠금 없음:
  53/53 disabled에 검사 조건 0, handleSubmit 참조 0 — 진행은 사용자 자유
- [캐시 정합] 검사 호출은 inputRule "solo_face" — A커밋 캐시 키 gatecache:solo_face:{sha}와
  같은 네임스페이스라 65종과 캐시를 공유한다
- [벌크 공정] 5앵커 × 53종 사전 스캔 통과 후에만 적용. ★내 스크립트 버그로 1회 중단:
  onRemove 치환을 splice보다 먼저 해서 findClose가 앵커를 잃었다 — 첫 파일 쓰기 전에
  죽어 부분 생성 0건 확인 후 순서만 고쳐 재실행
- [★앵커 실패 2회 — 들여쓰기] upzEnd·onPick 앵커를 14/12칸으로 가정했는데 실제는
  props 14·닫는 줄 12칸이고 cameraFacing 유무로 변형이 갈렸다. 문자열 앵커 대신
  줄 기반 탐색(<UploadZone → onRemove → 첫 "/>")으로 바꿔 53/53 균일 확인
- [무접촉 실측] 기존 65 · 펫 13 · 2인 11 · 경계 6 · 비얼굴 17 전부 diff 0.
  53종 외 페이지 변경 0 · 이미지 0
- 커밋 메시지: feat(face-C): 얼굴 사전 검사 53종 확산 — 단일 업로드 모드
- 다음에 할 것: 얼굴 검사 총 118종 가동(65 다장 + 53 단일). 남은 후보는 2인 11종
  (이미지당 1인 검사로 변형 필요) / [MJ] Play Console 상품 3종 → IAP-B

## 2026-08-14 — FaceCheck-B: 얼굴 검사 UI B안 전환 (65종 파일럿)
- [문제] 기존 GateBadge는 판정 대상인 사진을 커튼으로 덮고, 사유는 8.5px로 첫 줄
  하나만 보여줬다. hard_fail은 썸네일이 말없이 사라진 뒤 화면 위쪽 결제 오류용
  분홍칸에서 이유를 찾아야 했다 — 인과가 끊기고 결제 실패와 같은 옷을 입었다
- [해결] useFaceCheck 훅 + FaceCheckNote 컴포넌트 신설, GateBadge는 링+번호만 남김.
  안내는 업로드 카드 "바로 아래"에서, 사진은 절대 덮지 않는다
- [★hard_fail 경로 이동] setError(reasons) 삭제 — 사진은 여전히 담기지 않지만
  이유는 사라진 자리 아래 카드에서 말한다. 분홍 에러칸은 결제·서버 오류 전용으로 복귀
- [★"그대로 진행" 버튼 없음] 검사가 막으려는 행동에 버튼을 달아주면 안내가 아니라
  승인이 된다. 단 만들기 버튼을 잠그지도 않았다 — soft_fail은 "만들 수는 있지만
  아쉽다"는 판정이고, 멀쩡한 사진을 잘못 막는 것이 최악이라는 원칙과 부딪힌다.
  실측: 65/65 disabled={loading || images.length < MIN_PHOTOS} — 게이트 조건 미포함
- [자가 진단 9개 전부 해소] 글씨 최소 11.5px(번호 배지 10→11.5, 원 18→19) ·
  사진 안 덮음 · reasons 전량 표시 · hard_fail 같은 자리 · 결제칸 미공유 ·
  검사 중 커튼 제거 · 통과 표시 신설 · 다음 행동 버튼 2종 · 경고색 #E0A33C 통일
- [버튼이 곧 파일 선택창] "이 사진 바꾸기"가 label+hidden input이다 — 바꾸라고
  써놓고 다른 데를 누르게 하지 않는다. 교체는 replacePhoto(지목 사진 제거 후 재검사)
- [★자구 보존] "첫 번째 사진이 결과의 기준이 돼요 — 가장 잘 나온 정면 사진을
  첫 번째로" 65/65 그대로
- [벌크 공정] 8앵커 × 65종 사전 전수 스캔 통과 후에만 적용. 사후 검증에서 잔존
  setPhotos(·checkPhoto( 0건 확인(★단어 경계로 셀 것 — resetPhotos(가 setPhotos(를
  부분 문자열로 포함해 오탐이 났다)
- [4상태 실측] 임시 라우트로 검사중·통과·soft·hard 렌더 스크린샷 → B안 시안과 대조.
  하네스는 커밋 전 삭제(.next turbopack 캐시에 참조가 남아 타입 에러 — .next 정리로 해소)
- [범위] 65종 페이지 접촉은 불가피했다: GateBadge는 타일 안(overflow hidden)에
  주입돼 카드 아래를 그릴 수 없고, hard_fail의 setError 경로가 페이지에 있었다
- 커밋 메시지: feat(face-B): 얼굴 검사 UI B안 전환 — 65종 파일럿
- 다음에 할 것: FaceCheck-C(53종 신규 배선, 앵커 1개) / [MJ] Play Console 상품 3종

## 2026-08-14 — FaceCheck-A: validate-photo 일 한도 + 해시 캐시 (공개 프록시 차단)
- [문제] validate-photo는 인증 0·한도 0·캐시 0인 완전 공개 라우트였다. 바디의
  inputRule 체크가 유일한 관문인데 그건 클라가 보내는 값이라 위조가 자유롭다
  = 누구나 임의 이미지를 던져 Gemini 비전 분석을 무료로 받아가는 구조. 얼굴 검사를
  53종으로 확산하기 전에 이걸 먼저 막는다(노출면이 65 → 118 페이지로 넓어지기 때문)
- [해결] app/lib/gateGuard.ts 신설 — 일 한도 60회 + sha256 해시 캐시 24h.
  withDailyFree의 free:{키}:{scope}:{KST날짜} INCR+TTL 관례를 그대로 복제
- [스코프] 로그인 회원 uid / 게스트(g_)·쿠키 없는 요청은 ip:{XFF 첫값}.
  게스트를 IP로 묶는 이유는 withDailyFree와 같다 — 쿠키 리셋 파밍 차단
- [★순서: 캐시 → 한도 → Gemini] 캐시 히트는 Gemini를 안 부르므로 한도를 소비하지
  않는다. 되돌아와 같은 사진을 다시 올리는 정상 사용자가 한도를 까먹지 않는다.
  한도 초과 상태에서도 캐시 히트는 200으로 정상 응답한다(실측)
- [★사용자 인질 금지] 한도 초과는 429지만, 클라 gate.ts는 res.ok를 보지 않고
  body.result만 읽는다 → result 없는 429는 마지막 줄 pass 폴백으로 떨어진다.
  즉 한도 초과 = "검사 생략"이지 "업로드 차단"이 아니다. 429 바디에 result를
  일부러 넣지 않은 것이 이 설계다
- [무접촉] "항상 200 + 판단 불가 시 pass" 원칙 그대로. Redis 미설정·장애·타임아웃은
  전부 false/null로 흘려 원래 경로로 보낸다 — 방어 실패가 검사 차단으로 번지지 않는다.
  실패 판정(pass 폴백)은 캐시하지 않는다(일시 장애가 24h 굳지 않게)
- [실측 22케이스 · Gemini 실호출 0] 캐시: 같은 이미지 2회차 0콜·판정 동일·다른 이미지
  1콜·inputRule 다르면 별도 키 / 한도: 429·Gemini 0콜·result 미포함·★클라 판정 pass
  ·초과 중 캐시 히트 200 / 폴백: 네트워크 실패·타임아웃·키 없음 3종 전부 pass +
  클라에서도 pass. 프로덕션 Redis는 _gatetest_ 키만 사용 후 DEL·잔여 0 확인
- [남은 것] FaceCheck-B(useFaceCheck 훅 + FaceCheckNote, 기존 65종 UI를 B안으로
  전환) → C(53종 일괄 배선, 앵커 1개). B안 확정 사항: "그대로 진행" 버튼 없음,
  "첫 번째 사진이 결과의 기준이 돼요" 유지
- 커밋 메시지: feat(face-A): validate-photo 일 한도+해시 캐시 — 공개 프록시 차단
- 다음에 할 것: FaceCheck-B 커밋 / [MJ] Play Console 상품 3종 등록 → IAP-B

## 2026-08-14 — IAP-A: 결제 진입 통합 + Play 상품 매핑 + 앱 내 외부결제 차단
- [문제] 같은 Toss 호출이 CoinNeededSheet과 CoinWallet에 통째로 복제돼 있었다.
  IAP 분기를 붙이면 두 곳이 갈라지고, 한쪽만 고치는 사고가 나면 앱에서 Toss가 뜬다
  = Play 정책 위반(결제 정지 사유)
- [해결] app/lib/startPurchase.ts 신설 — 시트·지갑이 공유하는 단일 입구.
  ★앱(Capacitor)에서는 분기가 아니라 차단이다. 안내만 띄우고 Toss 코드에 도달조차 안 함
- [Play 상품 매핑] products.ts에 playProductId 추가 (coin3→coin_3 / coin9→coin_9 /
  coin30→coin_30) + getCoinProductByPlayId 역조회. ★Play 상품 ID는 소문자·숫자·
  언더스코어만 되고 한 번 만들면 삭제가 안 된다(비활성화만) — 이 값 그대로 등록해야 함
- [경계 보존] saveReturn 옵션으로 갈랐다. 시트(402=만들다 막힌 자리)만 true,
  지갑 탭은 false — 어제 확정한 "지갑에서 온 사람은 지갑으로 복귀" 규칙 그대로
- [자구 대조 실측] HEAD 원문에서 기대 블록을 뽑아 헬퍼와 대조 — requestPayment 6줄·
  orderId 생성식·SDK 동적 import·USER_CANCEL 조건·오류 문구 전부 문자 일치(들여쓰기만 -2)
- [실측 44케이스] 웹: SDK 로드 1·requestPayment 1·3상품 금액/이름/successUrl/failUrl
  일치·안내 토스트 0 / 네이티브 스텁: 3상품 × (SDK 로드 0·requestPayment 0·안내 1·
  ★차단 시 returnTo 저장도 0) / returnTo: 저장값=pathname 3경로·저장 시점이
  requestPayment 이전(호출 순간 스냅샷)·지갑 저장 0·포맷 {path,at} 유지
- [무접촉] app/api 0줄 · app/payment 0줄 · 결제 라우트 0줄 · UI/문구/스타일 0줄
  (핸들러 본문만 교체, 렌더 트리 diff 0)
- [남은 것] IAP-B: RevenueCat 초기화 + purchasePackage + /api/coins/iap-credit 웹훅.
  헬퍼 네이티브 분기에 TODO(IAP-B) 마킹해 둠 — 그 한 줄만 갈아끼우면 된다.
  ★선행: MJ가 Play Console에 coin_3 / coin_9 / coin_30 등록(판매자 프로필 먼저)
- 커밋 메시지: feat(IAP-A): 결제 진입 통합 + Play 상품 매핑 + 앱 내 외부결제 차단
- 다음에 할 것: [MJ] Play Console 판매자 프로필 → 관리형 상품 3종 등록 → 라이선스
  테스터 / 위택스 신고 상태 점검 / [다음 커밋] IAP-B (RC 초기화 + 웹훅 적립)

## 2026-08-13 — 충전 후 "이어서 만들기" 복귀 버튼
- [문제] 402로 막혀 충전한 사람이 결제 성공 화면에서 "코인 지갑으로 →" 하나만 보고
  끝났다. 만들던 컨셉으로 돌아가려면 홈 → 카드 찾기를 다시 해야 했다
- [해결] 402 시트가 결제 직전 location.pathname을 저장 → 성공 화면이 1회 소비해
  [이어서 만들기 →](핑크 주버튼) + [코인 지갑 보기](보조)로 분기
- [★sessionStorage 기각 — 실측 근거] Toss는 같은 탭 리다이렉트지만
  mospic.com → pay.toss.im → mospic.com 으로 오리진을 넘나든다. sessionStorage는
  오리진 격리인 데다 안드로이드 웹뷰·카카오 인앱 브라우저가 새 컨텍스트를 열면
  세션이 갈려 빈 값으로 돌아온다 → localStorage + TTL 30분 + 1회성 소비 채택
- [★3중 방어] 내부 경로만 허용(절대 URL·//·javascript: 거부) · 읽는 순간 삭제
  (뒤로가기 재진입 중복 0) · TTL 30분. 소비 단계에서 한 번 더 검증(수동 오염 대비)
- [경계] 저장은 402 시트 경유일 때만. 지갑 탭 충전(CoinWallet)은 무접촉 —
  지갑에서 온 사람의 볼일은 잔액 확인이라 지갑 복귀가 자연스럽다
- [이동] router.replace — 결제 성공 화면을 백스택에 남기면 뒤로가기로 되돌아온다
- [실측 23케이스] 외부 URL 주입 8종 저장 거부 / 정상 경로 4종 복원 / 오염값·깨진
  JSON 거부 / 시나리오 3종(컨셉 복귀·지갑 기존화면·재진입 중복 0) / TTL 경계 2종 /
  ★구형 분기("아기 얼굴 만들러가기") onClick·라벨·스타일 원문 그대로 보존
- [무접촉] app/api/payments 0 · app/api/coins 0 · CoinWallet 0
- 커밋 메시지: feat: 충전 후 '이어서 만들기' 복귀 버튼 — 결제→생성 전환 흐름 연결
- 다음에 할 것: [MJ 선택] 900원 실결제로 Toss 검증 겸 복귀 동선 실측 /
  [대기열] IAP 라운드 시작(위택스 신고 상태 점검 포함) · Cowork 100컨셉 PDF 검토 ·
  크몽 옵트인 12+ 현황

## 2026-08-13 — 백그라운드 완료 알림 (셸 로컬 알림 + 웹 훅 3파일)
- [웹 훅 3파일] app/lib/notifyDone.ts 신설 · history.ts 발화 1지점 · LoadingSaveNote
  권한 요청 1지점. ★165 페이지 무접촉 — addToHistory가 곧 "생성 성공" 신호이고,
  LoadingSaveNote가 뜨는 순간이 곧 "생성 시작"이라 이미 있는 두 지점을 재사용했다
- [발화 조건] 앱(Capacitor) + App.getState().isActive === false + 권한 보유. 3개 다
  맞아야 1발. 포그라운드면 화면에 결과가 이미 있어 안 쏜다. 실패·타임아웃은 무알림(소음)
- [★웹 발화 0] Notification API 미사용. 탭이 죽으면 콜백이 안 돌아 정작 필요한 순간에
  못 가고 권한 프롬프트만 남는다. isNativePlatform()=false면 즉시 반환
- [권한 시점] 첫 생성 직전 1회. 거절하면 localStorage에 기억해 다시 묻지 않는다 —
  안드로이드는 재요청이 사실상 막히고, 물어봐야 소음이다. 거절해도 생성은 정상 진행
- [실측 10케이스] 웹 2종 발화 0 / 거절 후 재요청 0 · 거절 기억 · 권한없음 발화 0 /
  포그라운드 발화 0 / ★앱+백그라운드+권한 발화 1 / 플러그인 예외·구버전 앱 throw 0
- [셸] @capacitor/local-notifications@8.2.1 설치 · POST_NOTIFICATIONS 권한 추가 ·
  versionCode 3 / versionName 1.0.2 · cap sync 성공(플러그인 7종 인식).
  ★브리지 파일 신설 불필요 — 원격 URL 모드라 웹의 window.Capacitor.Plugins로 직접 호출된다
- [★게이트 ④ 일부 미완] gradle 빌드가 이 환경에서 "Unable to establish loopback
  connection"으로 실패한다(샌드박스 제약, --no-daemon도 동일). 배선은 정적 검증으로
  대체: capacitor.plugins.json · capacitor.settings.gradle · capacitor.build.gradle ·
  네이티브 모듈 디렉터리 4곳 모두 확인. 실제 빌드는 MJ가 Android Studio에서
- [한계] 원격 URL 셸이라 안드로이드가 웹뷰를 정리하면 콜백도 사라진다. "앱을 완전히
  닫아도 온다"는 보장은 없다 — 그건 FCM 영역. 이번 건은 "다른 앱 쓰는 동안"까지다
- 커밋 메시지: feat: 백그라운드 완료 알림 — 앱 로컬 알림 (웹 발화 0)
- 다음에 할 것: [MJ] Android Studio에서 AAB 서명 빌드 → 비공개 트랙 업로드 → 실기기
  실측(권한 팝업 시점 · 백그라운드 알림 도착)

## 2026-08-13 — 생성 결과 서버측 히스토리 확정 저장 + 로딩 안내
- [문제] 히스토리는 클라가 저장했다. 생성 중 화면을 나가거나 앱이 잠들면 클라가 죽어
  결과가 통째로 사라진다 — 원본 Blob은 남는데 목록엔 없다. 코인은 이미 나간 뒤다
- [해결] withCoin 성공 후처리(putOriginal 직후)에서 서버가 확정 저장한다.
  조건 3중: 성공(status<400) + 유료(resolved>0) + 카카오 uid + originalUrl 확보분만
- [★격리] 저장 블록 전체를 try/catch + Promise.race(5초)로 감쌌다. 실측:
  지연 30초 → 5,009ms에 끊김 / historyStore는 어떤 입력에도 throw 0(7케이스).
  블록 안에 return·throw 0 → 응답 경로 불변. 실패하면 살아 있는 클라가 폴백 저장
- [돈 경로 무변경] coins.ts 삭제 0줄 · 추가 30줄. 차감·402·인플라이트 5줄 문자 대조로
  원문 동일 확인. 추가분에 돈 로직 문자열 0건
- [중복 방지] save 라우트가 originalUrl로 최근 30건을 조회해 이미 있으면 {saved:"already"}.
  ★클라 saveToCloud는 응답을 안 읽어(await fetch만) 166 호출부 무접촉.
  프로덕션 조회로 판정 3/3 확인(기존=차단 · 신규=통과 · URL없음=통과)
- [공용 모듈] app/lib/historyStore.ts 신설 — 썸네일(sharp 1000px q85)·Blob·lpush/ltrim 500·
  중복 판정을 save 라우트와 withCoin이 공유한다. 규격이 갈라질 수 없게
- [★JPEG 정규화] 기존 save 라우트는 PNG를 PNG로 보관했으나 공용 모듈은 전부 JPEG로 통일.
  클라가 항상 canvas.toDataURL("image/jpeg")로 보내와 실질 무변경(MJ 승인)
- [로딩 안내] LoadingSaveNote 신설 — 로그인 사용자에게만 "완성되면 히스토리에 자동
  저장돼요 · 기다리는 동안 화면을 나가셔도 괜찮아요". ★게스트 렌더 0(게스트는 이 보장이
  없어 거짓 안내가 된다). 로그인 판별은 모듈 캐시로 1회만 조회. 165곳 배선(파일당 +2/-0)
- [무접촉] withDailyFree(무료 도구 nukki·upscale)·게스트 경로 0줄
- [게이트] ①돈경로 ②격리실측 ③중복판정(조회) ⑤벌크165 ⑥게스트 ⑦빌드 통과.
  ★③전체·④(클라 이탈 후 저장)는 프로덕션 쓰기가 필요해 MJ 폰 실측으로 대체(승인)
- 커밋 메시지: feat: 생성 결과 서버측 히스토리 확정 저장 + 로딩 안내 — 백그라운드 유실 0
- 다음에 할 것: [MJ] 폰 실측 — 생성 중 홈 버튼 → 복귀 후 히스토리에 남는지 / 항목 1개인지

## 2026-08-13 — Pro 컨셉 혼잡 안내 (실패 시 재시도·시간대 유도)
- [배경] Pro(gemini-3-pro-image) 29종은 혼잡 시간대에 429·5xx·타임아웃이 난다.
  기존엔 "지금 요청이 많아요"만 뜨고 왜·언제 다시 오면 되는지가 없었다
- [A 실패 안내] Pro 컨셉 에러 박스에서 **혼잡성 실패일 때만** 안내 한 단락을 띄우고,
  그 아래 기존 "코인은 차감되지 않았어요"가 이어진다(순서: 안내 → 무차감). 29/29 배선
- [B 사전 안내] 만들기 버튼 위 PrivacyLine 자리에 회색 한 줄. 28/29 —
  fourcutcouple은 PrivacyLine이 없어 생략(미사용 import도 제거)
- [★혼잡 판별] 화이트리스트 6종(요청이 많아요·생성이 어려워요·시간이 너무 오래·
  넘겨 중단했어요·만들지 못했어요. 잠시 후·생성에 실패했어요).
  ★동시생성 429("진행 중인 생성이…")는 원인이 달라 명시적으로 제외.
  "만들지 못했어요: 본문"(콘텐츠 거부)도 콜론판이라 안 걸린다
- [PRO_CONCEPTS] 클라에 엔진 신호가 0이라 상수를 신설했다. 손으로 고른 목록이 아니라
  route grep 결과를 옮긴 것이고, 게이트가 route 실측과 자동 대조한다(29=29 · 누락·잉여 0)
- [실측] 라이브 렌더 4케이스: Pro+혼잡=A 표시·순서 정상 / Pro+동시생성429=A 0 /
  flash+혼잡=A 0 / B는 Pro 3종 표시·flash·GPT 3종 0. 판별 함수 단위 10/10
- [서버 무접촉] app/api·coins.ts·gemini.ts 변경 0줄
- 커밋 메시지: feat: Pro 컨셉 혼잡 안내 — 실패 시 재시도·시간대 유도
- 주의/메모: ★새 Pro 컨셉을 만들거나 엔진을 바꾸면 PRO_CONCEPTS 배열도 같이 고쳐야
  한다. 자동 파생이 아니라 대조 게이트가 잡는 구조다

## 2026-08-11 — 스토어 소재 재설계 (피처 그래픽 + 스크린샷 크롭 전환)
- [★잘림 진단 결과: 잘린 적 없음] 태그라인 "사진관 안 가도, 사진관보다"를 픽셀로 재니
  잉크 x 66~381(폭 316px), 카드까지 71px 여유 — 전 글자 정상 렌더였다.
  대신 진짜 결함이 나왔다: **logo.png가 불투명 흰 배경**이라 워드마크 뒤에 밝은
  사각 판이 깔려 있었다(단색 배경에선 티가 덜 났고 그라데이션에선 바로 드러난다)
- [피처 재설계] 배경을 #FFFFFF→#F3F1EC 대각 그라데이션으로 500px 전체 충전 /
  좌측을 워드마크+태그라인 2줄로 정리(M 모노그램 제외, 좌 여백 56, 수직 중앙) /
  카드 220×275 → **328×410(높이 82%)**, 우측 24px bleed. 상하 여백 113 → 45px
- [흰 판 제거] 워드마크의 밝기를 뒤집어 알파로 삼는다(inkOnly) — 검은 글자만 남고
  흰 바탕은 완전 투명. 그라데이션 위에서도 판이 안 보인다
- [★스크린샷 크롭 전환] 좌우 패딩(823×1920, 여백 20%) 폐기 → 세로 크롭으로 폭 꽉 참.
  단순 중앙 크롭은 실패했다 — shot-01·05는 상단 탭 글자를, shot-03은 첫 행 얼굴
  이마를 반으로 갈랐다. → **크롭 앵커 자동 탐색** 신설: 행별 명암 편차를 재서
  위·아래 절단선이 모두 '민민한 가로 띠'에 놓이는 지점을 고른다(중앙 가중치 약하게)
- [앵커 실측] 중앙 대비 shot-01 −66 · 02 −237 · 03 −61 · 04 −57 · 05 −66 · 06 −58px.
  6장 전부 자동 앵커로 해결돼 수동 오프셋(SHOT_OFFSET)은 비어 있다
- [게이트] 치수·용량 8/8 / 피처 픽셀 3종(글자 끝~카드 39px·배경 네 끝 충전·우측
  카드 중앙절반 802~966 캔버스 안) / shot 6장 콘텐츠 훼손 0 / git status 이미지 0
- [★게이트가 제 검사식을 잡은 건] "상하 빈 띠 0"을 콘텐츠 잉크 경계로 재다가 카드
  위 45px(82% 높이의 설계값)이 실패로 떴다. 검사를 "배경이 꽉 찼는가"로 바로잡았다
- 커밋 메시지: fix: 스토어 소재 재설계 — 피처 그래픽 + 스크린샷 크롭 전환
- 다음에 할 것: [MJ] shot-05 재캡처(카운터 겹침은 수리 전 캡처라 그대로 남아 있음)

## 2026-08-11 — split 슬라이드 라벨 상향 (카운터 겹침 해소)
- [결함] 08-10 히어로 카운터 도입 후, freetools(split) 슬라이드에서 "4배 고화질" 라벨과
  "03 / 09" 카운터가 겹쳤다. 스토어 스크린샷(shot-05)에 그대로 찍혀 발견
- [수리] split 존의 paddingBottom 22 → **48**. 카운터 위치(오른쪽 14·아래 22)는 무접촉
- [★46이 아니라 48인 이유] 지시서의 22+24=46은 산술적으로는 맞지만 실측에서 0.19px
  겹쳤다 — 카운터가 fontSize 12 × lineHeight 1.35라 높이가 24.19px(소수)이기 때문.
  46은 라벨 밑변이 카운터 윗변에 정확히 걸리는 값이다. 48로 1.81px 여백 확보
- [실측] 겹침 면적 **0** (라벨 2종·무료 필 2개 전수). 비-split 슬라이드 4장 표본은
  맨 아래 문구 아래여백 28 그대로·카운터 겹침 0 — 무접촉 확인
- 커밋 메시지: fix: split 슬라이드 라벨 상향 — 카운터 겹침 해소
- 다음에 할 것: [MJ] shot-05 재캡처(라이브 반영 후) → 스토어 스크린샷 교체

## 2026-08-10 — 스토어 등록 소재 생산 스크립트 (아이콘·피처·스크린샷)
- [신규] `scripts/store-assets.mjs` — store-assets/raw → out으로 3종 산출.
  icon-512(512×512) · feature-1024x500 · shot-NN(1080×1920). 치수·용량을 산출 후
  **파일에서 다시 읽어** 검증하고, 하나라도 어긋나면 exit 1
- [★크롭 금지] 스크린샷은 fit:contain + #FAFAF8 패딩. 1080×2520 캡처는 823×1920으로
  줄고 좌우가 브랜드 배경으로 채워진다(패딩 23.8%). 잘라내면 UI가 잘려 "화면과 다르다"
  심사 지적을 부른다
- [피처 그래픽] 좌: M 모노그램 + MOSPIC 워드마크 + "사진관 안 가도, 사진관보다" /
  우: 애프터 3장(idtweed·bizpinkjacket·cheerglam) 220×275 카드, r18, 66px 겹침.
  겹침 자리에 배경색 링(4px)을 먼저 깔아 카드가 붙어 보이지 않게 했다
- [★한글 폰트 방어] 태그라인을 따로 렌더해 알파 채널에 획이 찍혔는지 검사하고,
  실패하면 로고를 키운 판으로 자동 폴백한다(글자 자리에 빈 여백이 남는 사고 차단).
  이번 실행은 Malgun Gothic으로 정상 렌더
- [자산 실태] M 모노그램 최고 해상도는 `public/icon-512.png` 512×512 — 더 큰 원본 없음
  (셸 런처는 192×192가 최대). 512는 플레이 요구치와 정확히 같아 확대 없이 통과.
  ★`public/store/feature-graphic.png`(1024×500)가 이미 있었다 — 구판, 이번 산출과 별개
- [.gitignore] `/store-assets/` 추가 — 원본 캡처도 산출물도 리포에 안 들어간다
- [실측] 8개 파일 치수·용량 전항 통과(피처 254KB, 스크린샷 최대 1.8MB).
  git status에 store-assets 이미지 0건, 강제 add도 ignore로 차단됨
- [★결함 발견] shot-05에서 새 히어로 카운터 "03 / 09"가 freetools 슬라이드의
  "4배 고화질" 라벨과 겹친다 — 이번 스코프 밖이라 미수정, 별도 수리 필요
- 커밋 메시지: feat: 스토어 소재 생산 스크립트 (아이콘·피처·스크린샷)
- 다음에 할 것: [MJ] 카운터-라벨 겹침 수리 판단 → 겹치면 shot-05 재캡처 /
  스크린샷 상태바에 타 앱 알림 아이콘 노출(무해하나 정리 가능)

## 2026-08-10 — 홈 헤드 점 인디케이터 → 사진 안 카운터 "01 / 09"
- [교체] 히어로 아래 점 9개를 걷어내고 사진 우하단(오른쪽 14 · 아래 22)에 카운터를 얹었다.
  분모는 HERO_SLIDES.length 자동 — 슬라이드를 늘려도 코드는 손댈 곳이 없다
- [★배치] 스크롤 컨테이너 **바깥**에 겹쳤다(relative 래퍼 신설). 안에 두면 슬라이드를 따라
  밀려나가 넘길 때 카운터가 두 개 스쳐 보인다. pointerEvents:none이라 카드 탭을 막지 않는다
- [★다크 칩 채택] MJ 시안 3안 중 A. 글자 없는 split 슬라이드(freetools)는 어둠 그라데이션이
  없어 흰 글씨만으로는 밝은 사진에 묻힌다 → rgba(0,0,0,0.38) 칩을 깔았다. 글자는 흰색 유지,
  분모만 rgba(255,255,255,0.62)
- [여백] 점 블록(marginTop 16 + 높이 6 = 22px)이 사라지며 아래 전부가 22px 상승.
  히어로 바닥→첫 섹션 간격 52 → **30**px = 전 섹션 공통 리듬과 일치(실측 확인)
- [실측] 3·6·9번 슬라이드에서 03/06/09 정확히 추종, 클론(10번째) 착지 시 01 복귀 +
  scrollLeft 0 리셋 정상. 회색 점 DOM 잔여 0. 빌드 "✓ Compiled successfully in 17.7s" · 경고 0
- [주석] "점 인디케이터"를 가리키던 스테일 주석 2곳(배열 안내·onHeroScroll)도 함께 정정
- 커밋 메시지: feat: 홈 헤드 카운터 01/09 — 점 인디케이터 교체

## 2026-08-10 — 앱 심사용 리뷰 로그인 통로 (env 게이트)
- [문제] 구글·애플 심사원은 한국 카카오 계정이 없어 로그인을 못 뚫는다. 로그인 벽 뒤가
  통째로 미검증이면 "기능 확인 불가"로 반려 사유가 된다
- [서버] `app/api/auth/review-login/route.ts` 신규(POST 전용). `REVIEW_LOGIN_TOKEN`과
  대조 → 일치 시 카카오 콜백과 **완전히 동일한** `kakao_user` 쿠키를 굽는다
  (`{id:"review9001", nickname:"Reviewer", profileImage:null, email:null}` ·
  httpOnly · secure(운영) · sameSite lax · 7일 · path "/"). 쿠키 옵션 6줄은 콜백과
  바이트 단위 동일 — 차이는 변수명뿐
- [★안전 기본값] env 미설정이면 **404**(라우트가 없는 것처럼). 심사가 끝나면 Vercel에서
  env만 지우면 통로가 닫힌다 — 코드 롤백·재배포 불필요. 16자 미만 토큰도 OFF 취급
  (무차별 대입 방어). 비교는 sha256 다이제스트 간 timingSafeEqual, 토큰 값은 코드·로그
  어디에도 없다
- [신원 설계] "review9001"은 게스트 접두("g_")가 아니라 getUserId/getAnyUserId가 정상
  회원으로 읽고 ensureWelcome 3코인도 정상 지급된다(의도 — 심사원이 유료 컨셉을 실제로
  한 번 돌려본다). 반대로 chargeAllowed()는 COIN_ADMIN_IDS에 없는 한 false라 충전 버튼은
  안 열린다(★단 COIN_CHARGE_OPEN="true"면 전원 통과 — 심사 전 확인 필요)
- [숨김 트리거] 설정 > "현재 버전" 값을 **3초 안에 7번 탭** → 인라인 "Review code" 입력칸.
  안드로이드 "빌드 번호 7번 탭" 관례와 같아 영어로 설명하기 쉽다. 원래 클릭 동작이 없던
  자리를 앵커로 써 일반 사용자에겐 보이지도 눌리지도 않는다. 설정을 닫으면 입력칸·탭
  기록이 초기화 — 재오픈해도 7탭을 다시 해야 열린다(노출 경로 0)
- [실측 검증] 6탭 미개방 / 7탭 개방 / 느린 7탭(550ms 간격, 3.85초) 미개방 / 설정 닫기 후
  재오픈 시 숨김 / 404일 때 "Unavailable" 표시 + 이동 없음 + Set-Cookie 0건 / GET 405 /
  빌드 "✓ Compiled successfully in 13.8s" · 경고 0
- 커밋 메시지: feat: 앱 심사용 리뷰 로그인 통로 (env 게이트)
- 다음에 할 것: [MJ] Vercel에 REVIEW_LOGIN_TOKEN 등록(16자 이상 무작위) → 심사 제출
  노트에 "설정 > 현재 버전 7번 탭" 영문 안내 첨부 / 심사 통과 후 env 삭제
- 주의/메모: 통로가 열려 있는 동안에는 토큰을 아는 사람 누구나 review9001로 로그인된다.
  심사 기간에만 켜 두는 것이 전제 — 상시 운영 금지

## 2026-07-28 — 글램 라인 7종 완전체 (킷·배선·BA, 홈 오픈)
- [킷 표준 개정] 썸네일 프레임 폐지 — 킷 = 상세페이지 단일 산출물, 카드는 대표 애프터
  원본 직행(155종 단일 사진 문법 준수) / 소요시간 표기 "약 30초"→"약 1분" 개정(Pro
  실측 반영 — 기존 9종 상세 소급 수정 백로그)
- [비포 체계 재정립] beauty 재사용 폐기 → 컨셉별 전용 파일명 비포 17장 GPT 신규
  (글램 15 + idolglam 남성 2). idolglam은 MJ 지적으로 남녀 4모델 체제 개정 — 남성
  보이그룹 분기 첫 실측
- [배선] 상세 7 + 카드 7 webp + BA 17쌍 34장 등록 + 홈 카드 7종 해제.
  CONCEPTS 162종 전량 홈 노출 체제
- [자산] 원료 14장 42.5MB → webp 4.66MB(-89.0%). 카드는 1086px 4장만 1080 축소,
  896px 3장 원폭 유지 / 상세는 가로 1070~1077로 전부 1080 미만이라 무축소.
  카드 원료 7장은 전부 애프터1의 md5 복사본이라 삭제해도 examples/ba에 원본이 남는다
- [BA 쌍] cheerglam 2 · crewglam 2 · guestlook 2 · idolglam 4 · anchorglam 2 ·
  goddessdress 2 · tripface 3 = 17쌍. 검수 시트 17/17 통과, 제외 0, 전 쌍 attention
- [★idolglam — 기대와 실물 불일치] 지시서는 비포4↔애프터4_직캠컷이었으나 실물은
  애프터4가 화보컷만 있고 대신 애프터1·3의 직캠컷 변형이 따로 있었다. 화보컷(기본 칩)을
  대표로 4쌍을 잡고 직캠컷 2장은 제외(bgchange cafe·season spring 전례).
  ★자산이 4쌍인데 페이지 pairs가 [1,2,3] 고정이라 4번째가 렌더되지 않아 [1,2,3,4]로
  넓혔다 — BA 4축의 '렌더' 축은 자산 수와 pairs 상한을 함께 봐야 완성된다(게이트 신설)
- [무접촉 확인] detailImage 7종은 코드화 2·3차 때 이미 배선돼 있어 손댈 것이 없었다
- 다음에 할 것: [MJ] 완전체 폰 실측(신규 7종 카드→상세→만들기→BA) / [★달력] 추석
  한복 리프레시 판단 — 8월 중순 마지노선, 즉시 착수 권고 / [백로그] 기존 9종 상세
  "30초" 소급 수정 · hairmenu 검증팩 · colorchange 재검증 · COIN_DORMANT 스테일 주석
  154개 정리 · 코인 전종 라이브 의도 확인(B대화)

## 2026-07-28 — ★글램 라인 7종 완결 (검증 15전 8승 → 코드화 3차, 162종 체제)
- [검증 여정] 후보 15종 왕복 — 채택 7: idolglam(GPT+Pro 2칩 화보컷/직캠컷)·cheerglam(Pro)·
  crewglam(Pro)·guestlook(Pro)·anchorglam(GPT, Pro폴백 승인)·goddessdress(GPT)·
  tripface(GPT, 남녀공용). 폐기: glampure·glamsmoky(beauty와 방향 중복)·balletcore(무드×
  일상배경 충돌)·blackhair(흑발→흑발 낙차 0)·남성 3종(파일럿·CEO·badboy — 그루밍 상한
  탓 낙차 부족)·rockchic(최종 드롭). colorchange 보류(추후 재검증)
- [★판매 공식 확립] 통과작 공통분모 = "혼자 못 만드는 모습(헤메코 팀급) + 일상 배경에서
  읽힘 + 비포 대비 낙차 확실". 파생 관문 2: "아이콘이 얼굴을 가리는 직업은 못 산다
  (파일럿 모자)" / "무드가 배경까지 세트인 컨셉은 못 산다(발레코어)"
- [★엔진 지도 확장] GPT = 패션·수트·드레스 생존(idol·anchor·goddess·trip), 정형 코스튬
  (치어복·발레복·승무원복)에서 생성 신뢰도 붕괴 → Pro. 웹 ChatGPT 생성 불안정 빈발 —
  라이브(API)와 다를 수 있음 유의
- [SKIN TRUTH v1→v3] Pro가 "매력점"을 발명하는 사고 2회 → v3 = 기본값 선언형("피부의
  기본값은 깨끗함, 점은 원본 복사만") + 종결줄 강화 + 존별 스캔 셀프체크. 글램 전 컨셉
  v3 통일(코드화분 포함)
- [코드화 3차] 6b5512a(Pro 3종) → 24cf23a(GPT 3종) → 6c86999(idolglam 이중 엔진 —
  칩이 엔진을 가르는 첫 route, 프롬프트 상수 단일 참조·에러 태그 분리·조건부 키 가드)
- [★발견 — 코인 전종 라이브] LIVE_COIN_CONCEPTS = Object.keys(CONCEPTS)로 바뀌어 있어
  coinCost 3 블록 = 즉시 3코인 과금. withCoin 0 인자·COIN_DORMANT 주석은 무시됨(전
  컨셉 동일). B대화 IAP 전환 의도인지 확인 대기 — "휴면 코인" 용어 은퇴, 기존 ★154개
  route COIN_DORMANT 스테일 주석 정리 백로그(초안의 12개는 변종 집계 중 한 줄만 읽은
  수치. 실측 = withCoin 래핑 159 중 글램 신표기 4를 뺀 154)
- [★표준 — 전례 실사] "job 전례" 단정이 4번째 문서≠코드 사고(engine·resultCount·
  inputRule에 이어). 새 표준: 명령문에서 전례 단정 금지 → 실사 후 있으면 따르고 없으면
  신설·보고. crewglam·anchorglam 자격 고지는 신설 라인
- [게이트 진화] 검사기 정밀판(프롬프트 리터럴 제외 + key: 앵커 판정 — 들여쓰기 함정
  스크립트 재현 수리) / ★이스케이프 잔재 0 검사 신설(생성기가 백틱·달러를 리터럴로 박은
  사고 45건을 빌드 전 검거)
- [부수] 17차 스토어 문서 잔여 정리 798fe1f / privacy 제7조 게스트 쿠키 문구 불일치 —
  B대화 몫으로 이관
- 규모: CONCEPTS 162종 / 생성 route 161 / 글램 7종 홈 카드 주석 대기
- 다음에 할 것: [A] 글램 킷 7종(cheer→crew→guest→idol→anchor→goddess→trip, trip은
  비포 3장 생성 선행) → webp 배선+BA / [MJ] 코인 전종 라이브 의도 확인(B대화) /
  [★달력] 추석 한복 리프레시 판단 — 8월 중순 마지노선, 킷 공정과 병행 필수 /
  [보류] hairmenu 검증팩 · colorchange 재검증 · bgchange 잔여 변형 BA
- 주의/메모: 이중 엔진 route 표준 = 프롬프트 상수 1벌 공유·태그 분리·조건부 키 가드 /
  글램 비포 = beauty_비포1~3 재사용(여성 전용 컨셉은 1~2만) / GPT 킷 애프터는 라이브
  재생성이 최종본(코인 차감 발생 유의)

## 2026-07-27 (17차) — 스토어 문서 정합: Data safety 5건 실측 반영 + 컨셉 수 150+ + 계정 삭제 앵커 URL
- [Data safety 5건] 14~16차 감사에서 드러난 누락·부정확을 코드 실측으로 교체:
  ① 기기 ID 신설 — 게스트 쿠키 mospic_guest(1년·httpOnly·SameSite Lax, proxy.ts가 페이지
     요청 시 1회 발급). 광고 ID 미수집 명기
  ② 자동 수집 신설 — IP. 무료 도구 한도 키 free:{컨셉}:ip:{IP}:{KST일자} TTL 172,800초(48h),
     접속 기록 자체는 방침 제2조 법정 3개월
  ③ 앱 활동 보강 — 유료 생성물 원본 1년(purge-expired RETENTION_DAYS=365, 삭제·탈퇴 시 즉시)
  ④ 금융 정보>구매 내역 신설 — order:{주문번호} 영수증 TTL 1,826일(5년). ★카드번호 등
     결제수단 정보는 저장하지 않는다(OrderReceipt 필드에 없음 — 승인은 토스가 처리)
  ⑤ 삭제 수단 교체 — "일괄 삭제"라는 부정확한 표현을 실제 범위로: 히스토리·유료 원본·
     코인 잔액·이용 내역 삭제 / 결제 5년·웰컴 지급 여부는 보관(15차 수리 결과와 정합)
- [컨셉 수] "110개 이상"→"150개 이상"(실측 155). ★정확값 대신 '이상' 표기 — 컨셉이 늘고
  줄 때마다 스토어 문구를 고치지 않아도 되고 과소 표기라 메타데이터 정확성 정책에도 안전.
  근거 주석도 실측법(들여쓰기 불규칙 → key: "..." 앵커)까지 적어 갱신
- [계정 삭제 URL] privacy에 조 번호 없는 "회원 탈퇴 방법" 문단 신설(id=delete-account,
  scrollMarginTop 68로 스티키 헤더 56px 회피). 기존 조문 본문 diff 0.
  STORE-LISTING 7항에 https://mospic.com/privacy#delete-account 기재
- [★대조에서 나온 모순 1건 — 미수리] privacy 제7조 ①이 "로그인 상태 유지 목적의 쿠키를
  사용합니다"라고만 적고 있다. 실제로는 비로그인 전원에게 게스트 식별 쿠키를 1년간
  발급하므로 Data safety ①과 방침이 어긋난다. 이번 수정 허용 범위가 privacy "앵커 1곳"
  이라 손대지 않았다. 제7조 ①에 "비로그인 이용자 식별을 위한 쿠키"를 한 구절 더하면 해소
- 게이트: diff = STORE-LISTING·privacy(신설 문단만)·WORKLOG / 기존 조문 diff 0 /
  110·116 잔존 0건 / Compiled successfully 원문 확인 · exit 0 / 코드 로직 0줄
- 다음에 할 것: [MJ] privacy 제7조 ① 게스트 쿠키 구절 승인 / 완전체 폰 실측 /
  [달력] 추석 한복 리프레시(8월 중순 데드라인)
- 주의/메모: 스토어 문서 수치는 '이상' 표기가 표준 / Data safety는 코드 실측이 진실원
  (문서 자체 체크리스트 금지 — 15차 교훈의 문서판)

## 2026-07-27 (16차) — menu 401 수리 + 실패 무차감 안내 154페이지 (앵커 2종 실측 반영)
- [1단계 — 전제 복원] menu/page.tsx에 9차 표준형 401 분기 + openLoginSheet import 추가.
  "402는 있는데 401이 없는" 페이지를 차집합으로 전수 확인한 결과 ★menu 단독이었다.
  401 분기 자구 변종도 0(154건 전부 표준형 한 줄)
- [2단계 — 벌크 154] 에러 메시지 아래 조건부 서브 줄 삽입:
  {COIN_GATED && COIN_COST > 0 && <div 12px #9B9B9B>코인은 차감되지 않았어요</div>}
  · 실동작 근거: withCoin은 res.status < 400 일 때만 decrby — 실패하면 코인이 안 빠진다.
    코드는 원래 안전했고 그 사실을 알리는 문구만 없었다(15차 감사 지적)
  · 무료 컨셉·휴면 상태에서는 조건이 자동으로 렌더를 막아 별도 분기 불필요
- [★앵커 2종] 에러 박스 <p>의 fontWeight가 600(25) / 700(129) 두 계열로 갈려 있었다.
  단일 앵커로 돌렸다면 25개만 삽입되고 129개가 조용히 누락됐을 자리.
  삽입 전 합집합=154 검증 → 삽입 → 재검증(154/154, 중복 0, 누락 0) 3단 확인
- [제외 1 — upscale] withDailyFree 무료 도구라 COIN_GATED·COIN_COST 선언 자체가 없다.
  삽입 시 컴파일 실패 + 코인 개념이 없어 문구도 무의미. 무접촉 확인
- [★잔여 과제] upscale은 401 분기도 없다(withDailyFree가 401을 반환하는데 전역 로그인
  시트로 안 빠지고 빨간 에러 박스로 떨어진다 = 9차가 없애려던 막다른 골목).
  이번 수정 허용 범위가 menu 1파일이라 손대지 않았다. 게이트①의 "401 분기 155/155"는
  실측 154/155 — 범위 내 전부 완료, upscale만 잔여. 별건 1파일 2줄이면 끝난다
- [소진] upscale 401 표준형 — 극단 케이스(쿠키 차단) 안전망 + 벌크 게이트 155 정합.
  402 분기는 없는 페이지라 res.ok 판정 직전에 넣었고, 무료 도구이므로 "코인은 차감되지
  않았어요"는 넣지 않았다. 이로써 401 분기 155/155 · 자구 변종 0(전부 표준형 한 줄)
- 게이트: 삽입 154/154 · 중복 0 · 누락 0 / 파일당 diff 1줄(153개), menu만 4줄(import+401
  2줄+삽입 1줄) / Compiled successfully 원문 확인 · exit 0
- 다음에 할 것: [MJ] upscale 401 분기 승인 / 완전체 폰 실측 / [달력] 추석 한복 리프레시
  (8월 중순 데드라인) / [백로그] Data safety 초안 5줄 수정(게스트 쿠키·IP·유료 원본·결제·
  탈퇴 삭제 범위), STORE-LISTING 컨셉 수 116→155 갱신
- 주의/메모: 벌크 전 "표준 앵커 1개" 가정 금지 — 포맷 변종부터 전수 집계(2연속 적발) /
  삽입은 합집합 사전검증→삽입→재검증 3단이 표준 / 무료 도구(withDailyFree) 페이지는
  코인 벌크의 상시 예외

## 2026-07-27 (15차) — 출시 전 감사 수리 1건: 탈퇴 파기 정합 / 무차감 안내는 전제 불일치로 보류
- [수리] withdraw에 coin:{uid}·coinlog:{uid} DEL 추가(기존 history·originals 블록 뒤,
  unlink 성공 확인 안쪽). 방침 제1조 "탈퇴 시 지체 없이 파기"·제5조 위탁표(Upstash
  "이용 수량·코인 잔액")와 코드가 어긋나 있던 것을 맞춤. coinlog는 어떤 컨셉을 언제
  썼는지가 남는 이용 이력이라 함께 삭제
- [의도적 잔존 2종] welcome:{uid}=재가입 웰컴 파밍 차단(privacy 제5조에 예외 1줄 신설) /
  payment:*=전자상거래법 5년(기존 주석 유지). 둘 다 redis.del 대상에 없음을 원문 확인
- [lint 청소] app/page.tsx의 미사용 AiReportLink 기본 import 제거(aiReportMailto만 사용).
  400건 중 1건 감소
- [★보류 — 무차감 안내 155페이지] 0단계 앵커 확정에서 지시서 전제가 깨져 중단.
  · 전제 "401/402는 전역 시트로 빠져 에러 박스에 도달하지 않음"은 155개 중 153개만 성립
  · app/menu/page.tsx: 402 분기는 있으나 ★401 분기 없음 → 401이 빨간 에러 박스로 표시됨
    (openLoginSheet import 자체가 없다. 9차 401 확산 때 누락된 1곳)
  · app/upscale/page.tsx: withDailyFree 무료 도구라 COIN_GATED·COIN_COST 선언이 아예 없음
    → 조건부 삽입 시 컴파일 실패. 코인 개념이 없어 문구도 무의미
  · 부수 발견: 에러 박스 <p>가 fontWeight 600(26개)/700(129개) 2종으로 갈려 있다.
    벌크 앵커는 2개 필요(단일 앵커로는 26개만 잡힌다)
- 규모: CONCEPTS 155 / 생성 route 154 / BA_LIVE 148 (무변동)
- 다음에 할 것: [MJ 결정] 무차감 안내 범위 — ①153개(menu·upscale 제외) ②154개(menu 포함,
  401 자리에도 참인 문구) ③menu 401 분기부터 수리 후 154개 / [MJ] 완전체 폰 실측 /
  [달력] 추석 한복 리프레시(8월 중순 데드라인)
- 주의/메모: 벌크 전 "표준 앵커 1개" 가정 금지 — 포맷 변종부터 전수 집계할 것 /
  menu는 401 전역 시트 미적용 상태(별건 수리 후보) / 이번 커밋은 코드만, 프로덕션
  Redis 실행 없음

## 2026-07-27 — ★신규 컨셉 9종 배치 완결 (검증→코드화→킷→BA, 155종 체제)
- [배치 여정] 최초 10종안에서 실측 왕복으로 재편 — film·mono 탈락(MJ), dslr 탈락("누가
  언제 쓰나" 테스트 실패), 신규 투입 anisky(애니 감성 릴스 트렌드)·brickfigure(블록
  인증샷 트렌드) → 최종 9종: goldenhour·fixnight·season·fixbacklight·bgchange·
  fixcrowd·beauty·anisky·brickfigure (전부 1장 출력=3코인 휴면, 그룹B)
- [★엔진 지형 확립] 검증 왕복의 산물 — GPT=과감하나 합성감 / flash=자연스러우나 원본
  침식 / Pro=장면 재구성+자연광. 결론: "원본 보존이 생명인 편집=GPT / 장면을 새로 짓는
  게 본질=Pro / 색·톤만=flash". 최종 Pro 3(goldenhour·fixnight·season)·GPT 6
- [프롬프트 자산 신규] SCENE & IDENTITY LOCK(빛 계열 공유) / GROUND LOCK+오버레이
  테스트(goldenhour v5 — 지상 잠금·하늘 자유) / SKIN TRUTH(beauty — 신규 점 생성 금지
  최상단+자가검증) / ANTI-COMPOSITE 4종(bgchange — 라이트랩·접지그림자·경계·원카메라) /
  저작권 가드(anisky 작품명 금지·brickfigure 완구 브랜드 금지 — voxel 문법)
- [코드화 3차] e69bd99(Pro 3종) → ecfc3ed(GPT 3종) → 3eaef4e(GPT 3종+fixnight 가이드
  정합). ★구제 컨셉 표준 신설: 입력=망한 사진인 컨셉(fixnight·fixbacklight·fixcrowd)은
  업로드 가이드 미표시(가이드의 "잘 찍기"가 입력 전제와 모순)
- [bgchange 칩 확장 321c2fd] 원버튼→5칩(studio·cafe·beach·night·garden), CORE+SCENES+
  FINISH 합성(season 패턴). 부수 수리 3: 외톨이 칸 full-width / 로딩 문구 / onClick
  이벤트 객체 방어
- [킷 9종] 스킬 v2 기반 + 신규 표준 2: ①썸네일 하단 띠 통일(시그니처색 띠 + 흰 볼드
  컨셉명 + 세로 구분선 + 서브카피) ②"커피 한 잔 값" 금지 적용(★스킬 파일 사본엔 잔재
  — 갱신 백로그)
- [최종 배선 3f70c99] webp 18장(67.5→8.3MB, -87.6%) + 홈 카드 9종 해제 + INDEX_ROWS
  헤어·뷰티 3장 승격 + ★conceptForGo 9종 매핑 추가
- [BA 등록 dae90f2] 26쌍 52장(768×960 q85), 검수 시트 2벌(원료+크롭 산출물) 26/26 통과
  제외 0. attention 20·center 6. ★md5 함정: {키}_헤드사진.png 4종이 애프터 복제본인데
  fixbacklight만 애프터2와 동일(나머지 3종은 애프터1) — 짐작 매칭했으면 오등록
- [★사고 기록 — 보고형 게이트 3연속 오탐] 1~3차 게이트표가 전부 "8지점 8/8 ✓"였으나
  실제론 conceptForGo가 9종 전부 누락(카드 숨김이라 실피해 0, 주석 해제 직전 발견).
  발견 수단 = "활성 카드 174장 전수 soon 폴백 실행 검사". ★새 표준: 배선 게이트는
  자기보고 금지, 폴백 전수 실행 검사로
- [실태 확인 — ★함정 추가] "문서 체크리스트 ≠ 코드 실태": engine 필드=타입에 없음,
  resultCount=146종 실사용 0, inputRule=순수 메타데이터(validate-photo 게이트는
  하드코딩 인자, concepts 필드는 아무도 안 읽음 — 관례상 solo_face만 계속 표기).
  배선 사양은 문서가 아니라 최신 블록(toon3d)을 원본으로
- 규모: CONCEPTS 155종 / 생성 route 154 / BA_LIVE 148종
- 다음에 할 것: [MJ] 완전체 폰 실측(홈 9카드→상세→만들기·BA 순환·갤러리 저장·뒤로) /
  [달력] 추석 한복 리프레시 판단(8월 중순 데드라인) → 수능 응원(9월 초 착수) /
  [백로그] photo_any 가이드 시트(B대화 몫) · bgchange·season 잔여 변형 BA 추가 후보
  (beach·night·garden·studio / summer·autumn·winter — 소재 기확보) · 스킬 파일 갱신
- 주의/메모: 새 컨셉 배선 게이트 = 폴백 전수 실행 검사 필수 / 구제 컨셉 = 가이드
  미표시 / 헤드사진류 복제 파일은 md5 대조 전 매칭 금지 / bgchange BA 2쌍(3번 후보는
  BeforeAfterHero onload 검증이 자동 소거 — 코드 무접촉)

## 2026-07-27 (14차) — WELCOME_COINS 상수 분리, 클라 번들 Redis SDK 제거
- [원인] 9차에서 LoginNeededSheet가 웰컴 개수를 쓰려고 coins.ts를 import했다.
  coins.ts는 @upstash/redis·@vercel/blob·next/server를 끌고 오는 서버 모듈이라
  Redis SDK가 통째로 클라 청크에 실렸다(13차 실측 135KB)
- [수리] app/lib/coin-constants.ts 신규 — import 0개인 순수 상수 파일.
  coins.ts는 여기서 import 후 재export(서버 호출부 무수정), 두 시트는 경로만 교체
- [★실측] 리빌드 후 Redis SDK 포함 클라 청크 1개(135KB) → 0개.
  KV_REST_API 참조 청크도 0. 남은 "upstash" 문자열 1건은 privacy 페이지의
  국외 위탁사 목록(정상 콘텐츠)
- [보안] 애초에 토큰 값은 안 샜다 — NEXT_PUBLIC_ 없는 env는 클라 빌드에서
  치환되지 않아 변수명만 남고 런타임 undefined였다. 순수 용량·위생 문제였음
- [출처 단일화] WELCOME_COINS 정의는 coin-constants 1곳뿐. 리터럴 3 잔존 0
- [재발 방지] coin-constants.ts 주석에 "이 파일에는 어떤 import도 두지 않는다"를
  못박았다. 클라 컴포넌트 중 coins.ts를 import하는 곳 0건 확인

## 2026-07-27 (13차) — 402 시트 게스트 소프트 로그인 줄(B) — 게스트 신원 라운드 종결
- [줄] "필요 N · 보유 M" 아래(canCharge 양 분기 공통)에 게스트 전용 안내 1줄 +
  보조 버튼("카카오로 시작하기"). 테두리·회색 톤이라 아래 상품 버튼(핑크)보다
  위계가 낮다. 웰컴 개수는 WELCOME_COINS 상수 참조(하드코딩 0), 새 색 0
- [판정] 시트 오픈 시 /api/auth/me 1회(마운트 아님). ★loggedIn 기본값 true라
  조회 실패·지연 시 줄이 숨겨진다 — 로그인 사용자에게 로그인을 권하는 오판 불가.
  /api/coins의 canCharge로는 못 가른다(로그인 사용자도 충전 잠금이면 false)
- [★발견 — 클라 번들 오염] LoginNeededSheet가 WELCOME_COINS를 위해 coins.ts를
  import한 탓에 @upstash/redis SDK가 클라 청크(134KB)에 들어가 있다(12차 이전,
  9차 커밋에서 유입). 이번 시트도 같은 청크라 추가 오염은 0이지만 근본 수리 필요
  · ★보안 영향 없음 확인: KV_REST_API_TOKEN은 변수명 문자열만 남고(런타임
    undefined) 실제 upstash.io 주소·토큰 값은 번들에 없다
  · 수리안: WELCOME_COINS를 서버 의존 없는 상수 파일(예 lib/coinConst.ts)로 분리
    → coins.ts·LoginNeededSheet·CoinNeededSheet 3파일 접촉. 이번 명령 범위 밖이라
    별건으로 남긴다
- [라운드 종결] 게스트 신원 A(12차)+B(13차) 완료. C(로그인 시 잔액 병합)는
  게스트가 충전을 못 해 잔액이 항상 0이라 지금은 불필요 — 게스트 IAP를 여는
  순간 선행 조건이 된다

## 2026-07-27 (12차) — ★게스트 신원 도입: 비로그인 생성 개방
- [발급] proxy.ts 신규 — mospic_guest 쿠키 부재 시 "g_"+randomUUID(httpOnly·secure·
  lax·1년). 페이지 요청만 매처(api·_next·확장자 제외). 발급 지점이 하나라 이중 발급·
  누락이 원천 차단. 동시 첫 요청 경합은 마지막 Set-Cookie 승자로 수렴, 패자 키는
  TTL로 소멸(free:*는 2일, coin은 게스트 잔액 0이라 생성 자체가 안 됨)
- [★Next 16 deprecation] middleware 규약이 deprecated라 proxy.ts로 만들었다
  (함수명도 proxy). 1차 시도에서 middleware.ts로 만들었더니 빌드가 경고를 냈고,
  node_modules/next/dist/docs/.../proxy.md 확인 후 전환 — 경고 소멸
- [신원] auth.ts에 getAnyUserId 신설: 카카오 우선, 없으면 mospic_guest(형식
  /^g_[0-9a-f-]{36}$/ 검증). getUserId는 무수정 — "카카오 회원인가" 판별자로
  결제·탈퇴·관리자 판정에 계속 쓰인다
- [차단 2종] ensureWelcome·chargeAllowed 최상단에 g_ 게이트. 호출부가 늘어도
  함수가 스스로 지킨다(웰컴 호출부는 이번 라운드에만 3→4곳으로 늘었다)
- [무료 도구] withDailyFree 키를 게스트는 free:{concept}:ip:{x-forwarded-for 첫값}:
  {KST일자}로 분기 — 쿠키 리셋 파밍 차단(07-20 로그인 방어의 대체). 카카오는 uid 원형
- [게스트 흐름] withCoin은 분기 추가 0으로 성립: 웰컴 no-op → inflight → 잔액 0 →
  402. /api/coins 401 해제로 게스트가 balance 0을 받아 153페이지 즉시 부족 체크가
  서버 왕복 없이 발화(페이지 수정 0)
- [무접촉] history·generate·usage·payments·withdraw·me·admin은 카카오 전용 유지
- [★IAP 라운드 선행 조건] ①로그인 시 게스트 잔액 병합(C커밋) — 지금은 게스트가
  충전을 못 해 잔액이 항상 0이라 무해하지만, 게스트 IAP를 열면 즉시 필수
  ②게스트 IAP 개방 시 약관 제6조① "코인 구매…회원만" 문구 수정
  ③purge-expired가 welcome:* 스캔이라 게스트를 못 본다 → coin:* 기준으로 변경
- [백로그] 복붙 getUserId 7곳(generate·history 4종·usage·payments/confirm) 공용
  유틸 통일 — 지금은 무접촉이 맞지만, 게스트 히스토리를 열면 필요해진다

## 2026-07-27 (11차) — 코인 클라 게이트 3페이지 보강, 153 전 페이지 동형화
- [대상] idstyle·nukki·petstudio — 어제 402 누락이던 그 3개. 코인 클라 게이트
  (COIN_GATED·COIN_COST·잔액 캐시·즉시 부족 체크·버튼 코인 표기)가 통째로 없었다
- [★자동 삽입 포기] 세 페이지가 표준 앵커와 전부 달랐다: petstudio·idstyle은 버튼
  라벨이 문자열(`: "펫 화보 만들기 ✨"`)이고 표준은 JSX fragment, nukki는 loading
  분기조차 없는 별도 버튼(`배경 지우기 ✨ · 무료 · 오늘 5회`), idstyle은
  handleSubmit 가드가 faces.length < MIN_FACES(다장 선택 UI).
  → 일괄 정규식 대신 페이지별 명시 앵커로 전환(앵커 1회 검증 후 적용)
- [nukki 예외] 버튼은 손대지 않았다. coinCost 0이라 코인 표기 조건이 어차피
  false이고, 기존 "무료 · 오늘 5회" 문구가 이 컨셉의 실제 정책(withDailyFree)이다.
  게이트 블록만 넣어 형태를 통일했고 무동작임을 주석에 명시
- [★정정] petstudio는 3코인이다(9코인 아님). 10차 보고에서 "9코인"이라 한 것은
  근거 없는 서술이었다 — 9코인 65종은 비즈니스 34 + 증명사진 31뿐
- [게이트] 153페이지 전수: COIN_GATED 정의 153 / 잔액 fetch 가드 153 /
  즉시 부족 체크 153 / CoinIcon 참조 153 — 전부 동형. 빌드 Compiled successfully
- [남은 리스크] Toss 앱 웹뷰 결제(카드사 스킴) 실측 미완 — 활성화 직후 최우선

## 2026-07-26 (10차) — ★코인 전면 활성화(원장 스위치 ON)
- [구조] 비용 진실원을 concepts.ts coinCost 하나로 통일. withCoin이
  LIVE_COIN_CONCEPTS.includes(key) && CONCEPTS[key].coinCost를 읽어 resolved 산출,
  resolved===0이면 기존 휴면 우회 그대로. route 152곳의 `withCoin("키", 0, …)`
  두 번째 인자는 호환용으로 남기고 무시(void cost) — 페이지·route 파일 0개 수정
- [스위치] LIVE_COIN_CONCEPTS = Object.keys(CONCEPTS) 파생.
  ★끄기 = 이 한 줄을 ["travel"] 등 리터럴로 되돌리면 전부 휴면(전환 전 형태는
  파일 주석에 보존). 롤백 1줄
- [★TDZ 함정] 기존 정의가 22행(CONCEPTS 30행보다 앞)이라 그 자리에 Object.keys를
  쓰면 초기화 전 참조로 런타임 에러. 정의를 CONCEPTS 종료 직후로 옮겨 해결
- [가격표] 0코인 2종(nukki·upscale — withDailyFree 경로라 withCoin 미적용,
  히어로 무료 필 유지) / 3코인 87종(재미추억 35·인생샷 18·반려동물 12·가족커플 11·
  사장님 8·헤어뷰티 2·비즈니스 1) / 9코인 65종(비즈니스 34·증명사진 31 — 출력 3장).
  withCoin 걸린 152 route 전부 CONCEPTS 등록 확인(비용 미정의 0건)
- [검증] travel resolved 3 전후 동일 / 해석 분포 3코인 87·9코인 65가 표시층과
  완전 일치 / 페이지 diff 0 / 빌드 Compiled successfully
- [★미비점 — 다음 작업] idstyle·nukki·petstudio 3개 페이지에 클라 코인 게이트
  (COIN_GATED·COIN_COST·잔액 캐시·즉시 부족 체크)가 통째로 없다. 어제 402 누락이던
  그 3개와 동일. petstudio는 9코인인데 버튼에 코인 표시가 안 뜨고 즉시 체크도 없어
  서버 왕복 후에야 402 시트가 뜬다(동작은 정상, UX 열위). idstyle은 은퇴 컨셉
- [잔여 리스크] Toss 결제가 앱 웹뷰에서 카드사 앱 스킴(intent://·ispmobile://)을
  띄울 수 있는지 미실측. allowNavigation은 *.kakao.com뿐 — 막히면 충전 불가라
  과금만 켜진 상태가 된다. ★실기기 1회 확인이 활성화 직후 최우선

## 2026-07-26 (9차) — 비로그인 401 로그인 유도 시트(153페이지) + 402 누락 3페이지 보강
- [문제] withCoin·withDailyFree는 비로그인에 401 "로그인이 필요해요"를 주는데,
  페이지들은 그걸 빨간 에러 박스로만 띄웠다 — 로그인 입구가 없는 막다른 골목.
  히어로 "무료" 탭으로 들어온 nukki·upscale 유입자도 같은 벽(withDailyFree도 401)
- [LoginNeededSheet] coinSheet와 같은 window 이벤트 관례(openLoginSheet()),
  layout 전역 마운트, 402 시트와 동일 규격(오버레이 .4·라운드 24·핸들 36×4·
  타이틀 20/900·서브 13/#999·CTA #FF4B7C) — 새 색·폰트 0. useBackClose 상속.
  서브 문구는 WELCOME_COINS 상수를 읽는다(3 하드코딩 금지)
- [벌크 153] 표준 150개 = 401 분기 1줄 + 주석 + import 1줄(3줄).
  ★402 누락 3개(idstyle·nukki·petstudio)는 401·402 둘 다 보강(6줄) —
  앞선 진단에서 "누락 2개"라 한 것은 부정확했다(handleSubmit 기준 재집계로 3개 확정).
  세 페이지 모두 구조는 표준과 같고 402 줄·import만 빠진 단순 누락이었다(upscale은 보유)
- [★공정 함정] 1차 시도에서 402 코드 줄만 앵커로 잡아, 기존 "// 코인 부족(402)"
  주석이 새로 삽입한 401 줄 위에 남아 주석이 다른 줄을 설명하게 됐다. 153개 전부
  원복(git checkout -- app/) 후 앵커를 "주석 줄 + 코드 줄 묶음"으로 바꿔 재실행.
  ※원복 시 layout.tsx 변경도 함께 날아가므로 재적용 필요 — 다음에도 주의
- [0단계 발견] /api/auth/kakao는 returnTo·redirect 파라미터를 받지 않는다(GET()이
  request 인자조차 없음). 콜백도 항상 "/"로 보낸다 → 이번엔 홈 복귀로 간다.
  웰컴 모달이 홈에 뜨므로 착지로도 성립. 원래 컨셉 페이지 복귀는 백로그
- [게이트] 401/402/openLoginSheet/openCoinSheet 각 153 일치, 파일당 diff
  3줄(150개)·6줄(3개)·삭제 0, 빌드 Compiled successfully

## 2026-07-26 (8차) — 웰컴 3코인 로그인 즉시 지급 + 확인 모달
- [기존 실태] ensureWelcome(SET NX·WELCOME_COINS 3)은 이미 있었지만 호출부가
  withDailyFree·withCoin·/api/coins 3곳뿐이라 "코인 API를 부르거나 유료 생성을
  시도할 때" 지급됐다 — 로그인해도 받은 줄 모르는 상태
- [수리] 카카오 콜백에서 로그인 즉시 지급. ensureWelcome 반환형 void→Promise<boolean>
  (첫 지급 true), 첫 지급일 때만 ?welcome=N 리다이렉트 → 홈이 모달 1회 표시 후
  history.replaceState로 주소 정리(?tab=coin과 같은 관례·같은 위치)
- [★uid 동일성] 콜백 지급 키 = String(userData.id), 이후 getUserId()는
  String(JSON.parse(cookie).id) = 같은 문자열. String 멱등이라 welcome:{uid}가
  두 벌 생길 수 없다. 게다가 SET NX라 콜백 뒤 다른 경로가 또 불려도 실지급 0
- [지급 실패 격리] try/catch로 삼켜 로그인은 성사시킨다. 실패해도 다음 /api/coins나
  유료 생성 때 기존 호출부가 재시도
- [WELCOME_COINS export] 콜백·클라가 3을 하드코딩하지 않게 서버 상수 하나만 본다
- [모달] 402 시트(CoinNeededSheet)와 동일 규격 재사용 — 오버레이 .4, 시트 라운드
  24, 핸들 36×4, 타이틀 20/900, 서브 13/#999, CTA #FF4B7C. 새 색·폰트 0.
  useBackClose 등록으로 뒤로가기·오버레이 탭으로도 닫힘
- [잔액 재조회 무동작] 홈에는 코인 잔액 state가 없다(07-25 코인 카드 제거분).
  코인 탭이 마운트마다 자체 조회하므로 열면 이미 +3이 보인다 — 추가 조치 불필요
- [canCharge 조사] chargeAllowed(uid) = COIN_ADMIN_IDS 포함 또는
  COIN_CHARGE_OPEN==="true". ★서버 env 전역 on/off뿐이고 플랫폼 구분이 없다.
  "앱=충전 잠금, 웹=Toss" 분기를 하려면 UA/헤더 기반 Capacitor 감지가 별도로 필요
- [다음] 과금 활성화는 별건. withCoin이 LIVE_COIN_CONCEPTS+coinCost를 읽게 고치면
  배열 1줄로 켜고 끌 수 있다(현재 배열은 클라 표시 전용, 서버는 route 인자 151개)

## 2026-07-26 (7차) — 히어로 무료 도구 스플릿 슬라이드
- 3번 슬롯 신설(총 7장): 좌 배경 제거(체커보드+누끼 피사체) / 우 4배 고화질 —
  반반 탭존, 각각 상세 시트 직행. "4K" 아닌 "4배" 표기(엔진 4x — 과장 방지)
- 무료 필 = coinCost===0 조건부(카드 뱃지와 동일 조건) — 유료 전환 시 자동 소멸
- ★IAP 런칭 체크리스트 추가: nukki·upscale cost 0 유지 여부 결정(무료 미끼 전략
  vs 전량 유료) — 유지 시 코드 변경 0, 전환 시 히어로 슬라이드 존치 여부 재검토
- [소재] scripts/hero-freetools.mjs 신설. 좌=cut_dog.png(알파 보유, 털 경계로 누끼
  난이도 시연) / 우=up_detail.png(눈 클로즈업, cover+sharpen). 960×540 webp q88
  · 알파 검사 결과: examples/ba/누끼 사진의 cut_* 6종이 알파 보유, public/examples/ba의
    nukki-after-*.webp와 cards/nukki.webp는 전부 불투명 → 체커보드용으로 부적합
  · 안전영역 실측 통과: 390px 폰 잘림(좌우 9.5%) 밖에 두 피사체 모두 안착,
    하단 90px 라벨 영역은 체커보드 2색만(피사체 침범 0), 중앙 흰 3px 구분선 픽셀 확인
- [렌더] HERO_SLIDES에 split?: {label,key}[] 신설 + 타입 명시(기존은 추론이라 선택
  필드 추가 시 유니온 문제). split이면 판 전체 onClick 미부착·텍스트 오버레이 미렌더·
  ★어둠 그라데이션도 제외(글자 없는데 사진만 어두워짐). 기존 6장 경로는 무변경
- 클론 무한 루프·점 인디케이터·자동순환·타이머 정지는 전부 HERO_SLIDES.length 기반이라
  7장에서 코드 변경 0 (diff로 무접촉 확인)
- [소재 교체] 우측 눈 클로즈업 → 풍경(MJ — 클로즈업 혐오감 리스크 회피).
  선정 컷: examples/ba/업스케일 사진/up_scene.png (산 능선·침엽수림·호수 반영, 인물 0)

## 2026-07-26 (6차) — 방침↔코드 격차 3건 수리 (법정 5년·파기 크론·탈퇴 정리)
- [결제 5년] TTL 1년 → 1826일(365×5+윤일). 전자상거래법 제6조 계약·대금결제 기록
  보존 의무. 수정 3곳: coins/charge(order:{id} 영수증)·admin/grant-coins(동일 키)·
  payments/confirm(payment:{uid}:{orderId}). ★무접촉 3곳은 기록이 아닌 잔액/카운터라
  1년 유지: confirm의 bonusKey(무상 코인 1년 정책과 정합)·usage:{uid}·free:* 일일 카운터
- [파기 크론] purge-expired에 GET 분기 신설 — Vercel Cron이 Authorization: Bearer
  ${CRON_SECRET}로 호출할 때만 전체 사용자 실파기. 사람이 쓰는 POST(관리자·dryRun
  기본)는 무접촉. vercel.json 신설, schedule "0 18 * * *"(UTC) = KST 03:00
  · ★안전 방어선 ⑥ 추가: 삭제 직전 verifyAllExpired로 재검사, 365일 미경과나 at 없는
    항목이 하나라도 섞이면 그 사용자를 통째로 건너뛴다(부분 삭제 금지). POST 실파기도
    같은 함수를 타게 통일 — 방어선이 한 곳에만 있으면 의미가 없다
  · CRON_SECRET 미설정 시 전원 401(빈 Bearer 매칭 방지)
- [탈퇴 정리] withdraw가 history만 지우고 originals:{uid}를 남기던 고아 문제 수리.
  경로 소유권 가드(/originals/{uid}/) 후 Blob+인덱스 삭제. payment:*는 법정 5년이라
  의도적으로 유지(주석에 근거 명시)
  · 방침 제1조 1줄 정합: "탈퇴 시 히스토리만 파기" → "삭제하거나 탈퇴하면 즉시 파기"
    — 최소보유 원칙이 1년 대기보다 낫고 분쟁 소지도 적다
- [MJ 할 일] Vercel 대시보드에 CRON_SECRET 환경변수 등록(값 미생성 — 보고 참조).
  등록 전까지 크론은 401로 아무 것도 지우지 않는다(안전 실패)

## 2026-07-26 (5차) — 개인정보처리방침 12조 전면 증보 (MEVU 대조)
- MEVU 방침을 주제 체크리스트로만 사용, 전문 자체 작성. 핵심 추가: ★국외 이전
  고지 5개사(Google·OpenAI·Replicate·Vercel·Upstash — 법 28조의8 1항 3호 처리위탁
  근거, 별도 동의 UI 불요) / 법정 보유기간 표 / 쿠키 / 권리 행사 / 파기 / 구제기관
- 역선언 2건: 광고 식별자·마케팅 SDK 미사용, 사진 AI 학습 미사용(추론 API만) —
  MEVU가 쓸 수 없는 신뢰 문구
- 코드 검증 슬롯 A~F 결과:
  A 카카오 = 회원번호+닉네임+프로필이미지+이메일 4개(httpOnly 쿠키 7일) — 전문의
    "고유번호"만 표기는 축소라 4개로 수정
  B 업로드 사진 = 생성 route에 @vercel/blob import 0건, 미저장 확정 ✓
  C 쿠키 = kakao_user 1개뿐. document.cookie·middleware 0건 — "무료 이용 횟수
    쿠키"는 실재하지 않아 문구 삭제(구 방침의 오기를 승계할 뻔)
  D 광고·분석 SDK = GA·GTM·픽셀·firebase·mixpanel·amplitude·hotjar 전부 0건.
    grep의 "clarity" 7건은 AI 프롬프트 영단어(FACE CLARITY RULE) — SDK 아님 ✓
  E 결제 저장 = orderId·amount·productId·productName·uses·paidAt. 카드번호·
    paymentKey 미저장 ✓
  F 비회원 생성물 = history/save가 kakao_user 없으면 미저장 ✓
- ★코드↔문서 격차 3건(별건 수리 대기):
  ① payment 기록 Redis TTL 1년 < 전자상거래법 5년 — 방침은 법정 5년 유지, 코드가
     미달. 만료 시 법정 보존 의무 위반 소지
  ② 유료 원본 자동 파기 없음 — purge-expired(RETENTION_DAYS 365)가 관리자 수동
     배치라 실행 안 하면 무기한. 크론 필요
  ③ 탈퇴 시 originals:{uid}·payment:* 미삭제 — history만 지운다. 방침은 사실대로
     "탈퇴 시 히스토리 파기 / 유료 원본은 보유기간 경과 시 파기"로 기술
- 미채택: 광고 플랫폼 목록·얼굴인식·푸시 마케팅·AWS/채널톡 위탁(해당 없음)

## 2026-07-26 (4차) — 약관 25조 증보(MEVU 대조 반영) + privacy 공란 확정
- MEVU 약관 전문 대조 → 주제만 채택·전면 자체 작성: 약관 외 준칙(운영정책 근거)·
  통지·미성년자 결제 법정대리인 동의·쿠폰 조항(앱 쿠폰 탭 실존인데 약관 부재
  발견)·회사 콘텐츠/지식재산(예시 사진·MOSPIC 상표 보호)·금지행위 보강(부하·
  보안·스팸·사칭)·피드백(라이트)·일반 조항
- 미채택(의도): 만 19세 제한(14+ 유지)·청약철회 전면 불가 프레임(소비자 친화
  환불 유지)·피드백 회사 귀속·사용자 콘텐츠 회사 라이선스
- privacy 시행일·공고일 7/26, 보호책임자 최민준 확정 — 두 문서 시행일 정렬
- 사업자 정보에 등록번호·전화 추가. 잔여: 통신판매업 신고번호(신고 완료 시 추가),
  상호 띄어쓰기 통일(사업자등록증 확인 대기)
- [검증] 조 번호 1~25 연속 + 본문 상호참조 4건 실측 일치(제14조/제12조/제17조/
  제10조②·제12조④) — 19조→25조 재배열로 참조가 어긋나기 쉬운 지점이라 자동 대조
- [후속] 약관 하단 사업자 정보 → 접이식(기본 접힘, 포털 푸터 관례) — 법정 상시
  표기는 설정 하단 블록이 담당, 약관 쪽은 참고 표기

## 2026-07-26 (3차) — 이용약관 전문 게시 (/terms)
- 19조+부칙: 우리 확정 정책 반영 — 코인(성공 시 차감·실패 무차감·유상 5년·
  무상 1년·양도 불가), 환불(7일 미사용 전액 + 이후 잔여 유상분 사용 공제 환불·
  마켓 정책 우선), 생성물 이용자 귀속·상업 이용 허용·홍보 무단 사용 금지·AI
  메타데이터 고지, 공적 증명 용도 제한, 금지행위(딥페이크·타인 사진), 만 14세
  미만 불가. 시행일 2026-07-26. 설정 약관 항목 연결
- MEVU 약관은 미참조(노션 JS 벽 + 타사 약관 복제 부적절) — 주제 대조는 추후
  텍스트 확보 시
- [실제 작업] /terms는 이미 존재했다(12조 초안·시행일 [__] 미기재). 신설이 아니라
  전문 교체. 설정 연결도 이미 window.location.replace("/terms")로 배선돼 있어
  2단계는 무접촉 — privacy 항목과 동일 방식
- [사업자 정보] 코드 값 그대로: 대표 최민준 / 대구광역시 달서구 성서로45길 29,
  1층 8호 (갈산동) / rnrwls159@naver.com
  ★상호 표기가 두 갈래 — 설정 하단 블록 "퍼스트 컴퍼니"(띄어쓰기) vs 법률 문서
  본문 "퍼스트컴퍼니". 약관은 privacy와 맞춰 붙여쓰기 채택. 어느 쪽이 등기 상호인지
  확인 후 한쪽으로 통일 필요(미결)
- [미결 승계] privacy의 시행일·공고일 "[__]월 [__]일" 플레이스홀더는 그대로 —
  약관만 7/26로 확정돼 두 문서의 시행일이 어긋나 있다. privacy도 채워야 함

## 2026-07-26 (2차) — ★"재실행 Cap=false" 진범 = 폰의 WebAPK (셸 무죄)
- [증상] no-store 후에도 재실행마다 Cap=false·뒤로=즉시 종료. 셸 수리 2종(오리진
  재등록 44행대·reload 보강)에도 불변 — 수리가 안 먹는 게 아니라 다른 앱이었음
- [★검거] MJ의 Logcat 캡처에서 "WebAPK Launch URL: https://mospic.com/" 발견 —
  홈 화면의 MOSPIC은 6월 PWA 설정 때 크롬이 만든 WebAPK. Android Studio ▶는 셸을
  설치·자동실행(true)하지만 이후 MJ가 열던 건 WebAPK(크롬 = Capacitor 없음 =
  false·즉시 종료). 앱 정보 "Chrome에서 다운로드됨"으로 확정
- [해결] WebAPK 제거 → 셸 단독 실측: 재실행에도 Cap=true(nav=14787B/200) 유지
- [유지 결정] 셸 방어 2종 커밋(#7454 실존 결함 방어) / 웹 no-store 유지(웹뷰 옛
  번들 캐시 실증) / 진단 배지 D1~D6 전량 철거
- [★교훈] 원격 모드 디버깅은 "웹 코드/웹뷰 캐시/셸 버전/★폰의 앱 정체(셸 vs
  WebAPK)" 4층 확인이 먼저. 같은 아이콘·같은 URL이라 화면으론 구분 불가 —
  앱 정보의 출처("Chrome에서 다운로드됨")가 리트머스지
- [파생 과제] 테스터 온보딩 안내에 "기존 홈 화면 MOSPIC 아이콘 제거" 문구(백로그)

## 2026-07-26 — ★뒤로가기 "즉시 종료" 미스터리 종결 (범인 = 옛 셸 + 웹뷰 캐시)
- [증상] 홈→상세→만들기→뒤로→뒤로 = 더블백 토스트 없이 즉시 앱 종료. 진단 배지
  D0~D3이 폰에서 전부 미표시 — 코드 예측과 정면 충돌
- [경로 소거] SPA 가로채기 가설 → 브라우저 실측으로 기각(D1·D3 표시, location.
  replace는 Next 패치 대상 아님·문서 정상 교체). bfcache → persisted=false 실측
  기각. 재연 체계·가짜 칸 → 브라우저에서 완벽 동작(state.__backClose:1 확인)
- [★범인 2중] ①웹뷰 HTTP 캐시가 옛 번들 유지(원격 모드는 앱 재시작으로 안 비워짐
  — 배지 미표시 원인) ②폰의 셸이 옛 빌드라 Capacitor 브리지 미주입(D5 Cap=false
  전 화면 확인) = BackButtonBridge 미등록 = Capacitor 기본 "무확인 즉시 종료".
  7/22 더블백 실측 통과 이후 셸이 갈렸던 것
- [해결] 캐시 삭제 + Android Studio 셸 재설치 → D5 OK(시도 1회)·재연 경로 정상
  (D1 있음·D2 backClose:1) 실측 확인
- [남긴 수리 2건] BackButtonBridge 등록 재시도(200ms×10 폴링 — 주입 지연 방어,
  ae7d126) + canGoBack=false && pathname!=="/" 시 홈 폴백(딥링크 직행 종료 결함,
  a54e7f7). 진단 배지 D0~D5·showDiagBadge는 원인 확정 후 전체 철거
- [발견·별건] 만들기 진입 직후 UploadGuide 자동 오픈이 가짜 칸 1개를 쌓아,
  뒤로 1회가 "가이드만 닫힘"이 됨 — 생성 페이지(컨셉명·BA·3단계)가 상세와 비슷해
  상세 복귀로 읽힘. UX 결정 대기: 가이드를 뒤로 대상에서 뺄지(C-1) 유지할지
- [교훈] ★원격 모드 문제 판정 시 "웹 코드/웹뷰 캐시/셸 버전" 3층을 분리해 확인할 것.
  웹 push는 즉시 반영되지만 캐시가 옛 번들을 물 수 있고, 셸은 재설치 전까지 안 갈림.
  진단 배지(화면 표시)는 logcat이 막힌 기기에서 유효한 실측 수단

## 2026-07-25 (4차) — 홈 하단 재편: 증명·비즈 승격 + 스튜디오 목차
- [채택 범위] Claude Design 매거진 시안 중 STUDIO INDEX만 이식(MJ) — 홈 전면 교체 아님
- [섹션 신설] HOME_SECTIONS 5개: 증명사진 8종·비즈니스 프로필 8종 가로 스크롤(사장님
  문법 복제, 기존 item 문자 복사 = 신규 카드 데이터 0·`all` 145 불변). 섹션 cat 필드
  신설 — 신규 2섹션 전체보기는 해당 카테고리 선택 오버레이, 기존 3섹션 동작 불변
- [목차 리스트] "무엇을 만들까요" 5줄(인생샷·헤어뷰티·반려동물·가족커플·재미추억):
  번호+이름+한줄+원형 썸네일 겹침+› — 탭=카테고리 선택 오버레이(useBackClose 상속).
  헤어뷰티는 소속 2종이라 원형 2개(메이크업 라인 출시 시 자연 충원)
- 렌더 순서: 검은 배너 → 증명 → 비즈 → 목차 → 사장님(최하단 유지). 목차는 홈 칩에서만
  노출(다른 칩=그리드 대체 — 의도된 동작)
- [보정 후속] popular cat:"hot"·bizowner cat:"biz" — 인기·사장님 전체보기가
  전체가 아닌 해당 챕터 선택 오버레이로 착지(more는 전체 유지 의도)

## 2026-07-25 (3차 보강) — 업로드 가이드 마감
- [pet 교체 11d9890] 피할 예 2장 실사(흔들림·뒷모습·같은 시바) — 27장 전량 실사,
  훼손 가공 잔재 0
- [시각 마킹 7a23ec9] good ✓초록 / bad ✕빨강 뱃지 + bad 어둠·대각 X 오버레이(CSS만,
  사진 무접촉), 캡션 색 분리, 기존 필 (7,7)→(34,10) 이동, "빨간 X 금지" 옛 주석 방침
  갱신. MJ 폰 검수 통과 — 가이드 라운드 종료

## 2026-07-25 (3차) — 업로드 가이드 전면 재설계(시트 9종 · 사진 27장 · generic 소멸)
- [문제] 12장짜리 사진 한 벌(generic)이 143곳에 광역 배선돼 있었다 — 인물 컨셉
  19곳에서 "음식 사진"이 예시로 떴다. 시트 구분이 solo_face·generic 둘뿐이라
  자동차·부동산·복원이 전부 같은 안내를 보고 있었던 게 근본 원인
- [시트 9종 재편 UploadGuide.tsx] solo_face / portrait_multi / family / pet /
  food_drink / product_obj / space / vehicle / old_photo
  · 캡션·checks·avoid를 시트마다 새로 씀 — 그 컨셉이 실제로 겪는 실패를 적는다
    (역광 / 플래시 반사 / 차가 잘림 / 액자 유리 반사광 / 한쪽 벽만 좁게)
  · ★portrait_multi는 "여러 명이 함께"를 피하라고 하면 안 된다(2인 정식 지원)
  · ★family는 반대로 "각자 따로 한 장씩" — 입력 방식 자체가 다르다
  · old_photo는 입력이 "옛날 사진을 찍거나 스캔한 것"이라 규칙이 완전히 별종
- [사진 27장] 좋은 예 1 + 피할 예 2 × 9시트. ★훼손 합성 폐기 — 예전엔 좋은 사진
  하나를 어둡게·흐리게 만들어 피할 예를 찍어냈는데, 실사용자가 겪는 실패를 못 보여준다.
  이제 전부 실제로 그렇게 찍힌 사진. scripts/guide-prep.mjs는 변환만 한다
  (600×800 3:4 webp q85 / 사람·동물 = 피사체 가중 크롭, 사물·공간 = 중앙 크롭)
  · 총 1.30MB · 평균 49KB · 최대 128KB(space-2)
- [배선 143곳 → 9종 분산] 1차 18종 generic→solo_face(44bdc7f) → 시트 9종 코드(87e6b62)
  → 2차 11종 재배선+사진(e598c36): food·menu·homecafe→food_drink /
  product·goods·nukki→product_obj / interior·realestate·factory→space /
  car→vehicle / restore→old_photo
  · 최종 집계 solo_face 99 · pet 12 · family 11 · portrait_multi 10 ·
    food_drink 3 · product_obj 3 · space 3 · old_photo 1 · vehicle 1 = 143 (generic 0)
  · generic-*.webp 3장 제거. generic 키는 미상정 type의 안전망으로만 남아 food_drink를 가리킴
- 커밋 메시지: feat: 업로드 가이드 2단계 — 전 시트 전용 사진 + 잔여 11곳 재배선(generic 0)
  / docs: WORKLOG 07-25 3차 — 업로드 가이드 전면 재설계
- 다음에 할 것: 폰에서 9시트 실물 검수(캡션 줄바꿈·캐러셀 스크롤·사진 크롭) /
  pet-2·3 GPT 소재 도착 시 같은 파일명으로 덮어쓰기만 하면 됨(코드 변경 0)
- 주의/메모: ★사진 원본(png/jpg)은 리포에 넣지 않는다 — C:\mospic-app\tmp\guide-src에
  두고 guide-prep으로 변환한 webp만 커밋. ★UploadGuide의 cardsFor(null, ...)은
  회색 자리표시를 뜻한다(사진 없는 시트를 배선해도 깨진 이미지가 안 뜬다) — 현재 0곳

## 2026-07-25 (2차) — 홈 리디자인 라운드 마감 + 업로드 가이드 리디자인
- [칩 3역할 분리 e0abfec] "홈" 칩 신설(랜딩·기본 선택·최초 진입 기본값) / "전체"=전량
  그리드 / "인기"(value "hot")=POPULAR_KEYS 20종 상수(idblack·idnavy·biznavy·bizgray·
  lifeshot·y2k·luxe·idol·travel·couple·friend·family·petstudio·petcostume·clay·figure·
  roman·wedding·graduation·hairstyle — 실키 검증 완료, 교체는 배열만). 부수 수리:
  즐겨찾기 복원 인덱스 0→1, 전체보기 오버레이 홈 칩 숨김, 오버레이 인기도 POPULAR_KEYS 통일
- [칩 위치 왕복] 히어로 아래 이동(8140d02) → MJ 요청 원복(595601d) — 히어로가 home 칩
  전용이라 다른 칩에서 칩이 점프하던 문제가 원위치 복귀로 구조적 해소
- [히어로 ebaef0e→b85eccd] HERO_SLIDES 상수(id/title/subtitle/image/objectPosition/go)
  + 5초 자동 순환(HERO_INTERVAL_MS) + ★클론 무한 루프(마지막→클론 smooth → 2px 스냅
  확인 후 auto로 1번 순간 점프 — 되감기 스윕 제거) + 타이머 정지(홈 칩 아님·홈 탭 아님·
  document.hidden·1장 이하) + 수동 스와이프 시 리셋. 6장 확정: ①hero_main "셀카 한 장이"
  ②hero_biz — 카피 교체 "첫인상은\n프로필 사진에서" ③luxe ④petstudio(shiba)
  ⑤couple(cp_애프터1) ⑥food "사장님, 사진이 매출입니다"
  ★실측 규격: 표시 최대 480×270(16:9)·소재 960×540 webp q88·안전영역 = 가운데 81%
  (390px 폰 좌우 45px 잘림) — 안전영역 검수에서 couple 남성 얼굴 걸침·corgi 귀 아슬 발견,
  cp_애프터1·shiba로 교체 후 통과. scripts/hero-prep.mjs 분리(ba-prep과 규격 상이)
- [코인 카드 제거 13851a6] MJ 요청 — 홈 랜딩 "내 코인/충전·내역" 블록 + 전용 fetch 제거
  (홈 진입 API 1회 절감). ★트레이드오프: 비로그인 웰컴 3코인 안내가 홈 첫 화면에서 소멸
  (잔여: 코인 탭·402 시트) — 전환 아쉬우면 히어로 슬라이드 1장을 웰컴 안내로 부활 후보
- [업로드 가이드 29fd759] "생성 전에 확인해 주세요" 창을 MJ의 Claude Design 시안대로
  바텀시트 리디자인 — radius 22·드래그 핸들·×, 3:4 카드 132px 예시
- [가이드 예시 사진 3beaf3c] 4종 시트(증명·음식·펫·커플) × 3장(좋은 예 1 + 피할 예 2)
  = 12장 webp — 킷 비포 재가공, scripts/guide-prep.mjs 분리, UploadGuide 연결.
  ★폰 검수 대기: 좋은 예가 "입력용 셀카"로 보이는지 / 피할 예 2장이 132px에서
  한눈에 나쁘게 보이는지

## 2026-07-25 — CS 인프라 3종(관리자 조회·고아 정리·만료 퍼지) + 로고 홈 복귀
- [★관리자 도구 8ab7896] 출시 후 "사진이 없어졌어요" CS 대응 인프라 — 홈에 링크 없음,
  ★URL 직접 접근: mospic.com/admin (카카오 ID 입력 → 코인 잔액·coinlog·히스토리 개수·
  최근 20·원본 개수·만료일)
  · GET /api/admin/user?uid= (읽기 전용, 쓰기 함수 0)
  · POST /api/admin/cleanup-orphans {uid} — LTRIM 501번째부터 발생하는 고아 Blob 정리
    (인덱스에 없는 history/{uid}/ 파일만, originals/는 조회조차 안 함)
  · POST /api/admin/purge-expired {uid} 또는 {all:true} — 유료 원본 365일 초과 파기
    (privacy 3조 5항 대응)
  · ★삭제 API 2종은 dryRun 기본 — body에 confirm:"DELETE" 없으면 목록만 반환
  · env COIN_ADMIN_IDS=4920083346 (Vercel Production·Preview, Sensitive OFF) —
    ★미설정 시 전원 거부(열림이 아니라 잠김으로 실패)
- [발견·수리] chargeAllowed 재사용 불가 판정 — COIN_CHARGE_OPEN=true를 켜는 순간
  개인정보 API가 함께 열리는 구조였음 → 별도 엄격 게이트 checkAdmin 신설
- [안전장치 12종] 대표: 인덱스 읽기 실패 시 즉시 중단(전량 삭제 방지) / 인덱스 0 + Blob>0이면
  삭제 거부(유실 시 사진 전멸 방지) / all:true는 dryRun만 / at 없는 원본은 미판정 보존 /
  화면에 삭제 버튼 없음 / 모든 접근 [ADMIN] 로깅
- [실측] 시크릿 창 → "로그인이 필요해요"로 차단 확인(데이터 0바이트 노출)
- [로고 홈 복귀 5b9ebe3] 워드마크 클릭 → 홈 랜딩 복귀. ★핵심: 오버레이를 state로 하나씩
  닫으면 정리자가 같은 틱에 back()을 N번 쏴 가드 불균형(07-22 앱 종료 버그) →
  history.go(-N) 단일 점프로 훅의 "점프 대응" 경로 사용, popstate 1회로 역순 전체 정리.
  워드마크는 홈 헤더 1곳뿐(컨셉 페이지의 MOSPIC 149건은 전부 공유 문구)
- [운영 정책 정리] 로그인=클라우드 히스토리 축소본 1000px 최대 500개 / 유료 원본 1년 /
  비로그인=기기 내부만. 폰 교체·재설치는 카카오 로그인으로 복원 가능, 직접 삭제·비로그인
  생성·500개 초과분은 복구 불가
- 다음: [MJ] Play Console 본인확인(주소 증빙 서류 확보 — KB 명세서에 주소 미표시,
  통신사 청구서 청구지 변경 검토 중) / Android 기기 인증(Play Console 폰 앱 로그인) /
  스크린샷 8장
- [★결제 정합성 감사] MJ 우려("코인을 더 많이/더 적게 주면 안 된다") 전수 감사 결과:
  · 더 많이 주는 경로 = ✅ 이미 3중 방어 — 서버가 product.coins만 사용(클라는 coins를
    보내지도 않음) / amount를 product.price와 검증 / 그 금액으로 토스 재승인.
    중복은 멱등 2단(GET+parse → SET NX)과 INCRBY 원자성으로 차단
  · 구멍은 전부 "결제됐는데 적립 안 됨" 방향(전부 사용자 손해): (A)결제 후 완전 이탈
    (B)charge 중 오류 (F)Redis 장애 (D)coinlog 유실 (H)orderId 소유권 미검증
- [수리 dc3c6b0] ①order:{id} 값을 영수증 객체로({uid,provider,productId,coins,amount,
  at,status}) — 사후 감사·보정의 전제. ★하위호환 파서 6케이스 실측(옛 문자열 키도
  "처리된 주문"으로 인식 → 과거 결제 중복 적립 0) ②success 실패 화면 재시도 UI —
  ★예전엔 유일 버튼 "홈으로"가 URL 파라미터를 날려 영구 미적립을 만들던 구조 → 재시도·
  문의(orderId 프리필) 앞세우고 홈은 약한 텍스트로 강등 ③POST /api/admin/grant-coins
  (dryRun 기본·confirm:"GRANT"·orderId 중복보정 409 차단·[ADMIN] 로깅·화면 버튼 없음)
- [판단] 토스용 웹훅·2단계 커밋 같은 큰 인프라는 짓지 않음 — charge는 관리자 게이트 뒤라
  실사용자 노출 0이고, IAP 전환 시 구글이 복구 수단을 기본 제공(구매복원·RTDN/웹훅·
  ★미확인 시 자동 환불 = "돈만 나가고 코인 없음"이 구조적으로 불가능)
- [IAP 필수 설계 5종 메모리 기록] 웹훅 주도 적립 / restorePurchases 회수 /
  영수증 서버 검증 / acknowledge·consume 처리 / 환불·차지백 시 코인 회수 정책

## 2026-07-23 — ★Play 계정 전략 전환: 조직 → 개인 (DUNS 병목 폐기)
- [배경] 조직 계정 = DUNS 필수인데 발급 경로가 전부 막힘: 애플 무료 창구는 계정 생성
  전화인증 일시잠금 → 애플뮤직 경유로 계정은 만들었으나 개발자 사이트가 2FA 요구 →
  2FA 설정에서 "알 수 없는 오류" / D&B 직접(dnb.com)은 한국 접속 시 NICE디앤비로
  자동 리다이렉트 / NICE디앤비 신규 발급 50만원(배제)
- [★공식 문서 확인] Play Console 계정 유형: "개인 및 조직 계정은 동일한 기능에 액세스,
  결제 프로필로 수익 창출 가능" — 커뮤니티발 "개인사업자+조직=정산 불가" 경고는
  공식 근거 없음. 조직 필수 카테고리는 금융·건강·VPN·정부 4종뿐 → MOSPIC 해당 없음
- [★MJ 결정] 개인 계정 — 근거: ①DUNS 대기(불확실) 대신 14일(확정) ②개인→조직 전환은
  가능, 조직→개인은 불가(되돌릴 수 있는 쪽) ③14일 테스트가 실사용 피드백 기간도 됨
- [새 과제] 비공개 테스트: 테스터 12명 이상 × 최근 14일 연속 참여 → 프로덕션 액세스 신청
  → 구글 검토(~7일). 테스터는 구글 계정(@gmail) 보유자. ★거절 시 12명×14일 처음부터 재시작
- [주의] 개인 계정도 법적 이름·주소·이메일·전화가 스토어 공개 — 개발자 표시명은 별도
  지정 가능(MOSPIC), 주소는 사업장 주소 사용 시도
- [폐기] DUNS 관련 과제·애플 계정 트랙 전부 종료(백로그에서 제거). 단 향후 iOS 출시나
  조직 전환 시 재등장 가능
- 다음: 계정 생성($25·신원확인·Play Console 앱 기기인증) → 앱 등록 → 비공개 테스트
  트랙 + 테스터 12명 초대 → 14일 → 프로덕션 신청

## 2026-07-22 — ★뒤로가기 대장정 종결 ("두 번 실패" 기능, 진단부터 다시 해서 완치)
- [진단이 전부] 증상만 보고 두 번 땜질 실패 → 변경 0 전수 진단: 표준 훅(useBackClose)은
  125곳 완비·정교했고 진짜 구멍은 ①하단 탭 미연동 ②셸 backButton 리스너 부재 둘뿐
- [탭 편입 35c9d19] useBackClose(activeTab!=="home") 1줄 — 코인·히스토리 탭 뒤로=홈 복귀
  (예전엔 앱 종료). 깊이 태그 = 등록순 아닌 "열린 시점 순"이라 겹침 순서 자동 보장
- [셸 더블백 a16e668 / 셸 7b4be71] @capacitor/app 8.1.1 + BackButtonBridge —
  canGoBack→history.back() 위임 / false→"한 번 더 누르면 종료됩니다"(MJ 확정). 실기기 통과
- [(C) 재연 체계] 만들기 진입 replace가 상세 가짜 칸을 덮는 건 의도된 설계(잔여 칸 제거)
  → 뒤로=홈 착지를 수용하되 sessionStorage 컨텍스트(1회 소비)로 착지한 홈이 직전 화면
  (상세+전체보기/⭐칩)을 재연 — 진입 공통 1곳+홈 복원 1곳, 121개 체인 무접촉
- [보정 5건] ①상세를 전체보기 위 겹침(1414행 1줄+zIndex 130→136) ②홈 pill이 인라인
  컴포넌트 state라 리마운트마다 리셋되던 기존 버그 → 모듈 미러 지속화 ③깜빡임 근본 =
  MPA 서버 페인트가 하이드레이션 전 노출 → body 최상단 프리하이드레이션 인라인 가드
  (ctx peek만·커버·1200ms 백스톱) ④all 경로 유령 칸 충돌 → replaceState 중화
  ⑤확산 안전: soon 제외 + CONCEPTS 직조회(conceptForGo는 soon 폴백이라 실패 감지 불가)
- [확산 592d4e6] y2k 파일럿 → 전 컨셉(baby·soon 제외), 표본 실측 ✓
- [아기얼굴 01f8f95] "뒤로 2번=앱 종료"는 7/15부터 있던 같은 틱 닫힘+열림 경합(blame 확증)
  이 셸 리스너로 표면화 → 역순서 틱 분리(pushState 동기 선행)로 종료 버그 해소.
  만들기 뒤로=홈(상세 생략)은 유령 칸 구조상 수용 — ★MJ 결정: 아기얼굴은 추후
  라우트형 전환 예정(백로그)이라 무시, 전환 시 표준 자동 상속
- [게이트 강화 — 사고 1건 투명 기록] JSX 주석 파스 에러 커밋이 grep 오판으로 push(521a3fa,
  Vercel 미배포라 라이브 노출 0) → 핫픽스 + ★게이트를 "Compiled successfully 존재
  명시 확인"으로 교체
- ★훅 일반 규칙 명문화: 오버레이 닫힘+열림 같은 틱 금지(닫힘 back()은 비동기라 새 칸을 잡아먹음)

## 2026-07-21 — ★MOSPIC 상표 출원 완료 (출원번호 40-2026-0147433)
- 2주 묵은 서명 블로킹 당일 완주: 진범 = 공동인증서 만료(작년 스너글미 출원 성공으로
  역추정) → 국민은행 무료 재발급(만료 2027-02-11) → 특허로 인증서 사용등록 갱신
- 7월 초 임시저장 소실 → 기록 기반 재작성: 출원인 최민준(개인) / 42류 지정상품 12개
  (SaaS·AIaaS·이미지처리·사진 전자보관·클라우드 — 10개 초과 가산 +4,000) / 일반상표,
  견본 "MOSPIC/모스픽" 결합 / 합계 50,000원
- MJ 결정: 9류 미포함(필요시 추후 별도) / KIPRIS 선행검색 MOSPIC·모스픽 0건 확인 후 제출
- 접수 2026.07.21 → 납부확인증 발급 확인(농협 이체, 시스템 반영 ✓) — 접수 시점부터
  선출원 지위, 스토어 출시 전 브랜드 선점 완료
- 이후: 심사 ~1년(통지서 오면 대응) / 등록결정 시 등록료 별도 / [미수신통지서 1건]은
  스너글미 거절서 추정 — 확인 대기

## 2026-07-21 — 2인 라인 10종 구축 완주 (신규 라인 하나가 하루 만에)
- 한 일:
  - [엔진 검증] 나노바나나 Pro 2인 실측 통과·3인 이상 금지 확정 / Pro 단가 $0.134~0.24 → 코인 3~4개 프리미엄 근거
  - [TWOSHOT_CORE v2 확정] 편집 프레임+스몰페이스 10%·눈코 잠금+메이크업 스킨(점0)+GENDER LOCK+AGE LAW+HAIR IDENTITY LAW+스톡페이스 가드 — couple route가 기준 원본(수정 시 couple→재이식)
  - [실측 법칙] 성별 스왑→성별 칩 필수화 / 한복 딴사람 사건→머리 실루엣=닮음 축 발견(HAIR LAW) / Cowork 검증 루프 채택 4건 이식
  - [인프라] 9e2dcc7 파일럿(2슬롯·성별칩·Pro)→80a07bd 다이얼 중간 복원+타임아웃 150s→d6d23af 클라 145s 동기화(사슬 145>140>150, Fluid enabled) — 실측 33초대
  - [배선] f6ddba8 Wave1 표준 6종 / 3a988d6 CORE v2 7종 전파 / b05a476 Wave2 특수 3종(여행 4씬·펫 3슬롯·네컷) — Pro 10종 체제
  - [킷·연결] 킷 10종 발송(네컷 폐기→9종) / d35672b 상세·썸네일 18webp 일괄 연결(56→6.2MB) / e7f8022 생성 화면 표준 13요소 완전체+코인 게이트 앵커 편입
  - [동면] 네컷 3형제(fourcut·fourcutillust·fourcutcouple) 홈 숨김 — 스트립 품질 검증 후 복귀
- 다음에 할 것: 폰 검증 → 1인 라운드2 킷 사진 7종(MJ) → goods 실측 → BA_LIVE 확산 후보(81→90종, OneDrive 소재 확보) → 안경 위험군 3종 검증 → 수능 시즌(9월 초 착수) → 배포 시점에 Vercel Pro+코인 정책
- 주의/메모: 2인 공식 수정은 couple 한 곳→9종 재이식 / 2인 킷 비포="각자 셀카 2장" 문법 / 예시 이미지 webp q82·800px / Hobby 약관=비상업 전용(IAP 전 Pro 전환 필수)

## 2026-07-20 (밤) — ★비포/애프터 라이브 시스템: 하루 만에 0→54종 106쌍
- [배치 교정] 최초 상세 오버레이 배치 → MJ 정정 "만들기 화면의 결과 예시 자리" →
  이설(1cef98d). ★조사 발견: 결과 예시 = PreviewCard 단일 표준 112페이지(A=상세webp
  16:10 뭉갬 크롭 / B=이모지 placeholder) — BA가 명백한 상위호환 + perl 벌크 성립 근거
- [컴포넌트 bf2ab9c→09b4c66] BeforeAfterHero: MJ 판정 "대형 창은 시선을 뺏어 전환 저해"
  → 컴팩트 개편 — PreviewCard 풋프린트(16:10), 좌 Before | 우 After 50:50 분할(한눈 대비),
  쌍 2개+면 3초 크로스페이드 순환·1쌍 정지, 프리로드 검증·깨진 쌍 제외·무변화 폴백.
  ★단일 교체 지점 2호 증명(1파일 = 전 지면 일괄, AdBanner에 이어)
- [자산 공정] scripts/ba-prep.mjs — 768×1024 webp q85, attention 크롭 + @center 폴백
  (스니커즈 앞코 사례) + 투명 PNG 흰 flatten(누끼 컷). BA_LIVE 상수 = 확산 단일 지점.
  ★OneDrive 킷 소재 지도: 쌍완비 75종 / 애프터만 5종 / 소재없음 15종(2인 라인 등)
- [1차 41f1390] 7종 17쌍 — ★restore 함정: 폴더 비포N↔애프터N이 갤러리용 딴 사진 →
  가짜 쌍 2 폐기, POINT 진짜 쌍만. bizmnavy 소재 없어 제외(나쁜 쌍보다 빈 자리)
- [2차 da77167] 47종 89쌍 — 파일명 6패턴 자동 매핑 + 컨셉당 검수 시트 눈검사(시트 6장,
  이상 0). 제외 8: 패턴 미해당 5(수동 검토 대기: idglasses·bizknit·bizribbon·bizblack·
  bizwhite) + idol 오포함 + 1차 완료 2
- ★교훈: 킷 폴더의 번호 매칭은 쌍 보장이 아님 — 쌍별 시각 검수가 필수 게이트
- 남은 BA: 수동 검토 5종 / 표준형 22종·특수 계열(쌍 완비 — 3차 후보) / 소재 없음
  15종(컨셉 대화 생산과 연계)
- [품질 표준화 99ff861] MJ 3관찰(얼굴 이탈·미적용·쌍 수 들쭉) 일괄 해소 —
  ①크롭 교정: 원인 = 3:4 자산이 반폭 4:5 창 cover에서 상하 재크롭 → 768×960(4:5)로
  전량 재생성, 인물 attention/사물 center 정책 분리, ba-prep 규격도 갱신
  ②쌍 표준화: "1쌍" 5종의 진범 = 여성 B세트 파일명(id_model_woman_b_N) 매퍼 누락 →
  전부 2쌍 승격. 1쌍 예외 = restore뿐(진짜 쌍이 하나). 초과 소재는 대표 3쌍 선별
  ③3차 확산 27종 전부 성사(제외 0) — 칩형(halloween·job·era·sporty·hairstyle)도 시트 실증
- ★총 81종 192쌍 라이브(3쌍 31·2쌍 49·1쌍 1) / 시트 11장 통과 / 자산 384파일 3자 일치.
  잔여 = 수동 검토 5 + 소재 없음 ~15(2인 라인 등 — 컨셉 생산 연계) + 애프터만 5
- [로고 교체] 앱 아이콘 하트-M → M 모노그램(흰 M·검정 타일, MJ 확정 — Claude Design
  시안 C방향) — PWA·파비콘·셸 어댑티브·스플래시 일괄 재생성. 워드마크(logo.png·og·피처)는
  별개 자산 유지, 카카오 동의화면 아이콘은 MJ 수동 재업로드
  → MJ 실측 완료: 앱서랍·스플래시(흰 배경+검정 타일)·파비콘·카카오 동의화면 전부 교체
  확인 + 폰 재설치 겸 누끼 자정 리셋 실측·BA 표본(얼굴 중앙·신규 확산) 통과.
  ★잔여 브랜드 자산(다음 라운드 후보): 워드마크 logo.png·홈 헤더·og.png·feature-graphic
  — 검정 타일 M 문법으로 재제작 시 Claude Design 프롬프트부터

## 2026-07-20 — 리디자인 9종 라운드 마감 (6월 유산 정리 종료)
- 한 일:
  - [스킬 개정] mospic-detail-page-prompt: "커피 한 잔 값" 등 특정 가격대 암시 비유 금지 명문화 → "합리적인 가격·부담 없는 가격" 표준 (컨셉별 가격이 달라 커피 앵커가 역효과)
  - [킷 9종 발송] product(NO-TOUCH 신뢰 킬러)·menu(6스타일 그리드+정직보정)·interior(원본1+6무드 그리드)·restore(얼굴 그대로 킬러+부모님 선물 소구+어르신 가독 36px)·age(인생 타임라인 2줄 킬러)·nukki(투명 PNG 체커보드 실연, "3초"→"단 몇 초" 완화)·upscale(★"0원·무료" 문구 전면 해제+저화질 비포 그림판 자가제작 공정)·figure(4대상 그리드+"실물 아님" 고지, O2O 복선)·illust(인원수 보존 킬러 "넷이면 넷") — 전량 기존 사진 재활용, AI 생성 0회
  - [8종 교체] 8531764: webp q88, 52MB→6.3MB. restore 세로 16,383px = WebP 한계 → fit-inside 처리. 커밋 메시지 실제(8종)에 맞게 조정
  - [interior] 기존 디자인 유지 확정 — webp git 복구로 라이브 무손상, 신규 교체 취소
  - [원료 정리] 111411f: 초기 시절부터 tracked였던 원료 PNG 9개 git rm — repo 약 57MB 절감
- 다음에 할 것: 폰 검증(★upscale "0원" 소멸 = 코인 스위치 전 시한폭탄 해제 / nukki 체커보드 투명 / restore 장문 화질) → 기존 17종 상세 커피 문구 교체(낮은 우선순위 백로그) → goods 실측 → 가족사진 2단 파이프라인 검증(Claude 브리핑 1단) → 수능 시즌(10월)
- 주의/메모: 리디자인 루틴 = 같은 파일명 webp 덮어넣기(코드 0). WebP 세로 한계 16,383px(초과 시 fit-inside). 원료 PNG는 커밋 전 삭제가 표준 — legacy tracked 원료는 이번에 전량 정리 완료. 상세페이지 신기준 = 풀블리드 히어로·카드형 가격표·컨셉별 시그니처 색감(그라파이트/로스티드브라운/그레이지/마호가니/트와일라잇/체커보드/실버/월넛/테라코타)

## 2026-07-20 — 코인 시스템 사용자 대면 완성 + 저장 어휘 교훈
- [히스토리 저장 통합 2080736] "원본 저장" 버튼 폐기 — ★교훈: 사용자 어휘에서 "원본"은
  "더 좋은 화질"로 읽힘(MJ 지적). 저장하기 하나가 항상 최고 화질(originalUrl ?? src),
  화질 사다리는 히스토리 4K 버튼이 담당. upscale route는 무변경(Replicate가 공개 URL
  직접 수용 — 바디 경량화 덤)
- [홈 코인 카드 e018351] 무료체험 카드 자리 교체 — 비로그인 "웰컴 3개" 유도 /
  로그인 "내 코인 🪙 N + 충전·내역 ›"(0도 표시). usage·FREE_LIMIT 로직은 무접촉
  (스위치 날 폐기 목록)
- [충전 입구 개방] 지갑 충전하기 전원 노출 — canCharge=false면 상품 톤다운 +
  "충전은 앱 정식 출시와 함께 열려요 🚀"(402 시트와 문구 통일) = 가격표 40% 사전 노출
  마케팅 + 정직 게이트. ★COIN_ADMIN_IDS는 미설정 상태 유지(토스 스킵으로 불필요) —
  현재 전원이 출시 대기 화면을 봄
- [★정책 v2] 4K·누끼 = 무료+로그인+1인 하루 5회(KST 자정 리셋, free:{key}:{uid}:{date}
  INCR 서버 강제) — 익명 무제한이던 실비 누수 차단. withDailyFree 래퍼 신설(withCoin
  자매 — 로그인·inflight 공유, 차감·원본 미적용). 홈 썸네일 좌상단 '무료' 뱃지(coinCost 0
  기준). ★스위치 전 첫 라이브 동작 변경: 이 2종은 즉시 로그인 필요
- [광고 슬롯 90d5bb4] AdBanner 공용(76px 비즈보드형, hero_biz+STUDIO 카피 하우스, AD 칩,
  탭→홈) — 누끼·업스케일 업로드/결과 4지면. 실광고 전환 = AdBanner 1파일 교체(후보 AdFit
  웹배너). ★유료 컨셉 화면 광고 금지 원칙(주석 명문화) / ★Play 메모: 하우스는 '광고 포함'
  신고 불요, 실광고 붙이는 날 신고 필수
- [배너 단색화 d94bfa6] AdBanner 하우스 배경 → 홈 단색 #FAFAF8 + 헤어라인(텍스트 명암
  반전) — 단일 교체 지점 설계 첫 증명(1파일 수정 = 4지면 일괄 반영)
- [코인 비주얼 b624711] 🪙 이모지 6곳 전폐 → CoinIcon SVG(로고 코랄→민트 + 조리개 6엽,
  14px 가독) + 지갑 폴리시(잔액 카드·내역 아이콘칩·핑크 1곳 원칙) — 스위치 날 120개
  버튼 뱃지 일관 확산 준비. ★앱 아이콘은 Claude Design 시안 보드(A정제/B축약/C모노그램/
  D반전) 진행 — 확정 시 셸 자산·카카오·og·피처그래픽 일괄 재생성 파이프라인 예정
- ★코드 큐 소진 — 남은 전부가 MJ 손 4건(DUNS·스크린샷 8장·통판 신고·카카오 키) 뒤:
  IAP configure → 상품 등록 → 벌크 스위치 → 제출

## 2026-07-19 — ★코인 3원칙 완성: 유료 원본 1년 보관 (MJ 확정)
- [정책 확정] 유료 원본 보존 기간 = 1년 (프라이버시·비용 상한·약관 명확성) —
  privacy 명문화 완료, 만료 퍼지 배치는 여유 과제(유료 누적 후 1년 내)
- [파일럿 9c5fb17] withCoin 성공 경로: ledgerId(차감↔원본 감사 연결) → 병렬 put
  originals/{uid}/ (3초 타임아웃, 실패해도 생성·차감 유지) → originals:{uid} 서버 인덱스
  (클라 사망에도 소실 0) → 응답 originalUrls → 히스토리 관통 → 크게보기 "원본 저장" 버튼.
  0코인·비 gated 자동 배제. 4K·누끼 제외(0코인 + 즉시 기기 전달이라 소실 시나리오 없음)
- [삭제 정합] 개별 삭제 시 원본 Blob·인덱스 동반 삭제 + 전체삭제 확장 — "삭제 시 즉시
  파기" 약관 문구와 코드 일치
- [정합 수리] privacy 3항 '서버 미보관'은 클라우드 히스토리 도입 이후 실태와 상충된
  잠복 문구 → 5항 신설로 표면화 → 실태 반영 문구로 교체 (자기모순 해소)
- [실측 완결] 원본 풀 루프(생성→차감→보존→원본 저장→4K→삭제 즉시 파기) MJ 실측 + 파기
  감사 0건 — 코인 3원칙 실측 완료
- ★코인 3원칙(로그인·원본 보존·실패 무차감) 전부 구현 — 남은 건 스위치와 IAP 레일뿐

## 2026-07-18 (4차) — ★스위치 킷 완결 (travel에 4조각 집결) + 스토어 리스팅 완성
- [스토어 자산] STORE-LISTING.md(리스팅·Data safety·등급 설문·스크린샷 목록 8장) +
  feature-graphic.png 1024×500 (302a1c0) → 수치 실측 보정: 노출 116 컨셉(증명 31·비즈 34·
  화보변신 34·사장님 8·펫 4·추억 3·유틸 2), "110개 이상" 보수 표기, 40% 할인 줄 갱신
  필수 주석 (8afadf2)
- [402 충전 유도 시트] 전역 CoinNeededSheet(Toast 패턴·layout 마운트) — 필요/보유 +
  상품 3종(취소선·런칭가·뱃지) + canCharge 서버 판정(false="충전은 곧 열릴 예정"+지갑 이동) +
  useBackClose. travel 402 분기 파일럿 (1971feb) → 실측 통과(잔액 1 하향은 사전 승인 절차,
  예상 13≠실제 3 편차를 목표 기준 자가 조정 — admin-test-402)
- [코인 뱃지+즉시 체크] concepts.ts coinCost 전 118블록(3코인 51·9코인 65·0코인 2 —
  단가표 정합, idstyle=블록 없는 레거시 URL 전용 확인) + ★LIVE_COIN_CONCEPTS=["travel"]
  단일 전환 지점 + travel 버튼 "🪙 3" + 잔액 캐시 즉시 부족 체크(서버 왕복 제거, 402는
  백스톱) (8890710)
- [기록] "만들기 → 잔액 확인 402 = Gemini 호출 전 차단 = API 비용 0" (MJ 질문 답)
- ★스위치 날 공정 확정: route 벌크(withCoin) + page 벌크(402 분기+뱃지+즉시체크) +
  LIVE_COIN_CONCEPTS 확장 — 세 방이면 120종 전환
- 다음: 유료 원본 Blob 영구 저장 조사(코인 3원칙 마지막 미구현) / [MJ] DUNS·스크린샷 8장

## 2026-07-18 (3차) — id-photo 폐기 + 릴리즈 서명·AAB 첫 빌드 + RevenueCat 실측 = ★기술 미확인 0
- [id-photo 폐기] 3장화(5bc69cc) 직후 MJ 결정으로 컨셉 제거(cbf83d9) — 스타일드 증명
  32종 단일 체계로 통일. 배선 6곳+고아 자산 5개 제거, 배너는 이미 스타일드 연결이라
  재배선 0. 단가표 정정: 9코인 65종, 총 120 route
- [업로드 키+AAB] (셸 449956e) keytool 업로드 키(CN=MOSPIC, RSA2048, ~2053) →
  keystore.properties 분리+gitignore(*.jks) / build.gradle 조건부 서명 /
  gradlew bundleRelease 성공 — app-release.aab 3.9MB, 서명 주체 검증 ✓.
  ★MJ 3중 백업 완료(USB+개인 클라우드). ★함정 발견: "Hello G.BOX" 프로필 경로가
  Java 루프백 소켓 생성까지 파괴 — _JAVA_OPTIONS로 temp를 C:/mospic-app/tmp로 우회
- [RevenueCat] (셸 e34b4bb) purchases-capacitor 13.2.3(core>=8 요구, 8.4.2 호환 ✓)
  설치 → CDP 실측: window.Capacitor.Plugins.Purchases 전역 노출 ✓(메서드 25종) →
  셸 브리지 코드 불필요. IAP는 웹 lib/purchases.ts 헬퍼(관례: 전역 호출+지역 타입,
  @capacitor 웹 미설치)만. configure/API 키는 DUNS·계정 개설 후
- ★기술 미확인 리스크 0 — 남은 대기줄 = DUNS(MJ 손, 미착수)
- 다음: 스토어 자산(피처 그래픽·리스팅 문구·Data safety 초안 = STORE-LISTING.md) /
  402 충전 시트 UX / [MJ] DUNS 신청

## 2026-07-18 (2차) — ★코인 단가표 100% 확정 (MJ 검수 완료)
- 단가 원칙: 코인 = 출력 장수 × 3 / 1코인 = 500원 정가 / 런칭 40% 할인
- 3코인(1장, 정가 1,500·런칭 900) = 52종: 일반 50 + 홈 아기얼굴(generate — 구 FREE_LIMIT
  폐기, 웰컴 코인으로 대체) + 펫관상(petreceipt — ★사진 기반 리뉴얼 예정(MJ 선언),
  가격은 리뉴얼 전후 동일이라 선확정)
- 9코인(3장, 정가 4,500·런칭 2,700) = 66종: 증명 31 + 비즈 34 + ★id-photo(1장→3장 통일
  확정, 독립 병렬 3회 — 별도 커밋 참조)
- 0코인(무료+로그인 — 스위치 날 0코인 래퍼로 로그인·악용 방어만) = 2종: upscale 4K
  (회당 3~4원 = 마케팅비, "4K 무료" 셀링포인트) + nukki 누끼
- 체계 밖(비부과): validate-photo
- ★적용 시점: 스위치 날(IAP 개통)까지 라이브 동작 무변경. id-photo 3장화만 즉시 반영
  (과금 무관 상품 개선)
- 백로그: 펫관상 사진 기반 리뉴얼(컨셉 대화 몫) / 즐겨찾기 로그인 동기화 / 히스토리 뷰 4K
- (정정) id-photo는 3장화 직후 컨셉 자체 폐기(MJ — 스타일드 32종 체계와 달라 혼란)
  → 9코인 그룹 66→65종, 총 120 route

## 2026-07-18 — 스토어 요건 2건 마감 + UX 배치 7건 (판단 최소 모드 첫 가동, 10커밋 무사고)
- 한 일:
  - [★모드] 판단 최소 모드 도입 — 게이트(grep 전수·build 0·diff 범위·PNG 금지) 전부
    통과 시 push까지 자동, 실패 시 중단·보고. 이 배치 10커밋 전부 게이트 통과
  - [★스토어 요건 마감] AI 생성물 신고: AiReportLink 공용 컴포넌트, 결과 120곳
    "문제가 있나요?" + 설정 항목(2aa80ca) + 홈 아기 결과의 고지 자체 누락 구멍 발견·수리
    (0c2e09a — 120곳 완성) / 사업자 정보 표기: 설정 하단(b7f0a3d) → 접기 UI로 노출
    최소화(f89e548, 통판번호 주석 자리)
  - [바이럴 인프라] og 메타태그+공유 카드 og.png 1200×630(adf34e7, 카톡 디버거 캐시
    초기화 → 사진 카드 실확인) / shareImage 헬퍼 — 웹뷰 카톡 사진 공유, saveImage 관례
    (전역 브리지·폴백·취소 무토스트)(3e11260, 실기기 검증) / 공유 버튼 120곳 확산(d5e2291,
    라벨 변형 12곳 2차 앵커, Upscale4K는 공유 대상 화면 없어 제외)
  - [4K] Upscale4K 원버튼화 — 성공 후 비활성(재클릭 중복 과금 차단), image 변경 시
    리셋(f89e548) + 116곳 확산(8b3bff8, 제외: upscale 자체·nukki 투명 파괴·petreceipt) —
    ★결과 화면 표준 = 저장→공유→4K 3단 확립, 새 컨셉 복제 시 자동 포함
  - [즐겨찾기] 상세 ⭐ + 홈 "⭐ 즐겨찾기" 칩 필터(cefdc0d) — ★정규 키 =
    conceptForGo(go).key 통일(카드 go/컨셉 key 어긋남 은둔버그 예방), "soon" 오염 차단,
    localStorage 로컬(로그인 동기화는 후보)
  - [히스토리 개별 삭제] 크게보기 삭제 버튼 + /api/history/delete(83ca824) — 소유권 가드
    (id로 경로 조립 금지, 항목 보유 url + /history/{uid}/ 이중 확인), LREM은 파싱 객체
    그대로(직렬화 일치), 로컬 우선·클라우드 멱등. ★전체삭제는 이미 클라우드까지 처리 중 확인
- 다음에 할 것: 코인 단가표 산출(출력장수×3, 특수 케이스는 MJ 검수) / [MJ] DUNS 신청
  (미착수 — 스토어까지의 유일한 대기줄) / 업로드 키+AAB 시험 빌드 / RevenueCat 셸 실측 /
  스토어 자산(스크린샷·피처 그래픽·Data safety 초안)
- 주의/메모: 4K 코인 부과 여부 = 단가표 검수 때 MJ 결정 / 즐겨찾기 로그인 동기화 후보 /
  히스토리 뷰 4K는 http URL 이슈로 보류

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