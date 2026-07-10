export type ConceptExample = { emoji: string; accent: string };
export type Concept = {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  description: string;
  examples: ConceptExample[];
  start: "baby" | "idphoto" | "voxel" | "food" | "factory" | "pet" | "product" | "restore" | "realestate" | "interior" | "car" | "lifeshot" | "bizprofile" | "hairstyle" | "illust" | "figure" | "age" | "menu" | "fashion" | "idol" | "xmas" | "graduation" | "wedding"  | "petstudio" | "petreceipt" | "era" | "petcostume"  | "couple" | "hanbokcouple" | "friend" | "family" | "familyhanbok" | "familypet" | "fourcut" | "fourcutillust" | "fourcutcouple"  | "nukki" | "upscale" | "idskyblue" | "biznavy" | "bizmnavy" | "bizmcharcoal" | "bizmblack" | "bizmlightgray" | "bizmvest" | "bizmbeige" | "bizmblazer" | "bizmturtle" | "bizmdb" | "bizmknittie" | "bizblack" | "bizwhite" | "bizribbon" | "bizbeige" | "bizlavender" | "bizgray" | "bizknit" | "bizchiffon" | "bizpinkjacket" | "bizcreamdress" | "biznavyblouse" | "bizskyblouse" | "bizpinktweed" | "bizshirring" | "bizviolet" | "bizblueskirt" | "bizburgundy" | "bizkhaki" | "bizblackdress" | "bizbluegray" | "bizpinstripe" | "bizcheck" | "bizknitdress" | "idblack" | "idnavy" | "idcharcoal" | "idwhiteshirt" | "idbeige" | "idblacktie" | "idblouse" | "idknit" | "idturtleneck" | "idglasses" | "idoffshoulder" | "idupdo" | "idlonghair" | "idtweed" | "idwavebob" | "idponytail" | "idgarma" | "iddropcut" | "idperm" | "idpomade" | "idwarmbob" | "idhime" | "idashwave" | "idlowbun" | "idburgundy" | "iddandy" | "iddownperm" | "idnavysuit" | "idbeigeblazer" | "idhenley" | "soon";
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
    detailImage: "/details/restore.png",
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
    detailImage: "/details/realestate.png",
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
    detailImage: "/details/interior.png",
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
    detailImage: "/details/car.png",
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
    detailImage: "/details/illust.png",
    start: "illust",
  },
   idskyblue: {
       key: "idskyblue",
       title: "하늘빛 블루 셔츠",
       subtitle: "맑고 산뜻한 첫인상",
       emoji: "📷",
       accent: "#EAF3FF",
       description: "하늘빛 블루 셔츠에 깨끗한 하늘색 배경. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올려주시면, 가장 잘 나온 증명사진 3장을 만들어드려요.",
       examples: [
         { emoji: "📷", accent: "#EAF3FF" },
         { emoji: "💙", accent: "#DCEBFF" },
         { emoji: "✨", accent: "#EAF3FF" },
       ],
        detailImage: "/details/idskyblue.png",
       start: "idskyblue",
     },
       biznavy: {
       key: "biznavy",
       title: "네이비 정장 프로필",
       subtitle: "신뢰를 더하는 프로페셔널",
       emoji: "💼",
       accent: "#EAF3FF",
       description: "깔끔한 네이비 정장과 차분한 회색 배경의 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "💼", accent: "#EAF3FF" },
         { emoji: "🤵", accent: "#DCEBFF" },
         { emoji: "✨", accent: "#EAF3FF" },
       ],
       detailImage: "/details/biznavy.png",
       start: "biznavy",
     },
     bizmnavy: {
       key: "bizmnavy",
       title: "남성 네이비 정장",
       subtitle: "믿음직한 프로페셔널",
       emoji: "💼",
       accent: "#EAF3FF",
       description: "깔끔한 네이비 정장과 넥타이, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "💼", accent: "#EAF3FF" },
         { emoji: "🤵", accent: "#EAF3FF" },
         { emoji: "✨", accent: "#EAF3FF" },
       ],
       detailImage: "/details/bizmnavy.png",
       start: "bizmnavy",
     },
     bizmcharcoal: {
       key: "bizmcharcoal",
       title: "남성 차콜 정장",
       subtitle: "비즈니스 스탠다드",
       emoji: "💼",
       accent: "#ECEEF1",
       description: "깔끔한 차콜 그레이 정장, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "💼", accent: "#ECEEF1" },
         { emoji: "🤵", accent: "#ECEEF1" },
         { emoji: "✨", accent: "#ECEEF1" },
       ],
       detailImage: "/details/bizmcharcoal.png",
       start: "bizmcharcoal",
     },
     bizmblack: {
       key: "bizmblack",
       title: "남성 블랙 정장",
       subtitle: "격식 있는 클래식",
       emoji: "🖤",
       accent: "#F0F1F4",
       description: "깔끔한 블랙 정장과 넥타이, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🖤", accent: "#F0F1F4" },
         { emoji: "🤵", accent: "#F0F1F4" },
         { emoji: "✨", accent: "#F0F1F4" },
       ],
       detailImage: "/details/bizmblack.png",
       start: "bizmblack",
     },
     bizmlightgray: {
       key: "bizmlightgray",
       title: "남성 라이트그레이 정장",
       subtitle: "밝고 부드러운 인상",
       emoji: "🤵",
       accent: "#F2F3F5",
       description: "깔끔한 라이트그레이 정장, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🤵", accent: "#F2F3F5" },
         { emoji: "💼", accent: "#F2F3F5" },
         { emoji: "✨", accent: "#F2F3F5" },
       ],
       detailImage: "/details/bizmlightgray.png",
       start: "bizmlightgray",
     },
     bizmvest: {
       key: "bizmvest",
       title: "남성 쓰리피스 (조끼)",
       subtitle: "무게감 있는 임원룩",
       emoji: "💼",
       accent: "#ECEDF0",
       description: "깔끔한 차콜 쓰리피스(조끼) 정장, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "💼", accent: "#ECEDF0" },
         { emoji: "🤵", accent: "#ECEDF0" },
         { emoji: "✨", accent: "#ECEDF0" },
       ],
       detailImage: "/details/bizmvest.png",
       start: "bizmvest",
     },
     bizmbeige: {
       key: "bizmbeige",
       title: "남성 베이지 정장",
       subtitle: "따뜻하고 친근한",
       emoji: "🧥",
       accent: "#F5EFE6",
       description: "깔끔한 베이지 정장, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🧥", accent: "#F5EFE6" },
         { emoji: "🤵", accent: "#F5EFE6" },
         { emoji: "✨", accent: "#F5EFE6" },
       ],
       detailImage: "/details/bizmbeige.png",
       start: "bizmbeige",
     },
     bizmblazer: {
       key: "bizmblazer",
       title: "남성 네이비 블레이저",
       subtitle: "노타이 비즈캐주얼",
       emoji: "🧥",
       accent: "#EAF3FF",
       description: "깔끔한 네이비 블레이저(노타이), 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🧥", accent: "#EAF3FF" },
         { emoji: "🤵", accent: "#EAF3FF" },
         { emoji: "✨", accent: "#EAF3FF" },
       ],
       detailImage: "/details/bizmblazer.png",
       start: "bizmblazer",
     },
     bizmturtle: {
       key: "bizmturtle",
       title: "남성 블레이저 터틀넥",
       subtitle: "모던 미니멀",
       emoji: "⬛",
       accent: "#EDEEF0",
       description: "깔끔한 블레이저와 터틀넥, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "⬛", accent: "#EDEEF0" },
         { emoji: "🤵", accent: "#EDEEF0" },
         { emoji: "✨", accent: "#EDEEF0" },
       ],
       detailImage: "/details/bizmturtle.png",
       start: "bizmturtle",
     },
     bizmdb: {
       key: "bizmdb",
       title: "남성 더블브레스티드",
       subtitle: "존재감 있는 실루엣",
       emoji: "🤵",
       accent: "#E9EEF6",
       description: "깔끔한 네이비 더블브레스티드 정장, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🤵", accent: "#E9EEF6" },
         { emoji: "💼", accent: "#E9EEF6" },
         { emoji: "✨", accent: "#E9EEF6" },
       ],
       detailImage: "/details/bizmdb.png",
       start: "bizmdb",
     },
     bizmknittie: {
       key: "bizmknittie",
       title: "남성 니트타이 재킷",
       subtitle: "젊은 전문직 세미포멀",
       emoji: "👔",
       accent: "#EDEFEA",
       description: "깔끔한 스포츠 재킷과 니트타이, 차분한 회색 배경의 남성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·두 손 모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "👔", accent: "#EDEFEA" },
         { emoji: "🤵", accent: "#EDEFEA" },
         { emoji: "✨", accent: "#EDEFEA" },
       ],
       detailImage: "/details/bizmknittie.png",
       start: "bizmknittie",
     },
      bizblack: {
       key: "bizblack",
       title: "블랙 정장 프로필",
       subtitle: "격식을 갖춘 클래식",
       emoji: "🖤",
       accent: "#F0F1F4",
       description: "클래식한 블랙 정장과 깔끔한 밝은 회색 배경의 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🖤", accent: "#F0F1F4" },
         { emoji: "🤵", accent: "#E5E6EA" },
         { emoji: "✨", accent: "#F0F1F4" },
       ],
       detailImage: "/details/bizblack.png",
       start: "bizblack",
     },
     bizwhite: {
       key: "bizwhite",
       title: "화이트 셔츠 프로필",
       subtitle: "편안하고 단정한 전문가",
       emoji: "🤍",
       accent: "#FFF0F5",
       description: "깔끔한 화이트 셔츠와 밝은 회색 배경의 편안한 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요.",
       examples: [
         { emoji: "🤍", accent: "#FFF0F5" },
         { emoji: "👔", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizwhite.png",
       start: "bizwhite",
     },
     bizribbon: {
       key: "bizribbon",
       title: "리본 블라우스 프로필",
       subtitle: "우아하고 단정한 여성 프로필",
       emoji: "🎀",
       accent: "#FFF0F5",
       description: "아이보리 리본 블라우스와 블랙 스커트, 밝은 회색 배경의 우아한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🎀", accent: "#FFF0F5" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizribbon.png",
       start: "bizribbon",
     },
     bizbeige: {
       key: "bizbeige",
       title: "베이지 정장 프로필",
       subtitle: "부드럽고 따뜻한 전문가",
       emoji: "🤎",
       accent: "#F3ECE3",
       description: "따뜻한 베이지 정장과 밝은 회색 배경의 우아한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🤎", accent: "#F3ECE3" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizbeige.png",
       start: "bizbeige",
     },
     bizlavender: {
       key: "bizlavender",
       title: "라벤더 정장 프로필",
       subtitle: "화사하고 부드러운 첫인상",
       emoji: "💜",
       accent: "#F0EBFA",
       description: "화사한 파스텔 라벤더 정장과 밝은 회색 배경의 부드러운 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "💜", accent: "#F0EBFA" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizlavender.png",
       start: "bizlavender",
     },
     bizgray: {
       key: "bizgray",
       title: "그레이 정장 프로필",
       subtitle: "차분하고 전문적인 인상",
       emoji: "🩶",
       accent: "#EFF0F2",
       description: "차분하고 전문적인 그레이 정장과 밝은 회색 배경의 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🩶", accent: "#EFF0F2" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizgray.png",
       start: "bizgray",
     },
     bizknit: {
       key: "bizknit",
       title: "니트 가디건 프로필",
       subtitle: "친근하고 단정한 분위기",
       emoji: "🧶",
       accent: "#F5EFE6",
       description: "부드러운 니트 가디건과 깔끔한 블라우스, 밝은 회색 배경의 친근한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🧶", accent: "#F5EFE6" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizknit.png",
       start: "bizknit",
     },
     bizchiffon: {
       key: "bizchiffon",
       title: "쉬폰 블라우스 프로필",
       subtitle: "밝고 화사한 여성 프로필",
       emoji: "🌸",
       accent: "#FCEFF3",
       description: "부드러운 쉬폰 블라우스와 파스텔 스커트, 밝은 회색 배경의 밝고 화사한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🌸", accent: "#FCEFF3" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizchiffon.png",
       start: "bizchiffon",
     },
     bizpinkjacket: {
       key: "bizpinkjacket",
       title: "핑크 트위드 재킷 프로필",
       subtitle: "우아하고 화사한 셋업",
       emoji: "🌷",
       accent: "#FCE8EF",
       description: "샤넬풍 핑크 트위드 재킷 셋업과 밝은 회색 배경의 화사하고 우아한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🌷", accent: "#FCE8EF" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizpinkjacket.png",
       start: "bizpinkjacket",
     },
     bizcreamdress: {
       key: "bizcreamdress",
       title: "크림 원피스 프로필",
       subtitle: "은은하고 우아한 여성 프로필",
       emoji: "🎀",
       accent: "#FBF3E8",
       description: "은은한 리본 장식의 크림 원피스와 밝은 회색 배경의 우아한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🎀", accent: "#FBF3E8" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizcreamdress.png",
       start: "bizcreamdress",
     },
     biznavyblouse: {
       key: "biznavyblouse",
       title: "네이비 블라우스 프로필",
       subtitle: "단정하고 클래식한 조합",
       emoji: "💙",
       accent: "#EAEFF7",
       description: "단정한 네이비 블라우스와 베이지 스커트, 밝은 회색 배경의 클래식한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "💙", accent: "#EAEFF7" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/biznavyblouse.png",
       start: "biznavyblouse",
     },
     bizskyblouse: {
       key: "bizskyblouse",
       title: "스카이블루 블라우스 프로필",
       subtitle: "맑고 산뜻한 첫인상",
       emoji: "🩵",
       accent: "#EAF3FB",
       description: "맑은 파스텔 스카이블루 블라우스와 베이지 스커트, 밝은 회색 배경의 밝고 산뜻한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🩵", accent: "#EAF3FB" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizskyblouse.png",
       start: "bizskyblouse",
     },
     bizpinktweed: {
       key: "bizpinktweed",
       title: "핑크 트위드 원피스 프로필",
       subtitle: "격식 있는 우아한 원피스",
       emoji: "🌸",
       accent: "#FCE8EF",
       description: "샤넬풍 핑크 트위드 원피스와 밝은 회색 배경의 우아하고 격식 있는 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🌸", accent: "#FCE8EF" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizpinktweed.png",
       start: "bizpinktweed",
     },
     bizshirring: {
       key: "bizshirring",
       title: "셔링 블라우스 프로필",
       subtitle: "우아하고 고급스러운 무드",
       emoji: "🎀",
       accent: "#F7F0E9",
       description: "부드러운 셔링 블라우스와 베이지 스커트, 밝은 회색 배경의 우아한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🎀", accent: "#F7F0E9" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizshirring.png",
       start: "bizshirring",
     },
     bizviolet: {
       key: "bizviolet",
       title: "바이올렛 스커트 프로필",
       subtitle: "차분하고 세련된 분위기",
       emoji: "💜",
       accent: "#F0EBF7",
       description: "깔끔한 화이트 셔츠와 바이올렛 스커트, 밝은 회색 배경의 차분하고 세련된 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "💜", accent: "#F0EBF7" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizviolet.png",
       start: "bizviolet",
     },
     bizblueskirt: {
       key: "bizblueskirt",
       title: "블루 스커트 프로필",
       subtitle: "깨끗하고 산뜻한 느낌",
       emoji: "💙",
       accent: "#EAF0F8",
       description: "깔끔한 화이트 셔츠와 블루 스커트, 밝은 회색 배경의 깨끗하고 산뜻한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "💙", accent: "#EAF0F8" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizblueskirt.png",
       start: "bizblueskirt",
     },
     bizburgundy: {
       key: "bizburgundy",
       title: "버건디 슬랙스 프로필",
       subtitle: "자신감과 열정을 드러내는",
       emoji: "🍷",
       accent: "#F6EAEC",
       description: "우아한 타이 블라우스와 버건디 슬랙스, 밝은 회색 배경의 자신감 있는 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🍷", accent: "#F6EAEC" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizburgundy.png",
       start: "bizburgundy",
     },
     bizkhaki: {
       key: "bizkhaki",
       title: "카키 수트 프로필",
       subtitle: "모던하고 세련된 무드",
       emoji: "🫒",
       accent: "#F0EEE4",
       description: "따뜻한 카키 수트와 밝은 회색 배경의 모던하고 세련된 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🫒", accent: "#F0EEE4" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizkhaki.png",
       start: "bizkhaki",
     },
     bizblackdress: {
       key: "bizblackdress",
       title: "블랙 원피스 프로필",
       subtitle: "시크하고 세련된 무드",
       emoji: "🖤",
       accent: "#EFEFF1",
       description: "시크한 블랙 원피스와 밝은 회색 배경의 세련되고 모던한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🖤", accent: "#EFEFF1" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizblackdress.png",
       start: "bizblackdress",
     },
     bizbluegray: {
       key: "bizbluegray",
       title: "블루&그레이 미니원피스 프로필",
       subtitle: "발랄하고 산뜻한 인상",
       emoji: "💙",
       accent: "#ECEFF4",
       description: "그레이 보디에 스카이블루 소매·리본 포인트, 밝은 회색 배경의 발랄하고 산뜻한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "💙", accent: "#ECEFF4" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizbluegray.png",
       start: "bizbluegray",
     },
     bizpinstripe: {
       key: "bizpinstripe",
       title: "핀스트라이프 수트 프로필",
       subtitle: "클래식하고 자신감 있는",
       emoji: "📏",
       accent: "#ECEEF1",
       description: "세로 줄무늬 핀스트라이프 수트와 밝은 회색 배경의 클래식하고 자신감 있는 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "📏", accent: "#ECEEF1" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizpinstripe.png",
       start: "bizpinstripe",
     },
     bizcheck: {
       key: "bizcheck",
       title: "체크 블레이저 수트 프로필",
       subtitle: "우아하고 클래식한 패턴",
       emoji: "🏁",
       accent: "#EFEEEC",
       description: "세련된 체크·하운드투스 블레이저 수트와 밝은 회색 배경의 우아하고 클래식한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🏁", accent: "#EFEEEC" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizcheck.png",
       start: "bizcheck",
     },
     bizknitdress: {
       key: "bizknitdress",
       title: "카멜 니트 원피스 프로필",
       subtitle: "따뜻하면서 단정한 무드",
       emoji: "🐫",
       accent: "#F3EDE2",
       description: "부드러운 카멜 니트 원피스와 밝은 회색 배경의 따뜻하면서도 단정한 여성 전문가 프로필. 정면 사진 3~6장을 올리면, 팔짱·손모음·자연스러운 각도까지 서로 다른 포즈의 프로필 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
       examples: [
         { emoji: "🐫", accent: "#F3EDE2" },
         { emoji: "💁‍♀️", accent: "#FFE0EC" },
         { emoji: "✨", accent: "#FFF0F5" },
       ],
       detailImage: "/details/bizknitdress.png",
       start: "bizknitdress",
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
    detailImage: "/details/figure.png",
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
    detailImage: "/details/age.png",
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
    detailImage: "/details/menu.png",
    start: "menu",
  },
  nukki: {
    key: "nukki",
    title: "배경 제거",
    subtitle: "누끼 따서 투명 PNG로",
    emoji: "✂️",
    accent: "#DCEBFF",
    description: "상품·인물·사물 사진의 배경을 깔끔하게 지워 투명 배경 PNG로 만들어드려요. 상세페이지·디자인·합성에 바로 쓰세요.",
    examples: [
      { emoji: "✂️", accent: "#DCEBFF" },
      { emoji: "🖼️", accent: "#E7F7EA" },
      { emoji: "✨", accent: "#FFEAF1" },
    ],
    detailImage: "/details/nukki.png",
    start: "nukki",
  },
  upscale: {
    key: "upscale",
    title: "고화질 변환",
    subtitle: "흐린 사진을 4배 또렷하게",
    emoji: "🔍",
    accent: "#E1ECFF",
    description: "작고 흐릿한 사진을 4배 해상도(최대 4096px)로 키워드려요. 인쇄·상세페이지·확대용으로 좋아요. 없던 디테일을 새로 만들진 못하니, 너무 뭉개진 사진은 한계가 있어요.",
    examples: [
      { emoji: "🔍", accent: "#E1ECFF" },
      { emoji: "🖼️", accent: "#E7F7EA" },
      { emoji: "✨", accent: "#FFEAF1" },
    ],
    detailImage: "/details/upscale.png",
    start: "upscale",
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
  idblack: {
    key: "idblack",
    title: "블랙 정장 증명사진",
    subtitle: "취업·이력서용 깔끔한 정석",
    emoji: "🖤",
    accent: "#EFEFF1",
    description: "깔끔한 블랙 정장과 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🖤", accent: "#EFEFF1" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idblack.png",
    start: "idblack",
  },
  idnavy: {
    key: "idnavy",
    title: "네이비 정장 증명사진",
    subtitle: "신뢰감을 주는 면접용",
    emoji: "💙",
    accent: "#EAEFF7",
    description: "신뢰감 있는 네이비 정장과 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "💙", accent: "#EAEFF7" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idnavy.png",
    start: "idnavy",
  },
  idcharcoal: {
    key: "idcharcoal",
    title: "차콜그레이 정장 증명사진",
    subtitle: "차분하고 전문적인 인상",
    emoji: "🩶",
    accent: "#ECEDEF",
    description: "차분하고 전문가다운 차콜그레이 정장과 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🩶", accent: "#ECEDEF" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idcharcoal.png",
    start: "idcharcoal",
  },
  idwhiteshirt: {
    key: "idwhiteshirt",
    title: "화이트셔츠 증명사진",
    subtitle: "깔끔한 학생증·사원증용",
    emoji: "🤍",
    accent: "#F4F5F7",
    description: "재킷 없이 깔끔한 화이트 셔츠와 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🤍", accent: "#F4F5F7" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idwhiteshirt.png",
    start: "idwhiteshirt",
  },
  idbeige: {
    key: "idbeige",
    title: "베이지 정장 증명사진",
    subtitle: "부드럽고 따뜻한 인상",
    emoji: "🧸",
    accent: "#F3ECE3",
    description: "부드럽고 따뜻한 인상의 베이지 정장과 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🧸", accent: "#F3ECE3" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idbeige.png",
    start: "idbeige",
  },
  idblacktie: {
    key: "idblacktie",
    title: "블랙정장+넥타이 증명사진",
    subtitle: "격식을 갖춘 면접·서류용",
    emoji: "🤵",
    accent: "#EDEDEF",
    description: "넥타이까지 갖춘 가장 격식 있는 블랙 정장과 밝은 회색 배경의 단정한 증명사진. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🤵", accent: "#EDEDEF" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idblacktie.png",
    start: "idblacktie",
  },
  idblouse: {
    key: "idblouse",
    title: "아이보리 블라우스 증명사진",
    subtitle: "편안하고 단정한 여성 느낌",
    emoji: "🤍",
    accent: "#FBF3E8",
    description: "부드러운 아이보리 블라우스와 밝은 회색 배경의 단정한 증명사진. 정장보다 편안하면서도 깔끔한 인상을 줘요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🤍", accent: "#FBF3E8" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idblouse.png",
    start: "idblouse",
  },
  idknit: {
    key: "idknit",
    title: "니트 가디건 증명사진",
    subtitle: "부드럽고 친근한 분위기",
    emoji: "🧶",
    accent: "#F5EFE6",
    description: "부드럽고 친근한 니트 가디건과 밝은 회색 배경의 단정한 증명사진. 딱딱하지 않고 편안한 인상을 줘요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🧶", accent: "#F5EFE6" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idknit.png",
    start: "idknit",
  },
  idturtleneck: {
    key: "idturtleneck",
    title: "터틀넥 증명사진",
    subtitle: "모던하고 미니멀한 인상",
    emoji: "🖤",
    accent: "#EBECEE",
    description: "모던하고 미니멀한 터틀넥 니트와 밝은 회색 배경의 단정한 증명사진. 깔끔하고 세련된 인상을 줘요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "🖤", accent: "#EBECEE" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idturtleneck.png",
    start: "idturtleneck",
  },
  idglasses: {
    key: "idglasses",
    title: "정장+안경 증명사진",
    subtitle: "안경을 깔끔하게 살린 정장",
    emoji: "👓",
    accent: "#ECEEF1",
    description: "안경을 깔끔하게 살린 정장 증명사진. 렌즈 반사·빛 번짐 없이 또렷하게 만들어드려요. 안경을 쓴 정면 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)",
    examples: [
      { emoji: "👓", accent: "#ECEEF1" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idglasses.png",
    start: "idglasses",
  },
  idoffshoulder: {
    key: "idoffshoulder",
    title: "단발 오프숄더 증명사진",
    subtitle: "청초하고 자연스러운 무드",
    emoji: "💜",
    accent: "#F0EBF7",
    description: "청초한 단발과 오프숄더, 소프트 라벤더 배경의 화사한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "💜", accent: "#F0EBF7" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idoffshoulder.png",
    start: "idoffshoulder",
  },
  idupdo: {
    key: "idupdo",
    title: "올림머리 블라우스 증명사진",
    subtitle: "정돈된 이미지를 주는",
    emoji: "🤍",
    accent: "#EAF2EC",
    description: "정돈된 올림머리와 아이보리 블라우스, 페일 민트 배경의 단정한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🤍", accent: "#EAF2EC" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idupdo.png",
    start: "idupdo",
  },
  idlonghair: {
    key: "idlonghair",
    title: "긴머리 블라우스 증명사진",
    subtitle: "우아하고 자연스러운",
    emoji: "🌸",
    accent: "#F7ECF0",
    description: "우아한 긴 생머리와 화이트 블라우스, 더스티 로즈 배경의 자연스러운 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🌸", accent: "#F7ECF0" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idlonghair.png",
    start: "idlonghair",
  },
  idtweed: {
    key: "idtweed",
    title: "반묶음 트위드 증명사진",
    subtitle: "포멀한 러블리 무드",
    emoji: "🎀",
    accent: "#F9EEE8",
    description: "단정한 반묶음 헤어와 아이보리 트위드 자켓, 웜 피치 배경의 우아한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🎀", accent: "#F9EEE8" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idtweed.png",
    start: "idtweed",
  },
  idwavebob: {
    key: "idwavebob",
    title: "물결 단발 증명사진",
    subtitle: "발랄하고 상큼한 C컬",
    emoji: "💛",
    accent: "#F7F3E4",
    description: "발랄한 C컬 물결 단발과 베이지 니트, 버터옐로 배경의 상큼한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "💛", accent: "#F7F3E4" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idwavebob.png",
    start: "idwavebob",
  },
  idponytail: {
    key: "idponytail",
    title: "로우 포니테일 증명사진",
    subtitle: "깔끔하고 프로페셔널한",
    emoji: "💙",
    accent: "#ECEFF4",
    description: "깔끔한 로우 포니테일과 네이비 정장, 라이트 그레이 배경의 프로페셔널한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "💙", accent: "#ECEFF4" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idponytail.png",
    start: "idponytail",
  },
  idgarma: {
    key: "idgarma",
    title: "가르마컷 블랙정장 증명사진",
    subtitle: "신뢰감 있는 첫인상",
    emoji: "🖤",
    accent: "#ECEDEF",
    description: "단정한 가르마컷과 블랙 정장, 차콜그레이 배경의 신뢰감 있는 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🖤", accent: "#ECEDEF" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idgarma.png",
    start: "idgarma",
  },
  iddropcut: {
    key: "iddropcut",
    title: "드랍컷 블루셔츠 증명사진",
    subtitle: "차분한 리더의 이미지",
    emoji: "💙",
    accent: "#EAEFF7",
    description: "자연스러운 드랍컷과 라이트 블루 셔츠, 그레이블루 배경의 차분한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "💙", accent: "#EAEFF7" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/iddropcut.png",
    start: "iddropcut",
  },
  idperm: {
    key: "idperm",
    title: "페릭컷 화이트티 증명사진",
    subtitle: "기본에 충실한 산뜻함",
    emoji: "🤍",
    accent: "#F5F1EA",
    description: "깔끔한 페릭컷과 화이트 티셔츠, 샌드베이지 배경의 산뜻한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🤍", accent: "#F5F1EA" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idperm.png",
    start: "idperm",
  },
  idpomade: {
    key: "idpomade",
    title: "포마드 레트로정장 증명사진",
    subtitle: "그 시절 감성의 클래식",
    emoji: "🕶️",
    accent: "#F0EBE4",
    description: "클래식한 포마드 올백과 레트로 정장, 세피아 브라운 배경의 그 시절 감성 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🕶️", accent: "#F0EBE4" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idpomade.png",
    start: "idpomade",
  },
  idwarmbob: {
    key: "idwarmbob",
    title: "웜브라운 단발 증명사진",
    subtitle: "따뜻하고 포근한 무드",
    emoji: "🤎",
    accent: "#F5EEE4",
    description: "따뜻한 웜브라운 단발과 아이보리 니트, 크림 베이지 배경의 포근한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🤎", accent: "#F5EEE4" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idwarmbob.png",
    start: "idwarmbob",
  },
  idhime: {
    key: "idhime",
    title: "밀크브라운 히메컷 증명사진",
    subtitle: "러블리하고 부드러운",
    emoji: "🎀",
    accent: "#F7ECEA",
    description: "부드러운 밀크브라운 히메컷과 베이지 자켓, 웜 로즈베이지 배경의 러블리한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🎀", accent: "#F7ECEA" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idhime.png",
    start: "idhime",
  },
  idashwave: {
    key: "idashwave",
    title: "애쉬 웨이브 증명사진",
    subtitle: "세련되고 몽환적인",
    emoji: "🩶",
    accent: "#EEEEF0",
    description: "세련된 애쉬브라운 웨이브와 라벤더 니트, 소프트 그레이 배경의 몽환적인 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🩶", accent: "#EEEEF0" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idashwave.png",
    start: "idashwave",
  },
  idlowbun: {
    key: "idlowbun",
    title: "로우번 터틀넥 증명사진",
    subtitle: "시크하고 세련된 무드",
    emoji: "🖤",
    accent: "#F5EBEA",
    description: "깔끔한 로우번과 블랙 터틀넥, 밝은 로즈베이지 배경의 시크한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🖤", accent: "#F5EBEA" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idlowbun.png",
    start: "idlowbun",
  },
  idburgundy: {
    key: "idburgundy",
    title: "버건디 오프숄더 프로필",
    subtitle: "우아하고 여성스러운 화보",
    emoji: "🍷",
    accent: "#F6E9E6",
    description: "우아한 버건디 새틴 오프숄더와 웜 피치 배경의 여성스러운 화보 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (여성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🍷", accent: "#F6E9E6" },
      { emoji: "💁‍♀️", accent: "#FFE0EC" },
      { emoji: "✨", accent: "#FFF0F5" },
    ],
    detailImage: "/details/idburgundy.png",
    start: "idburgundy",
  },
  iddandy: {
    key: "iddandy",
    title: "댄디 베스트 증명사진",
    subtitle: "시원하고 댄디한 무드",
    emoji: "🩵",
    accent: "#EAEFF4",
    description: "아이스블루 셔츠와 네이비 니트 베스트, 라이트 스카이그레이 배경의 시원하고 댄디한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🩵", accent: "#EAEFF4" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/iddandy.png",
    start: "iddandy",
  },
  iddownperm: {
    key: "iddownperm",
    title: "다운펌 화이트셔츠 증명사진",
    subtitle: "청량하고 산뜻한 첫인상",
    emoji: "🩵",
    accent: "#EAF3FB",
    description: "자연스러운 다운펌과 화이트 셔츠, 소프트 스카이블루 배경의 청량한 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🩵", accent: "#EAF3FB" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/iddownperm.png",
    start: "iddownperm",
  },
  idnavysuit: {
    key: "idnavysuit",
    title: "가르마 네이비수트 증명사진",
    subtitle: "신뢰감 있는 프로페셔널",
    emoji: "💙",
    accent: "#EAEFF7",
    description: "단정한 가르마와 네이비 수트, 밝은 웜그레이 배경의 신뢰감 있는 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "💙", accent: "#EAEFF7" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idnavysuit.png",
    start: "idnavysuit",
  },
  idbeigeblazer: {
    key: "idbeigeblazer",
    title: "소프트펌 베이지 증명사진",
    subtitle: "세련되고 따뜻한 무드",
    emoji: "🤎",
    accent: "#F3ECE3",
    description: "부드러운 소프트펌과 베이지 블레이저, 웜 아이보리 배경의 세련된 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🤎", accent: "#F3ECE3" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idbeigeblazer.png",
    start: "idbeigeblazer",
  },
  idhenley: {
    key: "idhenley",
    title: "투블럭 헨리넥 증명사진",
    subtitle: "감각적이고 모던한",
    emoji: "🌿",
    accent: "#ECEFEA",
    description: "깔끔한 투블럭과 블랙 헨리넥, 라이트 세이지 그레이 배경의 감각적인 프로필이에요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 사진 3장을 만들어드려요. (남성 전용 컨셉이에요.)",
    examples: [
      { emoji: "🌿", accent: "#ECEFEA" },
      { emoji: "🧑‍💼", accent: "#DCEBFF" },
      { emoji: "✨", accent: "#EAF3FF" },
    ],
    detailImage: "/details/idhenley.png",
    start: "idhenley",
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
  if (go === "idskyblue") return CONCEPTS.idskyblue;
  if (go === "biznavy") return CONCEPTS.biznavy;
  if (go === "bizmnavy") return CONCEPTS.bizmnavy;
  if (go === "bizmcharcoal") return CONCEPTS.bizmcharcoal;
  if (go === "bizmblack") return CONCEPTS.bizmblack;
  if (go === "bizmlightgray") return CONCEPTS.bizmlightgray;
  if (go === "bizmvest") return CONCEPTS.bizmvest;
  if (go === "bizmbeige") return CONCEPTS.bizmbeige;
  if (go === "bizmblazer") return CONCEPTS.bizmblazer;
  if (go === "bizmturtle") return CONCEPTS.bizmturtle;
  if (go === "bizmdb") return CONCEPTS.bizmdb;
  if (go === "bizmknittie") return CONCEPTS.bizmknittie;
  if (go === "bizblack") return CONCEPTS.bizblack;
  if (go === "bizwhite") return CONCEPTS.bizwhite;
  if (go === "bizribbon") return CONCEPTS.bizribbon;
  if (go === "bizbeige") return CONCEPTS.bizbeige;
  if (go === "bizlavender") return CONCEPTS.bizlavender;
  if (go === "bizgray") return CONCEPTS.bizgray;
  if (go === "bizknit") return CONCEPTS.bizknit;
  if (go === "bizchiffon") return CONCEPTS.bizchiffon;
  if (go === "bizpinkjacket") return CONCEPTS.bizpinkjacket;
  if (go === "bizcreamdress") return CONCEPTS.bizcreamdress;
  if (go === "biznavyblouse") return CONCEPTS.biznavyblouse;
  if (go === "bizskyblouse") return CONCEPTS.bizskyblouse;
  if (go === "bizpinktweed") return CONCEPTS.bizpinktweed;
  if (go === "bizshirring") return CONCEPTS.bizshirring;
  if (go === "bizviolet") return CONCEPTS.bizviolet;
  if (go === "bizblueskirt") return CONCEPTS.bizblueskirt;
  if (go === "bizburgundy") return CONCEPTS.bizburgundy;
  if (go === "bizkhaki") return CONCEPTS.bizkhaki;
  if (go === "bizblackdress") return CONCEPTS.bizblackdress;
  if (go === "bizbluegray") return CONCEPTS.bizbluegray;
  if (go === "bizpinstripe") return CONCEPTS.bizpinstripe;
  if (go === "bizcheck") return CONCEPTS.bizcheck;
  if (go === "bizknitdress") return CONCEPTS.bizknitdress;
  if (go === "idblack") return CONCEPTS.idblack;
  if (go === "idnavy") return CONCEPTS.idnavy;
  if (go === "idcharcoal") return CONCEPTS.idcharcoal;
  if (go === "idwhiteshirt") return CONCEPTS.idwhiteshirt;
  if (go === "idbeige") return CONCEPTS.idbeige;
  if (go === "idblacktie") return CONCEPTS.idblacktie;
  if (go === "idblouse") return CONCEPTS.idblouse;
  if (go === "idknit") return CONCEPTS.idknit;
  if (go === "idturtleneck") return CONCEPTS.idturtleneck;
  if (go === "idglasses") return CONCEPTS.idglasses;
  if (go === "idoffshoulder") return CONCEPTS.idoffshoulder;
  if (go === "idupdo") return CONCEPTS.idupdo;
  if (go === "idlonghair") return CONCEPTS.idlonghair;
  if (go === "idtweed") return CONCEPTS.idtweed;
  if (go === "idwavebob") return CONCEPTS.idwavebob;
  if (go === "idponytail") return CONCEPTS.idponytail;
  if (go === "idgarma") return CONCEPTS.idgarma;
  if (go === "iddropcut") return CONCEPTS.iddropcut;
  if (go === "idperm") return CONCEPTS.idperm;
  if (go === "idpomade") return CONCEPTS.idpomade;
  if (go === "idwarmbob") return CONCEPTS.idwarmbob;
  if (go === "idhime") return CONCEPTS.idhime;
  if (go === "idashwave") return CONCEPTS.idashwave;
  if (go === "idlowbun") return CONCEPTS.idlowbun;
  if (go === "idburgundy") return CONCEPTS.idburgundy;
  if (go === "iddandy") return CONCEPTS.iddandy;
  if (go === "iddownperm") return CONCEPTS.iddownperm;
  if (go === "idnavysuit") return CONCEPTS.idnavysuit;
  if (go === "idbeigeblazer") return CONCEPTS.idbeigeblazer;
  if (go === "idhenley") return CONCEPTS.idhenley;
  if (go === "figure") return CONCEPTS.figure;
  if (go === "age") return CONCEPTS.age;
  if (go === "menu") return CONCEPTS.menu;
  if (go === "nukki") return CONCEPTS.nukki;
  if (go === "upscale") return CONCEPTS.upscale;
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