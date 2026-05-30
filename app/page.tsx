"use client";
import { useState, useEffect } from "react";

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
    } catch (err: any) {
      if (err.name !== "AbortError") handleDownload();
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

      // 사용 횟수 기록 (실패해도 결과는 보여줌)
      try {
        const usageRes = await fetch("/api/usage", { method: "POST" });
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsageCount(usageData.count);
          setLimitReached(usageData.limitReached);
        }
      } catch {
        // usage 기록 실패해도 결과 표시는 정상 진행
      }

      setResults(data.output);
      setStep("");
    } catch (err: any) {
      clearTimeout(timeoutId);
      setStep("");
      if (err.name === "AbortError") {
        setError("시간이 너무 오래 걸려요. 다시 시도해주세요. ⏱️");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-pink-50 flex flex-col items-center p-6 pt-10">

      <div className="w-full max-w-sm flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-pink-600">👶 우리 아기 얼굴은?</h1>
        {userLoading ? (
          <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            {user.profileImage && (
              <img src={user.profileImage} className="w-8 h-8 rounded-full" />
            )}
            <span className="text-xs text-gray-600 max-w-[60px] truncate">{user.nickname}</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
              로그아웃
            </button>
          </div>
        ) : (
          <button onClick={handleLogin}
            className="bg-yellow-400 text-black text-sm px-3 py-1.5 rounded-full font-bold hover:bg-yellow-500 transition">
            카카오 로그인
          </button>
        )}
      </div>

      <p className="text-gray-500 mb-4 text-center text-sm">
        엄마 아빠 사진을 올리면 AI가 아기 얼굴을 예측해드려요!
      </p>

      {user && (
        <div className={`w-full max-w-sm rounded-2xl p-3 mb-4 text-center ${
          limitReached ? "bg-red-50 border border-red-200" : "bg-white border border-pink-200"
        }`}>
          {limitReached ? (
            <p className="text-red-500 font-bold text-sm">
              🔒 무료 {FREE_LIMIT}회를 모두 사용했어요!
            </p>
          ) : (
            <p className="text-pink-600 text-sm">
              ✨ 무료 이용{" "}
              <span className="font-bold">{FREE_LIMIT - usageCount}회</span> 남았어요
              <span className="text-gray-400 text-xs ml-1">({usageCount}/{FREE_LIMIT})</span>
            </p>
          )}
        </div>
      )}

      {!userLoading && !user && (
        <div className="w-full max-w-sm bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-center">
          <p className="text-yellow-700 font-bold mb-2">💛 카카오 로그인 후 이용 가능해요!</p>
          <button onClick={handleLogin}
            className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold hover:bg-yellow-500 transition">
            카카오로 시작하기
          </button>
        </div>
      )}

      {limitReached && (
        <div className="w-full max-w-sm bg-gradient-to-b from-pink-50 to-purple-50 border-2 border-pink-300 rounded-2xl p-6 mb-6 text-center">
          <div className="text-5xl mb-3">👶💎</div>
          <h2 className="text-xl font-bold text-pink-600 mb-2">무료 체험이 끝났어요!</h2>
          <p className="text-gray-500 text-sm mb-4">
            계속 이용하시려면 프리미엄으로 업그레이드하세요
          </p>
          <div className="bg-white rounded-2xl p-4 mb-4 text-left">
            <p className="font-bold text-gray-700 mb-2">💎 프리미엄 혜택</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ 무제한 아기 얼굴 예측</li>
              <li>✅ 고화질 결과 이미지</li>
              <li>✅ 결과 저장 및 공유</li>
            </ul>
          </div>
          <button
            onClick={() => alert("결제 시스템 준비 중이에요! 곧 오픈할게요 💕")}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-2xl font-bold text-lg hover:opacity-90 transition">
            💎 프리미엄 시작하기
          </button>
          <p className="text-gray-400 text-xs mt-2">월 990원 · 언제든 해지 가능</p>
        </div>
      )}

      <div className="flex gap-4 mb-6 w-full max-w-sm">
        <button onClick={() => setGender("girl")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "girl"
              ? "bg-pink-500 text-white shadow-lg"
              : "bg-white text-pink-400 border-2 border-pink-300"
          }`}>
          👧 딸
        </button>
        <button onClick={() => setGender("boy")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "boy"
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-white text-blue-400 border-2 border-blue-300"
          }`}>
          👦 아들
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-6 w-full max-w-sm">
        <label className="cursor-pointer">
          <div className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 transition ${
            image1 ? "border-pink-400 bg-pink-50" : "border-pink-300 bg-white"
          }`}>
            {image1 ? (
              <img src={image1} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 text-3xl">
                👩
              </div>
            )}
            <div>
              <p className="text-pink-600 font-bold text-base">엄마 사진</p>
              <p className="text-gray-400 text-sm">
                {image1 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}
              </p>
            </div>
            <div className="ml-auto text-pink-400 text-2xl">{image1 ? "✓" : "+"}</div>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) setImage1(await toBase64(e.target.files[0]));
            }} />
        </label>

        <label className="cursor-pointer">
          <div className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 transition ${
            image2 ? "border-blue-400 bg-blue-50" : "border-blue-300 bg-white"
          }`}>
            {image2 ? (
              <img src={image2} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-3xl">
                👨
              </div>
            )}
            <div>
              <p className="text-blue-600 font-bold text-base">아빠 사진</p>
              <p className="text-gray-400 text-sm">
                {image2 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}
              </p>
            </div>
            <div className="ml-auto text-blue-400 text-2xl">{image2 ? "✓" : "+"}</div>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) setImage2(await toBase64(e.target.files[0]));
            }} />
        </label>
      </div>

      <button onClick={handleSubmit}
        className={`w-full max-w-sm py-4 rounded-2xl text-lg font-bold transition disabled:opacity-50 ${
          limitReached
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-pink-500 text-white hover:bg-pink-600"
        }`}
        disabled={loading || limitReached}>
        {loading
          ? "예측 중... 🍼"
          : limitReached
          ? "🔒 무료 횟수 초과"
          : user
          ? "아기 얼굴 예측하기 ✨"
          : "카카오 로그인 후 시작하기"}
      </button>

      {loading && (
        <div className="mt-8 w-full max-w-sm flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounce">👶</div>
          <div className="bg-white rounded-2xl p-4 w-full text-center shadow-sm">
            <p className="text-pink-600 font-bold text-base">{loadingMsg}</p>
          </div>
          <div className="flex gap-2 w-full">
            {["압축", "전송", "생성"].map((s, i) => (
              <div key={i} className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition ${
                step === s
                  ? "bg-pink-500 text-white"
                  : ["압축", "전송", "생성"].indexOf(step) > i
                  ? "bg-pink-200 text-pink-600"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {["🗜️ 압축", "📤 전송", "🎨 생성"][i]}
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">⏱️ {elapsed}초 경과 · 보통 40~60초 걸려요</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 w-full">
            <p className="text-yellow-700 text-xs text-center">
              💡 AI가 엄마 아빠 얼굴을 열심히 분석하고 있어요!
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-500 font-semibold text-center">⚠️ {error}</p>
      )}

      {results.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <h2 className="text-2xl font-bold text-pink-600 text-center">
            {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
          </h2>
          <div className="relative w-full">
            <img src={results[selected]} className="w-full rounded-2xl shadow-lg object-cover" />
            <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              {selected + 1} / {results.length}
            </div>
          </div>
          <div className="flex gap-3 w-full">
            {results.map((url, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className={`flex-1 rounded-xl overflow-hidden border-4 transition ${
                  selected === i ? "border-pink-500 scale-105" : "border-transparent opacity-60"
                }`}>
                <img src={url} className="w-full aspect-square object-cover" />
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm">사진을 탭해서 선택하세요!</p>
          <div className="flex gap-3 w-full">
            <button onClick={handleDownload}
              className="flex-1 bg-white border-2 border-pink-400 text-pink-500 py-3 rounded-2xl font-bold hover:bg-pink-50 transition">
              📥 저장하기
            </button>
            <button onClick={handleShare}
              className="flex-1 bg-yellow-400 text-black py-3 rounded-2xl font-bold hover:bg-yellow-500 transition">
              📤 공유하기
            </button>
          </div>
          <button
            onClick={() => { setResults([]); setImage1(""); setImage2(""); setSelected(0); }}
            className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold hover:bg-gray-200 transition">
            🔄 다시 만들기
          </button>
        </div>
      )}
    </main>
  );
}