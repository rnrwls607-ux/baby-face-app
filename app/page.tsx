"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PRODUCT_LIST as PRODUCTS } from "./lib/products";

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
        orderName: "babyface " + product.name,
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
      const a = document.createElement("a"); a.href = `/api/download?url=${encodeURIComponent(url)}`; a.download = `babyface_${ts}.png`;
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
    } catch (e: unknown) {
      clearTimeout(tid); setStep("");
      const err = e as {name?:string;message?:string};
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  // ─── 공통 헤더 ───────────────────────────────────────────────
  const Header = ({ title, onBack }: { title?: string; onBack?: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, background: "#fff", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", padding: "4px 8px 4px 0", cursor: "pointer", color: "#111", display: "flex" }}>
            <Icon.Back />
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -1, color: "#111" }}>babyface</span>
            <span style={{ fontSize: 10, background: "#FF4B7C", color: "#fff", padding: "1px 5px", borderRadius: 4, fontWeight: 700, marginLeft: 2 }}>AI</span>
          </div>
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
            <button onClick={handleLogin} style={{ background: "#FEE500", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#111" }}>
              카카오 로그인
            </button>
          )
        )}
        {!onBack && (
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex", padding: 0 }}>
            <Icon.Settings />
          </button>
        )}
      </div>
    </div>
  );

  // ─── 하단 탭 ─────────────────────────────────────────────────
  const tabs = [
    { id: "home" as Tab, Icon: Icon.Home, label: "홈" },
    { id: "ticket" as Tab, Icon: Icon.Ticket, label: "이용권" },
    { id: "coupon" as Tab, Icon: Icon.Coupon, label: "쿠폰" },
    { id: "history" as Tab, Icon: Icon.History, label: "히스토리" },
  ];

  const BottomNav = () => (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #f0f0f0", display: "flex", zIndex: 40, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map(({ id, Icon: I, label }) => (
        <button key={id} onClick={() => { setActiveTab(id); setShowMakeScreen(false); }}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: activeTab === id ? "#111" : "#bbb", transition: "color .2s" }}>
          <I />
          <span style={{ fontSize: 10, fontWeight: activeTab === id ? 700 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );

  // ─── 홈 메인 ─────────────────────────────────────────────────
  const HomeMain = () => (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* 히어로 배너 */}
      <div onClick={() => setShowMakeScreen(true)}
        style={{ margin: "16px 20px 0", borderRadius: 20, overflow: "hidden", background: "linear-gradient(135deg, #FFE4EE 0%, #F3E4FF 100%)", padding: "28px 24px", cursor: "pointer", position: "relative" }}>
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", fontSize: 80, opacity: 0.15, lineHeight: 1 }}>👶</div>
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#FF4B7C", background: "#fff", borderRadius: 20, padding: "3px 10px", display: "inline-block", marginBottom: 10 }}>NEW · AI 아기 예측</span>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#111", lineHeight: 1.3, margin: 0 }}>우리 아기 얼굴은<br/>어떻게 생겼을까? 👶</p>
          <p style={{ fontSize: 13, color: "#888", margin: "8px 0 16px" }}>사진 2장으로 AI가 예측해드려요</p>
          <div style={{ background: "#111", color: "#fff", borderRadius: 24, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
            지금 무료로 체험하기 →
          </div>
        </div>
      </div>

      {/* 무료 횟수 */}
      {user && (
        <div style={{ margin: "12px 20px 0", background: limitReached ? "#FFF0F3" : "#F7F7F7", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: limitReached ? "#FF4B7C" : "#888", margin: 0, marginBottom: 2 }}>무료 체험 현황</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: limitReached ? "#FF4B7C" : "#111", margin: 0 }}>
              {/* ✅ usageRemaining 사용 (bonus 포함된 실제 잔여) */}
              {limitReached ? "이용권이 필요해요" : `${usageRemaining}회 남았어요`}
            </p>
          </div>
          {limitReached ? (
            <button onClick={() => setShowPaymentSheet(true)}
              style={{ background: "#FF4B7C", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              이용권 구매
            </button>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: FREE_LIMIT }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < usageCount ? "#ddd" : "#FF4B7C" }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 섹션: 지금 시작하기 */}
      <div style={{ margin: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 12, color: "#999", margin: "0 0 3px" }}>AI 아기 얼굴 예측</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: 0 }}>지금 바로 시작해보세요</p>
          </div>
        </div>

        <button onClick={() => setShowMakeScreen(true)}
          style={{ width: "100%", background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 20, overflow: "hidden", cursor: "pointer", textAlign: "left" }}>
          <div style={{ background: "linear-gradient(135deg, #FFF0F5 0%, #F5EEFF 100%)", height: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>👩</div>
              <div style={{ fontSize: 11, color: "#FF4B7C", fontWeight: 600, marginTop: 4 }}>엄마</div>
            </div>
            <div style={{ fontSize: 20, color: "#ddd" }}>+</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>👨</div>
              <div style={{ fontSize: 11, color: "#6B9AFF", fontWeight: 600, marginTop: 4 }}>아빠</div>
            </div>
            <div style={{ fontSize: 20, color: "#ddd" }}>=</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>👶</div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginTop: 4 }}>아기</div>
            </div>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, background: "#FF4B7C", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>NEW</span>
                <span style={{ fontSize: 10, color: "#999", border: "1px solid #eee", padding: "2px 8px", borderRadius: 4 }}>딸</span>
                <span style={{ fontSize: 10, color: "#999", border: "1px solid #eee", padding: "2px 8px", borderRadius: 4 }}>아들</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>엄마 아빠 닮은 아기 얼굴 예측</p>
              <p style={{ fontSize: 12, color: "#999", margin: 0 }}>사진 2장으로 AI가 예측해드려요</p>
            </div>
            <div style={{ color: "#ccc", fontSize: 20 }}>›</div>
          </div>
        </button>
      </div>

    {/* 섹션: 다양한 AI 사진 */}
      <div style={{ margin: "28px 0 0" }}>
        <div style={{ padding: "0 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 12, color: "#999", margin: "0 0 3px" }}>이런 것도 만들어드려요</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#111", margin: 0 }}>다양한 AI 사진 ✨</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 20px 4px", scrollbarWidth: "none" }} className="hide-scrollbar">
          {[
            { emoji: "📸", title: "AI 증명사진", sub: "스튜디오급 증명사진", color: "#E8F4FF", href: "/id-photo" },
            { emoji: "🐶", title: "반려동물 사진", sub: "우리 강아지 AI 사진", color: "#FFF4E8", href: "" },
            { emoji: "👨‍👩‍👧", title: "가족사진", sub: "AI 가족 합성사진", color: "#F0FFE8", href: "" },
            { emoji: "💑", title: "커플 사진", sub: "여행·데이트 합성", color: "#FFE8F4", href: "" },
          ].map((item, i) => (
            <div key={i}
              onClick={() => { if (item.href) window.location.href = item.href; }}
              style={{ flexShrink: 0, width: 148, background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 16, overflow: "hidden", cursor: item.href ? "pointer" : "default" }}>
              <div style={{ background: item.color, height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{item.emoji}</div>
              <div style={{ padding: "10px 12px 12px" }}>
                {item.href ? (
                  <span style={{ fontSize: 10, background: "#FF4B7C", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>이용 가능</span>
                ) : (
                  <span style={{ fontSize: 10, color: "#aaa", border: "1px solid #eee", padding: "2px 6px", borderRadius: 4 }}>준비중</span>
                )}
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111", margin: "5px 0 2px" }}>{item.title}</p>
                <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 100 }} />
    </div>
  );

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
              style={{ width: "100%", background: "#111", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              이용권 구매하기
            </button>
          </div>
        )}

        {/* 성별 선택 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 10 }}>아기 성별</p>
          <div style={{ display: "flex", gap: 10, background: "#F7F7F7", borderRadius: 14, padding: 4 }}>
            {([["girl", "👧", "딸"], ["boy", "👦", "아들"]] as const).map(([g, emoji, label]) => (
              <button key={g} onClick={() => setGender(g)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, transition: "all .2s",
                  background: gender === g ? "#fff" : "transparent",
                  color: gender === g ? "#111" : "#aaa",
                  boxShadow: gender === g ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* 사진 업로드 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 10 }}>사진 업로드</p>
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
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: state ? "#111" : "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
            style={{ width: "100%", background: loading || !user ? "#F0F0F0" : "#111", color: loading || !user ? "#aaa" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 700, cursor: loading || !user ? "not-allowed" : "pointer", transition: "all .2s" }}>
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
                  <div key={s} style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: "center", background: isActive ? "#111" : isDone ? "#333" : "#F0F0F0", color: isActive || isDone ? "#fff" : "#aaa", transition: "all .3s" }}>
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
                    style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `3px solid ${selected === i ? "#111" : "transparent"}`, cursor: "pointer", opacity: selected === i ? 1 : 0.5, padding: 0, transition: "all .2s" }}>
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
                borderBottom: `2px solid ${activeSubTab === i ? "#111" : "transparent"}`, transition: "all .2s" }}>
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
        rightBtn={<button style={{ background: "#111", color: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.Plus /></button>} />
    );
    if (activeTab === "history") return (
      <div style={{ background: "#fff", minHeight: "100vh" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #F0F0F0" }}>
          {["이미지 0", "저장된 결과"].map((label, i) => (
            <button key={i} style={{ flex: 1, padding: "14px 0", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "#111" : "#aaa", borderBottom: `2px solid ${i === 0 ? "#111" : "transparent"}` }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, padding: 40, textAlign: "center" }}>
          <span style={{ fontSize: 56, opacity: 0.12 }}>👶</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#222", margin: "0 0 6px" }}>아직 생성한 아기 얼굴이 없어요</p>
            <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>아기 얼굴을 예측해보세요!</p>
          </div>
          <button onClick={() => { setActiveTab("home"); setShowMakeScreen(true); }}
            style={{ background: "#111", color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            아기 얼굴 만들러가기
          </button>
        </div>
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
      </main>
      <BottomNav />
      {showPaymentSheet && <PaymentSheet />}
    </div>
  );
}
