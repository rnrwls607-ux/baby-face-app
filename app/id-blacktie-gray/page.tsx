"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";
import { checkPhoto, newPhotoId, type Photo } from "../lib/gate";
import GateBadge from "../components/GateBadge";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 6;
const ACCENT = "#FF4B7C";

export default function IdBlacktieGrayPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const images = photos.map(p => p.src);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result as string); r.onerror = rej;
  });

  const compress = (b64: string): Promise<string> => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const M = 1024; let { width: w, height: h } = img;
      if (w > h) { if (w > M) { h = h * M / w; w = M; } } else { if (h > M) { w = w * M / h; h = M; } }
      c.width = w; c.height = h; c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.9));
    };
    img.src = b64;
  });

  const handleUpload = async (files: FileList) => {
    setError("");
    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) { setError(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`); return; }
    const picked = Array.from(files).slice(0, remaining);
    const converted = await Promise.all(picked.map(toBase64));
    // 1) 먼저 "확인 중" 상태로 담아 화면에 바로 보여준다.
    const batch: Photo[] = converted.map(src => ({ id: newPhotoId(), src, gate: { status: "checking" } }));
    setPhotos(prev => [...prev, ...batch]);

    // 2) 여러 장을 동시에 판정한다.
    const checks = await Promise.all(batch.map(p => checkPhoto(p.src, "solo_face")));

    const rejected = new Set<string>();
    const passed = new Map<string, Photo["gate"]>();
    const reasons: string[] = [];
    batch.forEach((p, i) => {
      const c = checks[i];
      if (c.ok) passed.set(p.id, c.gate);
      else { rejected.add(p.id); reasons.push(...c.reasons); }
    });

    // 3) 인덱스가 아니라 id 로 찾아 지우고 갱신한다 — 기다리는 동안 사진이
    //    추가·삭제돼도 엉뚱한 사진을 건드리지 않는다.
    setPhotos(prev => prev
      .filter(p => !rejected.has(p.id))
      .map(p => (passed.has(p.id) ? { ...p, gate: passed.get(p.id)! } : p)));

    if (reasons.length) setError([...new Set(reasons)].join(" · "));
  };

  const removeImage = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (images.length < MIN_PHOTOS) { setError(`정면 얼굴 사진을 ${MIN_PHOTOS}장 이상 올려주세요.`); return; }
    setLoading(true); setError(""); setResults([]);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await Promise.all(images.map(compress));
      const res = await fetch("/api/id-blacktie-gray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: compressed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResults(data.output);
      void addToHistory(data.output, "증명사진 (블랙정장+넥타이)");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleDownload = (url: string, idx: number) => {
    const a = document.createElement("a");
    a.href = url.startsWith("data:") ? url : `/api/download?url=${encodeURIComponent(url)}`;
    a.download = `id-blacktie-gray-${idx + 1}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>블랙정장+넥타이 증명사진</span>
      </div>

      <div style={{ padding: "18px 18px 100px" }}>
        <div style={{ background: "#FFF0F5", borderRadius: 16, padding: "16px 18px", marginBottom: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: ACCENT, margin: "0 0 5px" }}>🤵 블랙정장+넥타이 증명사진</p>
          <p style={{ fontSize: 12.5, color: "#7A6A70", margin: 0, lineHeight: 1.55 }}>넥타이까지 갖춘 가장 격식 있는 블랙 정장과 밝은 회색 배경의 단정한 증명사진이에요. 면접·공식 서류처럼 격식이 중요할 때 좋아요. 얼굴이 정면으로 잘 보이는 사진을 3~6장 올리면, 가장 잘 나온 증명사진 3장을 만들어드려요. (남녀 모두 사용할 수 있어요.)</p>
        </div>

        {results.length === 0 && (
          <>
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#191919", margin: 0 }}>내 사진</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: images.length >= MIN_PHOTOS ? ACCENT : "#9B9B9B" }}>{images.length}/{MAX_PHOTOS}장</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: `1.5px solid ${ACCENT}` }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <GateBadge gate={photos[idx]?.gate} />
                    <button onClick={() => removeImage(idx)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", fontSize: 13, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}

                {images.length < MAX_PHOTOS && (
                  <label style={{ display: "block", cursor: "pointer" }}>
                    <div style={{ aspectRatio: "1", borderRadius: 12, border: "1.5px dashed #D9DCE2", background: "#F1F2F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                      <span style={{ fontSize: 26, color: "#C2C6CE" }}>＋</span>
                      <span style={{ fontSize: 10.5, color: "#9B9B9B", fontWeight: 600, textAlign: "center" }}>여러 장<br/>한번에</span>
                    </div>
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={async e => { if (e.target.files?.length) { await handleUpload(e.target.files); e.target.value = ""; } }} />
                  </label>
                )}
              </div>

              <div style={{ marginTop: 14, background: "#F4F4F6", borderRadius: 12, padding: "13px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: ACCENT, margin: "0 0 7px" }}>📸 이렇게 찍으면 더 잘 나와요</p>
                <p style={{ fontSize: 11.5, color: "#7A8095", margin: 0, lineHeight: 1.7 }}>
                  · <b style={{ color: "#5A6275" }}>정면</b>을 바라보고 얼굴이 또렷하게 나온 사진<br/>
                  · <b style={{ color: "#5A6275" }}>밝은 곳</b>에서 찍어 얼굴이 어둡지 않은 사진<br/>
                  · 이마·눈·코·입이 <b style={{ color: "#5A6275" }}>가려지지 않은</b> 사진<br/>
                  · 표정이 서로 다른 정면 사진을 <b style={{ color: "#5A6275" }}>여러 장</b> 넣을수록 더 닮게 나와요<br/>
                  <span style={{ color: "#B0B5C2" }}>✗ 옆모습·뒷모습·너무 어둡거나 흐린 사진은 피해주세요</span>
                </p>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading || images.length < MIN_PHOTOS}
              style={{ width: "100%", marginTop: 18, background: loading || images.length < MIN_PHOTOS ? "#E8E9ED" : ACCENT, color: loading || images.length < MIN_PHOTOS ? "#AEB2BA" : "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: loading || images.length < MIN_PHOTOS ? "not-allowed" : "pointer", boxShadow: loading || images.length < MIN_PHOTOS ? "none" : "0 6px 18px rgba(255,75,124,0.32)" }}>
              {loading ? `만드는 중... (${elapsed}초)` : images.length < MIN_PHOTOS ? `사진을 ${MIN_PHOTOS}장 이상 올려주세요` : "증명사진 3장 만들기 ✨"}
            </button>
          </>
        )}

        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🤵</div>
            <p style={{ fontSize: 14, color: "#9B9B9B", marginTop: 10, fontWeight: 600 }}>AI가 증명사진 3장을 각각 만들고 있어요...</p>
            <p style={{ fontSize: 12, color: "#C2C6CE", marginTop: 4 }}>조금만 기다려주세요 ({elapsed}초)</p>
          </div>
        )}

        {error && (
          <div style={{ background: "#FFEAF1", border: "1px solid #FF4B7C33", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#FF4B7C", margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "#191919", textAlign: "center", margin: "4px 0 6px" }}>완성됐어요! ✨</p>
            <p style={{ fontSize: 13, color: "#9B9B9B", textAlign: "center", margin: "0 0 18px" }}>마음에 드는 사진을 저장하세요</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {results.map((url, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, background: "#FFF0F5", borderRadius: 8, padding: "3px 10px" }}>{idx + 1}번</span>
                  </div>
                  <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                    <img src={url} alt={`증명사진 ${idx + 1}`} style={{ width: "100%", display: "block" }} />
                  </div>
                  <button onClick={() => handleDownload(url, idx)}
                    style={{ width: "100%", background: ACCENT, color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>이 사진 저장하기</button>
                </div>
              ))}
            </div>

            <button onClick={() => { setResults([]); setPhotos([]); }}
              style={{ width: "100%", marginTop: 18, background: "#fff", color: "#191919", border: "1.5px solid #EFF0F3", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>다시 만들기</button>
          </div>
        )}
      </div>
    </div>
  );
}