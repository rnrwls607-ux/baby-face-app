// 컨셉 정의 (한 곳에서 관리 → 나중에 새 컨셉은 여기에 추가만)
export type ConceptExample = { emoji: string; accent: string };
export type Concept = {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  description: string;
  examples: ConceptExample[];
  start: "baby" | "idphoto" | "soon"; // 프로필 만들기 누르면 어디로
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
    start: "idphoto",
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

// 카드의 go 값 → 컨셉
export function conceptForGo(go: string): Concept {
  if (go === "baby") return CONCEPTS.baby;
  if (go === "idphoto") return CONCEPTS.idphoto;
  return CONCEPTS.soon;
}