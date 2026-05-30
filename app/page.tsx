"use client";
import { useState, useEffect, useRef } from "react";

const LOADING_MESSAGES = [
  "👶 아기 얼굴 윤곽 그리는 중...",
  "👁️ 눈 모양 만드는 중...",
  "👃 코 모양 다듬는 중...",
  "💕 엄마 닮은 부분 찾는 중...",
  "💪 아빠 닮은 부분 찾는 중...",
  "🎨 피부 톤 맞추는 중...",
  "✨ 마지막 터치 중...",
  "🍼 거의 다 됐어요!",
];

const FREE_LIMIT = 3;

type KakaoUser = {
  id: string;
  nickname: string;
  profileImage: string | null;
  email: string | null;
};

type Tab = "home" | "ticket" | "coupon" | "history";

export default function Home() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [usageCount, setUsageCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [image1, setImage1] = useState<string>("");
  const [image2, setImage2] = useState<string>("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<string>("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showMakeScreen, setShowMakeScreen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.loggedIn) setUser(data.user); })
      .catch(() => {})
      .finally(() => setUserLoading(false));

    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsageCount(data.count);
        setLimitReached(data.limitReached);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    setLoadingMsg(LOADING_MESSAGES[0]);
    let idx = 0;
    const msgInterval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 4000);
    const timeInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => { clearInterval(msgInterval); clearInterval(timeInterval); };
  }, [loading]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const compressImage = (base64: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 512;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
        } else {
          if (height > MAX) { width = (width * MAX) / height; height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = base64;
    });

  const handleLogin = () => { window.location.href = "/api/auth/kakao"; };
  const handleLogout = () => { window.location.href = "/api/auth/logout"; };

  const handleDownload = async () => {
    const result = results[selected];
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;
      const a = document.createElement("a");
      a.href = `/api/download?url=${encodeURIComponent(result)}`;
      a.download = `우리아기얼굴_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(result, "_blank");
    }
  };

  const handleShare = async () => {
    const result = results[selected];
    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const file = new File([blob], "우리아기얼굴.png", { type: "image/png" });
      const shareText = `👶 AI가 예측한 ${gender === "girl" ? "딸" : "아들"} 얼굴이에요!\n우리 아기 얼굴도 예측해보세요 👇\nhttps://baby-face-app-seven.vercel.app`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "우리 아기 얼굴은? 👶", text: shareText, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: "우리 아기 얼굴은? 👶", text: shareText, url: "https://baby-face-app-seven.vercel.app" });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("링크가 복사됐어요! 카카오톡에 붙여넣기 하세요 💕");
      }
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e?.name !== "AbortError") handleDownload();
    }
  };

  const handleSubmit = async () => {
    if (!user) { handleLogin(); return; }
    if (limitReached) return;
    if (!image1 || !image2) { setError("엄마와 아빠 사진을 모두 올려주세요!"); return; }

    setLoading(true);
    setError("");
    setResults([]);
    setSelected(0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110000);

    try {
      setStep("압축");
      const compressed1 = await compressImage(image1);
      const compressed2 = await compressImage(image2);
      setStep("전송");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: compressed1, image2: compressed2, gender }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setStep("생성");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");

      try {
        const usageRes = await fetch("/api/usage", { method: "POST" });
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsageCount(usageData.count);
          setLimitReached(usageData.limitReached);
        }
      } catch { /* usage 기록 실패해도 결과 표시 */ }

      setResults(data.output);
      setStep("");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setStep("");
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError") {
        setError("시간이 너무 오래 걸려요. 다시 시도해주세요. ⏱️");
      } else {
        setError(e?.message || "오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── 탭별 화면 ───────────────────────────────────────────────

  const renderEmptyState = (icon: string, title: string, subtitle?: string) => (
    <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
      <span className="text-6xl opacity-20">{icon}</span>
      <p className="text-gray-500 font-semibold text-base">{title}</p>
      {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
    </div>
  );

  const TicketTab = () => (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-3.5 text-sm font-bold text-pink-500 border-b-2 border-pink-500">보유 {FREE_LIMIT - usageCount}</button>
        <button className="flex-1 py-3.5 text-sm text-gray-400">지난 이용권</button>
      </div>
      <div className="bg-blue-50 px-4 py-3 flex items-center gap-2">
        <span className="text-blue-400 text-sm">ℹ️</span>
        <span className="text-blue-600 text-xs">앱을 삭제하면 이용권이 사라질 수 있어요!</span>
      </div>
      {renderEmptyState("🎟️", "보유한 이용권이 없어요!", "이용권을 구매하면 여기에 표시됩니다")}
    </div>
  );

  const CouponTab = () => (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-3.5 text-sm font-bold text-pink-500 border-b-2 border-pink-500">내 쿠폰 0</button>
        <button className="flex-1 py-3.5 text-sm text-gray-400">사용/만료 쿠폰</button>
      </div>
      {renderEmptyState("🎫", "보유한 쿠폰이 없어요!")}
    </div>
  );

  const HistoryTab = () => (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-3.5 text-sm font-bold text-pink-500 border-b-2 border-pink-500">이미지 0</button>
        <button className="flex-1 py-3.5 text-sm text-gray-400">저장된 결과</button>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 py-24 gap-6">
        <span className="text-6xl opacity-20">👶</span>
        <div className="text-center">
          <p className="text-gray-800 font-bold text-lg mb-1">아직 생성한 아기 얼굴이 없어요</p>
          <p className="text-gray-400 text-sm">아기 얼굴을 예측해보세요!</p>
        </div>
        <button
          onClick={() => { setActiveTab("home"); setShowMakeScreen(true); }}
          className="bg-gray-900 text-white px-8 py-3 rounded-full font-bold text-sm"
        >
          아기 얼굴 만들러가기
        </button>
      </div>
    </div>
  );

  // ─── 홈 메인 화면 ─────────────────────────────────────────────

  const HomeMain = () => (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-20">
      {/* 히어로 배너 */}
      <div className="relative bg-gradient-to-br from-pink-400 to-purple-500 mx-4 mt-4 rounded-3xl overflow-hidden h-52">
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-white/80 text-sm mb-1">엄마 아빠를 꼭 닮은</p>
          <p className="text-white font-black text-2xl leading-tight">우리 아기 얼굴 예측 👶</p>
          <p className="text-white/70 text-xs mt-1">사진만 올리면 AI가 만들어줘요</p>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-8xl opacity-30">👶</div>
      </div>

      {/* 무료 체험 현황 */}
      {user && (
        <div className="mx-4 mt-3">
          <div className={`rounded-2xl p-4 flex items-center justify-between ${limitReached ? "bg-red-50 border border-red-100" : "bg-pink-50 border border-pink-100"}`}>
            <div>
              <p className={`text-xs font-medium ${limitReached ? "text-red-400" : "text-pink-400"}`}>무료 체험</p>
              <p className={`font-bold text-base ${limitReached ? "text-red-500" : "text-pink-600"}`}>
                {limitReached ? "🔒 횟수를 모두 사용했어요" : `✨ ${FREE_LIMIT - usageCount}회 남았어요`}
              </p>
            </div>
            {limitReached ? (
              <button onClick={() => alert("결제 시스템 준비 중이에요! 곧 오픈할게요 💕")}
                className="bg-pink-500 text-white text-xs px-4 py-2 rounded-full font-bold">
                이용권 구매
              </button>
            ) : (
              <span className="text-gray-300 text-xs">{usageCount}/{FREE_LIMIT}</span>
            )}
          </div>
        </div>
      )}

      {/* 섹션: 지금 시작하기 */}
      <div className="mx-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">AI 아기 얼굴 예측</p>
            <p className="font-black text-gray-900 text-lg">지금 바로 만들어보세요 👶</p>
          </div>
        </div>

        {/* 메인 카드: 아기 얼굴 만들기 */}
        <button
          onClick={() => setShowMakeScreen(true)}
          className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 h-36 flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-2">👧👦</p>
              <p className="text-pink-600 font-bold text-sm">우리 아기 얼굴은?</p>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>
                <span className="text-xs text-gray-400">딸 · 아들</span>
              </div>
              <p className="font-bold text-gray-900">엄마 아빠 닮은 아기 얼굴 예측</p>
              <p className="text-xs text-gray-400 mt-0.5">사진 2장으로 AI가 예측해드려요</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </div>
        </button>
      </div>

      {/* 섹션: 준비 중인 기능들 */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">곧 출시 예정</p>
            <p className="font-black text-gray-900 text-lg">이런 것도 만들 수 있어요 ✨</p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-0">
          {[
            { emoji: "📸", title: "AI 증명사진", sub: "스튜디오급 증명사진", tag: "준비중" },
            { emoji: "🐶", title: "반려동물 사진", sub: "우리 강아지 AI 사진", tag: "준비중" },
            { emoji: "👨‍👩‍👧", title: "가족사진", sub: "AI 가족 합성사진", tag: "준비중" },
          ].map((item, i) => (
            <div key={i} className="flex-shrink-0 w-40 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="bg-gray-50 h-24 flex items-center justify-center text-4xl">{item.emoji}</div>
              <div className="p-3">
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{item.tag}</span>
                <p className="font-bold text-gray-800 text-sm mt-1">{item.title}</p>
                <p className="text-gray-400 text-xs">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── 아기 얼굴 만들기 화면 ────────────────────────────────────

  const MakeScreen = () => (
    <div className="flex flex-col bg-white min-h-screen pb-24">
      {/* 서브 헤더 */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button onClick={() => { setShowMakeScreen(false); setResults([]); setImage1(""); setImage2(""); setError(""); }}
          className="text-gray-600 text-xl">‹</button>
        <p className="font-bold text-gray-900">아기 얼굴 예측하기</p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* 로그인 필요 안내 */}
        {!userLoading && !user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-yellow-700 font-bold mb-3">💛 카카오 로그인 후 이용 가능해요!</p>
            <button onClick={handleLogin}
              className="bg-yellow-400 text-black px-6 py-2.5 rounded-full font-bold text-sm">
              카카오로 시작하기
            </button>
          </div>
        )}

        {/* 결제 유도 */}
        {limitReached && (
          <div className="bg-gradient-to-b from-pink-50 to-purple-50 border border-pink-200 rounded-3xl p-5 text-center">
            <div className="text-4xl mb-3">👶💎</div>
            <h2 className="text-lg font-black text-gray-900 mb-1">무료 체험이 끝났어요!</h2>
            <p className="text-gray-500 text-sm mb-4">이용권을 구매하고 계속 사용하세요</p>
            <div className="bg-white rounded-2xl p-4 mb-4 text-left">
              <p className="font-bold text-gray-700 mb-2 text-sm">💎 프리미엄 혜택</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ 무제한 아기 얼굴 예측</li>
                <li>✅ 고화질 결과 이미지</li>
                <li>✅ 결과 저장 및 공유</li>
              </ul>
            </div>
            <button onClick={() => alert("결제 시스템 준비 중이에요! 곧 오픈할게요 💕")}
              className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-base">
              이용권 구매하기
            </button>
            <p className="text-gray-400 text-xs mt-2">단건 · 묶음 · 월구독 중 선택 가능</p>
          </div>
        )}

        {/* 성별 선택 */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">아기 성별 선택</p>
          <div className="flex gap-3">
            <button onClick={() => setGender("girl")}
              className={`flex-1 py-3.5 rounded-2xl text-base font-bold transition ${gender === "girl" ? "bg-pink-500 text-white shadow-lg shadow-pink-200" : "bg-gray-100 text-gray-500"}`}>
              👧 딸
            </button>
            <button onClick={() => setGender("boy")}
              className={`flex-1 py-3.5 rounded-2xl text-base font-bold transition ${gender === "boy" ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-500"}`}>
              👦 아들
            </button>
          </div>
        </div>

        {/* 사진 업로드 */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">사진 업로드</p>
          <div className="flex flex-col gap-3">
            <label className="cursor-pointer">
              <div className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 transition ${image1 ? "border-pink-400 bg-pink-50" : "border-gray-200 bg-gray-50"}`}>
                {image1 ? (
                  <img src={image1} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0 text-2xl">👩</div>
                )}
                <div className="flex-1">
                  <p className="text-gray-800 font-bold text-sm">엄마 사진</p>
                  <p className="text-gray-400 text-xs mt-0.5">{image1 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
                </div>
                <span className={`text-xl ${image1 ? "text-pink-400" : "text-gray-300"}`}>{image1 ? "✓" : "+"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => { if (e.target.files?.[0]) setImage1(await toBase64(e.target.files[0])); }} />
            </label>

            <label className="cursor-pointer">
              <div className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 transition ${image2 ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                {image2 ? (
                  <img src={image2} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-2xl">👨</div>
                )}
                <div className="flex-1">
                  <p className="text-gray-800 font-bold text-sm">아빠 사진</p>
                  <p className="text-gray-400 text-xs mt-0.5">{image2 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
                </div>
                <span className={`text-xl ${image2 ? "text-blue-400" : "text-gray-300"}`}>{image2 ? "✓" : "+"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => { if (e.target.files?.[0]) setImage2(await toBase64(e.target.files[0])); }} />
            </label>
          </div>
        </div>

        {/* 생성 버튼 */}
        <button onClick={handleSubmit}
          disabled={loading || limitReached || !user}
          className={`w-full py-4 rounded-2xl text-base font-black transition ${
            limitReached || !user ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-gray-900 text-white active:scale-[0.98]"
          }`}>
          {loading ? "예측 중... 🍼" : limitReached ? "🔒 이용권이 필요해요" : !user ? "로그인 후 시작하기" : "아기 얼굴 예측하기 ✨"}
        </button>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-6xl animate-bounce">👶</div>
            <div className="bg-gray-50 rounded-2xl p-4 w-full text-center">
              <p className="text-gray-800 font-bold text-sm">{loadingMsg}</p>
            </div>
            <div className="flex gap-2 w-full">
              {["압축", "전송", "생성"].map((s, i) => (
                <div key={i} className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition ${
                  step === s ? "bg-gray-900 text-white"
                  : ["압축","전송","생성"].indexOf(step) > i ? "bg-gray-200 text-gray-600"
                  : "bg-gray-100 text-gray-400"
                }`}>
                  {["🗜️ 압축","📤 전송","🎨 생성"][i]}
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs">⏱️ {elapsed}초 경과 · 보통 20~40초 걸려요</p>
          </div>
        )}

        {/* 에러 */}
        {error && <p className="text-red-500 text-sm text-center font-medium">⚠️ {error}</p>}

        {/* 결과 */}
        {results.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-black text-gray-900 text-center">
              {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
            </h2>
            <div className="relative w-full rounded-3xl overflow-hidden shadow-lg">
              <img src={results[selected]} className="w-full object-cover" />
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full font-bold">
                {selected + 1} / {results.length}
              </div>
            </div>
            {results.length > 1 && (
              <div className="flex gap-2 w-full">
                {results.map((url, i) => (
                  <button key={i} onClick={() => setSelected(i)}
                    className={`flex-1 rounded-xl overflow-hidden border-4 transition ${selected === i ? "border-gray-900 scale-105" : "border-transparent opacity-50"}`}>
                    <img src={url} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 w-full">
              <button onClick={handleDownload}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold text-sm">
                📥 저장하기
              </button>
              <button onClick={handleShare}
                className="flex-1 bg-yellow-400 text-black py-3.5 rounded-2xl font-bold text-sm">
                📤 공유하기
              </button>
            </div>
            <button onClick={() => { setResults([]); setImage1(""); setImage2(""); setSelected(0); }}
              className="w-full bg-gray-100 text-gray-500 py-3.5 rounded-2xl font-bold text-sm">
              🔄 다시 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── 공통 헤더 ────────────────────────────────────────────────

  const Header = () => (
    <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="flex items-center gap-1">
        <span className="text-lg">✦</span>
        <span className="font-black text-gray-900 text-lg tracking-tight">babyface</span>
      </div>
      <div className="flex items-center gap-3">
        {userLoading ? (
          <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            {user.profileImage && <img src={user.profileImage} className="w-8 h-8 rounded-full" />}
            <button onClick={handleLogout} className="text-xs text-gray-400">로그아웃</button>
          </div>
        ) : (
          <button onClick={handleLogin}
            className="bg-yellow-400 text-black text-xs px-3 py-1.5 rounded-full font-bold">
            카카오 로그인
          </button>
        )}
        <button className="text-gray-400 text-xl">⚙</button>
      </div>
    </div>
  );

  // ─── 하단 탭 네비게이션 ────────────────────────────────────────

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 max-w-lg mx-auto">
      <div className="flex">
        {([
          { id: "home", icon: "⊙", label: "홈" },
          { id: "ticket", icon: "🎟", label: "이용권" },
          { id: "coupon", icon: "🎫", label: "쿠폰" },
          { id: "history", icon: "🕐", label: "히스토리" },
        ] as { id: Tab; icon: string; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowMakeScreen(false); }}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition ${activeTab === tab.id ? "text-gray-900" : "text-gray-400"}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-xs font-medium ${activeTab === tab.id ? "font-bold" : ""}`}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="h-safe-area-inset-bottom" />
    </div>
  );

  // ─── 렌더링 ───────────────────────────────────────────────────

  const renderContent = () => {
    if (activeTab === "home" && showMakeScreen) return <MakeScreen />;
    if (activeTab === "home") return <HomeMain />;
    if (activeTab === "ticket") return <TicketTab />;
    if (activeTab === "coupon") return <CouponTab />;
    if (activeTab === "history") return <HistoryTab />;
    return <HomeMain />;
  };

  const showHeader = !showMakeScreen;

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto relative">
      {showHeader && <Header />}
      <main className="pb-20">
        {renderContent()}
      </main>
      <BottomNav />
    </div>
  );
}
