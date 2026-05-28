"use client";
import { useState } from "react";

export default function Home() {
  const [image1, setImage1] = useState<string>("");
  const [image2, setImage2] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<string>("");

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  // 이미지 압축 (최대 512px, 용량 대폭 감소)
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
        body: JSON.stringify({ image1: compressed, image2 }),
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

      <button
        onClick={handleSubmit}
        className="bg-pink-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-pink-600 transition"
        disabled={loading}
      >
        {loading ? "예측 중... 🍼" : "아기 얼굴 예측하기 ✨"}
      </button>

      {/* 진행 단계 표시 */}
      {loading && step && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {["🗜️ 압축", "📤 전송", "🎨 생성"].map((s, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  step.includes(["압축", "전송", "생성"][i])
                    ? "bg-pink-500 text-white"
                    : "bg-pink-100 text-pink-300"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-sm">{step}</p>
          <p className="text-gray-300 text-xs">보통 20~40초 걸려요</p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-500 font-semibold">⚠️ {error}</p>
      )}

      {result && (
        <div className="mt-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-pink-600 mb-4">우리 아기 얼굴 🎉</h2>
          <img src={result} className="w-64 h-64 object-cover rounded-2xl shadow-lg" />
        </div>
      )}
    </main>
  );
}