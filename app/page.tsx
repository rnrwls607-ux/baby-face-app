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

  // 결과 사진 + 링크 함께 공유
  const handleKakaoShare = async () => {
    try {
      // 결과 이미지를 blob으로 변환
      const response = await fetch(result);
      const blob = await response.blob();
      const file = new File([blob], "우리아기얼굴.png", { type: "image/png" });

      const shareText = `👶 AI가 예측한 ${gender === "girl" ? "딸" : "아들"} 얼굴이에요!\n우리 아기 얼굴도 예측해보세요 👇\nhttps://baby-face-app-seven.vercel.app`;

      // 이미지 파일 공유 가능 여부 확인
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "우리 아기 얼굴은? 👶",
          text: shareText,
          files: [file],
        });
      } else if (navigator.share) {
        // 파일 공유 불가 시 텍스트+링크만 공유
        await navigator.share({
          title: "우리 아기 얼굴은? 👶",
          text: shareText,
          url: "https://baby-face-app-seven.vercel.app",
        });
      } else {
        // PC: 클립보드 복사
        await navigator.clipboard.writeText(shareText);
        alert("링크가 복사됐어요! 카카오톡에 붙여넣기 하세요 💕");
      }
    } catch (err) {
      console.error("공유 실패:", err);
    }
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
    <main className="min-h-screen bg-pink-50 flex flex-col items-center p-6 pt-10">
      <h1 className="text-3xl font-bold text-pink-600 mb-1 text-center">👶 우리 아기 얼굴은?</h1>
      <p className="text-gray-500 mb-6 text-center text-sm">엄마 아빠 사진을 올리면 AI가 아기 얼굴을 예측해드려요!</p>

      {/* 성별 선택 */}
      <div className="flex gap-4 mb-6 w-full max-w-sm">
        <button
          onClick={() => setGender("girl")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "girl"
              ? "bg-pink-500 text-white shadow-lg"
              : "bg-white text-pink-400 border-2 border-pink-300"
          }`}
        >
          👧 딸
        </button>
        <button
          onClick={() => setGender("boy")}
          className={`flex-1 py-3 rounded-2xl text-lg font-bold transition ${
            gender === "boy"
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-white text-blue-400 border-2 border-blue-300"
          }`}
        >
          👦 아들
        </button>
      </div>

      {/* 사진 업로드 - 직관적인 큰 버튼 */}
      <div className="flex flex-col gap-4 mb-6 w-full max-w-sm">

        {/* 엄마 사진 */}
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
              <p className="text-gray-400 text-sm">{image1 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
            </div>
            <div className="ml-auto text-pink-400 text-2xl">{image1 ? "✓" : "+"}</div>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                const base64 = await toBase64(e.target.files[0]);
                setImage1(base64);
              }
            }}
          />
        </label>

        {/* 아빠 사진 */}
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
              <p className="text-gray-400 text-sm">{image2 ? "✅ 사진 선택됨" : "탭해서 사진 선택하기"}</p>
            </div>
            <div className="ml-auto text-blue-400 text-2xl">{image2 ? "✓" : "+"}</div>
          </div>
          <input type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                const base64 = await toBase64(e.target.files[0]);
                setImage2(base64);
              }
            }}
          />
        </label>
      </div>

      {/* 예측 버튼 */}
      <button
        onClick={handleSubmit}
        className="w-full max-w-sm bg-pink-500 text-white py-4 rounded-2xl text-lg font-bold hover:bg-pink-600 transition disabled:opacity-50"
        disabled={loading || !image1 || !image2}
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
      {error && <p className="mt-4 text-red-500 font-semibold text-center">⚠️ {error}</p>}

      {/* 결과 */}
      {result && (
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <h2 className="text-2xl font-bold text-pink-600 text-center">
            {gender === "girl" ? "👧 우리 딸 얼굴이에요!" : "👦 우리 아들 얼굴이에요!"} 🎉
          </h2>
          <img src={result} className="w-full rounded-2xl shadow-lg object-cover" />
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 bg-white border-2 border-pink-400 text-pink-500 py-3 rounded-2xl font-bold hover:bg-pink-50 transition"
            >
              📥 저장하기
            </button>
            <button
              onClick={handleKakaoShare}
              className="flex-1 bg-yellow-400 text-black py-3 rounded-2xl font-bold hover:bg-yellow-500 transition"
            >
              💬 공유하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}