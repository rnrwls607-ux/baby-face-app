"use client";
import { useState } from "react";

export default function Home() {
  const [image1, setImage1] = useState<string>("");
  const [image2, setImage2] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<string>("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");

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
    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "우리아기얼굴.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(result, "_blank");
    }
  };

  // 카카오톡 링크 공유 (도메인 등록 불필요)
  const handleKakaoShare = () => {
    const text = `AI가 예측한 ${gender === "girl" ? "딸" : "아들"} 얼굴이에요! 👶 우리 아기 얼굴도 예측해보세요!`;
    const url = "https://baby-face-app-seven.vercel.app";
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/easylink?app_key=fb8c103dd1a3cd4aa1bafe02f29b468d&ka=sdk/1.0&lcba=&appver=1.0&themeColor=%23F0F0F0&url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(kakaoUrl, "_blank", "width=500,height=600");
  };

  const handleSubmit = async () => {
    if (!image1 || !image2) {
      setError("엄마와 아빠 사진을 모두 올려주세요!");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110000);

    try {
      setStep("🗜️ 이미지 압축 중...");
      const compressed = await compressImage(image1);

      setStep("📤 서버로 전송 중...");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1: compressed, image2, gender }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      setStep("🎨 AI가 아기 얼굴 그리는 중...");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");

      const url = typeof data.output === "string" ? data.output : data.output?.[0];
      if (!url) throw new Error("이미지 URL을 받지 못했습니다.");

      setResult(url);
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
    <main className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-pink-600 mb-2">👶 우리 아기 얼굴은?</h1>
      <p className="text-gray-500 mb-8">엄마 아빠 사진을 올리면 AI가 아기 얼굴을 예측해드려요!</p>

      {/* 성별 선택 */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setGender("girl")}
          className={`px-6 py-3 rounded-full text-lg font-bold transition ${
            gender === "girl"
              ? "bg-pink-500 text-white shadow-lg scale-105"
              : "bg-white text-pink-400 border-2 border-pink-300"
          }`}
        >
          👧 딸
        </button>
        <button
          onClick={() => setGender("boy")}
          className={`px-6 py-3 rounded-full text-lg font-bold transition ${
            gender === "boy"
              ? "bg-blue-500 text-white shadow-lg scale-105"
              : "bg-white text-blue-400 border-2 border-blue-300"
          }`}
        >
          👦 아들
        </button>
      </div>

      {/* 사진 업로드 */}
      <div className="flex gap-8 mb-8">
        <div className="flex flex-col items-center">
          <label className="text-pink-500 font-semibold mb-2">👩 엄마 사진</label>
          <input type="file" accept="image/*"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                const base64 = await toBase64(e.target.files[0]);
                setImage1(base64);
              }
            }}
          />
          {image1 && <img src={image1} className="w-32 h-32 object-cover rounded-full mt-2" />}
        </div>

        <div className="flex flex-col items-center">
          <label className="text-blue-500 font-semibold mb-2">👨 아빠 사진</label>
          <input type="file" accept="image/*"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                const base64 = await toBase64(e.target.files[0]);
                setImage2(base64);
              }
            }}
          />
          {image2 && <img src={image2} className="w-32 h-32 object-cover rounded-full mt-2" />}
        </div>
      </div>

      {/* 예측 버튼 */}
      <button
        onClick={handleSubmit}
        className="bg-pink-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-pink-600 transition"
        disabled={loading}
      >
        {loading ? "예측 중... 🍼" : "아기 얼굴 예측하기 ✨"}
      </button>

      {/* 진행 단계 */}
      {loading && step && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {["압축", "전송", "생성"].map((s, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  step.includes(s) ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-300"
                }`}
              >
                {["🗜️ 압축", "📤 전송", "🎨 생성"][i]}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-sm">{step}</p>
          <p className="text-gray-300 text-xs">보통 20~40초 걸려요</p>
        </div>
      )}

      {/* 에러 */}
      {error && <p className="mt-4 text-red-500 font-semibold">⚠️ {error}</p>}

      {/* 결과 */}
      {result && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-pink-600">
            {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
          </h2>
          <img src={result} className="w-64 h-64 object-cover rounded-2xl shadow-lg" />
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="bg-white border-2 border-pink-400 text-pink-500 px-6 py-2 rounded-full font-semibold hover:bg-pink-50 transition"
            >
              📥 저장하기
            </button>
            <button
              onClick={handleKakaoShare}
              className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 transition"
            >
              💬 카카오 공유
            </button>
          </div>
        </div>
      )}
    </main>
  );
}