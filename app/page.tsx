"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PRODUCT_LIST as PRODUCTS } from "./lib/products";
import { addToHistory, getHistory, getCloudHistory, clearHistory, clearCloudHistory, type HistoryItem } from "./lib/history";
import { conceptForGo, type Concept } from "./lib/concepts";
import Upscale4K from "./components/Upscale4K";
const LOADING_MESSAGES = [
  "아기 얼굴 윤곽 그리는 중...",
  "눈 모양 만드는 중...",
  "코 모양 다듬는 중...",
  "엄마 닮은 부분 찾는 중...",
  "아빠 닮은 부분 찾는 중...",
  "피부 톤 맞추는 중...",
  "마지막 터치 중...",
  "거의 다 됐어요!",
];
const FREE_LIMIT = 3;
const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_vZnjEJeQVxn5Ol1JZgbd8PmOoBN0";
type KakaoUser = { id: string; nickname: string; profileImage: string | null; email: string | null };
type Tab = "home" | "ticket" | "coupon" | "history";
// ─────────────────────────────────────────────────────────────
// 아이콘 컴포넌트
// ─────────────────────────────────────────────────────────────
const Icon = {
  Home: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Ticket: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z"/>
    </svg>
  ),
  Coupon: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  History: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Settings: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Back: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Camera: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Share: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  ),
};
// ── 홈 디자인 토큰 (색·둥글기를 여기서 통제) ──
const HOME = {
  accent: "#FF4B7C",
  text: "#191919",
  sub: "#9B9B9B",
  tagBg: "#EFF0FA",
  tagText: "#8C8CA6",
  radius: 18,
};
// 카드 한 장의 데이터 형태 (image: 실제 사진 주소. 비우면 이모지로 표시)
type HomeCardItem = { id: string; title: string; subtitle: string; emoji: string; accent: string; badge: string; tags: string[]; go: string; image?: string };
// ── 홈 카탈로그 (여기에 객체 추가 = 카드 추가) ──
// go: "baby"=아기 만들기 화면 / "idphoto"=증명사진(/id-photo) / ""=준비중
// go → 카테고리(복수 가능). 칩 필터용. 새 컨셉 추가하면 여기 한 줄 넣기.
const GO_CATEGORIES: Record<string, string[]> = {
  baby: ["fun"],
  idphoto: ["idcard"],
  voxel: ["fun"],
  food: ["biz"],
  factory: ["biz"],
  pet: ["pet", "idcard"],        // 펫 + 증명사진 둘 다
  product: ["biz"],
  restore: ["fun"],
  realestate: ["biz"],
  interior: ["biz"],
  car: ["biz"],
  lifeshot: ["lifeshot"],
  bizprofile: ["business"],
  hairstyle: ["beauty"],
  illust: ["fun"],
  figure: ["fun"],
  age: ["fun"],
  menu: ["biz"],
  nukki: ["biz"],
  upscale: ["biz"],
  fashion: ["lifeshot"],
  idol: ["lifeshot", "beauty"],
  xmas: ["fun"],
  graduation: ["fun", "lifeshot"],
  wedding: ["family", "lifeshot"],
  petstudio: ["pet"],
  petreceipt: ["pet", "fun"],
  era: ["fun"],
  petcostume: ["pet", "fun"],
  couple: ["family"],
  hanbokcouple: ["family"],
  friend: ["family", "fun"],
  family: ["family"],
  familyhanbok: ["family"],
  familypet: ["family", "pet"],
  fourcut: ["fun", "lifeshot"],
  fourcutillust: ["fun"],
  fourcutcouple: ["fun", "family"],
};
const HOME_PILLS = [
  { label: "전체", value: "all" },
  { label: "인기 🔥", value: "hot" },
  { label: "증명사진", value: "idcard" },
  { label: "비즈니스", value: "business" },
  { label: "인생샷", value: "lifeshot" },
  { label: "헤어·뷰티", value: "beauty" },
  { label: "반려동물", value: "pet" },
  { label: "가족·커플", value: "family" },
  { label: "사장님 💼", value: "biz" },
  { label: "재미·추억", value: "fun" },
];
const HOME_HERO = [
  { id: "baby", title: "우리 아기 얼굴은?", subtitle: "엄마·아빠 닮은 아기를 미리 만나요", emoji: "👶", accent: "#FFDCE8", go: "baby", image: "/cards/baby.jpg" },
  { id: "idphoto", title: "AI 증명사진", subtitle: "스튜디오 없이 1분 완성", emoji: "🪪", accent: "#DCEBFF", go: "idphoto", image: "/cards/idphoto-1.jpg" },
  { id: "event", title: "지금 첫 3회 무료 🎉", subtitle: "가입하고 바로 만들어보세요", emoji: "🎁", accent: "#E6F7E9", go: "baby", image: "" },
];
const HOME_SECTIONS: { id: string; heading: string; title: string; layout: string; items: HomeCardItem[] }[] = [
  {
    id: "popular", heading: "지금 제일 인기 있는", title: "인기 AI 사진 🔥", layout: "scroll",
    items: [
      { id: "baby", title: "우리 아기 얼굴은?", subtitle: "부모 닮은 아기 미리보기", emoji: "👶", accent: "#FFE0EC", badge: "BEST", tags: ["인기", "가족"], go: "baby", image: "/cards/baby.jpg" },
      { id: "idphoto", title: "AI 증명사진", subtitle: "정장·깔끔 배경 1분", emoji: "🪪", accent: "#DCEBFF", badge: "NEW", tags: ["증명사진"], go: "idphoto", image: "/cards/idphoto-1.jpg" },
      { id: "couple", title: "커플 사진", subtitle: "여행·데이트 합성", emoji: "💑", accent: "#FFE9D6", badge: "", tags: ["인생샷"], go: "" },
    ],
  },
  {
    id: "more", heading: "이런 것도 만들어드려요", title: "다양한 AI 사진 ✨", layout: "scroll",
    items: [
      { id: "voxel", title: "복셀 아트", subtitle: "사진을 3D 블록으로", emoji: "🧊", accent: "#E1ECFF", badge: "NEW", tags: ["픽셀"], go: "voxel", image: "/cards/voxel.png" },
      { id: "food", title: "음식 사진 보정", subtitle: "메뉴판·광고용으로", emoji: "🍽️", accent: "#FFE0EC", badge: "NEW", tags: ["음식"], image: "/cards/food.png", go: "food" },
      { id: "factory", title: "공장 리모델링", subtitle: "리모델링 후 미리보기", emoji: "🏭", accent: "#E1ECFF", badge: "NEW", tags: ["인테리어"], image: "/cards/factory.png", go: "factory" },
      { id: "pet", title: "반려동물 증명사진", subtitle: "정장 입은 우리 아이", emoji: "🐶", accent: "#FFF1E0", badge: "NEW", tags: ["반려동물"], go: "pet" },
      { id: "product", title: "상품 사진 보정", subtitle: "쇼핑몰·중고거래용", emoji: "📦", accent: "#E7F7EA", badge: "NEW", tags: ["상품"], image: "/cards/product.png", go: "product" },
      { id: "restore", title: "옛날 사진 복원", subtitle: "빛바랜 추억을 선명하게", emoji: "🖼️", accent: "#FFEFD6", badge: "NEW", tags: ["복원"], image: "/cards/restore.png", go: "restore" },
      { id: "realestate", title: "부동산 매물 정리", subtitle: "매물 사진 깔끔하게", emoji: "🏠", accent: "#E1ECFF", badge: "NEW", tags: ["부동산"], image: "/cards/realestate.png", go: "realestate" },
      { id: "interior", title: "인테리어 비포/애프터", subtitle: "빈 방에 가구를", emoji: "🛋️", accent: "#FFEFD6", badge: "NEW", tags: ["인테리어"], image: "/cards/interior.png", go: "interior" },
      { id: "car", title: "중고차 사진 보정", subtitle: "판매용 깔끔샷", emoji: "🚗", accent: "#E7F7EA", badge: "NEW", tags: ["중고차"], image: "/cards/car.png", go: "car" },
      { id: "lifeshot2", title: "인생샷 프로필", subtitle: "감성 프로필 한 장", emoji: "📸", accent: "#EFEAFF", badge: "NEW", tags: ["인생샷"], go: "lifeshot" },
      { id: "bizprofile", title: "명함·링크드인 프로필", subtitle: "비즈니스 프로필", emoji: "💼", accent: "#DCEBFF", badge: "NEW", tags: ["비즈니스"], go: "bizprofile" },
      { id: "hairstyle", title: "헤어 체인지", subtitle: "미용실 가기 전", emoji: "💇", accent: "#FFE0EC", badge: "NEW", tags: ["헤어"], go: "hairstyle" },
      { id: "illust", title: "AI 일러스트", subtitle: "사진이 그림 한 장으로", emoji: "🎨", accent: "#EFEAFF", image: "/cards/illust.png", badge: "NEW", tags: ["일러스트"], go: "illust" },
      { id: "idskyblue", title: "하늘빛 블루 셔츠", subtitle: "맑고 산뜻한 첫인상", emoji: "📷", accent: "#EAF3FF", image: "/cards/idskyblue.png", badge: "NEW", tags: ["증명사진"], go: "idskyblue" },
      { id: "biznavy", title: "네이비 정장 프로필", subtitle: "신뢰를 더하는 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/biznavy.png", badge: "NEW", tags: ["비즈니스"], go: "biznavy" },
      { id: "bizblack", title: "블랙 정장 프로필", subtitle: "격식을 갖춘 클래식", emoji: "🖤", accent: "#F0F1F4", badge: "NEW", tags: ["비즈니스"], go: "bizblack" },
      { id: "figure", title: "미니어처 피규어", subtitle: "내 사진이 피규어로", emoji: "🧸", accent: "#FFF1E0", image: "/cards/figure.png", badge: "NEW", tags: ["피규어"], go: "figure" },
      { id: "age", title: "노년·베이비 변환", subtitle: "시간을 거슬러서", emoji: "⏳", accent: "#E7F7EA", image: "/cards/age.png", badge: "NEW", tags: ["재미"], go: "age" },
      { id: "menu", title: "메뉴판 비주얼", subtitle: "메뉴판에 바로 쓰는 사진", emoji: "📋", accent: "#FFF1E0", image: "/cards/menu.png", badge: "NEW", tags: ["사장님"], go: "menu" },
      { id: "nukki", title: "배경 제거", subtitle: "누끼 따서 투명 PNG로", emoji: "✂️", accent: "#DCEBFF", image: "/cards/nukki.png", badge: "NEW", tags: ["디자인"], go: "nukki" },
      { id: "upscale", title: "고화질 변환", subtitle: "흐린 사진을 4배 또렷하게", emoji: "🔍", accent: "#E1ECFF", image: "/cards/upscale.png", badge: "NEW", tags: ["고화질"], go: "upscale" },
      { id: "fashion", title: "패션 룩북", subtitle: "오늘의 착장이 화보로", emoji: "👗", accent: "#EFEAFF", badge: "NEW", tags: ["패션"], go: "fashion" },
      { id: "idol", title: "아이돌 프로필", subtitle: "오늘 데뷔하는 내 프로필", emoji: "🌟", accent: "#FFE0EC", badge: "NEW", tags: ["인생샷"], go: "idol" },
      { id: "xmas", title: "크리스마스 화보", subtitle: "따뜻한 연말 한 장", emoji: "🎄", accent: "#E7F7EA", badge: "NEW", tags: ["시즌"], go: "xmas" },
      { id: "graduation", title: "AI 졸업사진", subtitle: "학사모 쓴 내 모습", emoji: "🎓", accent: "#DCEBFF", badge: "NEW", tags: ["졸업"], go: "graduation" },
      { id: "wedding", title: "웨딩 화보", subtitle: "드레스·턱시도 입은 나", emoji: "💍", accent: "#FFE0EC", badge: "NEW", tags: ["웨딩"], go: "wedding" },
      { id: "petstudio", title: "펫 스튜디오 화보", subtitle: "우리 애기 화보 찍는 날", emoji: "🐶", accent: "#FFF1E0", badge: "NEW", tags: ["반려동물"], go: "petstudio" },
      { id: "petreceipt", title: "펫 관상 영수증", subtitle: "우리 애 관상, 영수증으로", emoji: "🧾", accent: "#E7F7EA", badge: "NEW", tags: ["반려동물"], go: "petreceipt" },
      { id: "era", title: "시대·복장 변신", subtitle: "다른 시대에 태어났다면?", emoji: "🕰️", accent: "#EFEAFF", badge: "NEW", tags: ["재미"], go: "era" },
      { id: "petcostume", title: "펫 코스튬", subtitle: "우리 애 옷 입혀보기", emoji: "🎀", accent: "#FFE0EC", badge: "NEW", tags: ["반려동물"], go: "petcostume" },
      { id: "couple", title: "커플 스튜디오 화보", subtitle: "둘이 함께, 스튜디오 화보", emoji: "💑", accent: "#FFE0EC", badge: "NEW", tags: ["커플"], go: "couple" },
      { id: "hanbokcouple", title: "웨딩 한복 커플", subtitle: "한복 입고 둘이 한 장", emoji: "👘", accent: "#FFF1E0", badge: "NEW", tags: ["커플"], go: "hanbokcouple" },
      { id: "friend", title: "우정 스냅", subtitle: "베프랑 같이 찍은 한 장", emoji: "👯", accent: "#DCEBFF", badge: "NEW", tags: ["우정"], go: "friend" },
      { id: "family", title: "가족 스튜디오 화보", subtitle: "온 가족이 한 장에", emoji: "👨‍👩‍👧‍👦", accent: "#E7F7EA", badge: "NEW", tags: ["가족"], go: "family" },
      { id: "familyhanbok", title: "한복 명절 가족사진", subtitle: "명절에 꺼내 쓰는 한 장", emoji: "🏮", accent: "#FFF1E0", badge: "NEW", tags: ["가족"], go: "familyhanbok" },
      { id: "familypet", title: "반려동물과 가족사진", subtitle: "우리 애도 가족이니까", emoji: "🐾", accent: "#DCEBFF", badge: "NEW", tags: ["가족"], go: "familypet" },
      { id: "fourcut", title: "인생네컷", subtitle: "나 혼자 네컷 한 장", emoji: "📸", accent: "#FFE0EC", badge: "NEW", tags: ["네컷"], go: "fourcut" },
      { id: "fourcutillust", title: "인생네컷 (일러스트)", subtitle: "그림체 네컷 한 장", emoji: "🎨", accent: "#EFEAFF", badge: "NEW", tags: ["네컷"], go: "fourcutillust" },
      { id: "fourcutcouple", title: "커플 네컷", subtitle: "둘이 함께 네컷 한 장", emoji: "📸", accent: "#DCEBFF", badge: "NEW", tags: ["네컷"], go: "fourcutcouple" },
      { id: "family", title: "가족사진", subtitle: "온 가족 AI 합성", emoji: "👨‍👩‍👧", accent: "#E7F7EA", badge: "", tags: ["가족"], go: "" },
      { id: "lifeshot", title: "인생샷 필터", subtitle: "감성 보정 한 장", emoji: "📸", accent: "#EFEAFF", badge: "", tags: ["인생샷"], go: "" },
    ],
  },
  {
    id: "idstyle", heading: "", title: "이런 스타일은 어때요?", layout: "grid",
    items: [
      { id: "s1", title: "올림머리 블랙 정장", subtitle: "클래식의 정석", emoji: "🧑‍💼", accent: "#DCEBFF", badge: "", tags: [], go: "idphoto", image: "/cards/idphoto-s1.jpg" },
      { id: "s2", title: "긴머리 블랙 정장", subtitle: "부드러운 인상을 주는", emoji: "💁", accent: "#FFE0EC", badge: "", tags: [], go: "idphoto", image: "/cards/idphoto-s2.jpg" },
      { id: "s3", title: "블랙 셋업", subtitle: "기본을 충실히 담아낸", emoji: "🕴️", accent: "#ECEEF1", badge: "", tags: [], go: "idphoto", image: "/cards/idphoto-s3.jpg" },
      { id: "s4", title: "네이비 셔츠", subtitle: "은은하면서도 깊이감 있는", emoji: "👔", accent: "#E1ECFF", badge: "", tags: [], go: "idphoto", image: "/cards/idphoto-s4.jpg" },
    ],
  },
];
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [usageCount, setUsageCount] = useState(0);
  // ✅ 추가: remaining (bonus 포함한 실제 잔여 횟수)
  const [usageRemaining, setUsageRemaining] = useState(FREE_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showMakeScreen, setShowMakeScreen] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [payingProduct, setPayingProduct] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyView, setHistoryView] = useState<HistoryItem | null>(null);
  const [detail, setDetail] = useState<Concept | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const [allConceptsCat, setAllConceptsCat] = useState("all");
  const [historyTab, setHistoryTab] = useState<"image" | "motion">("image");
  // ✅ usage를 fetch하는 함수 (재사용 가능하도록 분리)
  const fetchUsage = useCallback(() => {
    fetch("/api/usage")
      .then(r => r.json())
      .then(d => {
        setUsageCount(d.count ?? 0);
        setLimitReached(d.limitReached ?? false);
        setUsageRemaining(d.remaining ?? FREE_LIMIT);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.loggedIn) setUser(d.user); }).catch(() => {}).finally(() => setUserLoading(false));
    fetchUsage();
  }, [fetchUsage]);
  // ✅ 결제 완료 후 홈 복귀 시 usage 재조회 (?refreshed=1 감지)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("refreshed") === "1") {
      fetchUsage();
      // URL에서 파라미터 제거 (뒤로가기 시 재실행 방지)
      window.history.replaceState({}, "", "/");
    }
  }, [fetchUsage]);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    setLoadingMsg(LOADING_MESSAGES[0]);
    let idx = 0;
    const m = setInterval(() => { idx = (idx + 1) % LOADING_MESSAGES.length; setLoadingMsg(LOADING_MESSAGES[idx]); }, 3500);
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [loading]);
 // 로그인 상태면 클라우드(Blob+Redis) 히스토리를, 비로그인이면 기존 로컬(IndexedDB)을 표시
 const loadHistory = useCallback(async () => {
   if (user) {
     const cloud = await getCloudHistory();
     setHistory(cloud.map(c => ({ id: c.id, src: c.url, concept: c.concept, createdAt: c.createdAt })));
   } else {
     setHistory(await getHistory());
   }
 }, [user]);
 useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);
  const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result as string); r.onerror = rej; });
  const compress = (b64: string): Promise<string> => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const M = 512; let { width: w, height: h } = img;
      if (w > h) { if (w > M) { h = h * M / w; w = M; } } else { if (h > M) { w = w * M / h; h = M; } }
      c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = b64;
  });
  const handleLogin = () => { window.location.href = "/api/auth/kakao"; };
  const handleLogout = () => { window.location.href = "/api/auth/logout"; };
  const handlePayment = useCallback(async (productId: string) => {
    if (!user) { handleLogin(); return; }
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    setPayingProduct(productId);
    try {
      const { loadTossPayments } = await import("@tosspayments/payment-sdk");
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const orderId = "order_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      await tossPayments.requestPayment("카드", {
        amount: product.price,
        orderId,
        orderName: "MOSPIC " + product.name,
        customerName: user.nickname,
        successUrl: window.location.origin + "/payment/success?productId=" + productId,
        failUrl: window.location.origin + "/payment/fail",
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        alert("결제 중 오류가 발생했어요: " + (err?.message || ""));
      }
    } finally {
      setPayingProduct(null);
    }
  }, [user]);
  const handleDownload = async () => {
    const url = results[selected];
    try {
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
      const a = document.createElement("a"); a.href = url.startsWith("data:") ? url : `/api/download?url=${encodeURIComponent(url)}`; a.download = `mospic_${ts}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { window.open(url, "_blank"); }
  };
  const handleShare = async () => {
    const url = results[selected];
    const text = `👶 AI가 예측한 ${gender === "girl" ? "딸" : "아들"} 얼굴이에요!\nhttps://baby-face-app-seven.vercel.app`;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "babyface.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: "우리 아기 얼굴은?", text, files: [file] });
      else if (navigator.share) await navigator.share({ title: "우리 아기 얼굴은?", text, url: "https://baby-face-app-seven.vercel.app" });
      else { await navigator.clipboard.writeText(text); alert("링크가 복사됐어요!"); }
    } catch (e: unknown) { if ((e as {name?:string})?.name !== "AbortError") handleDownload(); }
  };
  const handleSubmit = async () => {
    if (!user) { handleLogin(); return; }
    if (limitReached || !image1 || !image2) { if (!image1 || !image2) setError("엄마와 아빠 사진을 모두 올려주세요."); return; }
    setLoading(true); setError(""); setResults([]); setSelected(0);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      setStep("압축");
      const [c1, c2] = await Promise.all([compress(image1), compress(image2)]);
      setStep("전송");
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image1: c1, image2: c2, gender }), signal: ctrl.signal });
      clearTimeout(tid); setStep("생성");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setIsPremiumResult(!!data.isPremium);
      try { const ur = await fetch("/api/usage", { method: "POST" }); if (ur.ok) { const ud = await ur.json(); setUsageCount(ud.count); setLimitReached(ud.limitReached); setUsageRemaining(ud.remaining ?? FREE_LIMIT); } } catch { /* ignore */ }
      setResults(data.output); setStep("");
      await addToHistory(data.output, "아기 얼굴");
      loadHistory();
    } catch (e: unknown) {
      clearTimeout(tid); setStep("");
      const err = e as {name?:string;message?:string};
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };
  // ─── 공통 헤더 ───────────────────────────────────────────────
  const Header = ({ title, onBack }: { title?: string; onBack?: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 58, background: "#fff", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", padding: "4px 8px 4px 0", cursor: "pointer", color: "#111", display: "flex" }}>
            <Icon.Back />
          </button>
        ) : (
          <img src="/logo.png" alt="mospic" style={{ height: 28, width: "auto", display: "block" }} />
        )}
        {title && <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{title}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {!onBack && (
          userLoading ? <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f5f5f5" }} /> :
          user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user.profileImage && <img src={user.profileImage} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} alt="" />}
              <button onClick={handleLogout} style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}>로그아웃</button>
            </div>
          ) : (
            <button onClick={handleLogin} style={{ background: "#FEE500", border: "none", borderRadius: 18, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", color: "#191919" }}>
              카카오 로그인
            </button>
          )
        )}
        {!onBack && (
          <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex", padding: 0 }}>
            <Icon.Settings />
          </button>
        )}
      </div>
    </div>
  );
  // ─── 하단 탭 (Mevu 스타일: 활성 탭 캡슐로 떠오름) ──────────────
  const tabs = [
    { id: "home" as Tab, Icon: Icon.Home, label: "홈" },
    { id: "ticket" as Tab, Icon: Icon.Ticket, label: "이용권" },
    { id: "coupon" as Tab, Icon: Icon.Coupon, label: "쿠폰" },
    { id: "history" as Tab, Icon: Icon.History, label: "히스토리" },
  ];
  const BottomNav = () => (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 40, paddingBottom: "env(safe-area-inset-bottom)", pointerEvents: "none" }}>
      <div style={{ margin: "0 14px 14px", background: "#fff", borderRadius: 30, boxShadow: "0 4px 18px rgba(0,0,0,0.08)", border: "1px solid #f3f3f3", display: "flex", padding: "8px 6px", pointerEvents: "auto" }}>
        {tabs.map(({ id, Icon: I, label }) => {
          const on = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); setShowMakeScreen(false); }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: on ? "7px 20px" : "7px 0", borderRadius: 18, background: on ? "#191919" : "transparent", color: on ? "#fff" : "#bbb", transition: "all .2s" }}>
                <I />
              </span>
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 400, color: on ? "#191919" : "#bbb" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
// ─── 홈 메인 (Mevu 스타일 카탈로그) ──────────────────────────
  const HomeMain = () => {
    const [pill, setPill] = useState(0);
    const [heroIdx, setHeroIdx] = useState(0);
    const heroRef = useRef<HTMLDivElement>(null);
 // 카드 탭 → 상세 페이지 열기
const handleCardTap = (go: string) => setDetail(conceptForGo(go));
    // 히어로 스크롤 시 현재 인덱스 추적 (점 인디케이터용)
    const onHeroScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setHeroIdx(idx);
    };
    const renderCard = (item: HomeCardItem, width: string | number, ratio: string) => (
      <div key={item.id} onClick={() => handleCardTap(item.go)} style={{ width, flexShrink: 0, cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          <div style={{ aspectRatio: ratio, borderRadius: HOME.radius, overflow: "hidden", background: `linear-gradient(155deg, ${item.accent} 0%, #ffffff 135%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
            {item.image ? <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
          </div>
          {item.badge && <span style={{ position: "absolute", left: 10, bottom: 10, background: HOME.accent, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>{item.badge}</span>}
        </div>
        <p style={{ margin: "11px 2px 1px", fontSize: 12.5, color: HOME.sub, fontWeight: 500 }}>{item.subtitle}</p>
        <p style={{ margin: "0 2px", fontSize: 16, color: HOME.text, fontWeight: 800, lineHeight: 1.25 }}>{item.title}</p>
        {item.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", padding: "0 2px" }}>
            {item.tags.map(t => <span key={t} style={{ fontSize: 11.5, color: HOME.tagText, background: HOME.tagBg, padding: "4px 11px", borderRadius: 20, fontWeight: 600 }}>{t}</span>)}
          </div>
        )}
      </div>
    );
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        {/* 카테고리 칩 */}
        <div className="hide-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "8px 18px 10px" }}>
          {HOME_PILLS.map((p, i) => {
            const on = pill === i;
            return (
              <button key={p.label} onClick={() => setPill(i)} style={{ position: "relative", flexShrink: 0, padding: "9px 18px", borderRadius: 22, cursor: "pointer", fontSize: 13.5, fontWeight: 700, border: on ? "1.5px solid #191919" : "1.5px solid #EAEBED", background: on ? HOME.text : "#fff", color: on ? "#fff" : "#7E848C" }}>
                {p.label}
              
              </button>
            );
          })}
        </div>
        {/* 상단 배너 (한 장씩 꽉 차게 스와이프 + 점 인디케이터) */}
        <div ref={heroRef} onScroll={onHeroScroll} className="hide-scrollbar" style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", padding: "0 18px" }}>
          {HOME_HERO.map(h => (
            <div key={h.id} style={{ flexShrink: 0, width: "100%", scrollSnapAlign: "center", paddingRight: 0, boxSizing: "border-box" }}>
              <div onClick={() => handleCardTap(h.go)} style={{ borderRadius: 22, height: 240, cursor: "pointer", position: "relative", overflow: "hidden", background: `linear-gradient(165deg, ${h.accent} 0%, #ffffff 130%)` }}>
                {h.image ? (
                  <>
                    <img src={h.image} alt={h.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 30%, transparent 55%)" }} />
                  </>
                ) : (
                  <div style={{ position: "absolute", right: 18, top: 44, fontSize: 120, opacity: 0.4 }}>{h.emoji}</div>
                )}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 25, fontWeight: 900, color: h.image ? "#fff" : HOME.text, letterSpacing: -0.5 }}>{h.title}</p>
                  <p style={{ margin: "7px 0 0", fontSize: 14, fontWeight: 500, color: h.image ? "rgba(255,255,255,0.9)" : "#6a6a6a" }}>{h.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 점 인디케이터 */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 12 }}>
          {HOME_HERO.map((_, i) => (
            <span key={i} style={{ width: heroIdx === i ? 18 : 6, height: 6, borderRadius: 3, background: heroIdx === i ? "#191919" : "#D8D8D8", transition: "all .2s" }} />
          ))}
        </div>
        {/* 무료 횟수 (기존 기능 유지) */}
        {user && (
          <div style={{ margin: "16px 18px 0", background: limitReached ? "#FFF0F3" : "#F7F7F9", borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 11, color: limitReached ? "#FF4B7C" : "#888", margin: "0 0 2px" }}>무료 체험 현황</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: limitReached ? "#FF4B7C" : "#111", margin: 0 }}>
                {limitReached ? "이용권이 필요해요" : `${usageRemaining}회 남았어요`}
              </p>
            </div>
            {limitReached ? (
              <button onClick={() => setShowPaymentSheet(true)} style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>이용권 구매</button>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: FREE_LIMIT }).map((_, i) => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < usageCount ? "#ddd" : "#FF4B7C" }} />))}
              </div>
            )}
          </div>
        )}
        {/* 섹션들 */}
        {HOME_SECTIONS.map(section => {
          const isGrid = section.layout === "grid";
          const cat = HOME_PILLS[pill].value;
          // "인기"는 badge가 BEST/NEW인 카드만, 나머지는 카테고리 매칭
          const filteredItems = cat === "all"
            ? section.items
            : cat === "hot"
            ? section.items.filter(it => it.badge === "BEST" || it.badge === "NEW")
            : section.items.filter(it => (GO_CATEGORIES[it.go] || []).includes(cat));
          if (filteredItems.length === 0) return null;
          return (
            <div key={section.id} style={{ marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 18px", marginBottom: 13 }}>
                <div>
                  {section.heading ? <p style={{ margin: "0 0 3px", fontSize: 13, color: HOME.text, fontWeight: 500 }}>{section.heading}</p> : null}
                  <p style={{ margin: 0, fontSize: 20, color: HOME.text, fontWeight: 900, letterSpacing: -0.4 }}>{section.title}</p>
                </div>
                <button onClick={() => { setAllConceptsCat(HOME_PILLS[pill].value); setShowAllConcepts(true); }} style={{ color: HOME.sub, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", background: "none", border: "none", cursor: "pointer", padding: 0 }}>전체보기 ›</button>
              </div>
              {isGrid ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 18px" }}>
                  {filteredItems.map(it => renderCard(it, "100%", "3 / 4"))}
                </div>
              ) : (
                <div className="hide-scrollbar" style={{ display: "flex", gap: 13, overflowX: "auto", padding: "0 18px 4px" }}>
                  {filteredItems.map(it => renderCard(it, 170, "4 / 5"))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ height: 110 }} />
      </div>
    );
  };
  // ─── 아기 얼굴 만들기 화면 ────────────────────────────────────
  const MakeScreen = () => (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <Header title="아기 얼굴 예측" onBack={() => { setShowMakeScreen(false); setResults([]); setImage1(""); setImage2(""); setError(""); }} />
      <div style={{ padding: "20px 20px 100px" }}>
        {/* 비로그인 */}
        {!userLoading && !user && (
          <div style={{ background: "#FFFBE6", border: "1px solid #FEE500", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontWeight: 700, color: "#111", marginBottom: 12, fontSize: 14 }}>카카오 로그인 후 이용 가능해요</p>
            <button onClick={handleLogin} style={{ background: "#FEE500", border: "none", borderRadius: 24, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#111" }}>
              카카오로 시작하기
            </button>
          </div>
        )}
        {/* 결제 유도 */}
        {limitReached && (
          <div style={{ border: "1.5px solid #F0F0F0", borderRadius: 20, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <p style={{ fontSize: 17, fontWeight: 900, color: "#111", margin: "0 0 6px" }}>무료 체험이 끝났어요</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 16px" }}>이용권을 구매하고 계속 사용하세요</p>
            <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "12px 16px", marginBottom: 16, textAlign: "left" }}>
              {["무제한 아기 얼굴 예측", "고화질 결과 이미지", "결과 저장 및 공유"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "#444" }}>
                  <span style={{ color: "#FF4B7C" }}>✓</span> {t}
                </div>
              ))}
            </div>
            <button onClick={() => setShowPaymentSheet(true)}
              style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              이용권 구매하기
            </button>
          </div>
        )}
        {/* 성별 선택 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10 }}>아기 성별</p>
          <div style={{ display: "flex", gap: 8, background: "#F1F2F6", borderRadius: 14, padding: 4 }}>
            {([["girl", "👧", "딸"], ["boy", "👦", "아들"]] as const).map(([g, emoji, label]) => (
              <button key={g} onClick={() => setGender(g)}
                style={{ flex: 1, padding: "11px 0", borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, transition: "all .2s",
                  background: gender === g ? "#fff" : "transparent",
                  color: gender === g ? "#FF4B7C" : "#8A8F99",
                  boxShadow: gender === g ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
        {/* 사진 업로드 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", marginBottom: 10 }}>사진 업로드</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              { state: image1, setter: setImage1, emoji: "👩", label: "엄마 사진", color: "#FFF0F5", borderColor: "#FFD6E7" },
              { state: image2, setter: setImage2, emoji: "👨", label: "아빠 사진", color: "#F0F5FF", borderColor: "#D6E4FF" },
            ]).map(({ state, setter, emoji, label, color, borderColor }, idx) => (
              <label key={idx} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, border: `1.5px ${state ? "solid" : "dashed"} ${state ? borderColor : "#E8E8E8"}`, background: state ? color : "#FAFAFA", transition: "all .2s" }}>
                  {state ? (
                    <img src={state} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} alt="" />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{emoji}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>{state ? "사진이 선택됐어요" : "탭해서 사진 선택하기"}</p>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: state ? "#FF4B7C" : "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                    {state ? <Icon.Check /> : <span style={{ color: "#999", fontSize: 18, lineHeight: 1 }}>+</span>}
                  </div>
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async e => { if (e.target.files?.[0]) setter(await toBase64(e.target.files[0])); }} />
              </label>
            ))}
          </div>
        </div>
        {/* 생성 버튼 */}
        {!limitReached && (
          <button onClick={handleSubmit} disabled={loading || !user}
            style={{ width: "100%", background: loading || !user ? "#F0F0F0" : "#FF4B7C", color: loading || !user ? "#aaa" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || !user ? "not-allowed" : "pointer", boxShadow: loading || !user ? "none" : "0 6px 18px rgba(255,75,124,0.32)", transition: "all .2s" }}>
            {loading ? `예측 중... (${elapsed}초)` : !user ? "로그인 후 시작하기" : "아기 얼굴 예측하기 ✨"}
          </button>
        )}
        {/* 로딩 */}
        {loading && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{ fontSize: 56, animation: "bounce 1s infinite", display: "inline-block" }}>👶</div>
            <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "14px 18px", margin: "16px 0 12px", textAlign: "left" }}>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>AI 분석 중</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>{loadingMsg}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["압축", "전송", "생성"].map((s, i) => {
                const steps = ["압축","전송","생성"]; const idx = steps.indexOf(step);
                const isActive = step === s; const isDone = idx > i;
                return (
                  <div key={s} style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: "center", background: isActive ? "#FF4B7C" : isDone ? "#FFA9C4" : "#F0F0F0", color: isActive || isDone ? "#fff" : "#aaa", transition: "all .3s" }}>
                    {["🗜️ 압축","📤 전송","🎨 생성"][i]}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* 에러 */}
        {error && (
          <div style={{ background: "#FFF0F3", border: "1px solid #FFD6E0", borderRadius: 12, padding: "12px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}
        {/* 결과 */}
        {results.length > 0 && (
          <div style={{ marginTop: 24 }} className="fade-up">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: "0 0 6px" }}>
                {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
              </p>
              {isPremiumResult && (
                <span style={{ fontSize: 11, background: "#FF4B7C", color: "#fff", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                  ✦ Gen-4 Premium · 엄마+아빠 동시 반영
                </span>
              )}
            </div>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
              <img src={results[selected]} style={{ width: "100%", display: "block" }} alt="AI 아기 얼굴" />
              <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
                {selected + 1} / {results.length}
              </div>
            </div>
            {results.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {results.map((url, i) => (
                  <button key={i} onClick={() => setSelected(i)}
                    style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `3px solid ${selected === i ? "#FF4B7C" : "transparent"}`, cursor: "pointer", opacity: selected === i ? 1 : 0.5, padding: 0, transition: "all .2s" }}>
                    <img src={url} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} alt="" />
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: "#F7F7F7", color: "#111", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon.Download /> 저장하기
              </button>
              <button onClick={handleShare}
                style={{ flex: 1, background: "#FEE500", color: "#111", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon.Share /> 공유하기
              </button>
            </div>
            <Upscale4K image={results[selected]} />
            <button onClick={() => { setResults([]); setImage1(""); setImage2(""); setSelected(0); }}
              style={{ width: "100%", background: "#F7F7F7", color: "#666", border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon.Refresh /> 다시 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
  // ─── 이용권/쿠폰/히스토리 ─────────────────────────────────────
  const EmptyPage = ({ tabs: t, emptyTitle, emptyIcon, rightBtn }: { tabs: string[]; emptyTitle: string; emptyIcon: string; rightBtn?: React.ReactNode }) => {
    const [activeSubTab, setActiveSubTab] = useState(0);
    return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #F0F0F0", position: "relative" }}>
          {rightBtn && <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>{rightBtn}</div>}
          {t.map((label, i) => (
            <button key={i} onClick={() => setActiveSubTab(i)}
              style={{ flex: 1, padding: "14px 0", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: activeSubTab === i ? 700 : 400, color: activeSubTab === i ? "#111" : "#aaa",
                borderBottom: `2px solid ${activeSubTab === i ? "#FF4B7C" : "transparent"}`, transition: "all .2s" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, padding: 40 }}>
          <span style={{ fontSize: 56, opacity: 0.15 }}>{emptyIcon}</span>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#333", margin: 0 }}>{emptyTitle}</p>
          <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>구매하면 여기에 표시됩니다</p>
        </div>
      </div>
    );
  };
  const renderContent = () => {
    if (activeTab === "home" && showMakeScreen) return <MakeScreen />;
    if (activeTab === "home") return <HomeMain />;
    if (activeTab === "ticket") return (
      // ✅ usageRemaining 사용 (bonus 포함된 실제 잔여 횟수)
      <EmptyPage tabs={[`보유 ${usageRemaining}회`, "지난 이용권"]} emptyTitle="보유한 이용권이 없어요" emptyIcon="🎟️" />
    );
    if (activeTab === "coupon") return (
      <EmptyPage tabs={["내 쿠폰 0", "사용/만료 쿠폰"]} emptyTitle="보유한 쿠폰이 없어요" emptyIcon="🎫"
        rightBtn={<button style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.Plus /></button>} />
    );
   if (activeTab === "history") return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        {/* 제목 */}
        <div style={{ padding: "18px 16px 0", textAlign: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#191919" }}>히스토리</span>
        </div>
        {/* 이미지 / 모션 탭 */}
        <div style={{ display: "flex", borderBottom: "1px solid #F0F0F0", marginTop: 14 }}>
          {([["image", "이미지", history.length], ["motion", "모션", 0]] as const).map(([key, label, count]) => {
            const on = historyTab === key;
            return (
              <button key={key} onClick={() => setHistoryTab(key)}
                style={{ flex: 1, padding: "14px 0", border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: on ? 800 : 500, color: on ? "#191919" : "#B5B9C0", borderBottom: `2px solid ${on ? "#FF4B7C" : "transparent"}`, transition: "all .2s" }}>
                {label} <span style={{ color: on ? "#FF4B7C" : "#C2C6CE" }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 안내 문구 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 16px 4px", color: "#9B9B9B" }}>
          <span style={{ fontSize: 13 }}>ⓘ</span>
          <span style={{ fontSize: 12.5 }}>앱을 삭제하면 결과물이 사라져요!</span>
        </div>

        {/* 이미지 탭 내용 */}
        {historyTab === "image" && (
          history.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 380, gap: 16, padding: 40, textAlign: "center" }}>
              <span style={{ fontSize: 56, opacity: 0.12 }}>🖼️</span>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#191919", margin: "0 0 6px" }}>아직 만든 사진이 없어요</p>
                <p style={{ fontSize: 13, color: "#9B9B9B", margin: 0 }}>나만의 프로필을 만들어보세요!</p>
              </div>
              <button onClick={() => { setActiveTab("home"); }} style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 24, padding: "13px 30px", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>만들러 가기</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 16px 8px" }}>
                <button onClick={async () => { if (window.confirm("저장된 사진을 모두 지울까요?")) { await clearHistory(); if (user) await clearCloudHistory(); setHistory([]); } }}
                  style={{ background: "none", border: "none", color: "#B5B9C0", fontSize: 12, cursor: "pointer" }}>전체 삭제</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "0 4px 4px" }}>
                {history.map(item => (
                  <button key={item.id} onClick={() => setHistoryView(item)} style={{ position: "relative", padding: 0, border: "none", cursor: "pointer", background: "none" }}>
                    <img src={item.src} alt={item.concept} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", borderRadius: 8 }} />
                    <span style={{ position: "absolute", left: 5, bottom: 5, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>{item.concept}</span>
                  </button>
                ))}
              </div>
            </>
          )
        )}

        {/* 모션 탭 내용 (준비중) */}
        {historyTab === "motion" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 380, gap: 16, padding: 40, textAlign: "center" }}>
            <span style={{ fontSize: 56, opacity: 0.12 }}>🎬</span>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#191919", margin: "0 0 6px" }}>모션은 곧 만나요</p>
              <p style={{ fontSize: 13, color: "#9B9B9B", margin: 0 }}>움직이는 프로필 기능을 준비하고 있어요</p>
            </div>
          </div>
        )}

        {/* 크게 보기 (기존 유지) */}
        {historyView && (
          <div onClick={() => setHistoryView(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <img src={historyView.src} alt="" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 14, objectFit: "contain" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { const a = document.createElement("a"); a.href = historyView.src; a.download = `photo_${historyView.id}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                style={{ background: "#fff", color: "#111", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>저장하기</button>
              <button onClick={() => setHistoryView(null)} style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        )}
      </div>
    );
  };
  // ─── 이용권 구매 바텀시트 ─────────────────────────────────────
  const PaymentSheet = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) setShowPaymentSheet(false); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>이용권 구매</p>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>구매한 이용권은 1년간 유효해요</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PRODUCTS.map(product => (
            <button key={product.id}
              onClick={() => { setShowPaymentSheet(false); handlePayment(product.id); }}
              disabled={payingProduct === product.id}
              style={{ width: "100%", background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left", transition: "all .2s" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, background: product.tag === "베스트" ? "#FF4B7C" : "#111", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                    {product.tag}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{product.name}</span>
                </div>
                <p style={{ fontSize: 12, color: "#999", margin: 0 }}>회당 {Math.round(product.price / product.uses).toLocaleString()}원</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 17, fontWeight: 900, color: "#111", margin: 0 }}>
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", margin: "16px 0 0" }}>
          결제는 토스페이먼츠를 통해 안전하게 처리됩니다
        </p>
      </div>
    </div>
  );
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", position: "relative", minHeight: "100vh", background: "#fff" }}>
      {!showMakeScreen && <Header />}
      <main style={{ paddingBottom: 80 }}>
        {renderContent()}
        {detail && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 130, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 2 }}>
              <button onClick={() => setDetail(null)} style={{ background: "rgba(255,255,255,0.9)", border: "none", width: 38, height: 38, borderRadius: "50%", fontSize: 22, cursor: "pointer", color: "#191919", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>‹</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginTop: -58 }}>
              {detail.detailImage ? (
                /* 통이미지 상세페이지: 풀폭 이미지 한 장만 */
                <img src={detail.detailImage} alt={detail.title} style={{ width: "100%", display: "block" }} />
              ) : (
              <>
              {/* 대표 이미지 (heroImages 여러장 스와이프 > heroImage 1장 > 이모지) */}
              {(() => {
                const heroes = detail.heroImages && detail.heroImages.length > 0
                  ? detail.heroImages
                  : detail.heroImage ? [detail.heroImage] : [];
                if (heroes.length > 0) {
                  return (
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", gap: 0, WebkitOverflowScrolling: "touch" }}>
                        {heroes.map((src, i) => (
                          <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", aspectRatio: "3/4", background: "#F1F2F6" }}>
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </div>
                        ))}
                      </div>
                      {heroes.length > 1 && (
                        <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                          {heroes.map((_, i) => (
                            <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div style={{ aspectRatio: "3/4", background: `linear-gradient(155deg, ${detail.accent} 0%, #ffffff 150%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 96 }}>{detail.emoji}</span>
                  </div>
                );
              })()}

              <div style={{ padding: "22px 20px 28px" }}>
                {/* 태그 칩 */}
                {detail.tags && detail.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
                    {detail.tags.map((t, i) => (
                      <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: i === 0 ? "#191919" : "#9298A2", background: i === 0 ? "#F0F1F4" : "#F7F8FA", padding: "7px 14px", borderRadius: 20 }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* 부제 + 큰 제목 */}
                <p style={{ fontSize: 14, color: "#FF4B7C", fontWeight: 700, margin: "0 0 6px" }}>{detail.subtitle}</p>
                <h2 style={{ fontSize: 27, fontWeight: 900, color: "#191919", margin: "0 0 18px", lineHeight: 1.22, letterSpacing: "-0.5px" }}>{detail.title}</h2>

                {/* 설명 */}
                <p style={{ fontSize: 15, color: "#5A5F66", lineHeight: 1.7, margin: "0 0 30px" }}>{detail.description}</p>

                {/* 예시 결과물 */}
                {detail.exampleImages && detail.exampleImages.length > 0 ? (
                  <>
                    <p style={{ fontSize: 15.5, fontWeight: 800, color: "#191919", margin: "0 0 14px" }}>이런 느낌으로 만들어드려요</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {detail.exampleImages.map((src, i) => (
                        <div key={i} style={{ aspectRatio: "4/5", borderRadius: 16, overflow: "hidden", background: "#F1F2F6" }}>
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15.5, fontWeight: 800, color: "#191919", margin: "0 0 14px" }}>이런 느낌으로 만들어드려요</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {detail.examples.map((ex, i) => (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: 16, background: `linear-gradient(155deg, ${ex.accent} 0%, #ffffff 140%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>{ex.emoji}</div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11.5, color: "#C2C6CE", margin: "12px 2px 0" }}>※ 예시 이미지는 준비 중이에요. 실제 결과물로 곧 교체돼요.</p>
                  </>
                )}
              </div>
              </>
              )}
            </div>

            {/* 고정 버튼 */}
            <div style={{ padding: "12px 16px 22px", background: "#fff", boxShadow: "0 -4px 20px rgba(0,0,0,0.05)", flexShrink: 0 }}>
              {detail.start === "soon" ? (
                <button disabled style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "#EEE", color: "#999", fontSize: 16, fontWeight: 800 }}>곧 만나요</button>
              ) : (
                <button onClick={() => { setDetail(null); if (detail.start === "baby") { setActiveTab("home"); setShowMakeScreen(true); } else if (detail.start === "idphoto") { window.location.href = "/id-photo"; } else if (detail.start === "voxel") { window.location.href = "/voxel"; } else if (detail.start === "food") { window.location.href = "/food"; } else if (detail.start === "factory") { window.location.href = "/factory"; } else if (detail.start === "pet") { window.location.href = "/pet"; } else if (detail.start === "product") { window.location.href = "/product"; } else if (detail.start === "restore") { window.location.href = "/restore"; } else if (detail.start === "realestate") { window.location.href = "/realestate"; } else if (detail.start === "interior") { window.location.href = "/interior"; } else if (detail.start === "car") { window.location.href = "/car"; } else if (detail.start === "lifeshot") { window.location.href = "/lifeshot"; } else if (detail.start === "bizprofile") { window.location.href = "/bizprofile"; } else if (detail.start === "hairstyle") { window.location.href = "/hairstyle"; } else if (detail.start === "illust") { window.location.href = "/illust"; } else if (detail.start === "idskyblue") { window.location.href = "/id-skyblue-skyblue"; } else if (detail.start === "biznavy") { window.location.href = "/biz-navy-gray"; } else if (detail.start === "figure") { window.location.href = "/figure"; } else if (detail.start === "age") { window.location.href = "/age"; }else if (detail.start === "menu") { window.location.href = "/menu"; } else if (detail.start === "nukki") { window.location.href = "/nukki"; } else if (detail.start === "upscale") { window.location.href = "/upscale"; } else if (detail.start === "fashion") { window.location.href = "/fashion"; } else if (detail.start === "idol") { window.location.href = "/idol"; }else if (detail.start === "xmas") { window.location.href = "/xmas"; } else if (detail.start === "graduation") { window.location.href = "/graduation"; } else if (detail.start === "wedding") { window.location.href = "/wedding"; }else if (detail.start === "petstudio") { window.location.href = "/petstudio"; } else if (detail.start === "petreceipt") { window.location.href = "/petreceipt"; }else if (detail.start === "era") { window.location.href = "/era"; } else if (detail.start === "petcostume") { window.location.href = "/petcostume"; }else if (detail.start === "couple") { window.location.href = "/couple"; } else if (detail.start === "hanbokcouple") { window.location.href = "/hanbokcouple"; } else if (detail.start === "friend") { window.location.href = "/friend"; }else if (detail.start === "family") { window.location.href = "/family"; } else if (detail.start === "familyhanbok") { window.location.href = "/familyhanbok"; } else if (detail.start === "familypet") { window.location.href = "/familypet"; }else if (detail.start === "fourcut") { window.location.href = "/fourcut"; } else if (detail.start === "fourcutillust") { window.location.href = "/fourcutillust"; } else if (detail.start === "fourcutcouple") { window.location.href = "/fourcutcouple"; }}} style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", background: "#FF4B7C", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                  <span>프로필 만들기</span>
                  {detail.resultCount ? <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>결과물 {detail.resultCount}장</span> : null}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "#F7F8FA", zIndex: 140, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, background: "#fff", borderBottom: "1px solid #EFF0F3", flexShrink: 0 }}>
            <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>설정</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
            {/* 필수 동의 약관 */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9B9B", margin: "8px 4px 8px" }}>필수 동의 약관</p>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
              <button onClick={() => alert("개인정보 처리방침은 준비 중이에요.")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>개인정보 처리방침</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <button onClick={() => alert("이용약관은 준비 중이에요.")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>이용약관</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
            </div>

            {/* 서비스 정보 */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9B9B", margin: "8px 4px 8px" }}>서비스 정보</p>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
              <button onClick={() => alert("고객센터는 준비 중이에요.")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>고객센터</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>현재 버전</span>
                <span style={{ fontSize: 13, color: "#9B9B9B" }}>1.0.0 · 최신 버전</span>
              </div>
            </div>

            {/* 사용자 정보 */}
            {user && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9B9B", margin: "8px 4px 8px" }}>계정</p>
                <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid #F2F3F5" }}>
                    {user.profileImage && <img src={user.profileImage} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt="" />}
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#191919", margin: 0 }}>{user.nickname}</p>
                      <p style={{ fontSize: 12, color: "#9B9B9B", margin: "2px 0 0" }}>카카오 계정 연결됨</p>
                    </div>
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(user.id); alert("사용자 ID가 복사됐어요."); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, color: "#9B9B9B" }}>사용자 ID</span>
                    <span style={{ fontSize: 12, color: "#C2C6CE", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.id} 📋</span>
                  </button>
                </div>
                <button onClick={handleLogout} style={{ width: "100%", background: "#fff", color: "#FF4B7C", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  로그아웃
                </button>
              </>
            )}

            {!user && (
              <button onClick={handleLogin} style={{ width: "100%", background: "#FEE500", color: "#191919", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                카카오 로그인
              </button>
            )}
          </div>
        </div>
      )}
      {showAllConcepts && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 135, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, background: "#fff", borderBottom: "1px solid #EFF0F3", flexShrink: 0 }}>
            <button onClick={() => setShowAllConcepts(false)} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>전체 AI 사진</span>
          </div>

          {/* 칩 필터 */}
          <div className="hide-scrollbar" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid #F4F5F7" }}>
            {HOME_PILLS.map(p => {
              const on = allConceptsCat === p.value;
              return (
                <button key={p.value} onClick={() => setAllConceptsCat(p.value)} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 22, cursor: "pointer", fontSize: 13.5, fontWeight: 700, border: on ? "1.5px solid #191919" : "1.5px solid #EAEBED", background: on ? HOME.text : "#fff", color: on ? "#fff" : "#7E848C" }}>
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 컨셉 그리드 (모든 섹션 카드 합쳐서 중복 제거) */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
            {(() => {
              // 모든 섹션 카드 모으기 + go 기준 중복 제거
              const seen = new Set<string>();
              const all: HomeCardItem[] = [];
              for (const sec of HOME_SECTIONS) {
                for (const it of sec.items) {
                  const k = it.go || it.id;
                  if (seen.has(k)) continue;
                  seen.add(k);
                  all.push(it);
                }
              }
              const cat = allConceptsCat;
              const list = cat === "all"
                ? all
                : cat === "hot"
                ? all.filter(it => it.badge === "BEST" || it.badge === "NEW")
                : all.filter(it => (GO_CATEGORIES[it.go] || []).includes(cat));

              if (list.length === 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
                    <span style={{ fontSize: 48, opacity: 0.15 }}>🪄</span>
                    <p style={{ fontSize: 14, color: "#9B9B9B", margin: 0 }}>이 카테고리는 준비 중이에요</p>
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {list.map(item => (
                    <div key={item.id} onClick={() => { setShowAllConcepts(false); setDetail(conceptForGo(item.go)); }} style={{ cursor: "pointer" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ aspectRatio: "3 / 4", borderRadius: HOME.radius, overflow: "hidden", background: `linear-gradient(155deg, ${item.accent} 0%, #ffffff 135%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                          {item.image ? <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
                        </div>
                        {item.badge && <span style={{ position: "absolute", left: 10, bottom: 10, background: HOME.accent, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>{item.badge}</span>}
                      </div>
                      <p style={{ margin: "10px 2px 1px", fontSize: 12.5, color: HOME.sub, fontWeight: 500 }}>{item.subtitle}</p>
                      <p style={{ margin: "0 2px", fontSize: 15, color: HOME.text, fontWeight: 800, lineHeight: 1.25 }}>{item.title}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {showPaymentSheet && <PaymentSheet />}
    </div>
  );
  }