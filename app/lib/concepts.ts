export type ConceptExample = { emoji: string; accent: string };
export type Concept = {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  description: string;
  examples: ConceptExample[];
  start: "baby" | "idphoto" | "voxel" | "food" | "factory" | "pet" | "product" | "restore" | "realestate" | "interior" | "car" | "lifeshot" | "bizprofile" | "hairstyle" | "illust" | "figure" | "age" | "menu" | "fashion" | "idol" | "xmas" | "graduation" | "wedding"  | "petstudio" | "petreceipt" | "era" | "petcostume"  | "couple" | "hanbokcouple" | "friend" | "family" | "familyhanbok" | "familypet" | "fourcut" | "fourcutillust" | "fourcutcouple"  |  "soon";
  tags?: string[];
  resultCount?: number;
  heroImage?: string;
  heroImages?: string[];
  exampleImages?: string[];
  detailImage?: string;
};

export const CONCEPTS: Record<string, Concept> = {
  baby: {
    key: "baby",
    title: "우리 아기 얼굴은?",
    subtitle: "엄마·아빠 닮은 아기를 미리 만나요",
    emoji: "👶",
    accent: "#FFE0EC",
    description: "엄마와 아빠 사진을 올리면, AI가 두 사람을 자연스럽게 닮은 아기 얼굴을 만들어드려요. 딸·아들도 선택할 수 있어요.",
    examples: [
      { emoji: "👶", accent: "#FFE0EC" },
      { emoji: "🍼", accent: "#FFEFD6" },
      { emoji: "🧸", accent: "#E7F7EA" },
    ],
    start: "baby",
  },
  idphoto: {
    key: "idphoto",
    title: "AI 증명사진",
    subtitle: "스튜디오 없이 1분 완성",
    emoji: "🪪",
    accent: "#DCEBFF",
    description: "사진 한 장만 올리면 깔끔한 배경의 증명사진을 만들어드려요. (※ 공식 여권·신분증 제출용으로는 사용할 수 없어요.)",
    examples: [
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "💁", accent: "#FFE0EC" },
      { emoji: "👔", accent: "#E1ECFF" },
    ],
    tags: ["증명사진", "이력서", "깔끔한"],
    resultCount: 1,
    start: "idphoto",
  },
  voxel: {
    key: "voxel",
    title: "복셀 아트",
    subtitle: "사진을 3D 블록 세상으로",
    emoji: "🧊",
    accent: "#E1ECFF",
    description: "사진 한 장을 작은 큐브로 쌓은 3D 블록(복셀) 스타일로 바꿔드려요. 마인크래프트 같은 입체 블록 느낌이에요.",
    examples: [
      { emoji: "🧊", accent: "#E1ECFF" },
      { emoji: "🟦", accent: "#E7F7EA" },
      { emoji: "🎮", accent: "#EFEAFF" },
    ],
    heroImage: "/examples/voxel-hero.jpg",
    exampleImages: ["/examples/voxel-1.jpg", "/examples/voxel-2.jpg", "/examples/voxel-3.jpg", "/examples/voxel-4.jpg"],
    start: "voxel",
  },
  food: {
    key: "food",
    title: "음식 사진 보정",
    subtitle: "메뉴판·광고용으로 변신",
    emoji: "🍽️",
    accent: "#FFE0EC",
    description: "대충 찍은 음식 사진을 올리면 조명·색감·배경을 정리해 광고처럼 먹음직스러운 사진으로 바꿔드려요. 음식 자체는 그대로 유지돼요.",
    examples: [
      { emoji: "🍽️", accent: "#FFE0EC" },
      { emoji: "🍜", accent: "#FFEFD6" },
      { emoji: "🍰", accent: "#FFE9D6" },
    ],
    detailImage: "/details/food.png",
    start: "food",
  },
  factory: {
    key: "factory",
    title: "공장 리모델링",
    subtitle: "리모델링 후 모습 미리보기",
    emoji: "🏭",
    accent: "#E1ECFF",
    description: "낡은 공장 내부 사진을 올리면 깨끗하게 리모델링된 모습으로 바꿔드려요. 구조와 각도는 그대로 두고 바닥·벽·조명만 새것처럼 정리해요.",
    examples: [
      { emoji: "🏭", accent: "#E1ECFF" },
      { emoji: "🧱", accent: "#ECEEF1" },
      { emoji: "💡", accent: "#FFEFD6" },
    ],
    detailImage: "/details/factory.png",
    start: "factory",
  },
  pet: {
    key: "pet",
    title: "반려동물 증명사진",
    subtitle: "정장 입은 우리 아이",
    emoji: "🐶",
    accent: "#FFF1E0",
    description: "우리 강아지·고양이 사진을 올리면 작은 정장을 입은 깔끔한 증명사진으로 바꿔드려요. 신입사원 댕댕이처럼 귀엽게 나와요!",
    examples: [
      { emoji: "🐶", accent: "#FFF1E0" },
      { emoji: "🐱", accent: "#FFE0EC" },
      { emoji: "🎓", accent: "#DCEBFF" },
    ],
    start: "pet",
  },
  product: {
    key: "product",
    title: "상품 사진 보정",
    subtitle: "쇼핑몰·중고거래용 깔끔샷",
    emoji: "📦",
    accent: "#E7F7EA",
    description: "대충 찍은 상품 사진을 올리면 배경을 깔끔하게 정리하고 조명·색감을 보정해 쇼핑몰 상품컷처럼 만들어드려요. 중고거래·스마트스토어에 딱이에요.",
    examples: [
      { emoji: "📦", accent: "#E7F7EA" },
      { emoji: "🛍️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFEFD6" },
    ],
    detailImage: "/details/product.png",
    start: "product",
  },
  restore: {
    key: "restore",
    title: "옛날 사진 복원",
    subtitle: "빛바랜 추억을 선명하게",
    emoji: "🖼️",
    accent: "#FFEFD6",
    description: "오래된 흑백·손상된 사진을 올리면 긁힘과 얼룩을 복원하고 자연스러운 색을 입혀드려요. 부모님·조부모님 사진 선물로 좋아요.",
    examples: [
      { emoji: "🖼️", accent: "#FFEFD6" },
      { emoji: "📷", accent: "#E7F7EA" },
      { emoji: "🎞️", accent: "#DCEBFF" },
    ],
    start: "restore",
  },
  realestate: {
    key: "realestate",
    title: "부동산 매물 정리",
    subtitle: "매물 사진 깔끔하게",
    emoji: "🏠",
    accent: "#E1ECFF",
    description: "어둡고 어수선하게 찍힌 매물 사진을 올리면 밝고 깔끔하게 보정해드려요. 공간 구조는 그대로, 밝기와 정돈만 손봐요.",
    examples: [
      { emoji: "🏠", accent: "#E1ECFF" },
      { emoji: "🪟", accent: "#E7F7EA" },
      { emoji: "✨", accent: "#FFEFD6" },
    ],
    start: "realestate",
  },
  interior: {
    key: "interior",
    title: "인테리어 비포/애프터",
    subtitle: "빈 방에 가구를 채워요",
    emoji: "🛋️",
    accent: "#FFEFD6",
    description: "비어있거나 낡은 방 사진을 올리면 모던한 가구와 인테리어로 꾸민 모습을 보여드려요. 공간 구조와 각도는 그대로예요.",
    examples: [
      { emoji: "🛋️", accent: "#FFEFD6" },
      { emoji: "🪑", accent: "#FFE0EC" },
      { emoji: "🖼️", accent: "#E1ECFF" },
    ],
    start: "interior",
  },
  car: {
    key: "car",
    title: "중고차 사진 보정",
    subtitle: "판매용 깔끔샷",
    emoji: "🚗",
    accent: "#E7F7EA",
    description: "어수선한 배경에 찍힌 차 사진을 올리면 배경을 정리하고 조명·색감을 보정해 판매용 사진으로 만들어드려요. 차량 자체는 그대로 유지돼요.",
    examples: [
      { emoji: "🚗", accent: "#E7F7EA" },
      { emoji: "✨", accent: "#DCEBFF" },
      { emoji: "🔑", accent: "#FFEFD6" },
    ],
    start: "car",
  },
  lifeshot: {
    key: "lifeshot",
    title: "인생샷 프로필",
    subtitle: "감성 프로필 한 장",
    emoji: "📸",
    accent: "#EFEAFF",
    description: "평범한 셀카를 올리면 스튜디오에서 찍은 듯한 감성 프로필로 만들어드려요. 얼굴은 그대로, 분위기만 화보처럼 바뀌어요.",
    examples: [
      { emoji: "📸", accent: "#EFEAFF" },
      { emoji: "✨", accent: "#FFE0EC" },
      { emoji: "🌸", accent: "#FFF1E0" },
    ],
    start: "lifeshot",
  },
  bizprofile: {
    key: "bizprofile",
    title: "명함·링크드인 프로필",
    subtitle: "비즈니스 프로필",
    emoji: "💼",
    accent: "#DCEBFF",
    description: "셀카 한 장으로 깔끔한 비즈니스 프로필을 만들어드려요. 링크드인·명함·이력서에 바로 쓸 수 있는 단정한 상반신 사진이에요.",
    examples: [
      { emoji: "💼", accent: "#DCEBFF" },
      { emoji: "👔", accent: "#E1ECFF" },
      { emoji: "✨", accent: "#E7F7EA" },
    ],
    start: "bizprofile",
  },
  hairstyle: {
    key: "hairstyle",
    title: "헤어 체인지",
    subtitle: "미용실 가기 전 미리보기",
    emoji: "💇",
    accent: "#FFE0EC",
    description: "내 사진을 올리면 트렌디한 새 헤어스타일로 미리 바꿔봐요. 얼굴은 그대로, 머리만 자연스럽게 바뀌어서 미용실 가기 전 실패 없이 골라요.",
    examples: [
      { emoji: "💇", accent: "#FFE0EC" },
      { emoji: "💁", accent: "#EFEAFF" },
      { emoji: "✨", accent: "#FFF1E0" },
    ],
    start: "hairstyle",
  },
  illust: {
    key: "illust",
    title: "AI 일러스트",
    subtitle: "사진이 그림 한 장으로",
    emoji: "🎨",
    accent: "#EFEAFF",
    description: "사진을 올리면 웹툰·애니메이션 느낌의 고급 일러스트로 그려드려요. 구도와 얼굴은 그대로, 그림체만 감성적으로 바뀌어요.",
    examples: [
      { emoji: "🎨", accent: "#EFEAFF" },
      { emoji: "🖌️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF1E0" },
    ],
    start: "illust",
  },
  figure: {
    key: "figure",
    title: "미니어처 피규어",
    subtitle: "내 사진이 피규어로",
    emoji: "🧸",
    accent: "#FFF1E0",
    description: "사진을 올리면 장면 전체를 정교한 미니어처 피규어 디오라마로 만들어드려요. 같은 구도 그대로, 소장하고 싶은 피규어 느낌으로!",
    examples: [
      { emoji: "🧸", accent: "#FFF1E0" },
      { emoji: "🏗️", accent: "#E7F7EA" },
      { emoji: "📦", accent: "#DCEBFF" },
    ],
    start: "figure",
  },
  age: {
    key: "age",
    title: "노년·베이비 변환",
    subtitle: "시간을 거슬러 보는 내 모습",
    emoji: "⏳",
    accent: "#E7F7EA",
    description: "내 사진을 올리면 70대 노년의 모습 또는 2~3살 아기였을 모습으로 만들어드려요. 얼굴 특징은 그대로, 나이만 자연스럽게 바뀌어요.",
    examples: [
      { emoji: "👴", accent: "#E7F7EA" },
      { emoji: "👶", accent: "#FFE0EC" },
      { emoji: "⏳", accent: "#EFEAFF" },
    ],
    start: "age",
  },
  menu: {
    key: "menu",
    title: "메뉴판 비주얼",
    subtitle: "메뉴판에 바로 쓰는 사진",
    emoji: "📋",
    accent: "#FFF1E0",
    description: "대충 찍은 음식 사진을 메뉴판·배달앱·포스터에 바로 쓸 수 있는 깔끔한 비주얼로 만들어드려요. 배경 정리 + 스튜디오 조명, 음식은 그대로예요.",
    examples: [
      { emoji: "📋", accent: "#FFF1E0" },
      { emoji: "🍜", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#E7F7EA" },
    ],
    start: "menu",
  },
  fashion: {
    key: "fashion",
    title: "패션 룩북",
    subtitle: "오늘의 착장이 화보로",
    emoji: "👗",
    accent: "#EFEAFF",
    description: "내 착장 사진을 올리면 브랜드 룩북처럼 보정해드려요. 옷·포즈·얼굴은 그대로, 배경과 조명만 화보급으로 바뀌어요.",
    examples: [
      { emoji: "👗", accent: "#EFEAFF" },
      { emoji: "👟", accent: "#DCEBFF" },
      { emoji: "📸", accent: "#FFE0EC" },
    ],
    start: "fashion",
  },
  idol: {
    key: "idol",
    title: "아이돌 프로필",
    subtitle: "오늘 데뷔하는 내 프로필",
    emoji: "🌟",
    accent: "#FFE0EC",
    description: "셀카 한 장으로 아이돌 데뷔 프로필을 만들어드려요. 얼굴은 그대로, 헤어·메이크업·조명만 아이돌급 스타일링으로 바뀌어요.",
    examples: [
      { emoji: "🌟", accent: "#FFE0EC" },
      { emoji: "🎤", accent: "#EFEAFF" },
      { emoji: "✨", accent: "#FFF1E0" },
    ],
    start: "idol",
  },
  xmas: {
    key: "xmas",
    title: "크리스마스 화보",
    subtitle: "따뜻한 연말 한 장",
    emoji: "🎄",
    accent: "#E7F7EA",
    description: "내 사진(반려동물도 OK)을 올리면 트리와 조명이 가득한 크리스마스 스튜디오 화보로 만들어드려요. 얼굴은 그대로, 분위기만 포근하게!",
    examples: [
      { emoji: "🎄", accent: "#E7F7EA" },
      { emoji: "🎁", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF1E0" },
    ],
    start: "xmas",
  },
  graduation: {
    key: "graduation",
    title: "AI 졸업사진",
    subtitle: "학사모 쓴 내 모습",
    emoji: "🎓",
    accent: "#DCEBFF",
    description: "사진 한 장으로 학사모와 졸업가운을 입은 졸업사진을 만들어드려요. 졸업식 못 갔어도, 미리 보고 싶어도 OK! 얼굴은 그대로예요.",
    examples: [
      { emoji: "🎓", accent: "#DCEBFF" },
      { emoji: "📜", accent: "#FFF1E0" },
      { emoji: "💐", accent: "#FFE0EC" },
    ],
    start: "graduation",
  },
  wedding: {
    key: "wedding",
    title: "웨딩 화보",
    subtitle: "드레스·턱시도 입은 나",
    emoji: "💍",
    accent: "#FFE0EC",
    description: "사진 한 장으로 우아한 웨딩 스튜디오 화보를 만들어드려요. 드레스 또는 턱시도, 얼굴은 그대로 — 결혼 전 미리보기로도, 재미로도 좋아요.",
    examples: [
      { emoji: "💍", accent: "#FFE0EC" },
      { emoji: "👰", accent: "#EFEAFF" },
      { emoji: "🤵", accent: "#DCEBFF" },
    ],
    start: "wedding",
  },
  petstudio: {
    key: "petstudio",
    title: "펫 스튜디오 화보",
    subtitle: "우리 애기 화보 찍는 날",
    emoji: "🐶",
    accent: "#FFF1E0",
    description: "반려동물 사진을 올리면 고급 스튜디오에서 촬영한 듯한 화보로 만들어드려요. 우리 애 생김새는 그대로, 조명과 배경만 프리미엄으로!",
    examples: [
      { emoji: "🐶", accent: "#FFF1E0" },
      { emoji: "🐱", accent: "#FFE0EC" },
      { emoji: "📸", accent: "#EFEAFF" },
    ],
    start: "petstudio",
  },
  petreceipt: {
    key: "petreceipt",
    title: "펫 관상 영수증",
    subtitle: "우리 애 관상, 영수증으로",
    emoji: "🧾",
    accent: "#E7F7EA",
    description: "반려동물 얼굴 사진을 올리면 AI 관상가가 복코·재물눈 같은 관상 포인트 5가지를 뽑아 귀여운 영수증으로 만들어드려요. 재미로 봐주세요!",
    examples: [
      { emoji: "🧾", accent: "#E7F7EA" },
      { emoji: "🐾", accent: "#FFE0EC" },
      { emoji: "🔮", accent: "#EFEAFF" },
    ],
    start: "petreceipt",
  },
  era: {
    key: "era",
    title: "시대·복장 변신",
    subtitle: "다른 시대에 태어났다면?",
    emoji: "🕰️",
    accent: "#EFEAFF",
    description: "내 사진을 올리고 시대를 고르면 그 시대의 옷·헤어·배경으로 변신시켜드려요. 조선시대부터 미래 도시까지, 얼굴은 그대로!",
    examples: [
      { emoji: "👘", accent: "#EFEAFF" },
      { emoji: "🎩", accent: "#FFF1E0" },
      { emoji: "🤖", accent: "#DCEBFF" },
    ],
    start: "era",
  },
  petcostume: {
    key: "petcostume",
    title: "펫 코스튬",
    subtitle: "우리 애 옷 입혀보기",
    emoji: "🎀",
    accent: "#FFE0EC",
    description: "반려동물 사진을 올리고 코스튬을 고르면 자연스럽게 입혀드려요. 임금님부터 우주비행사까지, 우리 애 생김새는 그대로!",
    examples: [
      { emoji: "👑", accent: "#FFE0EC" },
      { emoji: "🎅", accent: "#E7F7EA" },
      { emoji: "🚀", accent: "#DCEBFF" },
    ],
    start: "petcostume",
  },
  couple: {
    key: "couple",
    title: "커플 스튜디오 화보",
    subtitle: "둘이 함께, 스튜디오 화보",
    emoji: "💑",
    accent: "#FFE0EC",
    description: "두 사람의 사진을 한 장씩 올리면 함께 찍은 듯한 커플 스튜디오 화보를 만들어드려요. 따로 찍은 사진도 OK, 두 얼굴 모두 그대로예요.",
    examples: [
      { emoji: "💑", accent: "#FFE0EC" },
      { emoji: "📸", accent: "#EFEAFF" },
      { emoji: "💕", accent: "#FFF1E0" },
    ],
    start: "couple",
  },
  hanbokcouple: {
    key: "hanbokcouple",
    title: "웨딩 한복 커플",
    subtitle: "한복 입고 둘이 한 장",
    emoji: "👘",
    accent: "#FFF1E0",
    description: "두 사람의 사진을 한 장씩 올리면 고운 웨딩 한복을 입고 함께 찍은 전통 혼례 화보를 만들어드려요. 두 얼굴 모두 그대로예요.",
    examples: [
      { emoji: "👘", accent: "#FFF1E0" },
      { emoji: "🏮", accent: "#FFE0EC" },
      { emoji: "💒", accent: "#E7F7EA" },
    ],
    start: "hanbokcouple",
  },
  friend: {
    key: "friend",
    title: "우정 스냅",
    subtitle: "베프랑 같이 찍은 한 장",
    emoji: "👯",
    accent: "#DCEBFF",
    description: "둘이 따로 찍은 사진을 한 장씩 올리면 같이 찍은 듯한 우정 스냅을 만들어드려요. 멀리 있는 친구와도 한 장에!",
    examples: [
      { emoji: "👯", accent: "#DCEBFF" },
      { emoji: "✌️", accent: "#FFE0EC" },
      { emoji: "🎞️", accent: "#EFEAFF" },
    ],
    start: "friend",
  },
  family: {
    key: "family",
    title: "가족 스튜디오 화보",
    subtitle: "온 가족이 한 장에",
    emoji: "👨‍👩‍👧‍👦",
    accent: "#E7F7EA",
    description: "가족 한 명당 사진 한 장씩(2~4장) 올리면 다 같이 찍은 듯한 가족 스튜디오 화보를 만들어드려요. 멀리 사는 가족과도 한 장에!",
    examples: [
      { emoji: "👨‍👩‍👧‍👦", accent: "#E7F7EA" },
      { emoji: "📸", accent: "#FFE0EC" },
      { emoji: "🏡", accent: "#FFF1E0" },
    ],
    start: "family",
  },
  familyhanbok: {
    key: "familyhanbok",
    title: "한복 명절 가족사진",
    subtitle: "명절에 꺼내 쓰는 한 장",
    emoji: "🏮",
    accent: "#FFF1E0",
    description: "가족 사진(한 명당 한 장, 2~4장)을 올리면 다 같이 한복을 입고 찍은 명절 가족사진을 만들어드려요. 새해 인사·명절 안부용으로 딱!",
    examples: [
      { emoji: "🏮", accent: "#FFF1E0" },
      { emoji: "👘", accent: "#FFE0EC" },
      { emoji: "🎎", accent: "#EFEAFF" },
    ],
    start: "familyhanbok",
  },
  familypet: {
    key: "familypet",
    title: "반려동물과 가족사진",
    subtitle: "우리 애도 가족이니까",
    emoji: "🐾",
    accent: "#DCEBFF",
    description: "반려동물 사진 1장 + 가족 사진(한 명당 한 장)을 올리면 다 같이 찍은 가족사진을 만들어드려요. 우리 애 생김새도, 가족 얼굴도 모두 그대로!",
    examples: [
      { emoji: "🐾", accent: "#DCEBFF" },
      { emoji: "🐶", accent: "#FFF1E0" },
      { emoji: "👨‍👩‍👧", accent: "#E7F7EA" },
    ],
    start: "familypet",
  },
  fourcut: {
    key: "fourcut",
    title: "인생네컷",
    subtitle: "나 혼자 네컷 한 장",
    emoji: "📸",
    accent: "#FFE0EC",
    description: "사진 한 장을 올리면 다양한 표정·포즈의 네컷 스트립으로 만들어드려요. 부스 안 가도 인생네컷! 얼굴은 그대로예요.",
    examples: [
      { emoji: "📸", accent: "#FFE0EC" },
      { emoji: "✌️", accent: "#EFEAFF" },
      { emoji: "😆", accent: "#FFF1E0" },
    ],
    start: "fourcut",
  },
  fourcutillust: {
    key: "fourcutillust",
    title: "인생네컷 (일러스트)",
    subtitle: "그림체 네컷 한 장",
    emoji: "🎨",
    accent: "#EFEAFF",
    description: "사진 한 장을 올리면 웹툰 그림체의 네컷 스트립으로 그려드려요. 다양한 표정·포즈 4컷, 얼굴 특징은 그대로!",
    examples: [
      { emoji: "🎨", accent: "#EFEAFF" },
      { emoji: "🖌️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF1E0" },
    ],
    start: "fourcutillust",
  },
  fourcutcouple: {
    key: "fourcutcouple",
    title: "커플 네컷",
    subtitle: "둘이 함께 네컷 한 장",
    emoji: "📸",
    accent: "#DCEBFF",
    description: "두 사람의 사진을 한 장씩 올리면 둘이 함께 찍은 듯한 네컷 스트립을 만들어드려요. 따로 찍은 사진도 OK, 두 얼굴 모두 그대로예요.",
    examples: [
      { emoji: "📸", accent: "#DCEBFF" },
      { emoji: "💕", accent: "#FFE0EC" },
      { emoji: "✌️", accent: "#EFEAFF" },
    ],
    start: "fourcutcouple",
  },
  soon: {
    key: "soon",
    title: "곧 만나요",
    subtitle: "준비 중인 컨셉이에요",
    emoji: "✨",
    accent: "#EFEAFF",
    description: "이 컨셉은 열심히 준비 중이에요. 조금만 기다려 주세요!",
    examples: [
      { emoji: "📸", accent: "#EFEAFF" },
      { emoji: "🎨", accent: "#FFEFD6" },
      { emoji: "💫", accent: "#DCEBFF" },
    ],
    start: "soon",
  },
};

export function conceptForGo(go: string): Concept {
  if (go === "baby") return CONCEPTS.baby;
  if (go === "idphoto") return CONCEPTS.idphoto;
  if (go === "voxel") return CONCEPTS.voxel;
  if (go === "food") return CONCEPTS.food;
  if (go === "factory") return CONCEPTS.factory;
  if (go === "pet") return CONCEPTS.pet;
  if (go === "product") return CONCEPTS.product;
  if (go === "restore") return CONCEPTS.restore;
  if (go === "realestate") return CONCEPTS.realestate;
  if (go === "interior") return CONCEPTS.interior;
  if (go === "car") return CONCEPTS.car;
  if (go === "lifeshot") return CONCEPTS.lifeshot;
  if (go === "bizprofile") return CONCEPTS.bizprofile;
  if (go === "hairstyle") return CONCEPTS.hairstyle;
  if (go === "illust") return CONCEPTS.illust;
  if (go === "figure") return CONCEPTS.figure;
  if (go === "age") return CONCEPTS.age;
  if (go === "menu") return CONCEPTS.menu;
  if (go === "fashion") return CONCEPTS.fashion;
  if (go === "idol") return CONCEPTS.idol;
  if (go === "xmas") return CONCEPTS.xmas;
  if (go === "graduation") return CONCEPTS.graduation;
  if (go === "wedding") return CONCEPTS.wedding;
  if (go === "petstudio") return CONCEPTS.petstudio;
  if (go === "petreceipt") return CONCEPTS.petreceipt;
  if (go === "era") return CONCEPTS.era;
  if (go === "petcostume") return CONCEPTS.petcostume;
  if (go === "couple") return CONCEPTS.couple;
  if (go === "hanbokcouple") return CONCEPTS.hanbokcouple;
  if (go === "friend") return CONCEPTS.friend;
  if (go === "family") return CONCEPTS.family;
  if (go === "familyhanbok") return CONCEPTS.familyhanbok;
  if (go === "familypet") return CONCEPTS.familypet;
  if (go === "fourcut") return CONCEPTS.fourcut;
  if (go === "fourcutillust") return CONCEPTS.fourcutillust;
  if (go === "fourcutcouple") return CONCEPTS.fourcutcouple;
  return CONCEPTS.soon;
}