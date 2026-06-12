export type ConceptExample = { emoji: string; accent: string };
export type Concept = {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  description: string;
  examples: ConceptExample[];
  start: "baby" | "idphoto" | "voxel" | "food" | "factory" | "pet" | "product" | "restore" | "realestate" | "interior" | "car" | "soon";
  tags?: string[];
  resultCount?: number;
  heroImage?: string;
  heroImages?: string[];
  exampleImages?: string[];
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
  return CONCEPTS.soon;
}