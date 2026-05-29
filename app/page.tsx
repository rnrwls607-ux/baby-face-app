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

export default function Home() {
  const [image1, setImage1] = useState<string>("");
  const [image2, setImage2] = useState<string>("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<string>("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [loadingIdx, setLoadingIdx] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);

  // 로딩 메시지 자동 변경
  useEffect(() => {
    if (!loading) {
      setLoadingIdx(0);
      setElapsed(0);
      return;
    }

    setLoadingMsg(LOADING_MESSAGES[0]);

    const msgInterval = setInterval(() => {
      setLoadingIdx((prev) => {
        const next = (prev + 1) % LOADING_MESSAGES.length;
        setLoadingMsg(LOADING_MESSAGES[next]);
        return next;
      });
    }, 4000);

    const timeInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(timeInterval);
    };
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

 const handleDownload = async () => {
  const result = results[selected];
  try {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;
    const filename = `우리아기얼굴_${timestamp}.png`;

    const proxyUrl = `/api/download?url=${encodeURIComponent(result)}`;
    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = filename;
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
        await navigator.share({
          title: "우리 아기 얼굴은? 👶",
          text: shareText,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "우리 아기 얼굴은? 👶",
          text: shareText,
          url: "https://baby-face-app-seven.vercel.app",
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("링크가 복사됐어요! 카카오톡에 붙여넣기 하세요 💕");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") handleDownload();
    }
  };

  const handleSubmit = async () => {
    if (!image1 || !image2) {
      setError("엄마와 아빠 사진을 모두 올려주세요!");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    setSelected(0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110000);

    try {
      setStep("압축");
      const compressed = await compressImage(image1);

      setStep("전송");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: compressed, image2, gender }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      setStep("생성");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");

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
      <h1 className="text-3xl font-bold text-pink-600 mb-1 text-center">👶 우리 아기 얼굴은?</h1>
      <p className="text-gray-500 mb-6 text-center text-sm">엄마 아빠 사진을 올리면 AI가 아기 얼굴을 예측해드려요!</p>

      {/* 성별 선택 */}
      <div className="flex gap-4 mb-6 w-full max-w-sm">
        <button onClick={() => setGender("girl")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "girl" ? "bg-pink-500 text-white shadow-lg" : "bg-white text-pink-400 border-2 border-pink-300"
          }`}>
          👧 딸
        </button>
        <button onClick={() => setGender("boy")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "boy" ? "bg-blue-500 text-white shadow-lg" : "bg-white text-blue-400 border-2 border-blue-300"
          }`}>
          👦 아들
        </button>
      </div>

      {/* 사진 업로드 */}
      <div className="flex flex-col gap-4 mb-6 w-full max-w-sm">
        <label className="cursor-pointer">
          <div className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 transition ${
            image1 ? "border-pink-400 bg-pink-50" : "border-pink-300 bg-white"
          }`}>
            {image1 ? (
              <img src={image1} className="w-16 h-16 object-cover rounded-full flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 text-3xl">👩</div>
            )}
            <div>
              <p className="text-pink-600 font-bold text-base">엄마 사진</p>
              <p className="text-gray-400 text-sm">{image1 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
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
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-3xl">👨</div>
            )}
            <div>
              <p className="text-blue-600 font-bold text-base">아빠 사진</p>
              <p className="text-gray-400 text-sm">{image2 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
            </div>
            <div className="ml-auto text-blue-400 text-2xl">{image2 ? "✓" : "+"}</div>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) setImage2(await toBase64(e.target.files[0]));
            }} />
        </label>
      </div>

      {/* 예측 버튼 */}
      <button onClick={handleSubmit}
        className="w-full max-w-sm bg-pink-500 text-white py-4 rounded-2xl text-lg font-bold hover:bg-pink-600 transition disabled:opacity-50"
        disabled={loading || !image1 || !image2}>
        {loading ? "예측 중... 🍼" : "아기 얼굴 예측하기 ✨"}
      </button>

      {/* 로딩 화면 */}
      {loading && (
        <div className="mt-8 w-full max-w-sm flex flex-col items-center gap-4">
          {/* 아기 이모지 애니메이션 */}
          <div className="text-6xl animate-bounce">👶</div>

          {/* 로딩 메시지 */}
          <div className="bg-white rounded-2xl p-4 w-full text-center shadow-sm">
            <p className="text-pink-600 font-bold text-base">{loadingMsg}</p>
          </div>

          {/* 진행 단계 바 */}
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

          {/* 경과 시간 */}
          <p className="text-gray-400 text-sm">
            ⏱️ {elapsed}초 경과 · 보통 40~60초 걸려요
          </p>

          {/* 귀여운 팁 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 w-full">
            <p className="text-yellow-700 text-xs text-center">
              💡 AI가 엄마 아빠 얼굴을 열심히 분석하고 있어요!
            </p>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && <p className="mt-4 text-red-500 font-semibold text-center">⚠️ {error}</p>}

      {/* 결과 3장 */}
      {results.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <h2 className="text-2xl font-bold text-pink-600 text-center">
            {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
          </h2>

          {/* 선택된 큰 사진 */}
          <div className="relative w-full">
            <img src={results[selected]} className="w-full rounded-2xl shadow-lg object-cover" />
            <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              {selected + 1} / {results.length}
            </div>
          </div>

          {/* 3장 썸네일 */}
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

          {/* 버튼 */}
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

          {/* 다시 만들기 */}
          <button onClick={() => { setResults([]); setImage1(""); setImage2(""); setSelected(0); }}
            className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold hover:bg-gray-200 transition">
            🔄 다시 만들기
          </button>
        </div>
      )}
    </main>
  );
}