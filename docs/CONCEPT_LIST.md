# MOSPIC 컨셉 전체 목록

생성일 2026-09-06 · 총 **198종** — 라이브 190 · 숨김 7 · soon 1

> 이 파일은 `node scripts/concept-list.mjs` 가 `app/lib/concepts.ts`(VM 실평가)에서 만든다. 손으로 고치지 말 것 — launch 스테이지가 출시 커밋 때 다시 쓴다.
> · 엔진: `app/api/{키}/route.ts` 모델 문자열. 자기 route 없는 biz*/id* 변형은 부모 route를 따른다(괄호 표기).
> · inputType: 저장 칸이 없어 도출한다 — specs/{키}.json > inputRule(solo_face→person, multi_face→duo, pet) > 키·분류 휴리스틱(couple/friend/family→duo, pet→pet, food/menu→food, product/goods/nukki→product) > other.
> · 상태: 홈 카드 열림=라이브 · 카드 주석/없음=숨김 · key "soon"=soon. 분류: 홈 카드 tags[0], 카드 없으면 GO 분류.

| # | 키 | 한글명 | 엔진 | inputType | 상태 | 시즌·분류 |
|---:|---|---|---|---|---|---|
| 1 | `baby` | 우리 아기 얼굴은? | flash (generate) | duo | 라이브 | 인기 |
| 2 | `voxel` | 복셀 아트 | gpt | person | 라이브 | 픽셀 |
| 3 | `food` | 음식 사진 보정 | flash | food | 라이브 | 음식 |
| 4 | `factory` | 공장 리모델링 | flash | other | 라이브 | 인테리어 |
| 5 | `pet` | 반려동물 증명사진 | flash | pet | 라이브 | 반려동물 |
| 6 | `product` | 상품 사진 보정 | flash | product | 라이브 | 상품 |
| 7 | `restore` | 옛날 사진 복원 | flash | other | 라이브 | 복원 |
| 8 | `realestate` | 부동산 매물 정리 | flash | other | 라이브 | 부동산 |
| 9 | `interior` | 인테리어 비포/애프터 | flash | other | 라이브 | 인테리어 |
| 10 | `car` | 중고차 사진 보정 | flash | other | 라이브 | 중고차 |
| 11 | `lifeshot` | 인생샷 프로필 | flash | person | 숨김 (카드 없음) | 인생샷 |
| 12 | `y2k` | Y2K 하이틴 | flash | person | 라이브 | 재미 |
| 13 | `roman` | 로판 웹툰 주인공 | flash | person | 라이브 | 재미 |
| 14 | `clay` | 클레이 아트 | flash | person | 라이브 | 재미 |
| 15 | `luxe` | 럭셔리 매거진 화보 | flash | person | 라이브 | 인생샷 |
| 16 | `homecafe` | 홈카페 감성 사진 | flash | food | 라이브 | 음식 |
| 17 | `travel` | 여행지 프로필 | flash | person | 라이브 | 인생샷 |
| 18 | `hanbok` | 한복 화보 | pro+flash | person | 라이브 | 비즈니스 |
| 19 | `retro90` | 90년대 사진관 | flash | person | 라이브 | 재미 |
| 20 | `hocance` | 호캉스 화보 | flash | person | 라이브 | 인생샷 |
| 21 | `redcarpet` | 레드카펫 화보 | flash | person | 라이브 | 인생샷 |
| 22 | `birthday` | 생일 화보 | flash | person | 라이브 | 인생샷 |
| 23 | `job` | 직업 변신 | flash | person | 라이브 | 재미 |
| 24 | `sporty` | 스포티 화보 | flash | person | 라이브 | 인생샷 |
| 25 | `flower` | 플라워 화보 | flash | person | 라이브 | 인생샷 |
| 26 | `remindwedding` | 리마인드 웨딩 | pro | duo | 라이브 | 가족 |
| 27 | `selfwedding` | 셀프웨딩 화보 | pro | person | 라이브 | 커플 |
| 28 | `duofamily` | 둘이서 가족사진 | pro | duo | 라이브 | 가족 |
| 29 | `coupletravel` | 커플 여행 스냅 | pro | duo | 라이브 | 커플 |
| 30 | `petbirthday` | 펫 생일 파티 | pro | pet | 라이브 | 반려동물 |
| 31 | `petmemorial` | 무지개다리 초상 | pro | pet | 라이브 | 반려동물 |
| 32 | `petceo` | 펫 CEO 출근 | pro | pet | 라이브 | 반려동물 |
| 33 | `petgraduation` | 펫 졸업사진 | pro | pet | 라이브 | 반려동물 |
| 34 | `petminhwa` | 조선 민화 초상 | pro | pet | 라이브 | 반려동물 |
| 35 | `petroyal` | 로얄 유화 초상 | pro | pet | 라이브 | 반려동물 |
| 36 | `pettwo` | 펫 둘이서 | pro | duo | 라이브 | 반려동물 |
| 37 | `petjob` | 펫 직업 변신 | pro | pet | 라이브 | 반려동물 |
| 38 | `pendrawing` | 펜 드로잉 초상 | gpt | person | 라이브 | 재미 |
| 39 | `oilportrait` | 유화 명화 초상 | gpt | person | 라이브 | 재미 |
| 40 | `softanime` | 감성 애니 초상 | gpt | person | 라이브 | 재미 |
| 41 | `retroanime` | 레트로 애니 초상 | gpt | person | 라이브 | 재미 |
| 42 | `popart` | 팝아트 포스터 | gpt | person | 라이브 | 재미 |
| 43 | `marble` | 대리석 조각상 | gpt | person | 라이브 | 재미 |
| 44 | `chibifigure` | 미니 피규어 | gpt | person | 라이브 | 재미 |
| 45 | `clayfigure` | 클레이 피규어 | gpt | person | 라이브 | 재미 |
| 46 | `stitchart` | 자수 초상 | gpt | person | 라이브 | 재미 |
| 47 | `pixelart` | 픽셀 아트 | gpt | person | 라이브 | 재미 |
| 48 | `stainedglass` | 스테인드글라스 | gpt | person | 라이브 | 재미 |
| 49 | `neonsign` | 네온사인 초상 | gpt | person | 라이브 | 재미 |
| 50 | `paperart` | 페이퍼 아트 | gpt | person | 라이브 | 재미 |
| 51 | `stickerpack` | 스티커팩 | gpt | person | 라이브 | 재미 |
| 52 | `toon3d` | 3D 캐릭터 초상 | flash | person | 라이브 | 재미 |
| 53 | `goldenhour` | 골든아워 | pro | person | 라이브 | 비즈니스 |
| 54 | `fixnight` | 야간 사진 구제 | pro | person | 라이브 | 인생샷 |
| 55 | `season` | 계절 변환 | pro | person | 라이브 | 재미 |
| 56 | `fixbacklight` | 역광 구제 | gpt | person | 라이브 | 인생샷 |
| 57 | `bgchange` | 배경 교체 | gpt | person | 라이브 | 인생샷 |
| 58 | `fixcrowd` | 행인 지우개 | gpt | person | 라이브 | 인생샷 |
| 59 | `beauty` | 뷰티 보정 | gpt | person | 라이브 | 헤어·뷰티 |
| 60 | `anisky` | 애니 감성 | gpt | person | 라이브 | 재미 |
| 61 | `brickfigure` | 블록 피규어 | gpt | person | 라이브 | 비즈니스 |
| 62 | `cheerglam` | 치어리더 | pro | person | 라이브 | 헤어·뷰티 |
| 63 | `crewglam` | 승무원 스타일 | pro | person | 라이브 | 헤어·뷰티 |
| 64 | `guestlook` | 하객룩 | pro | person | 라이브 | 헤어·뷰티 |
| 65 | `anchorglam` | 아나운서 | pro+gpt | person | 라이브 | 헤어·뷰티 |
| 66 | `goddessdress` | 여신 드레스 | gpt | person | 라이브 | 비즈니스 |
| 67 | `tripface` | 여행 셀카 구제 | gpt | person | 라이브 | 인생샷 |
| 68 | `idolglam` | 아이돌 글램 | pro+gpt | person | 라이브 | 비즈니스 |
| 69 | `campusgrad` | 캠퍼스 졸업사진 | pro | person | 라이브 | 인생샷 |
| 70 | `dresswedding` | 웨딩 스냅 | pro | person | 라이브 | 인생샷 |
| 71 | `gyaru` | 갸루 메이크오버 | gpt | person | 라이브 | 인생샷 |
| 72 | `genderswap` | 반대의 나 | gpt | person | 라이브 | 재미 |
| 73 | `deskfigure` | 데스크 피규어 | gpt | person | 라이브 | 피규어 |
| 74 | `digicam` | 디지캠 스냅 | pro+flash | person | 라이브 | 재미 |
| 75 | `airportsnap` | 공항패션 파파라치 | pro+flash | person | 라이브 | 인생샷 |
| 76 | `cinesnap` | 시네필름 스냅 | pro | person | 라이브 | 인생샷 |
| 77 | `schoolsnap` | 교복 컨셉 스냅 | pro | person | 라이브 | 인생샷 |
| 78 | `gravityad` | 3D 그래비티 광고컷 | gpt | product | 라이브 | 상품 |
| 79 | `feltdoll` | 몽글 펠트 인형 | gpt | person | 라이브 | 피규어 |
| 80 | `personalcolor` | 퍼스널컬러 화보 | pro | person | 라이브 | 헤어 |
| 81 | `monoactor` | 흑백 배우 프로필 | pro | person | 라이브 | 인생샷 |
| 82 | `fortunecard` | 관상 화보 | pro | person | 라이브 | 재미 |
| 83 | `minichef` | 미니 셰프 푸드샷 | gpt | food | 라이브 | 음식 |
| 84 | `poolside` | 풀사이드 호캉스 | pro | person | 라이브 | 인생샷 |
| 85 | `snowsnap` | 첫눈 스냅 | pro | person | 라이브 | 인생샷 |
| 86 | `profileduo` | 베프 프로필 스냅 | pro | duo | 라이브 | 우정 |
| 87 | `droneview` | 드론뷰 여행샷 | pro | person | 라이브 | 인생샷 |
| 88 | `autumnsnap` | 단풍 스냅 | pro | person | 라이브 | 인생샷 |
| 89 | `trenchlook` | 트렌치코트 가을 화보 | pro | person | 라이브 | 인생샷 |
| 90 | `examcheer` | 수능 응원 스냅 | pro | person | 라이브 | 인생샷 |
| 91 | `xmasvintage` | 빈티지 크리스마스 스냅 | pro | person | 라이브 | 시즌 |
| 92 | `campsnap` | 감성 캠핑 스냅 | pro | person | 라이브 | 인생샷 |
| 93 | `picnicsnap` | 한강 피크닉 스냅 | pro | person | 라이브 | 인생샷 |
| 94 | `partysnap` | 홀리데이 파티 스냅 | pro | person | 라이브 | 시즌 |
| 95 | `skisnap` | 스키장 겨울 스냅 | pro | person | 라이브 | 인생샷 |
| 96 | `productscene` | 제품 연출컷 | gpt | product | 라이브 | 상품 |
| 97 | `kidsdraw` | 아이 그림 실사화 | gpt | product | 라이브 | 상품 |
| 98 | `flatlay` | 플랫레이 상품컷 | gpt | product | 라이브 | 상품 |
| 99 | `ghostfit` | 고스트 마네킹 착장컷 | gpt | product | 라이브 | 상품 |
| 100 | `carad` | 자동차 광고컷 | gpt | product | 라이브 | 중고차 |
| 101 | `sketch2real` | 스케치 실물화 | gpt | product | 라이브 | 상품 |
| 102 | `nailshot` | 네일아트 상품컷 | gpt | product | 라이브 | 상품 |
| 103 | `bouquetshot` | 꽃다발 상품컷 | gpt | product | 라이브 | 상품 |
| 104 | `plantshot` | 반려식물 화보 | gpt | product | 라이브 | 상품 |
| 105 | `halloween` | 할로윈 변신 | flash | person | 라이브 | 시즌 |
| 106 | `goods` | 굿즈 미리보기 | flash | product | 숨김 (카드 주석 잠금) | 재미 |
| 107 | `bizprofile` | 명함·링크드인 프로필 | flash | person | 숨김 (카드 주석 잠금) | 비즈니스 |
| 108 | `hairstyle` | 헤어 체인지 | flash | person | 라이브 | 헤어 |
| 109 | `illust` | AI 일러스트 | flash | person | 라이브 | 일러스트 |
| 110 | `idskyblue` | 하늘빛 블루 셔츠 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 111 | `biznavy` | 네이비 정장 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 112 | `bizmnavy` | 남성 네이비 정장 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 113 | `bizmcharcoal` | 남성 차콜 정장 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 114 | `bizmblack` | 남성 블랙 정장 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 115 | `bizmlightgray` | 남성 라이트그레이 정장 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 116 | `bizmvest` | 남성 쓰리피스 (조끼) | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 117 | `bizmbeige` | 남성 베이지 정장 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 118 | `bizmblazer` | 남성 네이비 블레이저 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 119 | `bizmturtle` | 남성 블레이저 터틀넥 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 120 | `bizmdb` | 남성 더블브레스티드 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 121 | `bizmknittie` | 남성 니트타이 재킷 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 122 | `bizblack` | 블랙 정장 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 123 | `bizwhite` | 화이트 셔츠 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 124 | `bizribbon` | 리본 블라우스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 125 | `bizbeige` | 베이지 정장 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 126 | `bizlavender` | 라벤더 정장 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 127 | `bizgray` | 그레이 정장 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 128 | `bizknit` | 니트 가디건 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 129 | `bizchiffon` | 쉬폰 블라우스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 130 | `bizpinkjacket` | 핑크 트위드 재킷 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 131 | `bizcreamdress` | 크림 원피스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 132 | `biznavyblouse` | 네이비 블라우스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 133 | `bizskyblouse` | 스카이블루 블라우스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 134 | `bizpinktweed` | 핑크 트위드 원피스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 135 | `bizshirring` | 셔링 블라우스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 136 | `bizviolet` | 바이올렛 스커트 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 137 | `bizblueskirt` | 블루 스커트 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 138 | `bizburgundy` | 버건디 슬랙스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 139 | `bizkhaki` | 카키 수트 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 140 | `bizblackdress` | 블랙 원피스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 141 | `bizbluegray` | 블루&그레이 미니원피스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 142 | `bizpinstripe` | 핀스트라이프 수트 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 143 | `bizcheck` | 체크 블레이저 수트 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 144 | `bizknitdress` | 카멜 니트 원피스 프로필 | flash (bizprofile) | person | 라이브 | 비즈니스 |
| 145 | `figure` | 미니어처 피규어 | flash | person | 라이브 | 피규어 |
| 146 | `age` | 노년·베이비 변환 | flash | person | 라이브 | 재미 |
| 147 | `menu` | 메뉴판 비주얼 | flash | food | 라이브 | 사장님 |
| 148 | `nukki` | 배경 제거 | replicate | product | 라이브 | 디자인 |
| 149 | `upscale` | 고화질 변환 | replicate | other | 라이브 | 고화질 |
| 150 | `fashion` | 패션 룩북 | flash | person | 라이브 | 패션 |
| 151 | `idol` | 아이돌 프로필 | flash | person | 라이브 | 인생샷 |
| 152 | `xmas` | 크리스마스 화보 | flash | person | 라이브 | 시즌 |
| 153 | `graduation` | AI 졸업사진 | flash | person | 라이브 | 졸업 |
| 154 | `wedding` | 웨딩 화보 | flash | duo | 라이브 | 비즈니스 |
| 155 | `petstudio` | 펫 스튜디오 화보 | flash | pet | 라이브 | 반려동물 |
| 156 | `petreceipt` | 펫 관상 영수증 | pro | pet | 라이브 | 반려동물 |
| 157 | `era` | 시대·복장 변신 | flash | person | 라이브 | 재미 |
| 158 | `petcostume` | 펫 코스튬 | flash | pet | 라이브 | 반려동물 |
| 159 | `couple` | 커플 스튜디오 화보 | pro | duo | 라이브 | 커플 |
| 160 | `hanbokcouple` | 웨딩 한복 커플 | pro | duo | 라이브 | 커플 |
| 161 | `friend` | 우정 스냅 | pro | duo | 라이브 | 우정 |
| 162 | `family` | 가족 스튜디오 화보 | flash | duo | 숨김 (카드 주석 잠금) | 가족 |
| 163 | `familyhanbok` | 명절 한복 2인 | pro | duo | 라이브 | 가족 |
| 164 | `familypet` | 반려가족 사진 | pro | duo | 라이브 | 가족 |
| 165 | `fourcut` | 인생네컷 | flash | person | 숨김 (카드 주석 잠금) | 네컷 |
| 166 | `fourcutillust` | 인생네컷 (일러스트) | flash | person | 숨김 (카드 주석 잠금) | 네컷 |
| 167 | `fourcutcouple` | 커플 네컷 | pro | duo | 숨김 (카드 주석 잠금) | 네컷 |
| 168 | `idblack` | 블랙 정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 169 | `idnavy` | 네이비 정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 170 | `idcharcoal` | 차콜그레이 정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 171 | `idwhiteshirt` | 화이트셔츠 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 172 | `idbeige` | 베이지 정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 173 | `idblacktie` | 블랙정장+넥타이 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 174 | `idblouse` | 아이보리 블라우스 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 175 | `idknit` | 니트 가디건 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 176 | `idturtleneck` | 터틀넥 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 177 | `idglasses` | 정장+안경 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 178 | `idoffshoulder` | 단발 오프숄더 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 179 | `idupdo` | 올림머리 블라우스 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 180 | `idlonghair` | 긴머리 블라우스 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 181 | `idtweed` | 반묶음 트위드 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 182 | `idwavebob` | 물결 단발 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 183 | `idponytail` | 로우 포니테일 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 184 | `idgarma` | 가르마컷 블랙정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 185 | `iddropcut` | 드랍컷 블루셔츠 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 186 | `idperm` | 페릭컷 화이트티 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 187 | `idpomade` | 포마드 레트로정장 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 188 | `idwarmbob` | 웜브라운 단발 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 189 | `idhime` | 밀크브라운 히메컷 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 190 | `idashwave` | 애쉬 웨이브 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 191 | `idlowbun` | 로우번 터틀넥 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 192 | `idburgundy` | 버건디 오프숄더 프로필 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 193 | `iddandy` | 댄디 베스트 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 194 | `iddownperm` | 다운펌 화이트셔츠 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 195 | `idnavysuit` | 가르마 네이비수트 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 196 | `idbeigeblazer` | 소프트펌 베이지 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 197 | `idhenley` | 투블럭 헨리넥 증명사진 | gpt (idstyle) | person | 라이브 | 증명사진 |
| 198 | `soon` | 곧 만나요 | - | other | soon | - |

## ★ 탈락·보류 (재론 금지 — 플레이북 §7)

| 키 | 판정 | 근거 | 리포 흔적 |
|---|---|---|---|
| `oldmoney` | 탈락 | v1~v3 조명 수술 후에도 미달 — 조명 수술의 한계 판례 | 없음 |
| `marathon` | 탈락 | G1 탈락 | 없음 |
| `petid` | 탈락 | pet 컨셉과 겹침 | 없음 |
| `boxtoy` | 탈락 | 글자 봉쇄 헌법과 충돌 | 없음 |
| `chibisticker` | 보류 | 다중 셀 일관성 리스크 — 네컷 동면과 연동해 재론 | 없음 |
| `filmcampus` | 보류 | 09-06 G2 보류(재론 금지). spec·프롬프트·비포 3·애프터 4 보관, route 미배선 | spec·ba |

