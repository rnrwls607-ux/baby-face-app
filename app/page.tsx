"use client";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, Fragment } from "react";
import { PRODUCT_LIST as PRODUCTS } from "./lib/products";
import { addToHistory, getHistory, getCloudHistory, clearHistory, clearCloudHistory, deleteHistoryItem, deleteCloudHistoryItem, type HistoryItem } from "./lib/history";
import { CONCEPTS, POPULAR_KEYS, conceptForGo, type Concept } from "./lib/concepts";
import { toast } from "./lib/toast";
import { saveImage } from "./lib/saveImage";
import { shareImage } from "./lib/shareImage";
import { getFavorites, toggleFavorite } from "./lib/favorites";
import { APP_VERSION } from "./lib/version";
import { useBackClose } from "./lib/useBackClose";
import Upscale4K from "./components/Upscale4K";
import CoinWallet from "./components/CoinWallet";
import { aiReportMailto } from "./components/AiReportLink";
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
// go: "baby"=아기 만들기 화면 / ""=준비중
// go → 카테고리(복수 가능). 칩 필터용. 새 컨셉 추가하면 여기 한 줄 넣기.
const GO_CATEGORIES: Record<string, string[]> = {
  baby: ["fun"],
  voxel: ["fun"],
  pendrawing: ["fun"],
  oilportrait: ["fun"],
  softanime: ["fun"],
  retroanime: ["fun"],
  popart: ["fun"],
  marble: ["fun"],
  chibifigure: ["fun"],
  clayfigure: ["fun"],
  stitchart: ["fun"],
  pixelart: ["fun"],
  stainedglass: ["fun"],
  neonsign: ["fun"],
  paperart: ["fun"],
  stickerpack: ["fun"],
  toon3d: ["fun"],
  food: ["biz"],
  factory: ["biz"],
  pet: ["pet", "idcard"],        // 펫 + 증명사진 둘 다
  product: ["biz"],
  restore: ["fun"],
  realestate: ["biz"],
  interior: ["biz"],
  car: ["biz"],
  lifeshot: ["lifeshot"],
  y2k: ["fun"],
  roman: ["fun"],
  clay: ["fun"],
  luxe: ["lifeshot"],
  homecafe: ["biz"],
  travel: ["lifeshot"],
  hanbok: ["lifeshot"],
  retro90: ["fun"],
  hocance: ["lifeshot"],
  redcarpet: ["lifeshot"],
  birthday: ["lifeshot", "fun"],
  job: ["fun"],
  sporty: ["lifeshot"],
  flower: ["lifeshot"],
  halloween: ["fun"],
  goods: ["fun", "pet"],
  bizprofile: ["business"],
  biznavy: ["business"],
  bizmnavy: ["business"],
  bizmcharcoal: ["business"],
  bizmblack: ["business"],
  bizmlightgray: ["business"],
  bizmvest: ["business"],
  bizmbeige: ["business"],
  bizmblazer: ["business"],
  bizmturtle: ["business"],
  bizmdb: ["business"],
  bizmknittie: ["business"],
  bizblack: ["business"],
  bizwhite: ["business"],
  bizribbon: ["business"],
  bizbeige: ["business"],
  bizlavender: ["business"],
  bizgray: ["business"],
  bizknit: ["business"],
  bizchiffon: ["business"],
  bizpinkjacket: ["business"],
  bizcreamdress: ["business"],
  biznavyblouse: ["business"],
  bizskyblouse: ["business"],
  bizpinktweed: ["business"],
  bizshirring: ["business"],
  bizviolet: ["business"],
  bizblueskirt: ["business"],
  bizburgundy: ["business"],
  bizkhaki: ["business"],
  bizblackdress: ["business"],
  bizbluegray: ["business"],
  bizpinstripe: ["business"],
  bizcheck: ["business"],
  bizknitdress: ["business"],
  idskyblue: ["idcard"],
  idblack: ["idcard"],
  idnavy: ["idcard"],
  idcharcoal: ["idcard"],
  idwhiteshirt: ["idcard"],
  idbeige: ["idcard"],
  idblacktie: ["idcard"],
  idblouse: ["idcard"],
  idknit: ["idcard"],
  idturtleneck: ["idcard"],
  idglasses: ["idcard"],
  idoffshoulder: ["idcard"],
  idupdo: ["idcard"],
  idlonghair: ["idcard"],
  idtweed: ["idcard"],
  idwavebob: ["idcard"],
  idponytail: ["idcard"],
  idgarma: ["idcard"],
  iddropcut: ["idcard"],
  idperm: ["idcard"],
  idpomade: ["idcard"],
  idwarmbob: ["idcard"],
  idhime: ["idcard"],
  idashwave: ["idcard"],
  idlowbun: ["idcard"],
  idburgundy: ["idcard"],
  iddandy: ["idcard"],
  iddownperm: ["idcard"],
  idnavysuit: ["idcard"],
  idbeigeblazer: ["idcard"],
  idhenley: ["idcard"],
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
  petbirthday: ["pet"],
  petmemorial: ["pet"],
  petceo: ["pet"],
  petgraduation: ["pet"],
  petminhwa: ["pet"],
  petroyal: ["pet"],
  pettwo: ["pet"],
  petjob: ["pet"],
  petreceipt: ["pet", "fun"],
  era: ["fun"],
  petcostume: ["pet", "fun"],
  couple: ["family"],
  hanbokcouple: ["family"],
  friend: ["family", "fun"],
  remindwedding: ["family"],
  selfwedding: ["family"],
  duofamily: ["family"],
  coupletravel: ["family"],
  family: ["family"],
  familyhanbok: ["family"],
  familypet: ["family", "pet"],
  fourcut: ["fun", "lifeshot"],
  fourcutillust: ["fun"],
  fourcutcouple: ["fun", "family"],
  goldenhour: ["lifeshot"],
  fixnight: ["lifeshot"],
  season: ["lifeshot", "fun"],
  fixbacklight: ["lifeshot"],
  bgchange: ["lifeshot"],
  fixcrowd: ["lifeshot"],
  beauty: ["beauty"],
  anisky: ["lifeshot", "fun"],
  brickfigure: ["fun"],
  cheerglam: ["beauty"],
  crewglam: ["beauty"],
  guestlook: ["beauty", "lifeshot"],
  anchorglam: ["beauty"],
  goddessdress: ["beauty", "lifeshot"],
  tripface: ["lifeshot"],
  idolglam: ["beauty", "lifeshot"],
  campusgrad: ["lifeshot"],
  dresswedding: ["lifeshot"],
  deskfigure: ["fun"],
  digicam: ["fun"],
  airportsnap: ["lifeshot"],
  cinesnap: ["lifeshot"],
  schoolsnap: ["lifeshot"],
  gravityad: ["biz"],
  feltdoll: ["fun"],
  personalcolor: ["beauty"],
  monoactor: ["lifeshot"],
  fortunecard: ["fun"],
  minichef: ["biz"],
  poolside: ["lifeshot"],
  snowsnap: ["lifeshot"],
  profileduo: ["family","fun"],
  droneview: ["lifeshot"],
  autumnsnap: ["lifeshot"],
  trenchlook: ["lifeshot"],
  examcheer: ["lifeshot"],
  xmasvintage: ["fun"],
  campsnap: ["lifeshot"],
  picnicsnap: ["lifeshot"],
  partysnap: ["fun"],
  skisnap: ["lifeshot"],
  productscene: ["biz"],
  kidsdraw: ["biz"],
  flatlay: ["biz"],
  ghostfit: ["biz"],
  carad: ["biz"],
  gyaru: ["lifeshot"],
  genderswap: ["fun"],
};
// SSR에선 useEffect로 폴백 (useLayoutEffect 서버 경고 방지) — 복원 재연을 첫 페인트 전에 돌리기 위함
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
// 홈 칩(pill) 지속화 — HomeMain이 인라인 컴포넌트라 리렌더마다 리마운트되며 state가 리셋됨.
// 모듈 변수로 미러해 상세를 열었다 닫아도, 만들기 복귀 재연에서도 칩이 유지된다 (문서 세션 한정).
let persistedHomePill = 0; // 기본 "홈"(랜딩) — 0 홈 / 1 ⭐즐겨찾기 / 2 전체 / 3 인기
const HOME_PILLS = [
  { label: "홈", value: "home" },
  { label: "⭐ 즐겨찾기", value: "favs" },
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
// ─── 홈 히어로 슬라이드 ──────────────────────────────────────────────────────
// 소재를 늘리려면 ★이 배열에만 항목을 추가하면 된다 — 자동 순환·우하단 카운터는
// 배열 길이를 따라가고("/ 09"의 분모도 여기서 나온다), 코드는 손댈 곳이 없다.
//   id             고유 키
//   title          메인 카피 (\n 으로 줄바꿈)
//   subtitle       서브 카피
//   image          /public 기준 경로 — ★표시 규격 480×270(16:9), 2배수 권장 960×540
//   objectPosition 사진에서 보여줄 기준점 (얼굴이 잘리면 여기를 조절)
//   go             탭했을 때 열 컨셉 키 (CONCEPTS의 키)
//   accent/emoji   image가 없을 때 쓰는 폴백
//   split          ★한 장에 도구 둘을 반씩 담은 슬라이드. 있으면 title/subtitle 대신
//                  좌·우 50% 탭존이 각각 자기 컨셉 상세를 연다(go·텍스트 오버레이 미사용)
const HERO_SLIDES: {
  id: string; image: string; accent: string;
  title?: string; subtitle?: string; emoji?: string; go?: string; objectPosition?: string;
  split?: { label: string; key: string }[];
}[] = [
  { id: "main", title: "셀카 한 장이,\n작품이 되다", subtitle: "AI 프로필 · 증명사진 · 화보", emoji: "✨", accent: "#F5E9DC", go: "idburgundy", image: "/hero/hero_main.webp", objectPosition: "center 48%" },
  { id: "biz", title: "첫인상은\n프로필 사진에서", subtitle: "비즈니스 프로필 34종", emoji: "💼", accent: "#E8EAED", go: "bizmcharcoal", image: "/hero/hero_biz.webp", objectPosition: "center 50%" },
  { id: "freetools", accent: "#F2F2F2", image: "/hero/hero_freetools.webp", split: [
    { label: "배경 제거", key: "nukki" },
    { label: "4배 고화질", key: "upscale" },
  ] },
  { id: "idolglam", title: "오늘의 나,\n데뷔 화보의 주인공으로", emoji: "🌟", accent: "#F3E4F8", go: "idolglam", image: "/hero/hero_idolglam.webp", objectPosition: "center 50%" },
  { id: "hanbok", title: "추석엔,\n가장 고운 한복 화보", emoji: "🌸", accent: "#FCE8EF", go: "hanbok", image: "/hero/hero_hanbok.webp", objectPosition: "center 50%" },
  { id: "goldenhour", title: "그 사진,\n하루 중 가장 아름다운 빛으로", emoji: "🌅", accent: "#FBEEDF", go: "goldenhour", image: "/hero/hero_goldenhour.webp", objectPosition: "center 50%" },
  { id: "goddessdress", title: "오늘 밤의\n주인공은 나", emoji: "👗", accent: "#F5E7EE", go: "goddessdress", image: "/hero/hero_goddessdress.webp", objectPosition: "center 50%" },
  { id: "wedding", title: "웨딩 화보,\n스튜디오 없이도 눈부시게", emoji: "💍", accent: "#FBEFE9", go: "wedding", image: "/hero/hero_wedding.webp", objectPosition: "center 50%" },
  { id: "brickfigure", title: "내 하루가,\n손바닥 위 블록 세상으로", emoji: "🧱", accent: "#FBEFD6", go: "brickfigure", image: "/hero/hero_brickfigure.webp", objectPosition: "center 50%" },
];
const HERO_INTERVAL_MS = 5000; // 자동 전환 주기
// 성별 대상 도트 배지(시안 2 채택) — audience 있는 컨셉(사람 사진 필수)에만, 카드 사진 우상단.
// 펫·음식·공간·풍경·범용 도구는 audience 미지정이라 자동으로 안 뜬다. 히어로·목차 등 다른 형태 미적용.
const AUD_DOT: Record<string, { c: string; t: string }> = {
  female: { c: "#D96A8B", t: "여성" },
  male: { c: "#3A5FA8", t: "남성" },
  all: { c: "#9AA0AA", t: "공용" },
};
const audienceBadge = (go: string) => {
  const a = CONCEPTS[go]?.audience;
  if (!a) return null;
  const d = AUD_DOT[a];
  return (
    <span style={{ position: "absolute", right: 10, top: 10, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.8)", borderRadius: 20, padding: "3px 8px 3px 7px", fontSize: 11, fontWeight: 700, color: "#3A3E45", letterSpacing: 0.3 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.c }} />{d.t}
    </span>
  );
};
// cat: 이 섹션의 "전체보기 ›"가 열 카테고리(HOME_PILLS의 value). 비우면 현재 칩을 따른다.
const HOME_SECTIONS: { id: string; heading: string; title: string; layout: string; items: HomeCardItem[]; cat?: string }[] = [
  {
    id: "popular", heading: "지금 가장 많이 만드는", title: "인기 컨셉", layout: "grid", cat: "hot",
    items: [
      { id: "pop-bizpinkjacket", title: "핑크 트위드 재킷 프로필", subtitle: "우아하고 화사한 셋업", emoji: "🌷", accent: "#FCE8EF", image: "/cards/bizpinkjacket.webp", badge: "NEW", tags: ["비즈니스"], go: "bizpinkjacket" },
      { id: "pop-bizmnavy", title: "남성 네이비 정장", subtitle: "믿음직한 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/bizmnavy.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmnavy" },
      { id: "pop-interior", title: "인테리어 비포/애프터", subtitle: "빈 방에 가구를", emoji: "🛋️", accent: "#FFEFD6", badge: "NEW", tags: ["인테리어"], image: "/cards/interior.webp", go: "interior" },
      { id: "pop-idtweed", title: "반묶음 트위드 증명사진", subtitle: "포멀한 러블리 무드", emoji: "🎀", accent: "#F9EEE8", image: "/cards/idtweed.webp", badge: "NEW", tags: ["증명사진"], go: "idtweed" },
    ],
  },
  {
    id: "more", heading: "이런 것도 만들어드려요", title: "다양한 AI 사진", layout: "scroll",
    items: [
      { id: "hanbok", title: "한복 화보", subtitle: "추석엔, 가장 고운 한복 화보", emoji: "🌸", accent: "#FCE8EF", badge: "추석", tags: ["인생샷"], image: "/cards/hanbok.webp", go: "hanbok" },
      { id: "hanbokcouple", title: "웨딩 한복 커플", subtitle: "추석, 둘이 고운 한복으로", emoji: "👘", accent: "#FFF1E0", badge: "NEW", tags: ["커플"], image: "/cards/hanbokcouple.webp", go: "hanbokcouple" },
      { id: "familyhanbok", title: "명절 한복 2인", subtitle: "추석 부모님과, 고운 한복 2인 화보", emoji: "🏮", accent: "#FFF1E0", badge: "NEW", tags: ["가족"], image: "/cards/familyhanbok.webp", go: "familyhanbok" },
      { id: "baby", title: "우리 아기 얼굴은?", subtitle: "부모 닮은 아기 미리보기", emoji: "👶", accent: "#FFE0EC", badge: "BEST", tags: ["인기", "가족"], go: "baby", image: "/cards/baby.webp" },
      { id: "voxel", title: "복셀 아트", subtitle: "사진을 3D 블록으로", emoji: "🧊", accent: "#E1ECFF", badge: "NEW", tags: ["픽셀"], go: "voxel", image: "/cards/voxel.webp" },
      { id: "pendrawing", title: "펜 드로잉 초상", subtitle: "한 장의 손그림 초상화", emoji: "✒️", accent: "#F2F0EC", badge: "NEW", tags: ["재미"], go: "pendrawing", image: "/cards/pendrawing.webp" },
      { id: "oilportrait", title: "유화 명화 초상", subtitle: "미술관에 걸린 나", emoji: "🖼️", accent: "#EDE4D8", badge: "NEW", tags: ["재미"], go: "oilportrait", image: "/cards/oilportrait.webp" },
      { id: "softanime", title: "감성 애니 초상", subtitle: "애니메이션 한 장면처럼", emoji: "🌿", accent: "#E7F7EA", badge: "NEW", tags: ["재미"], go: "softanime", image: "/cards/softanime.webp" },
      { id: "retroanime", title: "레트로 애니 초상", subtitle: "90년대 애니 한 장면", emoji: "📼", accent: "#FFE8D6", badge: "NEW", tags: ["재미"], go: "retroanime", image: "/cards/retroanime.webp" },
      { id: "popart", title: "팝아트 포스터", subtitle: "원색으로 물든 나", emoji: "🎨", accent: "#FFE0EC", badge: "NEW", tags: ["재미"], go: "popart", image: "/cards/popart.webp" },
      { id: "marble", title: "대리석 조각상", subtitle: "미술관에 선 나", emoji: "🏛️", accent: "#EFF0F3", badge: "NEW", tags: ["재미"], go: "marble", image: "/cards/marble.webp" },
      { id: "chibifigure", title: "미니 피규어", subtitle: "책상 위 나의 피규어", emoji: "🧸", accent: "#FFE9D6", badge: "NEW", tags: ["재미"], go: "chibifigure", image: "/cards/chibifigure.webp" },
      { id: "clayfigure", title: "클레이 피규어", subtitle: "손으로 빚은 나", emoji: "🏺", accent: "#F6E7DA", badge: "NEW", tags: ["재미"], go: "clayfigure", image: "/cards/clayfigure.webp" },
      { id: "stitchart", title: "자수 초상", subtitle: "한 땀 한 땀 수놓은 나", emoji: "🧵", accent: "#FBE7EC", badge: "NEW", tags: ["재미"], go: "stitchart", image: "/cards/stitchart.webp" },
      { id: "pixelart", title: "픽셀 아트", subtitle: "도트로 그린 나의 세계", emoji: "👾", accent: "#E3ECFF", badge: "NEW", tags: ["재미"], go: "pixelart", image: "/cards/pixelart.webp" },
      { id: "stainedglass", title: "스테인드글라스", subtitle: "빛으로 물든 초상", emoji: "🪟", accent: "#E2E9FA", badge: "NEW", tags: ["재미"], go: "stainedglass", image: "/cards/stainedglass.webp" },
      { id: "neonsign", title: "네온사인 초상", subtitle: "어둠 속에 빛나는 나", emoji: "💡", accent: "#F6E1F5", badge: "NEW", tags: ["재미"], go: "neonsign", image: "/cards/neonsign.webp" },
      { id: "paperart", title: "페이퍼 아트", subtitle: "겹겹이 오려 만든 나", emoji: "✂️", accent: "#FBEEDF", badge: "NEW", tags: ["재미"], go: "paperart", image: "/cards/paperart.webp" },
      { id: "stickerpack", title: "스티커팩", subtitle: "여섯 컷 나만의 스티커", emoji: "🏷️", accent: "#FFF0D9", badge: "NEW", tags: ["재미"], go: "stickerpack", image: "/cards/stickerpack.webp" },
      { id: "toon3d", title: "3D 캐릭터 초상", subtitle: "극장판 주인공이 된 나", emoji: "🎬", accent: "#E7EDFB", badge: "NEW", tags: ["재미"], go: "toon3d", image: "/cards/toon3d.webp" },
      { id: "goldenhour", title: "골든아워", subtitle: "흐린 오후도 가장 아름다운 빛으로", emoji: "🌅", accent: "#FBEEDF", image: "/cards/goldenhour.webp", badge: "NEW", tags: ["인생샷"], go: "goldenhour" },
      { id: "fixnight", title: "야간 사진 구제", subtitle: "어두운 밤 사진, 밤은 그대로 선명하게", emoji: "🌙", accent: "#E7EAF3", image: "/cards/fixnight.webp", badge: "NEW", tags: ["인생샷"], go: "fixnight" },
      { id: "season", title: "계절 변환", subtitle: "같은 자리를 봄·여름·가을·겨울로", emoji: "🍂", accent: "#F7E9DE", image: "/cards/season.webp", badge: "NEW", tags: ["재미"], go: "season" },
      { id: "fixbacklight", title: "역광 구제", subtitle: "시커먼 얼굴은 환하게, 역광 감성은 그대로", emoji: "🔆", accent: "#FCEEDA", image: "/cards/fixbacklight.webp", badge: "NEW", tags: ["인생샷"], go: "fixbacklight" },
      { id: "bgchange", title: "배경 교체", subtitle: "나는 그대로, 배경만 바꿔요", emoji: "🖼️", accent: "#EDEDF0", image: "/cards/bgchange.webp", badge: "NEW", tags: ["인생샷"], go: "bgchange" },
      { id: "fixcrowd", title: "행인 지우개", subtitle: "낯선 사람들만 감쪽같이, 그 자리는 온전히", emoji: "🧹", accent: "#E3F0F2", image: "/cards/fixcrowd.webp", badge: "NEW", tags: ["인생샷"], go: "fixcrowd" },
      { id: "beauty", title: "뷰티 보정", subtitle: "쌩얼도, 메이크업 받은 날처럼", emoji: "💄", accent: "#FBE7EE", image: "/cards/beauty.webp", badge: "NEW", tags: ["헤어·뷰티"], go: "beauty" },
      { id: "anisky", title: "애니 감성", subtitle: "평범한 오후를 애니 영화의 한 장면으로", emoji: "⛅", accent: "#E2ECFA", image: "/cards/anisky.webp", badge: "NEW", tags: ["재미"], go: "anisky" },
      { id: "brickfigure", title: "블록 피규어", subtitle: "내 하루가 귀여운 블록 세상으로", emoji: "🧱", accent: "#FBEFD6", image: "/cards/brickfigure.webp", badge: "NEW", tags: ["재미"], go: "brickfigure" },
      { id: "cheerglam", title: "치어리더", subtitle: "오늘의 나, 경기장의 스타로", emoji: "📣", accent: "#E0475B", image: "/cards/cheerglam.webp", badge: "NEW", tags: ["헤어·뷰티"], go: "cheerglam" },
      { id: "crewglam", title: "승무원 스타일", subtitle: "단정한 쪽머리와 유니폼, 기내의 품격", emoji: "✈️", accent: "#2E4A7A", image: "/cards/crewglam.webp", badge: "NEW", tags: ["헤어·뷰티"], go: "crewglam" },
      { id: "guestlook", title: "하객룩", subtitle: "결혼식 가는 길, 가장 우아한 나", emoji: "💐", accent: "#B08497", image: "/cards/guestlook.webp", badge: "NEW", tags: ["헤어·뷰티", "인생샷"], go: "guestlook" },
      { id: "anchorglam", title: "아나운서", subtitle: "단정한 수트, 뉴스룸의 카리스마", emoji: "🎙️", accent: "#3A5FA8", image: "/cards/anchorglam.webp", badge: "NEW", tags: ["헤어·뷰티"], go: "anchorglam" },
      { id: "goddessdress", title: "여신 드레스", subtitle: "시상식 밤의 주인공처럼", emoji: "👗", accent: "#8E4B6B", image: "/cards/goddessdress.webp", badge: "NEW", tags: ["헤어·뷰티", "인생샷"], go: "goddessdress" },
      { id: "tripface", title: "여행 셀카 구제", subtitle: "배경은 그대로, 나는 그날의 베스트로", emoji: "🧳", accent: "#E07A5F", image: "/cards/tripface.webp", badge: "NEW", tags: ["인생샷"], go: "tripface" },
      { id: "idolglam", title: "아이돌 글램", subtitle: "오늘의 나, 데뷔 화보의 주인공으로", emoji: "🌟", accent: "#B54BC9", image: "/cards/idolglam.webp", badge: "NEW", tags: ["헤어·뷰티", "인생샷"], go: "idolglam" },
      // ─── 신규 4종 (2026-08-12 신설 · 2026-08-13 킷 반입·홈 오픈)
      { id: "campusgrad", title: "캠퍼스 졸업사진", subtitle: "가고 싶던 그 캠퍼스에서", emoji: "🎓", accent: "#EAF0E4", image: "/cards/campusgrad.webp", badge: "NEW", tags: ["인생샷"], go: "campusgrad" },
      { id: "dresswedding", title: "웨딩 스냅", subtitle: "오늘, 웨딩 화보의 주인공", emoji: "💍", accent: "#FBEFE9", image: "/cards/dresswedding.webp", badge: "NEW", tags: ["인생샷"], go: "dresswedding" },
      { id: "gyaru", title: "갸루 메이크오버", subtitle: "오늘만은 갸루", emoji: "💗", accent: "#FBE6F1", image: "/cards/gyaru.webp", badge: "NEW", tags: ["인생샷"], go: "gyaru" },
      { id: "deskfigure", title: "데스크 피규어", subtitle: "책상 위 나만의 굿즈", emoji: "🧸", accent: "#A47551", image: "/cards/deskfigure.webp", badge: "NEW", tags: ["피규어"], go: "deskfigure" },
      { id: "digicam", title: "디지캠 스냅", subtitle: "플래시 팡, Y2K 스냅", emoji: "📸", accent: "#5B7C99", image: "/cards/digicam.webp", badge: "NEW", tags: ["재미"], go: "digicam" },
      { id: "airportsnap", title: "공항패션 파파라치", subtitle: "찍히듯 자연스럽게", emoji: "✈️", accent: "#33415C", image: "/cards/airportsnap.webp", badge: "NEW", tags: ["인생샷"], go: "airportsnap" },
      { id: "cinesnap", title: "시네필름 스냅", subtitle: "내 하루가 영화 한 장면", emoji: "🎬", accent: "#2C3A47", image: "/cards/cinesnap.webp", badge: "NEW", tags: ["인생샷"], go: "cinesnap" },
      { id: "schoolsnap", title: "교복 컨셉 스냅", subtitle: "그 시절로, 더 예쁘게", emoji: "🎀", accent: "#4A5A8A", image: "/cards/schoolsnap.webp", badge: "NEW", tags: ["인생샷"], go: "schoolsnap" },
      { id: "gravityad", title: "3D 그래비티 광고컷", subtitle: "제품이 주인공이 되는 순간", emoji: "🧴", accent: "#6C5CE7", image: "/cards/gravityad.webp", badge: "NEW", tags: ["상품"], go: "gravityad" },
      { id: "feltdoll", title: "몽글 펠트 인형", subtitle: "보들보들 나만의 인형", emoji: "🧶", accent: "#C98A6B", image: "/cards/feltdoll.webp", badge: "NEW", tags: ["피규어"], go: "feltdoll" },
      { id: "personalcolor", title: "퍼스널컬러 화보", subtitle: "내게 꼭 맞는 색을 입다", emoji: "🎨", accent: "#D98BA3", image: "/cards/personalcolor.webp", badge: "NEW", tags: ["헤어"], go: "personalcolor" },
      { id: "monoactor", title: "흑백 배우 프로필", subtitle: "흑백이 말해주는 분위기", emoji: "🎞️", accent: "#3A3D42", image: "/cards/monoactor.webp", badge: "NEW", tags: ["인생샷"], go: "monoactor" },
      { id: "fortunecard", title: "관상 화보", subtitle: "복이 가득한 얼굴", emoji: "🏮", accent: "#A63A2E", image: "/cards/fortunecard.webp", badge: "NEW", tags: ["재미"], go: "fortunecard" },
      { id: "minichef", title: "미니 셰프 푸드샷", subtitle: "내 요리 위 꼬마 셰프", emoji: "🍳", accent: "#E67E22", image: "/cards/minichef.webp", badge: "NEW", tags: ["음식"], go: "minichef" },
      { id: "poolside", title: "풀사이드 호캉스", subtitle: "호캉스 무드 그대로", emoji: "🏖️", accent: "#2E9CB8", image: "/cards/poolside.webp", badge: "NEW", tags: ["인생샷"], go: "poolside" },
      { id: "snowsnap", title: "첫눈 스냅", subtitle: "첫눈처럼 설레는", emoji: "❄️", accent: "#7FA8C9", image: "/cards/snowsnap.webp", badge: "NEW", tags: ["인생샷"], go: "snowsnap" },
      { id: "profileduo", title: "베프 프로필 스냅", subtitle: "우리 둘, 나란히", emoji: "👯", accent: "#E8A0B4", image: "/cards/profileduo.webp", badge: "NEW", tags: ["우정"], go: "profileduo" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "droneview", title: "드론뷰 여행샷", subtitle: "드론 없이 드론샷", emoji: "🚁", accent: "#3A8FB7", image: "/cards/droneview.webp", badge: "NEW", tags: ["인생샷"], go: "droneview" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "autumnsnap", title: "단풍 스냅", subtitle: "가장 예쁜 계절, 가장 예쁜 나", emoji: "🍁", accent: "#C8763A", image: "/cards/autumnsnap.webp", badge: "NEW", tags: ["인생샷"], go: "autumnsnap" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "trenchlook", title: "트렌치코트 가을 화보", subtitle: "걷다 멈춘, 그 한 컷", emoji: "🧥", accent: "#8B6B4E", image: "/cards/trenchlook.webp", badge: "NEW", tags: ["인생샷"], go: "trenchlook" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "examcheer", title: "수능 응원 스냅", subtitle: "잘 될 거야, 라는 한 장", emoji: "🌸", accent: "#D94F4F", image: "/cards/examcheer.webp", badge: "NEW", tags: ["인생샷"], go: "examcheer" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "xmasvintage", title: "빈티지 크리스마스 스냅", subtitle: "필름에 담긴 연말 저녁", emoji: "🎁", accent: "#8B2E2E", image: "/cards/xmasvintage.webp", badge: "NEW", tags: ["시즌"], go: "xmasvintage" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "campsnap", title: "감성 캠핑 스냅", subtitle: "랜턴 불빛 아래, 그 저녁", emoji: "🏕️", accent: "#4A6B4F", image: "/cards/campsnap.webp", badge: "NEW", tags: ["인생샷"], go: "campsnap" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "picnicsnap", title: "한강 피크닉 스냅", subtitle: "맑은 날, 잔디 위 한 장", emoji: "🧺", accent: "#6BA36B", image: "/cards/picnicsnap.webp", badge: "NEW", tags: ["인생샷"], go: "picnicsnap" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "partysnap", title: "홀리데이 파티 스냅", subtitle: "연말 파티, 오늘 밤의 주인공", emoji: "🥂", accent: "#B8892E", image: "/cards/partysnap.webp", badge: "NEW", tags: ["시즌"], go: "partysnap" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "skisnap", title: "스키장 겨울 스냅", subtitle: "설산 위, 겨울 인생샷", emoji: "⛷️", accent: "#3B7DD8", image: "/cards/skisnap.webp", badge: "NEW", tags: ["인생샷"], go: "skisnap" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "productscene", title: "제품 연출컷", subtitle: "상세페이지 연출컷, 사진 한 장으로", emoji: "🪴", accent: "#6B8E5A", image: "/cards/productscene.webp", badge: "NEW", tags: ["상품"], go: "productscene" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "kidsdraw", title: "아이 그림 실사화", subtitle: "우리 아이 그림이 진짜가 됐어요", emoji: "🖍️", accent: "#E8743B", image: "/cards/kidsdraw.webp", badge: "NEW", tags: ["상품"], go: "kidsdraw" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "flatlay", title: "플랫레이 상품컷", subtitle: "위에서 찍은 정돈된 한 컷", emoji: "🧺", accent: "#8C7A6B", image: "/cards/flatlay.webp", badge: "NEW", tags: ["상품"], go: "flatlay" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "ghostfit", title: "고스트 마네킹 착장컷", subtitle: "마네킹 없이, 입은 것처럼", emoji: "👕", accent: "#4F6D8F", image: "/cards/ghostfit.webp", badge: "NEW", tags: ["상품"], go: "ghostfit" },
      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다
      { id: "carad", title: "자동차 광고컷", subtitle: "내 차가 카탈로그 표지처럼", emoji: "🏎️", accent: "#2E3A4F", image: "/cards/carad.webp", badge: "NEW", tags: ["중고차"], go: "carad" },
      { id: "genderswap", title: "반대의 나", subtitle: "다르게 태어났다면", emoji: "🔄", accent: "#E7EEF6", image: "/cards/genderswap.webp", badge: "NEW", tags: ["재미"], go: "genderswap" },
      { id: "pet", title: "반려동물 증명사진", subtitle: "정장 입은 우리 아이", emoji: "🐶", accent: "#FFF1E0", badge: "NEW", tags: ["반려동물"], image: "/cards/pet.webp", go: "pet" },
      { id: "restore", title: "옛날 사진 복원", subtitle: "빛바랜 추억을 선명하게", emoji: "🖼️", accent: "#FFEFD6", badge: "NEW", tags: ["복원"], image: "/cards/restore.webp", go: "restore" },
      { id: "interior", title: "인테리어 비포/애프터", subtitle: "빈 방에 가구를", emoji: "🛋️", accent: "#FFEFD6", badge: "NEW", tags: ["인테리어"], image: "/cards/interior.webp", go: "interior" },
      { id: "illust", title: "AI 일러스트", subtitle: "사진이 그림 한 장으로", emoji: "🎨", accent: "#EFEAFF", image: "/cards/illust.webp", badge: "NEW", tags: ["일러스트"], go: "illust" },
      { id: "lifeshot2", title: "인생샷 프로필", subtitle: "감성 프로필 한 장", emoji: "📸", accent: "#EFEAFF", image: "/cards/lifeshot.webp", badge: "NEW", tags: ["인생샷"], go: "lifeshot" },
      // { id: "bizprofile", title: "명함·링크드인 프로필", subtitle: "비즈니스 프로필", emoji: "💼", accent: "#DCEBFF", badge: "NEW", tags: ["비즈니스"], go: "bizprofile" }, // 홈 노출 숨김 — 증명·비즈프로필 라인과 중복 (파일·URL 직접 접근은 유지)
      { id: "hairstyle", title: "헤어 체인지", subtitle: "미용실 가기 전", emoji: "💇", accent: "#FFE0EC", image: "/cards/hairstyle.webp", badge: "NEW", tags: ["헤어"], go: "hairstyle" },
      { id: "idskyblue", title: "하늘빛 블루 셔츠", subtitle: "맑고 산뜻한 첫인상", emoji: "📷", accent: "#EAF3FF", image: "/cards/idskyblue.webp", badge: "NEW", tags: ["증명사진"], go: "idskyblue" },
      { id: "biznavy", title: "네이비 정장 프로필", subtitle: "신뢰를 더하는 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/biznavy.webp", badge: "NEW", tags: ["비즈니스"], go: "biznavy" },
      { id: "bizmnavy", title: "남성 네이비 정장", subtitle: "믿음직한 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/bizmnavy.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmnavy" },
      { id: "bizmcharcoal", title: "남성 차콜 정장", subtitle: "비즈니스 스탠다드", emoji: "💼", accent: "#ECEEF1", image: "/cards/bizmcharcoal.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmcharcoal" },
      { id: "bizmblack", title: "남성 블랙 정장", subtitle: "격식 있는 클래식", emoji: "🖤", accent: "#F0F1F4", image: "/cards/bizmblack.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmblack" },
      { id: "bizmlightgray", title: "남성 라이트그레이 정장", subtitle: "밝고 부드러운 인상", emoji: "🤵", accent: "#F2F3F5", image: "/cards/bizmlightgray.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmlightgray" },
      { id: "bizmvest", title: "남성 쓰리피스 (조끼)", subtitle: "무게감 있는 임원룩", emoji: "💼", accent: "#ECEDF0", image: "/cards/bizmvest.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmvest" },
      { id: "bizmbeige", title: "남성 베이지 정장", subtitle: "따뜻하고 친근한", emoji: "🧥", accent: "#F5EFE6", image: "/cards/bizmbeige.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmbeige" },
      { id: "bizmblazer", title: "남성 네이비 블레이저", subtitle: "노타이 비즈캐주얼", emoji: "🧥", accent: "#EAF3FF", image: "/cards/bizmblazer.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmblazer" },
      { id: "bizmturtle", title: "남성 블레이저 터틀넥", subtitle: "모던 미니멀", emoji: "⬛", accent: "#EDEEF0", image: "/cards/bizmturtle.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmturtle" },
      { id: "bizmdb", title: "남성 더블브레스티드", subtitle: "존재감 있는 실루엣", emoji: "🤵", accent: "#E9EEF6", image: "/cards/bizmdb.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmdb" },
      { id: "bizmknittie", title: "남성 니트타이 재킷", subtitle: "젊은 전문직 세미포멀", emoji: "👔", accent: "#EDEFEA", image: "/cards/bizmknittie.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmknittie" },
      { id: "bizblack", title: "블랙 정장 프로필", subtitle: "격식을 갖춘 클래식", emoji: "🖤", accent: "#F0F1F4", image: "/cards/bizblack.webp", badge: "NEW", tags: ["비즈니스"], go: "bizblack" },
      { id: "bizwhite", title: "화이트 셔츠 프로필", subtitle: "편안하고 단정한 전문가", emoji: "🤍", accent: "#FFF0F5", image: "/cards/bizwhite.webp", badge: "NEW", tags: ["비즈니스"], go: "bizwhite" },
      { id: "bizribbon", title: "리본 블라우스 프로필", subtitle: "우아한 여성 프로필", emoji: "🎀", accent: "#FFF0F5", image: "/cards/bizribbon.webp", badge: "NEW", tags: ["비즈니스"], go: "bizribbon" },
      { id: "bizbeige", title: "베이지 정장 프로필", subtitle: "부드럽고 따뜻한 전문가", emoji: "🤎", accent: "#F3ECE3", image: "/cards/bizbeige.webp", badge: "NEW", tags: ["비즈니스"], go: "bizbeige" },
      { id: "bizlavender", title: "라벤더 정장 프로필", subtitle: "화사하고 부드러운 첫인상", emoji: "💜", accent: "#F0EBFA", image: "/cards/bizlavender.webp", badge: "NEW", tags: ["비즈니스"], go: "bizlavender" },
      { id: "bizgray", title: "그레이 정장 프로필", subtitle: "차분하고 전문적인 인상", emoji: "🩶", accent: "#EFF0F2", image: "/cards/bizgray.webp", badge: "NEW", tags: ["비즈니스"], go: "bizgray" },
      { id: "bizknit", title: "니트 가디건 프로필", subtitle: "친근하고 단정한 분위기", emoji: "🧶", accent: "#F5EFE6", image: "/cards/bizknit.webp", badge: "NEW", tags: ["비즈니스"], go: "bizknit" },
      { id: "bizchiffon", title: "쉬폰 블라우스 프로필", subtitle: "밝고 화사한 여성 프로필", emoji: "🌸", accent: "#FCEFF3", image: "/cards/bizchiffon.webp", badge: "NEW", tags: ["비즈니스"], go: "bizchiffon" },
      { id: "bizpinkjacket", title: "핑크 트위드 재킷 프로필", subtitle: "우아하고 화사한 셋업", emoji: "🌷", accent: "#FCE8EF", image: "/cards/bizpinkjacket.webp", badge: "NEW", tags: ["비즈니스"], go: "bizpinkjacket" },
      { id: "bizcreamdress", title: "크림 원피스 프로필", subtitle: "은은하고 우아한 여성 프로필", emoji: "🎀", accent: "#FBF3E8", image: "/cards/bizcreamdress.webp", badge: "NEW", tags: ["비즈니스"], go: "bizcreamdress" },
      { id: "biznavyblouse", title: "네이비 블라우스 프로필", subtitle: "단정하고 클래식한 조합", emoji: "💙", accent: "#EAEFF7", image: "/cards/biznavyblouse.webp", badge: "NEW", tags: ["비즈니스"], go: "biznavyblouse" },
      { id: "bizskyblouse", title: "스카이블루 블라우스 프로필", subtitle: "맑고 산뜻한 첫인상", emoji: "🩵", accent: "#EAF3FB", image: "/cards/bizskyblouse.webp", badge: "NEW", tags: ["비즈니스"], go: "bizskyblouse" },
      { id: "bizpinktweed", title: "핑크 트위드 원피스 프로필", subtitle: "격식 있는 우아한 원피스", emoji: "🌸", accent: "#FCE8EF", image: "/cards/bizpinktweed.webp", badge: "NEW", tags: ["비즈니스"], go: "bizpinktweed" },
      { id: "bizshirring", title: "셔링 블라우스 프로필", subtitle: "우아하고 고급스러운 무드", emoji: "🎀", accent: "#F7F0E9", image: "/cards/bizshirring.webp", badge: "NEW", tags: ["비즈니스"], go: "bizshirring" },
      { id: "bizviolet", title: "바이올렛 스커트 프로필", subtitle: "차분하고 세련된 분위기", emoji: "💜", accent: "#F0EBF7", image: "/cards/bizviolet.webp", badge: "NEW", tags: ["비즈니스"], go: "bizviolet" },
      { id: "bizblueskirt", title: "블루 스커트 프로필", subtitle: "깨끗하고 산뜻한 느낌", emoji: "💙", accent: "#EAF0F8", image: "/cards/bizblueskirt.webp", badge: "NEW", tags: ["비즈니스"], go: "bizblueskirt" },
      { id: "bizburgundy", title: "버건디 슬랙스 프로필", subtitle: "자신감과 열정을 드러내는", emoji: "🍷", accent: "#F6EAEC", image: "/cards/bizburgundy.webp", badge: "NEW", tags: ["비즈니스"], go: "bizburgundy" },
      { id: "bizkhaki", title: "카키 수트 프로필", subtitle: "모던하고 세련된 무드", emoji: "🫒", accent: "#F0EEE4", image: "/cards/bizkhaki.webp", badge: "NEW", tags: ["비즈니스"], go: "bizkhaki" },
      { id: "bizblackdress", title: "블랙 원피스 프로필", subtitle: "시크하고 세련된 무드", emoji: "🖤", accent: "#EFEFF1", image: "/cards/bizblackdress.webp", badge: "NEW", tags: ["비즈니스"], go: "bizblackdress" },
      { id: "bizbluegray", title: "블루&그레이 미니원피스 프로필", subtitle: "발랄하고 산뜻한 인상", emoji: "💙", accent: "#ECEFF4", image: "/cards/bizbluegray.webp", badge: "NEW", tags: ["비즈니스"], go: "bizbluegray" },
      { id: "bizpinstripe", title: "핀스트라이프 수트 프로필", subtitle: "클래식하고 자신감 있는", emoji: "📏", accent: "#ECEEF1", image: "/cards/bizpinstripe.webp", badge: "NEW", tags: ["비즈니스"], go: "bizpinstripe" },
      { id: "bizcheck", title: "체크 블레이저 수트 프로필", subtitle: "우아하고 클래식한 패턴", emoji: "🏁", accent: "#EFEEEC", image: "/cards/bizcheck.webp", badge: "NEW", tags: ["비즈니스"], go: "bizcheck" },
      { id: "bizknitdress", title: "카멜 니트 원피스 프로필", subtitle: "따뜻하면서 단정한 무드", emoji: "🐫", accent: "#F3EDE2", image: "/cards/bizknitdress.webp", badge: "NEW", tags: ["비즈니스"], go: "bizknitdress" },
      { id: "idblack", title: "블랙 정장 증명사진", subtitle: "취업·이력서용 정석", emoji: "🖤", accent: "#EFEFF1", image: "/cards/idblack.webp", badge: "NEW", tags: ["증명사진"], go: "idblack" },
      { id: "idnavy", title: "네이비 정장 증명사진", subtitle: "신뢰감 주는 면접용", emoji: "💙", accent: "#EAEFF7", image: "/cards/idnavy.webp", badge: "NEW", tags: ["증명사진"], go: "idnavy" },
      { id: "idcharcoal", title: "차콜그레이 정장 증명사진", subtitle: "차분하고 전문적인", emoji: "🩶", accent: "#ECEDEF", image: "/cards/idcharcoal.webp", badge: "NEW", tags: ["증명사진"], go: "idcharcoal" },
      { id: "idwhiteshirt", title: "화이트셔츠 증명사진", subtitle: "깔끔한 학생·사원증", emoji: "🤍", accent: "#F4F5F7", image: "/cards/idwhiteshirt.webp", badge: "NEW", tags: ["증명사진"], go: "idwhiteshirt" },
      { id: "idbeige", title: "베이지 정장 증명사진", subtitle: "부드럽고 따뜻한 인상", emoji: "🧸", accent: "#F3ECE3", image: "/cards/idbeige.webp", badge: "NEW", tags: ["증명사진"], go: "idbeige" },
      { id: "idblacktie", title: "블랙정장+넥타이 증명사진", subtitle: "격식 갖춘 면접·서류", emoji: "🤵", accent: "#EDEDEF", image: "/cards/idblacktie.webp", badge: "NEW", tags: ["증명사진"], go: "idblacktie" },
      { id: "idblouse", title: "아이보리 블라우스 증명사진", subtitle: "편안하고 단정한", emoji: "🤍", accent: "#FBF3E8", image: "/cards/idblouse.webp", badge : "NEW", tags: ["증명사진"], go: "idblouse" },
      { id: "idknit", title: "니트 가디건 증명사진", subtitle: "부드럽고 친근한", emoji: "🧶", accent: "#F5EFE6", image: "/cards/idknit.webp", badge: "NEW", tags: ["증명사진"], go: "idknit" },
      { id: "idturtleneck", title: "터틀넥 증명사진", subtitle: "모던하고 미니멀한", emoji: "🖤", accent: "#EBECEE", image: "/cards/idturtleneck.webp", badge: "NEW", tags: ["증명사진"], go: "idturtleneck" },
      { id: "idglasses", title: "정장+안경 증명사진", subtitle: "안경을 깔끔하게", emoji: "👓", accent: "#ECEEF1", image: "/cards/idglasses.webp", badge: "NEW", tags: ["증명사진"], go: "idglasses" },
      { id: "idoffshoulder", title: "단발 오프숄더 증명사진", subtitle: "청초하고 자연스러운", emoji: "💜", accent: "#F0EBF7", image: "/cards/idoffshoulder.webp", badge: "NEW", tags: ["증명사진"], go: "idoffshoulder" },
      { id: "idupdo", title: "올림머리 블라우스 증명사진", subtitle: "정돈된 이미지를 주는", emoji: "🤍", accent: "#EAF2EC", image: "/cards/idupdo.webp", badge: "NEW", tags: ["증명사진"], go: "idupdo" },
      { id: "idlonghair", title: "긴머리 블라우스 증명사진", subtitle: "우아하고 자연스러운", emoji: "🌸", accent: "#F7ECF0", image: "/cards/idlonghair.webp", badge: "NEW", tags: ["증명사진"], go: "idlonghair" },
      { id: "idtweed", title: "반묶음 트위드 증명사진", subtitle: "포멀한 러블리 무드", emoji: "🎀", accent: "#F9EEE8", image: "/cards/idtweed.webp", badge: "NEW", tags: ["증명사진"], go: "idtweed" },
      { id: "idwavebob", title: "물결 단발 증명사진", subtitle: "발랄하고 상큼한 C컬", emoji: "💛", accent: "#F7F3E4", image: "/cards/idwavebob.webp", badge: "NEW", tags: ["증명사진"], go: "idwavebob" },
      { id: "idponytail", title: "로우 포니테일 증명사진", subtitle: "깔끔하고 프로페셔널한", emoji: "💙", accent: "#ECEFF4", image: "/cards/idponytail.webp", badge: "NEW", tags: ["증명사진"], go: "idponytail" },
      { id: "idgarma", title: "가르마컷 블랙정장 증명사진", subtitle: "신뢰감 있는 첫인상", emoji: "🖤", accent: "#ECEDEF", image: "/cards/idgarma.webp", badge: "NEW", tags: ["증명사진"], go: "idgarma" },
      { id: "iddropcut", title: "드랍컷 블루셔츠 증명사진", subtitle: "차분한 리더의 이미지", emoji: "💙", accent: "#EAEFF7", image: "/cards/iddropcut.webp", badge: "NEW", tags: ["증명사진"], go: "iddropcut" },
      { id: "idperm", title: "페릭컷 화이트티 증명사진", subtitle: "기본에 충실한 산뜻함", emoji: "🤍", accent: "#F5F1EA", image: "/cards/idperm.webp", badge: "NEW", tags: ["증명사진"], go: "idperm" },
      { id: "idpomade", title: "포마드 레트로정장 증명사진", subtitle: "그 시절 감성의 클래식", emoji: "🕶️", accent: "#F0EBE4", image: "/cards/idpomade.webp", badge: "NEW", tags: ["증명사진"], go: "idpomade" },
      { id: "idwarmbob", title: "웜브라운 단발 증명사진", subtitle: "따뜻하고 포근한 무드", emoji: "🤎", accent: "#F5EEE4", image: "/cards/idwarmbob.webp", badge: "NEW", tags: ["증명사진"], go: "idwarmbob" },
      { id: "idhime", title: "밀크브라운 히메컷 증명사진", subtitle: "러블리하고 부드러운", emoji: "🎀", accent: "#F7ECEA", image: "/cards/idhime.webp", badge: "NEW", tags: ["증명사진"], go: "idhime" },
      { id: "idashwave", title: "애쉬 웨이브 증명사진", subtitle: "세련되고 몽환적인", emoji: "🩶", accent: "#EEEEF0", image: "/cards/idashwave.webp", badge: "NEW", tags: ["증명사진"], go: "idashwave" },
      { id: "idlowbun", title: "로우번 터틀넥 증명사진", subtitle: "시크하고 세련된 무드", emoji: "🖤", accent: "#F5EBEA", image: "/cards/idlowbun.webp", badge: "NEW", tags: ["증명사진"], go: "idlowbun" },
      { id: "idburgundy", title: "버건디 오프숄더 프로필", subtitle: "우아하고 여성스러운 화보", emoji: "🍷", accent: "#F6E9E6", image: "/cards/idburgundy.webp", badge: "NEW", tags: ["증명사진"], go: "idburgundy" },
      { id: "iddandy", title: "댄디 베스트 증명사진", subtitle: "시원하고 댄디한 무드", emoji: "🩵", accent: "#EAEFF4", image: "/cards/iddandy.webp", badge: "NEW", tags: ["증명사진"], go: "iddandy" },
      { id: "iddownperm", title: "다운펌 화이트셔츠 증명사진", subtitle: "청량하고 산뜻한 첫인상", emoji: "🩵", accent: "#EAF3FB", image: "/cards/iddownperm.webp", badge: "NEW", tags: ["증명사진"], go: "iddownperm" },
      { id: "idnavysuit", title: "가르마 네이비수트 증명사진", subtitle: "신뢰감 있는 프로페셔널", emoji: "💙", accent: "#EAEFF7", image: "/cards/idnavysuit.webp", badge: "NEW", tags: ["증명사진"], go: "idnavysuit" },
      { id: "idbeigeblazer", title: "소프트펌 베이지 증명사진", subtitle: "세련되고 따뜻한 무드", emoji: "🤎", accent: "#F3ECE3", image: "/cards/idbeigeblazer.webp", badge: "NEW", tags: ["증명사진"], go: "idbeigeblazer" },
      { id: "idhenley", title: "투블럭 헨리넥 증명사진", subtitle: "감각적이고 모던한", emoji: "🌿", accent: "#ECEFEA", image: "/cards/idhenley.webp", badge: "NEW", tags: ["증명사진"], go: "idhenley" },
      { id: "figure", title: "미니어처 피규어", subtitle: "내 사진이 피규어로", emoji: "🧸", accent: "#FFF1E0", image: "/cards/figure.webp", badge: "NEW", tags: ["피규어"], go: "figure" },
      { id: "age", title: "노년·베이비 변환", subtitle: "시간을 거슬러서", emoji: "⏳", accent: "#E7F7EA", image: "/cards/age.webp", badge: "NEW", tags: ["재미"], go: "age" },
      { id: "fashion", title: "패션 룩북", subtitle: "오늘의 착장이 화보로", emoji: "👗", accent: "#EFEAFF", image: "/cards/fashion.webp", badge: "NEW", tags: ["패션"], go: "fashion" },
      { id: "idol", title: "아이돌 프로필", subtitle: "오늘 데뷔하는 내 프로필", emoji: "🌟", accent: "#FFE0EC", image: "/cards/idol.webp", badge: "NEW", tags: ["인생샷"], go: "idol" },
      { id: "xmas", title: "크리스마스 화보", subtitle: "따뜻한 연말 한 장", emoji: "🎄", accent: "#E7F7EA", image: "/cards/xmas.webp", badge: "NEW", tags: ["시즌"], go: "xmas" },
      { id: "halloween", title: "할로윈 변신", subtitle: "뱀파이어·마녀·요정으로", emoji: "🎃", accent: "#EFEAFF", badge: "NEW", tags: ["시즌"], image: "/cards/halloween.webp", go: "halloween" },
      { id: "graduation", title: "AI 졸업사진", subtitle: "학사모 쓴 내 모습", emoji: "🎓", accent: "#DCEBFF", image: "/cards/graduation.webp", badge: "NEW", tags: ["졸업"], go: "graduation" },
      { id: "wedding", title: "웨딩 화보", subtitle: "드레스·턱시도 입은 나", emoji: "💍", accent: "#FFE0EC", badge: "NEW", tags: ["웨딩"], image: "/cards/wedding.webp", go: "wedding" },
      { id: "petstudio", title: "펫 스튜디오 화보", subtitle: "우리 애기 화보 찍는 날", emoji: "🐶", accent: "#FFF1E0", badge: "NEW", tags: ["반려동물"], image: "/cards/petstudio.webp", go: "petstudio" },
      { id: "petbirthday", title: "펫 생일 파티", subtitle: "우리 아이 생일, 화보로", emoji: "🎂", accent: "#FFE8F0", badge: "NEW", tags: ["반려동물"], image: "/cards/petbirthday.webp", go: "petbirthday" },
      { id: "petmemorial", title: "무지개다리 초상", subtitle: "소중한 아이를 오래 간직하는 초상", emoji: "🌈", accent: "#EFEAFF", badge: "NEW", tags: ["반려동물"], image: "/cards/petmemorial.webp", go: "petmemorial" },
      { id: "petceo", title: "펫 CEO 출근", subtitle: "오늘부터 우리 아이가 회장님", emoji: "👔", accent: "#E8EAED", badge: "NEW", tags: ["반려동물"], image: "/cards/petceo.webp", go: "petceo" },
      { id: "petgraduation", title: "펫 졸업사진", subtitle: "유치원 졸업을 축하하며", emoji: "🎓", accent: "#E7F7EA", badge: "NEW", tags: ["반려동물"], image: "/cards/petgraduation.webp", go: "petgraduation" },
      { id: "petminhwa", title: "조선 민화 초상", subtitle: "우리 아이를 민화 명작으로", emoji: "🖼️", accent: "#FFF3E2", badge: "NEW", tags: ["반려동물"], image: "/cards/petminhwa.webp", go: "petminhwa" },
      { id: "petroyal", title: "로얄 유화 초상", subtitle: "왕의 초상이 된 우리 아이", emoji: "👑", accent: "#F3E8DC", badge: "NEW", tags: ["반려동물"], image: "/cards/petroyal.webp", go: "petroyal" },
      { id: "pettwo", title: "펫 둘이서", subtitle: "두 아이를 한 장에", emoji: "🐾", accent: "#DCEBFF", badge: "NEW", tags: ["반려동물"], image: "/cards/pettwo.webp", go: "pettwo" },
      { id: "petjob", title: "펫 직업 변신", subtitle: "우리 아이의 첫 출근", emoji: "🩺", accent: "#E1ECFF", badge: "NEW", tags: ["반려동물"], image: "/cards/petjob.webp", go: "petjob" },
      { id: "petreceipt", title: "펫 관상 영수증", subtitle: "우리 애 관상, 영수증으로", emoji: "🧾", accent: "#E7F7EA", badge: "NEW", tags: ["반려동물"], image: "/cards/petreceipt.webp", go: "petreceipt" },
      { id: "era", title: "시대·복장 변신", subtitle: "다른 시대에 태어났다면?", emoji: "🕰️", accent: "#EFEAFF", image: "/cards/era.webp", badge: "NEW", tags: ["재미"], go: "era" },
      { id: "y2k", title: "Y2K 하이틴", subtitle: "2000년대 하이틴 스타로", emoji: "🕹️", accent: "#FCE8EF", badge: "NEW", tags: ["재미"], image: "/cards/y2k.webp", go: "y2k" },
      { id: "roman", title: "로판 웹툰 주인공", subtitle: "웹툰 표지 주인공으로", emoji: "👑", accent: "#EFEAFF", badge: "NEW", tags: ["재미"], image: "/cards/roman.webp", go: "roman" },
      { id: "clay", title: "클레이 아트", subtitle: "점토로 빚은 우리", emoji: "🧱", accent: "#FFEFD6", badge: "NEW", tags: ["재미"], image: "/cards/clay.webp", go: "clay" },
      // { id: "goods", title: "굿즈 미리보기", subtitle: "나·우리 애가 아크릴 굿즈로", emoji: "🔑", accent: "#FFE9D6", badge: "NEW", tags: ["재미"], go: "goods" }, // 완성 대기 — 상세페이지·썸네일 준비 후 오픈
      { id: "luxe", title: "럭셔리 매거진 화보", subtitle: "매거진 커버 속 나", emoji: "🖤", accent: "#E8EAED", badge: "NEW", tags: ["인생샷"], image: "/cards/luxe.webp", go: "luxe" },
      { id: "travel", title: "여행지 프로필", subtitle: "여행지 인생샷 한 장", emoji: "✈️", accent: "#E1ECFF", badge: "NEW", tags: ["인생샷"], image: "/cards/travel.webp", go: "travel" },
      { id: "retro90", title: "90년대 사진관", subtitle: "그때 그 사진관 감성", emoji: "📼", accent: "#FFEFD6", badge: "NEW", tags: ["재미"], image: "/cards/retro90.webp", go: "retro90" },
      { id: "hocance", title: "호캉스 화보", subtitle: "5성급 풀사이드 바이브", emoji: "🏝️", accent: "#DCEBFF", badge: "NEW", tags: ["인생샷"], image: "/cards/hocance.webp", go: "hocance" },
      { id: "redcarpet", title: "레드카펫 화보", subtitle: "오늘 밤의 주인공", emoji: "✨", accent: "#E8EAED", badge: "NEW", tags: ["인생샷"], image: "/cards/redcarpet.webp", go: "redcarpet" },
      { id: "birthday", title: "생일 화보", subtitle: "일 년 중 가장 빛나는 날", emoji: "🎂", accent: "#FFE0EC", badge: "NEW", tags: ["인생샷"], image: "/cards/birthday.webp", go: "birthday" },
      { id: "job", title: "직업 변신", subtitle: "파일럿·의사·CEO로 변신", emoji: "💼", accent: "#EFEAFF", badge: "NEW", tags: ["재미"], image: "/cards/job.webp", go: "job" },
      { id: "sporty", title: "스포티 화보", subtitle: "테니스·골프 올드머니 룩", emoji: "🎾", accent: "#E7F7EA", badge: "NEW", tags: ["인생샷"], image: "/cards/sporty.webp", go: "sporty" },
      { id: "flower", title: "플라워 화보", subtitle: "꽃에 둘러싸인 순간", emoji: "💐", accent: "#FCE8EF", badge: "NEW", tags: ["인생샷"], image: "/cards/flower.webp", go: "flower" },
      { id: "petcostume", title: "펫 코스튬", subtitle: "우리 애 옷 입혀보기", emoji: "🎀", accent: "#FFE0EC", badge: "NEW", tags: ["반려동물"], image: "/cards/petcostume.webp", go: "petcostume" },
      { id: "couple", title: "커플 스튜디오 화보", subtitle: "둘이 함께, 스튜디오 화보", emoji: "💑", accent: "#FFE0EC", badge: "NEW", tags: ["커플"], image: "/cards/couple.webp", go: "couple" },
      { id: "friend", title: "우정 스냅", subtitle: "베프랑 같이 찍은 한 장", emoji: "👯", accent: "#DCEBFF", badge: "NEW", tags: ["우정"], image: "/cards/friend.webp", go: "friend" },
      { id: "remindwedding", title: "리마인드 웨딩", subtitle: "부모님 웨딩사진, 다시 한 번", emoji: "💒", accent: "#FFF1E0", badge: "NEW", tags: ["가족"], image: "/cards/remindwedding.webp", go: "remindwedding" },
      { id: "selfwedding", title: "셀프웨딩 화보", subtitle: "우리끼리, 웨딩 화보", emoji: "💍", accent: "#FCE8EF", badge: "NEW", tags: ["커플"], image: "/cards/selfwedding.webp", go: "selfwedding" },
      { id: "duofamily", title: "둘이서 가족사진", subtitle: "둘이서 남기는 가족사진", emoji: "🏠", accent: "#E7F7EA", badge: "NEW", tags: ["가족"], image: "/cards/duofamily.webp", go: "duofamily" },
      { id: "coupletravel", title: "커플 여행 스냅", subtitle: "둘이 함께, 여행 스냅", emoji: "✈️", accent: "#DFF3FF", badge: "NEW", tags: ["커플"], image: "/cards/coupletravel.webp", go: "coupletravel" },
      // 가족 스튜디오 화보 — 3인 이상 다중인물 신원 유지 구현 난이도로 숨김 (해법 확보 시 복구, route·URL은 보존)
      // { id: "family", title: "가족 스튜디오 화보", subtitle: "온 가족이 한 장에", emoji: "👨‍👩‍👧‍👦", accent: "#E7F7EA", badge: "NEW", tags: ["가족"], go: "family" },
      { id: "familypet", title: "반려가족 사진", subtitle: "우리 애도 가족이니까", emoji: "🐾", accent: "#DCEBFF", badge: "NEW", tags: ["가족"], image: "/cards/familypet.webp", go: "familypet" },
      // 네컷 라인 — 스트립 품질 검증 후 복귀 예정 (URL·route·concepts는 보존)
      // { id: "fourcut", title: "인생네컷", subtitle: "나 혼자 네컷 한 장", emoji: "📸", accent: "#FFE0EC", badge: "NEW", tags: ["네컷"], go: "fourcut" },
      // { id: "fourcutillust", title: "인생네컷 (일러스트)", subtitle: "그림체 네컷 한 장", emoji: "🎨", accent: "#EFEAFF", badge: "NEW", tags: ["네컷"], go: "fourcutillust" },
      // { id: "fourcutcouple", title: "커플 네컷", subtitle: "둘이 함께 네컷 한 장", emoji: "📸", accent: "#DCEBFF", badge: "NEW", tags: ["네컷"], go: "fourcutcouple" },
    ],
  },
  // ★아래 두 섹션의 item은 위 섹션들의 정의를 ★문자 그대로 복사한 것이다.
  //   필드를 고치거나 새로 쓰지 않는다 — go 기준 중복 제거(all)가 145를 유지해야 하고,
  //   같은 컨셉이 두 곳에서 다른 제목으로 보이면 안 된다. 카드 추가는 원본 정의부에서.
  {
    id: "idcardline", heading: "여권·이력서 규격까지 한 번에", title: "증명사진", layout: "scroll", cat: "idcard",
    items: [
      { id: "idblack", title: "블랙 정장 증명사진", subtitle: "취업·이력서용 정석", emoji: "🖤", accent: "#EFEFF1", image: "/cards/idblack.webp", badge: "NEW", tags: ["증명사진"], go: "idblack" },
      { id: "idnavy", title: "네이비 정장 증명사진", subtitle: "신뢰감 주는 면접용", emoji: "💙", accent: "#EAEFF7", image: "/cards/idnavy.webp", badge: "NEW", tags: ["증명사진"], go: "idnavy" },
      { id: "idwarmbob", title: "웜브라운 단발 증명사진", subtitle: "따뜻하고 포근한 무드", emoji: "🤎", accent: "#F5EEE4", image: "/cards/idwarmbob.webp", badge: "NEW", tags: ["증명사진"], go: "idwarmbob" },
      { id: "iddandy", title: "댄디 베스트 증명사진", subtitle: "시원하고 댄디한 무드", emoji: "🩵", accent: "#EAEFF4", image: "/cards/iddandy.webp", badge: "NEW", tags: ["증명사진"], go: "iddandy" },
      { id: "idashwave", title: "애쉬 웨이브 증명사진", subtitle: "세련되고 몽환적인", emoji: "🩶", accent: "#EEEEF0", image: "/cards/idashwave.webp", badge: "NEW", tags: ["증명사진"], go: "idashwave" },
      { id: "idnavysuit", title: "가르마 네이비수트 증명사진", subtitle: "신뢰감 있는 프로페셔널", emoji: "💙", accent: "#EAEFF7", image: "/cards/idnavysuit.webp", badge: "NEW", tags: ["증명사진"], go: "idnavysuit" },
      { id: "idburgundy", title: "버건디 오프숄더 프로필", subtitle: "우아하고 여성스러운 화보", emoji: "🍷", accent: "#F6E9E6", image: "/cards/idburgundy.webp", badge: "NEW", tags: ["증명사진"], go: "idburgundy" },
      { id: "idhenley", title: "투블럭 헨리넥 증명사진", subtitle: "감각적이고 모던한", emoji: "🌿", accent: "#ECEFEA", image: "/cards/idhenley.webp", badge: "NEW", tags: ["증명사진"], go: "idhenley" },
    ],
  },
  {
    id: "bizline", heading: "링크드인·사원증·회사 소개용", title: "비즈니스 프로필", layout: "scroll", cat: "business",
    items: [
      { id: "biznavy", title: "네이비 정장 프로필", subtitle: "신뢰를 더하는 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/biznavy.webp", badge: "NEW", tags: ["비즈니스"], go: "biznavy" },
      { id: "bizgray", title: "그레이 정장 프로필", subtitle: "차분하고 전문적인 인상", emoji: "🩶", accent: "#EFF0F2", image: "/cards/bizgray.webp", badge: "NEW", tags: ["비즈니스"], go: "bizgray" },
      { id: "bizmnavy", title: "남성 네이비 정장", subtitle: "믿음직한 프로페셔널", emoji: "💼", accent: "#EAF3FF", image: "/cards/bizmnavy.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmnavy" },
      { id: "bizpinkjacket", title: "핑크 트위드 재킷 프로필", subtitle: "우아하고 화사한 셋업", emoji: "🌷", accent: "#FCE8EF", image: "/cards/bizpinkjacket.webp", badge: "NEW", tags: ["비즈니스"], go: "bizpinkjacket" },
      { id: "bizmcharcoal", title: "남성 차콜 정장", subtitle: "비즈니스 스탠다드", emoji: "💼", accent: "#ECEEF1", image: "/cards/bizmcharcoal.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmcharcoal" },
      { id: "bizribbon", title: "리본 블라우스 프로필", subtitle: "우아한 여성 프로필", emoji: "🎀", accent: "#FFF0F5", image: "/cards/bizribbon.webp", badge: "NEW", tags: ["비즈니스"], go: "bizribbon" },
      { id: "bizmblazer", title: "남성 네이비 블레이저", subtitle: "노타이 비즈캐주얼", emoji: "🧥", accent: "#EAF3FF", image: "/cards/bizmblazer.webp", badge: "NEW", tags: ["비즈니스"], go: "bizmblazer" },
      { id: "bizcreamdress", title: "크림 원피스 프로필", subtitle: "은은하고 우아한 여성 프로필", emoji: "🎀", accent: "#FBF3E8", image: "/cards/bizcreamdress.webp", badge: "NEW", tags: ["비즈니스"], go: "bizcreamdress" },
    ],
  },
  {
    id: "bizowner", heading: "우리 가게 사진도 스튜디오급", title: "사장님 컨셉", layout: "scroll", cat: "biz",
    items: [
      { id: "food", title: "음식 사진 보정", subtitle: "메뉴판·광고용으로", emoji: "🍽️", accent: "#FFE0EC", badge: "NEW", tags: ["음식"], image: "/cards/food.webp", go: "food" },
      { id: "homecafe", title: "홈카페 감성 사진", subtitle: "인스타 감성 한 장", emoji: "☕", accent: "#F5E9DC", badge: "NEW", tags: ["음식"], image: "/cards/homecafe.webp", go: "homecafe" },
      { id: "factory", title: "공장 리모델링", subtitle: "리모델링 후 미리보기", emoji: "🏭", accent: "#E1ECFF", badge: "NEW", tags: ["인테리어"], image: "/cards/factory.webp", go: "factory" },
      { id: "product", title: "상품 사진 보정", subtitle: "쇼핑몰·중고거래용", emoji: "📦", accent: "#E7F7EA", badge: "NEW", tags: ["상품"], image: "/cards/product.webp", go: "product" },
      { id: "realestate", title: "부동산 매물 정리", subtitle: "매물 사진 깔끔하게", emoji: "🏠", accent: "#E1ECFF", badge: "NEW", tags: ["부동산"], image: "/cards/realestate.webp", go: "realestate" },
      { id: "car", title: "중고차 사진 보정", subtitle: "판매용 깔끔샷", emoji: "🚗", accent: "#E7F7EA", badge: "NEW", tags: ["중고차"], image: "/cards/car.webp", go: "car" },
      { id: "menu", title: "메뉴판 비주얼", subtitle: "메뉴판에 바로 쓰는 사진", emoji: "📋", accent: "#FFF1E0", image: "/cards/menu.webp", badge: "NEW", tags: ["사장님"], go: "menu" },
      { id: "nukki", title: "배경 제거", subtitle: "누끼 따서 투명 PNG로", emoji: "✂️", accent: "#DCEBFF", image: "/cards/nukki.webp", badge: "NEW", tags: ["디자인"], go: "nukki" },
      { id: "upscale", title: "고화질 변환", subtitle: "흐린 사진을 4배 또렷하게", emoji: "🔍", accent: "#E1ECFF", image: "/cards/upscale.webp", badge: "NEW", tags: ["고화질"], go: "upscale" },
    ],
  },
];
// ─── 홈 하단 "무엇을 만들까요" 목차 ────────────────────────────────────────────
// 줄을 누르면 그 카테고리가 선택된 전체보기 오버레이가 열린다(뒤로가기는 useBackClose가 처리).
// value = HOME_PILLS의 value와 같아야 오버레이 칩이 함께 켜진다.
// thumbs = /cards/{key}.webp — 원형으로 겹쳐 보여줄 대표 3장.
//   헤어·뷰티는 오래 2장이었다(hairstyle·idol). beauty(뷰티 보정)가 합류해 예고대로 3장이 됐다.
const INDEX_ROWS: { no: string; name: string; desc: string; value: string; thumbs: string[] }[] = [
  { no: "01", name: "인생샷", desc: "일상을 화보처럼", value: "lifeshot", thumbs: ["lifeshot", "luxe", "travel"] },
  { no: "02", name: "헤어·뷰티", desc: "시술 전 미리보기", value: "beauty", thumbs: ["hairstyle", "idol", "beauty"] },
  { no: "03", name: "반려동물", desc: "우리 아이 첫 스튜디오 화보", value: "pet", thumbs: ["petstudio", "petcostume", "pet"] },
  { no: "04", name: "가족·커플", desc: "함께라서 더 예쁜 한 장", value: "family", thumbs: ["couple", "wedding", "duofamily"] },
  { no: "05", name: "재미·추억", desc: "오늘의 웃음 한 장", value: "fun", thumbs: ["baby", "clay", "y2k"] },
];
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [welcomeCoins, setWelcomeCoins] = useState(0); // >0이면 웰컴 모달 표시(값 = 받은 코인 수)
  const [payingProduct, setPayingProduct] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyView, setHistoryView] = useState<HistoryItem | null>(null);
  const [detail, setDetail] = useState<Concept | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => { setFavs(getFavorites()); }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [bizInfoOpen, setBizInfoOpen] = useState(false);
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const [allConceptsCat, setAllConceptsCat] = useState("all");
  const [historyTab, setHistoryTab] = useState<"image" | "motion">("image");
  // ─── 앱 심사용 숨김 로그인 (2026-08-10) ──────────────────────────────────
  // 구글·애플 심사원은 한국 카카오 계정이 없어 로그인을 못 뚫는다. 설정의
  // "현재 버전" 값을 3초 안에 7번 탭하면 리뷰 코드 입력칸이 열린다 —
  // 안드로이드 "빌드 번호 7번 탭" 관례와 같아 영어로 설명하기 쉽다.
  // ★이 외의 노출 경로는 없고, 설정을 닫으면 입력칸·탭 기록이 모두 초기화된다.
  const reviewTapsRef = useRef<number[]>([]);
  const [showReviewCode, setShowReviewCode] = useState(false);
  const [reviewCode, setReviewCode] = useState("");
  const [reviewErr, setReviewErr] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const bumpReviewTap = () => {
    const now = Date.now();
    const taps = [...reviewTapsRef.current, now].filter(t => now - t <= 3000);
    reviewTapsRef.current = taps;
    if (taps.length >= 7) { reviewTapsRef.current = []; setShowReviewCode(true); }
  };
  const submitReviewCode = async () => {
    const code = reviewCode.trim();
    if (!code || reviewBusy) return;
    setReviewBusy(true); setReviewErr("");
    try {
      const res = await fetch("/api/auth/review-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      // 404 = 통로 자체가 꺼짐(env 미설정) / 401 = 코드 불일치. 둘 다 영어로 짧게.
      if (!res.ok) { setReviewErr(res.status === 404 ? "Unavailable" : "Invalid code"); setReviewBusy(false); return; }
      window.location.replace("/"); // 세션 반영 — 전체 새로고침
    } catch {
      setReviewErr("Network error"); setReviewBusy(false);
    }
  };
  // 뒤로가기 → 열린 오버레이만 한 겹씩 닫기 (앱 이탈 방지, 겹침은 열린 순서대로)
  // 하단 탭도 표준 편입: 홈 외 탭에서 뒤로 = 홈 탭 복귀. ★오버레이들보다 먼저 등록해
  // 동시 오픈 시에도 탭이 스택 바닥(오버레이 먼저 닫힘 → 마지막에 탭이 홈으로).
  // 홈 탭에서는 조건 false → 칸을 안 쌓아 정상 종료 흐름 보존.
  useBackClose(activeTab !== "home", () => setActiveTab("home"));
  useBackClose(!!detail, () => setDetail(null));
  useBackClose(showSettings, () => setShowSettings(false));
  useBackClose(showAllConcepts, () => setShowAllConcepts(false));
  useBackClose(!!historyView, () => setHistoryView(null));
  useBackClose(showPaymentSheet, () => setShowPaymentSheet(false));
  useBackClose(welcomeCoins > 0, () => setWelcomeCoins(0)); // 웰컴 모달 — 뒤로가기로도 닫힌다
  // 설정을 닫으면 심사용 입력칸은 흔적 없이 원상복귀 (다시 열려면 7탭을 다시 해야 한다)
  useEffect(() => {
    if (showSettings) return;
    reviewTapsRef.current = [];
    setShowReviewCode(false); setReviewCode(""); setReviewErr("");
  }, [showSettings]);
  // ─── 워드마크 → 홈 복귀 (2026-07-25) ───────────────────────────────────────
  // 리렌더 강제용. HomeMain은 인라인 컴포넌트라 Home이 리렌더되면 리마운트되고,
  // 그때 pill을 persistedHomePill에서 다시 읽는다 → 미러만 0으로 바꾸면 칩이 홈으로 돌아온다.
  const [, bumpHome] = useState(0);
  const goHome = () => {
    // ★열린 오버레이 수만큼 "한 번에" 뒤로 점프한다.
    //   오버레이를 state로 하나씩 닫으면 useBackClose 정리자가 각각 history.back()을
    //   같은 틱에 N번 쏘는데, 브라우저가 이를 합치면 ignoreNextPop 가드만 남아
    //   다음 뒤로가기를 삼킨다(앱 종료 증상). go(-N)은 popstate 1회로 끝나고
    //   훅의 "점프 대응" while 루프가 스택을 정확히 비운다 — 가드 불균형이 생기지 않는다.
    const openCount = [activeTab !== "home", !!detail, showSettings, showAllConcepts, !!historyView, showPaymentSheet]
      .filter(Boolean).length;
    persistedHomePill = 0; // 칩을 "홈"으로 (미러 → 리마운트 시 반영)
    if (openCount > 0) window.history.go(-openCount);
    else bumpHome(n => n + 1); // 오버레이가 없으면 리렌더가 안 일어나므로 직접 유발
    window.scrollTo(0, 0);
    // go(-N)의 popstate는 비동기라 위 스크롤이 닫히기 전에 끝난다 → 닫힌 뒤 한 번 더.
    if (openCount > 0) setTimeout(() => window.scrollTo(0, 0), 80);
  };
  // (홈 코인 잔액 캐시는 코인 카드와 함께 제거 — 이 fetch는 그 카드 전용이었고,
  //  잔액이 필요한 코인 탭·402 시트는 각자 조회한다. 홈 진입 시 /api/coins 호출 1회 절감.)
  // 만들기 뒤로 복귀 재연 (y2k 파일럿) — 진입 때 심은 컨텍스트를 1회 소비해 상세(+전체보기·칩) 재오픈.
  // ★즉시 removeItem = 1회 소비 원칙: 새로고침·앞으로가기·딥링크 홈 직행에선 컨텍스트가 없어 무동작.
  // 전체보기 경유였다면 전체보기를 먼저 열고(가짜 칸 depth1), 상세는 다음 틱에 열어(depth2 = 스택 위)
  // "뒤로 = 상세 닫힘 → 전체보기 → 뒤로 = 홈" 순서를 보장한다 (동시 오픈이면 등록 순서상 역전됨).
  // 커버는 layout 인라인 스크립트가 서버 페인트 순간부터 세움(data-mospic-restoring) —
  // 하이드레이션 전 빈 홈 노출을 원천 차단. 여기서는 복원을 수행하고 오버레이 오픈 완료 시
  // 커버를 즉시 해제한다(인라인 1200ms 백스톱 타이머보다 먼저). ctx 소비도 여기 1곳뿐.
  useIsoLayoutEffect(() => {
    const uncover = () => document.documentElement.removeAttribute("data-mospic-restoring");
    try {
      const raw = sessionStorage.getItem("mospic_back_ctx");
      if (!raw) return;
      sessionStorage.removeItem("mospic_back_ctx");
      const ctx = JSON.parse(raw) as { detail?: string; from?: string; cat?: string };
      if (!ctx?.detail) { uncover(); return; }
      // 정규 키 직조회 — 폐기·미지 키면 조용히 무시 (conceptForGo는 soon 폴백이라 부적합)
      const found = CONCEPTS[ctx.detail];
      if (!found) { uncover(); return; }
      if (ctx.from === "all") {
        setShowAllConcepts(true);
        if (ctx.cat) setAllConceptsCat(ctx.cat);
        setTimeout(() => { setDetail(found); uncover(); }, 0);
      } else {
        if (ctx.from === "favs") persistedHomePill = 1; // ⭐ 즐겨찾기 칩 복원(홈 칩 신설로 0→1) — HomeMain lazy init이 읽음
        setDetail(found);
        uncover();
      }
    } catch { uncover(); /* 파싱·접근 불가 — 재연만 포기, 홈은 정상 */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 충전 완료 복귀 (?tab=coin) → 코인 탭 열고 주소 정리
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "coin") {
      setActiveTab("ticket");
      window.history.replaceState(null, "", "/");
    }
  }, []);
  // 최초 로그인 웰컴 (?welcome=N) → 모달 1회, 주소 정리 (위 ?tab=coin과 같은 관례)
  //   콜백이 ensureWelcome 첫 지급일 때만 이 쿼리를 단다 = 재로그인에는 안 뜬다.
  //   코인 수는 쿼리로 받는다 — 서버의 WELCOME_COINS가 진실원이고 여기서 3을 하드코딩하지 않는다.
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("welcome"));
    if (Number.isFinite(n) && n > 0) {
      setWelcomeCoins(n);
      window.history.replaceState(null, "", "/");
    }
  }, []);
  // 로그인 실패 사유 (?error=코드) → 토스트 1회, 주소 정리. ★코드가 화면에 안 뜨면
  //   사용자는 "눌렀는데 그냥 홈이야"만 겪는다 — 콜백은 이미 5종을 붙이고 있었는데
  //   읽는 곳이 한 군데도 없었다(2026-09-03 감사에서 발견).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (!code) return;
    const MSG: Record<string, string> = {
      kakao_login_failed: "카카오 로그인이 취소되었거나 실패했어요. 다시 시도해주세요.",
      token_failed: "로그인 처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요. (코드 T1)",
      user_info_failed: "카카오 정보를 받지 못했어요. 동의 화면에서 '동의하고 계속하기'를 눌러주세요. (코드 U1)",
      auth_not_configured: "서버 설정 문제로 지금은 로그인할 수 없어요. 운영자에게 알려주세요. (코드 A1)",
      server_error: "일시적인 오류예요. 잠시 후 다시 시도해주세요. (코드 S1)",
      welcome_failed: "로그인은 완료됐어요. 시작 코인 지급이 잠시 지연됐고, 첫 생성 때 자동으로 채워져요.",
    };
    toast(MSG[code] || "문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    window.history.replaceState(null, "", "/");
  }, []);
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.loggedIn) setUser(d.user); }).catch(() => {}).finally(() => setUserLoading(false));
  }, []);
 // 로그인 상태면 클라우드(Blob+Redis) 히스토리를, 비로그인이면 기존 로컬(IndexedDB)을 표시
 const loadHistory = useCallback(async () => {
   if (user) {
     const cloud = await getCloudHistory();
     setHistory(cloud.map(c => ({ id: c.id, src: c.url, concept: c.concept, createdAt: c.createdAt, originalUrl: c.originalUrl, recovered: c.recovered })));
   } else {
     setHistory(await getHistory());
   }
 }, [user]);
 useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);
  const handleLogin = () => { window.location.replace("/api/auth/kakao"); };
  const handleLogout = () => { window.location.replace("/api/auth/logout"); };
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
  // ─── 공통 헤더 ───────────────────────────────────────────────
  const Header = ({ title, onBack }: { title?: string; onBack?: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 58, background: "#fff", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", padding: "4px 8px 4px 0", cursor: "pointer", color: "#111", display: "flex" }}>
            <Icon.Back />
          </button>
        ) : (
          // 워드마크 = 홈 복귀 버튼. 로고 크기(28)는 그대로 두고 상하 패딩으로만
          // 탭 영역을 44px로 확보 — 세로 중앙 정렬이라 시각 위치는 변하지 않는다.
          <button onClick={goHome} aria-label="홈으로" style={{ background: "none", border: "none", padding: "8px 6px 8px 0", margin: 0, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="mospic" style={{ height: 28, width: "auto", display: "block" }} />
          </button>
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
    { id: "ticket" as Tab, Icon: Icon.Ticket, label: "코인" },
    { id: "coupon" as Tab, Icon: Icon.Coupon, label: "쿠폰" },
    { id: "history" as Tab, Icon: Icon.History, label: "히스토리" },
  ];
  const BottomNav = () => (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 40, paddingBottom: "env(safe-area-inset-bottom)", pointerEvents: "none" }}>
      <div style={{ margin: "0 14px 14px", background: "#fff", borderRadius: 30, boxShadow: "0 4px 18px rgba(0,0,0,0.08)", border: "1px solid #f3f3f3", display: "flex", padding: "8px 6px", pointerEvents: "auto" }}>
        {tabs.map(({ id, Icon: I, label }) => {
          const on = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); }}
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
    const [pill, setPillState] = useState(() => persistedHomePill); // 리마운트 간 유지 — persistedHomePill 미러
    const setPill = (i: number) => { persistedHomePill = i; setPillState(i); };
    const [heroIdx, setHeroIdx] = useState(0);
    const heroRef = useRef<HTMLDivElement>(null);
 // 카드 탭 → 상세 페이지 열기
const handleCardTap = (go: string) => setDetail(conceptForGo(go));
    // ─── 히어로 자동 순환 ──────────────────────────────────────────────────
    // 가로 스크롤 스냅 위에 얹는다(transform 트랙이 아님) — 네이티브 스와이프가
    // 그대로 살아 있고, scrollTo({behavior:"smooth"})가 오른쪽→왼쪽 가로 이동을 그린다.
    const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    // ★정지 조건: 홈 칩이 아니거나 홈 탭이 아니면 히어로가 화면에 없다 → 타이머를 돌릴 이유가 없다.
    const heroRunnable = HOME_PILLS[pill].value === "home" && activeTab === "home" && HERO_SLIDES.length > 1;

    const stopHero = () => { if (heroTimer.current) { clearInterval(heroTimer.current); heroTimer.current = null; } };
    const startHero = () => {
      stopHero();
      if (!heroRunnable) return;
      heroTimer.current = setInterval(() => {
        const el = heroRef.current;
        if (!el || !el.clientWidth) return;
        if (document.hidden) return; // 탭 백그라운드 — 넘기지 않는다
        const cur = Math.round(el.scrollLeft / el.clientWidth);
        // ★항상 오른쪽으로만 간다. 마지막(6번) 다음은 배열 끝에 덧붙인 1번 클론 →
        //   도착 즉시 onHeroScroll이 애니메이션 없이 진짜 1번으로 갈아끼운다.
        //   덕분에 "마지막 → 첫 장"이 되감기 스윕 없이 이어진다.
        const next = cur + 1 > HERO_SLIDES.length ? 0 : cur + 1;
        el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      }, HERO_INTERVAL_MS);
    };

    useEffect(() => {
      startHero();
      // 탭이 백그라운드로 가면 타이머 자체를 끄고, 돌아오면 다시 건다(배터리·불필요 리렌더 방지)
      const onVis = () => { if (document.hidden) stopHero(); else startHero(); };
      document.addEventListener("visibilitychange", onVis);
      return () => { stopHero(); document.removeEventListener("visibilitychange", onVis); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heroRunnable]);

    // 히어로 스크롤 시 현재 인덱스 추적 (우하단 카운터용) + 클론 착지 처리
    const onHeroScroll = () => {
      const el = heroRef.current;
      if (!el || !el.clientWidth) return;
      const w = el.clientWidth;
      const raw = Math.round(el.scrollLeft / w);
      // ★클론(마지막+1)에 "완전히 도착"했을 때만 순간 이동. 스크롤이 멈춘 뒤여야
      //   애니메이션과 싸우지 않는다(2px 이내 = 스냅 완료).
      //   클론과 1번은 같은 이미지라 갈아끼워도 화면에 변화가 보이지 않는다.
      //   자동 전환·손가락 스와이프 어느 쪽으로 도착해도 같은 경로를 탄다.
      if (raw >= HERO_SLIDES.length && Math.abs(el.scrollLeft - raw * w) < 2) {
        el.scrollTo({ left: 0, behavior: "auto" });
        setHeroIdx(0);
        startHero();
        return;
      }
      const idx = raw % HERO_SLIDES.length; // 인디케이터는 클론을 세지 않는다
      setHeroIdx(idx);
      // ★수동 스와이프 직후 곧바로 자동 전환되면 뺏기는 느낌이 난다 → 타이머를 처음부터 다시.
      //   (자동 전환이 만든 스크롤에도 걸리지만, 결과는 "한 장당 5초"로 동일해 무해하다)
      startHero();
    };
    const renderCard = (item: HomeCardItem, width: string | number, ratio: string) => (
      <div key={item.id} className="pressable" onClick={() => handleCardTap(item.go)} style={{ width, flexShrink: 0, cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          <div style={{ aspectRatio: ratio, borderRadius: HOME.radius, overflow: "hidden", background: `linear-gradient(155deg, ${item.accent} 0%, #ffffff 135%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
            {item.image ? <img src={item.image} alt={item.title} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
          </div>
          {item.badge && <span style={{ position: "absolute", left: 10, bottom: 10, background: HOME.accent, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>{item.badge}</span>}
          {CONCEPTS[item.go]?.coinCost === 0 && <span style={{ position: "absolute", left: 10, top: 10, background: "#1B7A4A", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>무료</span>}
          {audienceBadge(item.go)}
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
        <div className="hide-scrollbar" style={{ display: "flex", gap: 18, overflowX: "auto", padding: "8px 18px 10px" }}>
          {HOME_PILLS.map((p, i) => {
            const on = pill === i;
            return (
              <button key={p.label} onClick={() => setPill(i)} style={{ position: "relative", flexShrink: 0, padding: "3px 2px 8px", cursor: "pointer", fontSize: 14, fontWeight: on ? 800 : 600, background: "none", border: "none", borderBottom: on ? "2px solid #FF4B7C" : "2px solid transparent", color: on ? "#191919" : "#8A8F98" }}>
                {p.label}
              
              </button>
            );
          })}
        </div>
        {/* 상단 배너 (한 장씩 꽉 차게 스와이프 + 우하단 카운터) — 전체(pill 0)에서만 표시 */}
        {HOME_PILLS[pill].value === "home" && (
        <div style={{ position: "relative" }}>
        <div ref={heroRef} onScroll={onHeroScroll} className="hide-scrollbar" style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", padding: 0 }}>
          {/* 마지막에 1번 슬라이드의 복제본을 한 장 더 깐다 — 무한 루프용(위 onHeroScroll 참고).
              슬라이드가 1장뿐이면 순환이 없으므로 클론도 만들지 않는다. */}
          {(HERO_SLIDES.length > 1 ? [...HERO_SLIDES, { ...HERO_SLIDES[0], id: HERO_SLIDES[0].id + "-loop" }] : HERO_SLIDES).map(h => (
            <div key={h.id} style={{ flexShrink: 0, width: "100%", scrollSnapAlign: "center", paddingRight: 0, boxSizing: "border-box" }}>
              {/* split 슬라이드는 판 전체가 아니라 좌·우 존이 각자 탭을 받는다 */}
              <div onClick={h.split ? undefined : () => handleCardTap(h.go!)} style={{ borderRadius: 0, height: 270, cursor: h.split ? "default" : "pointer", position: "relative", overflow: "hidden", background: `linear-gradient(165deg, ${h.accent} 0%, #ffffff 130%)` }}>
                {h.image ? (
                  <>
                    <img src={h.image} alt={h.title ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: h.objectPosition }} />
                    {/* 어둠 그라데이션은 흰 글자 가독성용 — split은 글자가 없어 사진만 어두워지므로 뺀다 */}
                    {!h.split && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 35%, transparent 60%)" }} />}
                  </>
                ) : (
                  <div style={{ position: "absolute", right: 18, top: 44, fontSize: 120, opacity: 0.4 }}>{h.emoji}</div>
                )}
                {h.split ? h.split.map((z, zi) => (
                  <div key={z.key} onClick={() => handleCardTap(z.key)}
                    style={{ position: "absolute", top: 0, bottom: 0, left: zi === 0 ? 0 : "50%", width: "50%", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 48 }}>
                    {/* ★coinCost === 0 일 때만 — IAP 전환 시 자동 소멸(허위 고지 방지). 카드 뱃지와 같은 조건 */}
                    {CONCEPTS[z.key]?.coinCost === 0 && (
                      <span style={{ marginBottom: 6, background: "#1B7A4A", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>무료</span>
                    )}
                    <span style={{ background: "rgba(255,255,255,0.94)", color: "#191919", fontSize: 15, fontWeight: 800, padding: "8px 14px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>{z.label}</span>
                  </div>
                )) : (
                  <div style={{ position: "absolute", left: 24, bottom: 28, textAlign: "left" }}>
                    <p style={{ margin: 0, fontSize: 25, fontWeight: 900, color: "#fff", letterSpacing: -0.5, whiteSpace: "pre-line", textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>{h.title}</p>
                    <p style={{ margin: "7px 0 0", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.92)", textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>{h.subtitle}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* 페이지 카운터 "01 / 09" — 점 인디케이터를 대체한다(2026-08-10).
            ★스크롤 컨테이너 "바깥"에 겹친다: 안에 두면 슬라이드를 따라 밀려나가
            넘길 때 카운터가 두 개 스쳐 보인다. 여기서는 판 위에 고정으로 얹힌다.
            ★글자 없는 split 슬라이드는 어둠 그라데이션이 없어(위 참고) 흰 글씨만으로는
            밝은 사진에 묻힌다 → 옅은 다크 칩을 깔아 어떤 사진에서도 읽히게 했다.
            pointerEvents none — 카드 탭이 카운터에 막히지 않는다. */}
        {HERO_SLIDES.length > 1 && (
          <div style={{ position: "absolute", right: 14, bottom: 22, pointerEvents: "none", background: "rgba(0,0,0,0.38)", borderRadius: 20, padding: "4px 10px", fontSize: 12, letterSpacing: 0.6, lineHeight: 1.35 }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>{String(heroIdx + 1).padStart(2, "0")}</span>
            <span style={{ color: "rgba(255,255,255,0.62)", fontWeight: 600 }}> / {String(HERO_SLIDES.length).padStart(2, "0")}</span>
          </div>
        )}
        </div>
        )}
        {/* 코인 현황 카드는 2026-07-25에 제거 — 랜딩 최상단은 컨셉을 보여주는 자리로 양보했다.
            잔액·충전은 하단 "코인" 탭이, 부족 안내는 402 시트가 그대로 담당한다. */}
        {/* 섹션들 — 전체(pill 0)는 기존 섹션 미리보기, 그 외 칩은 2열 그리드 */}
        {HOME_PILLS[pill].value === "home" ? HOME_SECTIONS.map(section => {
          const isGrid = section.layout === "grid";
          const cat = HOME_PILLS[pill].value;
          // "인기"는 badge가 BEST/NEW인 카드만, 나머지는 카테고리 매칭
          const filteredItems = cat === "home"
            ? section.items
            : cat === "hot"
            ? section.items.filter(it => it.badge === "BEST" || it.badge === "NEW")
            : section.items.filter(it => (GO_CATEGORIES[it.go] || []).includes(cat));
          if (filteredItems.length === 0) return null;
          return (
            <Fragment key={section.id}>
            <div style={{ marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 18px", marginBottom: 13 }}>
                <div>
                  {section.heading ? <p style={{ margin: "0 0 3px", fontSize: 14, color: HOME.sub, fontWeight: 500 }}>{section.heading}</p> : null}
                  <p style={{ margin: 0, fontSize: 24, color: HOME.text, fontWeight: 900, letterSpacing: -0.4 }}>{section.title}<span style={{ color: "#FF4B7C" }}>.</span></p>
                </div>
                {/* section.cat이 있으면 그 카테고리로, 없으면 종전대로 현재 칩을 따라간다
                    (cat 미보유 3섹션은 v = HOME_PILLS[pill].value 로 기존과 완전 동치) */}
                <button onClick={() => { const v = section.cat ?? HOME_PILLS[pill].value; setAllConceptsCat(v === "home" ? "all" : v); setShowAllConcepts(true); }} style={{ color: HOME.sub, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", background: "none", border: "none", cursor: "pointer", padding: 0 }}>전체보기 ›</button>
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
            {/* MOSPIC STUDIO 검은 배너 — more 섹션 바로 뒤, 전체(pill 0)에서만 */}
            {section.id === "more" && (
              <div style={{ marginTop: 30, background: "#191919", padding: "32px 24px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#FF4B7C", fontWeight: 700, letterSpacing: 1 }}>MOSPIC STUDIO</p>
                <p style={{ margin: 0, fontSize: 23, color: "#fff", fontWeight: 900, whiteSpace: "pre-line", letterSpacing: -0.4, lineHeight: 1.35 }}>{"사진관 안 가도,\n사진관보다 잘 나오게"}<span style={{ color: "#FF4B7C" }}>.</span></p>
              </div>
            )}
            {/* 카테고리 목차 — 비즈니스 섹션 바로 뒤, 사장님 섹션 앞. 검은 배너와 같은 방식으로 끼운다.
                줄 탭 = 그 카테고리가 선택된 전체보기 오버레이(뒤로가기 = 오버레이만 닫힘). */}
            {section.id === "bizline" && (
              <div style={{ marginTop: 30 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 18px", marginBottom: 13 }}>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 14, color: HOME.sub, fontWeight: 500 }}>카테고리로 한눈에</p>
                    <p style={{ margin: 0, fontSize: 24, color: HOME.text, fontWeight: 900, letterSpacing: -0.4 }}>무엇을 만들까요<span style={{ color: "#FF4B7C" }}>.</span></p>
                  </div>
                  <button onClick={() => { setAllConceptsCat("all"); setShowAllConcepts(true); }} style={{ color: HOME.sub, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", background: "none", border: "none", cursor: "pointer", padding: 0 }}>전체보기 ›</button>
                </div>
                <div style={{ padding: "0 18px" }}>
                  {INDEX_ROWS.map((row, ri) => (
                    <div key={row.value} className="pressable"
                      onClick={() => { setAllConceptsCat(row.value); setShowAllConcepts(true); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", cursor: "pointer", borderBottom: ri < INDEX_ROWS.length - 1 ? "1px solid #EEECE8" : "none" }}>
                      <span style={{ width: 24, flexShrink: 0, fontSize: 13, color: HOME.sub, fontWeight: 600 }}>{row.no}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 17, color: HOME.text, fontWeight: 800 }}>{row.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: HOME.sub }}>{row.desc}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {row.thumbs.map((t, ti) => (
                          <div key={t} style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "2px solid #FAFAF8", marginLeft: ti === 0 ? 0 : -10, flexShrink: 0 }}>
                            <img src={`/cards/${t}.webp`} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ))}
                        <span style={{ marginLeft: 6, fontSize: 18, color: HOME.sub }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </Fragment>
          );
        }) : (() => {
          // 카테고리 선택 시: 해당 카테고리 컨셉 전체를 2열 그리드로 (전체보기 오버레이와 동일 로직)
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
          const cat = HOME_PILLS[pill].value;
          // 전체 = 노출 컨셉 전량 나열 / 인기 = POPULAR_KEYS 20종을 배열 순서 그대로
          const list = cat === "all"
            ? all
            : cat === "hot"
            ? POPULAR_KEYS.filter(k => CONCEPTS[k]).map(k => all.find(it => it.go === k)).filter((it): it is HomeCardItem => !!it)
            : cat === "favs"
            ? all.filter(it => favs.includes(conceptForGo(it.go).key))
            : all.filter(it => (GO_CATEGORIES[it.go] || []).includes(cat));
          if (list.length === 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
                <span style={{ fontSize: 48, opacity: 0.15 }}>{cat === "favs" ? "⭐" : "🪄"}</span>
                <p style={{ fontSize: 14, color: "#9B9B9B", margin: 0, textAlign: "center", lineHeight: 1.6, padding: "0 30px", whiteSpace: "pre-line" }}>{cat === "favs" ? "아직 즐겨찾기한 컨셉이 없어요.\n컨셉 상세에서 ⭐를 눌러 추가해보세요" : "이 카테고리는 준비 중이에요"}</p>
              </div>
            );
          }
          return (
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 18px" }}>
              {list.map(it => renderCard(it, "100%", "3 / 4"))}
            </div>
          );
        })()}
        <div style={{ height: 110 }} />
      </div>
    );
  };
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
    if (activeTab === "home") return <HomeMain />;
    if (activeTab === "ticket") return (
      <CoinWallet loggedIn={!!user} onLogin={handleLogin} />
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
                    {/* 복구됨 — 생성 중 앱을 나가 저장되지 못한 건을 서버 원본에서 되살린 것.
                        표시가 없으면 "이건 왜 여기 있지"가 되므로 작은 배지 하나로 알린다 */}
                    {item.recovered && <span style={{ position: "absolute", right: 5, top: 5, background: "rgba(255,255,255,.92)", color: "#3A3E45", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>복구됨</span>}
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
              {/* 저장·공유는 항상 최고 화질(원본 있으면 원본, 없으면 축소본) — "원본 저장" 별도 버튼 없음 */}
              <button onClick={() => { const s = historyView.originalUrl ?? historyView.src; const ext = /\.png(\?|$)/.test(s) || s.startsWith("data:image/png") ? "png" : "jpg"; void saveImage(s, `mospic_${historyView.id}.${ext}`); }}
                style={{ background: "#fff", color: "#111", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>저장하기</button>
              <button onClick={() => { const s = historyView.originalUrl ?? historyView.src; const ext = /\.png(\?|$)/.test(s) || s.startsWith("data:image/png") ? "png" : "jpg"; void shareImage(s, `mospic_${historyView.id}.${ext}`, "MOSPIC에서 만든 사진이에요 · mospic.com"); }}
                style={{ background: "#fff", color: "#111", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>공유하기</button>
              <button onClick={() => setHistoryView(null)} style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
            {/* 4K 업스케일 — 원본 있으면 원본 기준. 축소본(src) 입력이면 업스케일 품질에 한계가 있고, 투명 PNG는 JPEG 재인코딩 특성상 배경이 채워질 수 있음 */}
            <div style={{ marginTop: 4, width: "100%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
              <Upscale4K image={historyView.originalUrl ?? historyView.src} />
            </div>
            <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
              <button onClick={async () => {
                if (!window.confirm("이 사진을 삭제할까요? 되돌릴 수 없어요")) return;
                const id = historyView.id;
                await deleteHistoryItem(id);
                if (user) await deleteCloudHistoryItem(id);
                setHistory(h => h.filter(x => x.id !== id));
                setHistoryView(null);
                toast("삭제했어요");
              }} style={{ background: "none", color: "#FF6B6B", border: "1px solid rgba(255,107,107,.55)", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>삭제</button>
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
      <Header />
      <main style={{ paddingBottom: 80 }}>
        {renderContent()}
        {detail && (
          // zIndex 136: 전체보기(135) 위에 겹침 — 상세 뒤로 = 상세만 닫혀 전체보기 복귀. 설정(140)보다는 아래
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 136, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 2 }}>
              <button onClick={() => setDetail(null)} style={{ background: "rgba(255,255,255,0.9)", border: "none", width: 38, height: 38, borderRadius: "50%", fontSize: 22, cursor: "pointer", color: "#191919", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>‹</button>
              {detail.key !== "soon" && (
                <button onClick={() => { const added = toggleFavorite(detail.key); setFavs(getFavorites()); toast(added ? "즐겨찾기에 추가했어요" : "즐겨찾기에서 뺐어요"); }}
                  style={{ marginLeft: "auto", background: "rgba(255,255,255,0.9)", border: "none", width: 40, height: 40, borderRadius: "50%", fontSize: 22, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", color: favs.includes(detail.key) ? "#FF4B7C" : "#D6D9DF" }}>
                  {favs.includes(detail.key) ? "★" : "☆"}
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginTop: -58 }}>
              {detail.detailImage ? (
                /* 통이미지 상세페이지: 풀폭 이미지 한 장만 */
                <img src={detail.detailImage} alt={detail.title} loading="lazy" decoding="async" style={{ width: "100%", display: "block", background: "#F1F2F6", minHeight: 240 }} />
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
                            <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
                <button onClick={() => { if (detail.start !== "soon") { try { sessionStorage.setItem("mospic_back_ctx", JSON.stringify({ detail: detail.key, from: showAllConcepts ? "all" : HOME_PILLS[persistedHomePill].value === "favs" ? "favs" : "home", cat: allConceptsCat })); } catch { /* 시크릿 모드 등 — 재연만 포기 */ } } if (detail.start === "baby") { window.location.replace("/baby"); } else if (detail.start === "voxel") { window.location.replace("/voxel"); } else if (detail.start === "pendrawing") { window.location.replace("/pendrawing"); } else if (detail.start === "oilportrait") { window.location.replace("/oilportrait"); } else if (detail.start === "softanime") { window.location.replace("/softanime"); } else if (detail.start === "retroanime") { window.location.replace("/retroanime"); } else if (detail.start === "popart") { window.location.replace("/popart"); } else if (detail.start === "marble") { window.location.replace("/marble"); } else if (detail.start === "chibifigure") { window.location.replace("/chibifigure"); } else if (detail.start === "clayfigure") { window.location.replace("/clayfigure"); } else if (detail.start === "stitchart") { window.location.replace("/stitchart"); } else if (detail.start === "pixelart") { window.location.replace("/pixelart"); } else if (detail.start === "stainedglass") { window.location.replace("/stainedglass"); } else if (detail.start === "neonsign") { window.location.replace("/neonsign"); } else if (detail.start === "paperart") { window.location.replace("/paperart"); } else if (detail.start === "stickerpack") { window.location.replace("/stickerpack"); } else if (detail.start === "toon3d") { window.location.replace("/toon3d"); } else if (detail.start === "food") { window.location.replace("/food"); } else if (detail.start === "factory") { window.location.replace("/factory"); } else if (detail.start === "pet") { window.location.replace("/pet"); } else if (detail.start === "product") { window.location.replace("/product"); } else if (detail.start === "restore") { window.location.replace("/restore"); } else if (detail.start === "realestate") { window.location.replace("/realestate"); } else if (detail.start === "interior") { window.location.replace("/interior"); } else if (detail.start === "car") { window.location.replace("/car"); } else if (detail.start === "lifeshot") { window.location.replace("/lifeshot"); } else if (detail.start === "y2k") { window.location.replace("/y2k"); } else if (detail.start === "roman") { window.location.replace("/roman"); } else if (detail.start === "clay") { window.location.replace("/clay"); } else if (detail.start === "luxe") { window.location.replace("/luxe"); } else if (detail.start === "homecafe") { window.location.replace("/homecafe"); } else if (detail.start === "travel") { window.location.replace("/travel"); } else if (detail.start === "halloween") { window.location.replace("/halloween"); } else if (detail.start === "goods") { window.location.replace("/goods"); } else if (detail.start === "hanbok") { window.location.replace("/hanbok"); } else if (detail.start === "retro90") { window.location.replace("/retro90"); } else if (detail.start === "hocance") { window.location.replace("/hocance"); } else if (detail.start === "redcarpet") { window.location.replace("/redcarpet"); } else if (detail.start === "birthday") { window.location.replace("/birthday"); } else if (detail.start === "job") { window.location.replace("/job"); } else if (detail.start === "sporty") { window.location.replace("/sporty"); } else if (detail.start === "flower") { window.location.replace("/flower"); } else if (detail.start === "bizprofile") { window.location.replace("/bizprofile"); } else if (detail.start === "hairstyle") { window.location.replace("/hairstyle"); } else if (detail.start === "illust") { window.location.replace("/illust"); } else if (detail.start === "idskyblue") { window.location.replace("/id-skyblue-skyblue"); } else if (detail.start === "biznavy") { window.location.replace("/biz-navy-gray"); } else if (detail.start === "bizmnavy") { window.location.replace("/biz-man-navy"); } else if (detail.start === "bizmcharcoal") { window.location.replace("/biz-man-charcoal"); } else if (detail.start === "bizmblack") { window.location.replace("/biz-man-black"); } else if (detail.start === "bizmlightgray") { window.location.replace("/biz-man-lightgray"); } else if (detail.start === "bizmvest") { window.location.replace("/biz-man-vest"); } else if (detail.start === "bizmbeige") { window.location.replace("/biz-man-beige"); } else if (detail.start === "bizmblazer") { window.location.replace("/biz-man-blazer"); } else if (detail.start === "bizmturtle") { window.location.replace("/biz-man-turtleneck"); } else if (detail.start === "bizmdb") { window.location.replace("/biz-man-db"); } else if (detail.start === "bizmknittie") { window.location.replace("/biz-man-knittie"); } else if (detail.start === "bizblack") { window.location.replace("/biz-black-gray"); } else if (detail.start === "bizwhite") { window.location.replace("/biz-white-gray"); } else if (detail.start === "bizribbon") { window.location.replace("/biz-ribbon-gray"); } else if (detail.start === "bizbeige") { window.location.replace("/biz-beige-gray"); } else if (detail.start === "bizlavender") { window.location.replace("/biz-lavender-gray"); } else if (detail.start === "bizgray") { window.location.replace("/biz-gray-gray"); } else if (detail.start === "bizknit") { window.location.replace("/biz-knit-gray"); } else if (detail.start === "bizchiffon") { window.location.replace("/biz-chiffon-gray"); } else if (detail.start === "bizpinkjacket") { window.location.replace("/biz-pinkjacket-gray"); } else if (detail.start === "bizcreamdress") { window.location.replace("/biz-creamdress-gray"); } else if (detail.start === "biznavyblouse") { window.location.replace("/biz-navyblouse-gray"); } else if (detail.start === "bizskyblouse") { window.location.replace("/biz-skyblouse-gray"); } else if (detail.start === "bizpinktweed") { window.location.replace("/biz-pinktweed-gray"); } else if (detail.start === "bizshirring") { window.location.replace("/biz-shirring-gray"); } else if (detail.start === "bizviolet") { window.location.replace("/biz-violet-gray"); } else if (detail.start === "bizblueskirt") { window.location.replace("/biz-blueskirt-gray"); } else if (detail.start === "bizburgundy") { window.location.replace("/biz-burgundy-gray"); } else if (detail.start === "bizkhaki") { window.location.replace("/biz-khaki-gray"); } else if (detail.start === "bizblackdress") { window.location.replace("/biz-blackdress-gray"); } else if (detail.start === "bizbluegray") { window.location.replace("/biz-bluegray-gray"); } else if (detail.start === "bizpinstripe") { window.location.replace("/biz-pinstripe-gray"); } else if (detail.start === "bizcheck") { window.location.replace("/biz-check-gray"); } else if (detail.start === "bizknitdress") { window.location.replace("/biz-knitdress-gray"); } else if (detail.start === "idblack") { window.location.replace("/id-black-gray"); } else if (detail.start === "idnavy") { window.location.replace("/id-navy-gray"); } else if (detail.start === "idcharcoal") { window.location.replace("/id-charcoal-gray"); } else if (detail.start === "idwhiteshirt") { window.location.replace("/id-whiteshirt-gray"); } else if (detail.start === "idbeige") { window.location.replace("/id-beige-gray"); } else if (detail.start === "idblacktie") { window.location.replace("/id-blacktie-gray"); } else if (detail.start === "idblouse") { window.location.replace("/id-blouse-gray"); } else if (detail.start === "idknit") { window.location.replace("/id-knit-gray"); } else if (detail.start === "idturtleneck") { window.location.replace("/id-turtleneck-gray"); } else if (detail.start === "idglasses") { window.location.replace("/id-glasses-gray"); } else if (detail.start === "idoffshoulder") { window.location.replace("/id-offshoulder"); } else if (detail.start === "idupdo") { window.location.replace("/id-updo"); } else if (detail.start === "idlonghair") { window.location.replace("/id-longhair"); } else if (detail.start === "idtweed") { window.location.replace("/id-tweed"); } else if (detail.start === "idwavebob") { window.location.replace("/id-wavebob"); } else if (detail.start === "idponytail") { window.location.replace("/id-ponytail"); } else if (detail.start === "idgarma") { window.location.replace("/id-garma"); } else if (detail.start === "iddropcut") { window.location.replace("/id-dropcut"); } else if (detail.start === "idperm") { window.location.replace("/id-perm"); } else if (detail.start === "idpomade") { window.location.replace("/id-pomade"); } else if (detail.start === "idwarmbob") { window.location.replace("/id-warmbob"); } else if (detail.start === "idhime") { window.location.replace("/id-hime"); } else if (detail.start === "idashwave") { window.location.replace("/id-ashwave"); } else if (detail.start === "idlowbun") { window.location.replace("/id-lowbun"); } else if (detail.start === "idburgundy") { window.location.replace("/id-burgundy"); } else if (detail.start === "iddandy") { window.location.replace("/id-dandy"); } else if (detail.start === "iddownperm") { window.location.replace("/id-downperm"); } else if (detail.start === "idnavysuit") { window.location.replace("/id-navysuit"); } else if (detail.start === "idbeigeblazer") { window.location.replace("/id-beigeblazer"); } else if (detail.start === "idhenley") { window.location.replace("/id-henley"); } else if (detail.start === "figure") { window.location.replace("/figure"); } else if (detail.start === "age") { window.location.replace("/age"); }else if (detail.start === "menu") { window.location.replace("/menu"); } else if (detail.start === "nukki") { window.location.replace("/nukki"); } else if (detail.start === "upscale") { window.location.replace("/upscale"); } else if (detail.start === "fashion") { window.location.replace("/fashion"); } else if (detail.start === "idol") { window.location.replace("/idol"); }else if (detail.start === "xmas") { window.location.replace("/xmas"); } else if (detail.start === "graduation") { window.location.replace("/graduation"); } else if (detail.start === "wedding") { window.location.replace("/wedding"); }else if (detail.start === "petstudio") { window.location.replace("/petstudio"); } else if (detail.start === "petbirthday") { window.location.replace("/petbirthday"); } else if (detail.start === "petmemorial") { window.location.replace("/petmemorial"); } else if (detail.start === "petceo") { window.location.replace("/petceo"); } else if (detail.start === "petgraduation") { window.location.replace("/petgraduation"); } else if (detail.start === "petminhwa") { window.location.replace("/petminhwa"); } else if (detail.start === "petroyal") { window.location.replace("/petroyal"); } else if (detail.start === "pettwo") { window.location.replace("/pettwo"); } else if (detail.start === "petjob") { window.location.replace("/petjob"); } else if (detail.start === "petreceipt") { window.location.replace("/petreceipt"); }else if (detail.start === "era") { window.location.replace("/era"); } else if (detail.start === "petcostume") { window.location.replace("/petcostume"); }else if (detail.start === "couple") { window.location.replace("/couple"); } else if (detail.start === "hanbokcouple") { window.location.replace("/hanbokcouple"); } else if (detail.start === "friend") { window.location.replace("/friend"); } else if (detail.start === "remindwedding") { window.location.replace("/remindwedding"); } else if (detail.start === "selfwedding") { window.location.replace("/selfwedding"); } else if (detail.start === "duofamily") { window.location.replace("/duofamily"); } else if (detail.start === "coupletravel") { window.location.replace("/coupletravel"); }else if (detail.start === "family") { window.location.replace("/family"); } else if (detail.start === "familyhanbok") { window.location.replace("/familyhanbok"); } else if (detail.start === "familypet") { window.location.replace("/familypet"); }else if (detail.start === "fourcut") { window.location.replace("/fourcut"); } else if (detail.start === "fourcutillust") { window.location.replace("/fourcutillust"); } else if (detail.start === "fourcutcouple") { window.location.replace("/fourcutcouple"); } else if (detail.start === "goldenhour") { window.location.replace("/goldenhour"); } else if (detail.start === "fixnight") { window.location.replace("/fixnight"); } else if (detail.start === "season") { window.location.replace("/season"); } else if (detail.start === "fixbacklight") { window.location.replace("/fixbacklight"); } else if (detail.start === "bgchange") { window.location.replace("/bgchange"); } else if (detail.start === "fixcrowd") { window.location.replace("/fixcrowd"); } else if (detail.start === "beauty") { window.location.replace("/beauty"); } else if (detail.start === "anisky") { window.location.replace("/anisky"); } else if (detail.start === "brickfigure") { window.location.replace("/brickfigure"); } else if (detail.start === "cheerglam") { window.location.replace("/cheerglam"); } else if (detail.start === "crewglam") { window.location.replace("/crewglam"); } else if (detail.start === "guestlook") { window.location.replace("/guestlook"); } else if (detail.start === "anchorglam") { window.location.replace("/anchorglam"); } else if (detail.start === "goddessdress") { window.location.replace("/goddessdress"); } else if (detail.start === "tripface") { window.location.replace("/tripface"); } else if (detail.start === "idolglam") { window.location.replace("/idolglam"); } else if (detail.start === "campusgrad") { window.location.replace("/campusgrad"); } else if (detail.start === "dresswedding") { window.location.replace("/dresswedding"); } else if (detail.start === "gyaru") { window.location.replace("/gyaru"); } else if (detail.start === "genderswap") { window.location.replace("/genderswap"); } else if (detail.start === "deskfigure") { window.location.replace("/deskfigure"); } else if (detail.start === "digicam") { window.location.replace("/digicam"); } else if (detail.start === "airportsnap") { window.location.replace("/airportsnap"); } else if (detail.start === "cinesnap") { window.location.replace("/cinesnap"); } else if (detail.start === "schoolsnap") { window.location.replace("/schoolsnap"); } else if (detail.start === "gravityad") { window.location.replace("/gravityad"); } else if (detail.start === "feltdoll") { window.location.replace("/feltdoll"); } else if (detail.start === "personalcolor") { window.location.replace("/personalcolor"); } else if (detail.start === "monoactor") { window.location.replace("/monoactor"); } else if (detail.start === "fortunecard") { window.location.replace("/fortunecard"); } else if (detail.start === "minichef") { window.location.replace("/minichef"); } else if (detail.start === "poolside") { window.location.replace("/poolside"); } else if (detail.start === "snowsnap") { window.location.replace("/snowsnap"); } else if (detail.start === "profileduo") { window.location.replace("/profileduo"); } else if (detail.start === "droneview") { window.location.replace("/droneview"); } else if (detail.start === "autumnsnap") { window.location.replace("/autumnsnap"); } else if (detail.start === "trenchlook") { window.location.replace("/trenchlook"); } else if (detail.start === "examcheer") { window.location.replace("/examcheer"); } else if (detail.start === "xmasvintage") { window.location.replace("/xmasvintage"); } else if (detail.start === "campsnap") { window.location.replace("/campsnap"); } else if (detail.start === "picnicsnap") { window.location.replace("/picnicsnap"); } else if (detail.start === "partysnap") { window.location.replace("/partysnap"); } else if (detail.start === "skisnap") { window.location.replace("/skisnap"); } else if (detail.start === "productscene") { window.location.replace("/productscene"); } else if (detail.start === "kidsdraw") { window.location.replace("/kidsdraw"); } else if (detail.start === "flatlay") { window.location.replace("/flatlay"); } else if (detail.start === "ghostfit") { window.location.replace("/ghostfit"); } else if (detail.start === "carad") { window.location.replace("/carad"); }}} style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", background: "#FF4B7C", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
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
              <button onClick={() => { window.location.replace("/privacy"); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>개인정보 처리방침</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <button onClick={() => { window.location.replace("/terms"); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>이용약관</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
            </div>

            {/* 서비스 정보 */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9B9B", margin: "8px 4px 8px" }}>서비스 정보</p>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
              <button onClick={() => { window.location.replace("/ai-notice"); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>AI 생성물 안내</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <button onClick={() => { window.location.href = "mailto:rnrwls159@naver.com"; }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>고객센터</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <button onClick={() => { window.location.href = aiReportMailto("설정"); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>AI 생성물 신고</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>현재 버전</span>
                {/* ★심사용 숨김 트리거 — 이 값을 3초 안에 7번 탭. 원래 클릭 동작이 없던
                    자리라 일반 사용자에겐 보이지도 눌리지도 않는다(커서·하이라이트 무변화). */}
                <span onClick={bumpReviewTap} style={{ fontSize: 13, color: "#9B9B9B", userSelect: "none", WebkitTapHighlightColor: "transparent" }}>{APP_VERSION} · 최신 버전</span>
              </div>
              {showReviewCode && (
                <div style={{ padding: "14px 18px 16px", borderTop: "1px solid #F2F3F5" }}>
                  <p style={{ fontSize: 12, color: "#9B9B9B", margin: "0 0 8px" }}>App review sign-in</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={reviewCode}
                      onChange={e => { setReviewCode(e.target.value); setReviewErr(""); }}
                      onKeyDown={e => { if (e.key === "Enter") void submitReviewCode(); }}
                      placeholder="Review code"
                      autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#191919", outline: "none" }}
                    />
                    <button onClick={() => void submitReviewCode()} disabled={reviewBusy || !reviewCode.trim()}
                      style={{ background: reviewBusy || !reviewCode.trim() ? "#E8E9ED" : "#FF4B7C", color: reviewBusy || !reviewCode.trim() ? "#AEB2BA" : "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: reviewBusy || !reviewCode.trim() ? "not-allowed" : "pointer" }}>
                      {reviewBusy ? "..." : "OK"}
                    </button>
                  </div>
                  {reviewErr && <p style={{ fontSize: 12, color: "#FF4B7C", margin: "8px 2px 0" }}>{reviewErr}</p>}
                </div>
              )}
            </div>

            {/* 데이터 */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9B9B9B", margin: "8px 4px 8px" }}>데이터</p>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
              <button onClick={async () => { if (window.confirm("모든 생성 기록이 삭제되며 복구할 수 없습니다. 계속할까요?")) { await clearHistory(); if (user) await clearCloudHistory(); setHistory([]); toast("생성 기록을 모두 삭제했어요"); } }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#191919" }}>생성 기록 전체 삭제</span>
                <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
              </button>
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
                  <button onClick={() => { navigator.clipboard?.writeText(user.id); toast("사용자 ID를 복사했어요"); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", borderBottom: "1px solid #F2F3F5", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, color: "#9B9B9B" }}>사용자 ID</span>
                    <span style={{ fontSize: 12, color: "#C2C6CE", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.id} 📋</span>
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm("정말 탈퇴하시겠어요?")) return;
                    if (!window.confirm("생성 기록이 모두 삭제되며 복구할 수 없습니다. 계속할까요?")) return;
                    try {
                      const res = await fetch("/api/auth/withdraw", { method: "POST" });
                      if (!res.ok) throw new Error();
                      // 탈퇴 성공 후에만 기기 기록 정리 (클라우드 기록은 서버가 삭제)
                      await clearHistory();
                      alert("탈퇴가 완료됐어요. 이용해 주셔서 감사합니다.");
                      window.location.replace("/");
                    } catch {
                      alert("탈퇴 처리에 실패했어요. 다시 시도해주세요.");
                    }
                  }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "none", border: "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#9AA0AA" }}>회원탈퇴</span>
                    <span style={{ color: "#C2C6CE", fontSize: 18 }}>›</span>
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

            {/* 사업자 정보 (전자상거래 법정 표기) — 접힘 기본, 탭으로 펼침 */}
            <div style={{ marginTop: 28, paddingTop: 16, paddingBottom: 8, borderTop: "1px solid #EFF0F3" }}>
              <button onClick={() => setBizInfoOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <span style={{ fontSize: 11, color: "#BFC3CB" }}>사업자 정보</span>
                <span style={{ fontSize: 11, color: "#BFC3CB", transform: bizInfoOpen ? "rotate(180deg)" : "none" }}>˅</span>
              </button>
              {bizInfoOpen && (
                <p style={{ fontSize: 11, color: "#BFC3CB", lineHeight: 1.9, margin: "8px 0 0" }}>
                  퍼스트 컴퍼니 | 대표: 최민준<br />
                  사업자등록번호: 415-26-00922<br />
                  {/* 통신판매업신고번호: 제0000-대구달서-0000호 — 신고 완료 후 이 줄 활성화 (<br /> 포함) */}
                  대구광역시 달서구 성서로45길 29, 1층 8호 (갈산동)<br />
                  전화: 0507-1427-5058 | 이메일: rnrwls159@naver.com
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 웰컴 코인 모달 — 최초 로그인 1회. 규격은 402 시트(CoinNeededSheet)와 동일:
          같은 오버레이 농도·시트 라운드·핸들·타이틀/서브 크기·CTA 색. 새 색·폰트 도입 없음. */}
      {welcomeCoins > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}
          onClick={(e) => { if (e.target === e.currentTarget) setWelcomeCoins(0); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxWidth: 480, width: "100%", margin: "0 auto" }}>
            <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: "0 0 4px" }}>웰컴 코인 {welcomeCoins}개가 도착했어요 🎉</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 20px" }}>지금 바로 원하는 컨셉을 만들어보세요</p>
            <button onClick={() => setWelcomeCoins(0)}
              style={{ width: "100%", background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              시작하기
            </button>
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
          <div className="hide-scrollbar" style={{ display: "flex", gap: 18, overflowX: "auto", padding: "12px 16px 2px", flexShrink: 0, borderBottom: "1px solid #F4F5F7" }}>
            {HOME_PILLS.filter(p => p.value !== "home").map(p => {
              const on = allConceptsCat === p.value;
              return (
                <button key={p.value} onClick={() => setAllConceptsCat(p.value)} style={{ flexShrink: 0, padding: "3px 2px 10px", cursor: "pointer", fontSize: 14, fontWeight: on ? 800 : 600, background: "none", border: "none", borderBottom: on ? "2px solid #FF4B7C" : "2px solid transparent", color: on ? "#191919" : "#8A8F98" }}>
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
                ? POPULAR_KEYS.filter(k => CONCEPTS[k]).map(k => all.find(it => it.go === k)).filter((it): it is HomeCardItem => !!it)
                : cat === "favs"
                ? all.filter(it => favs.includes(conceptForGo(it.go).key))
                : all.filter(it => (GO_CATEGORIES[it.go] || []).includes(cat));

              if (list.length === 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
                    <span style={{ fontSize: 48, opacity: 0.15 }}>{cat === "favs" ? "⭐" : "🪄"}</span>
                    <p style={{ fontSize: 14, color: "#9B9B9B", margin: 0, textAlign: "center", lineHeight: 1.6, padding: "0 30px", whiteSpace: "pre-line" }}>{cat === "favs" ? "아직 즐겨찾기한 컨셉이 없어요.\n컨셉 상세에서 ⭐를 눌러 추가해보세요" : "이 카테고리는 준비 중이에요"}</p>
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {list.map(item => (
                    <div key={item.id} className="pressable" onClick={() => { setDetail(conceptForGo(item.go)); }} style={{ cursor: "pointer" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ aspectRatio: "3 / 4", borderRadius: HOME.radius, overflow: "hidden", background: `linear-gradient(155deg, ${item.accent} 0%, #ffffff 135%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                          {item.image ? <img src={item.image} alt={item.title} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
                        </div>
                        {item.badge && <span style={{ position: "absolute", left: 10, bottom: 10, background: HOME.accent, color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>{item.badge}</span>}
          {CONCEPTS[item.go]?.coinCost === 0 && <span style={{ position: "absolute", left: 10, top: 10, background: "#1B7A4A", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 20 }}>무료</span>}
                        {audienceBadge(item.go)}
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