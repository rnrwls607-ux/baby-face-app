"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addToHistory } from "../lib/history";
import { toast } from "../lib/toast";

// ── 디자인 토큰 (색·둥글기를 여기서 통제) ──
const UI = {
  accent: "#FF4B7C",      // 메인 핑크 (선택·버튼·강조)
  accentSoft: "#FFEAF1",  // 핑크 옅은 배경
  text: "#191919",        // 제목 글자
  sub: "#9B9B9B",         // 부제·설명 글자
  pageBg: "#F7F8FA",      // 화면 배경 (살짝 회색)
  surface: "#FFFFFF",     // 카드 배경
  chipBg: "#F1F2F6",      // 비활성 칩 배경
  chipText: "#8A8F99",    // 비활성 칩 글자
  line: "#EFF0F3",        // 경계선
  radius: 16,             // 기본 둥글기
};

const BG_OPTIONS = [
  { key: "white", label: "흰색" },
  { key: "skyblue", label: "하늘색" },
  { key: "gray", label: "회색" },
  { key: "beige", label: "베이지" },
];
const OUTFIT_OPTIONS = [
  { key: "black_suit", label: "블랙 정장" },
  { key: "navy_suit", label: "네이비 정장" },
  { key: "white_shirt", label: "화이트 셔츠" },
];
const HAIR_OPTIONS = [
  { key: "keep", label: "그대로 유지" },
  { key: "neat", label: "단정하게" },
  { key: "forehead", label: "이마 보이게" },
];

export default function IdPhotoPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [gender, setGender] = useState<"woman" | "man">("woman");
  const [bg, setBg] = useState("white");
  const [outfit, setOutfit] = useState("black_suit");
  const [hair, setHair] = useState("keep");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
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
  const handleUpload = async (file: File, index: number) => {
    const b64 = await toBase64(file);
    setImages(prev => { const next = [...prev]; next[index] = b64; return next; });
  };

  const renderOptions = (
    label: string,
    options: { key: string; label: string }[],
    value: string,
    setValue: (v: string) => void
  ) => (
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: UI.text, marginBottom: 10 }}>{label}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(o => {
          const on = value === o.key;
          return (
            <button key={o.key} onClick={() => setValue(o.key)}
              style={{ flex: "1 1 0", minWidth: 68, padding: "11px 8px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: on ? `1.5px solid ${UI.accent}` : "1.5px solid transparent",
                background: on ? UI.accentSoft : UI.chipBg, color: on ? UI.accent : UI.chipText,
                transition: "all .15s ease" }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    const valid = images.filter(Boolean);
    if (valid.length === 0) { setError("본인 사진을 한 장 이상 올려주세요."); return; }
    setLoading(true); setError(""); setResults([]); setSelected(0);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 110000);
    try {
      const compressed = await Promise.all(valid.map(compress));
      const res = await fetch("/api/id-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: compressed, gender, background: bg, clothing: outfit, hair }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서버 오류가 발생했습니다.");
      if (!data.output?.length) throw new Error("이미지를 받지 못했습니다.");
      setResults(data.output);
      void addToHistory(data.output, "증명사진");
    } catch (e: unknown) {
      clearTimeout(tid);
      const err = e as { name?: string; message?: string };
      setError(err?.name === "AbortError" ? "시간이 너무 오래 걸렸어요. 다시 시도해주세요." : err?.message || "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    const url = results[selected];
    const a = document.createElement("a");
    a.href = url.startsWith("data:") ? url : `/api/download?url=${encodeURIComponent(url)}`;
    a.download = "id_photo.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("저장됐어요");
  };

  const canSubmit = images.filter(Boolean).length > 0 && !loading;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: UI.pageBg, fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, borderBottom: `1px solid ${UI.line}`, position: "sticky", top: 0, background: UI.surface, zIndex: 10 }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: UI.text, padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: UI.text }}>AI 증명사진</span>
      </div>

      <div style={{ padding: "18px 18px 100px" }}>
        {/* 안내 박스 */}
        <div style={{ background: UI.accentSoft, borderRadius: UI.radius, padding: "16px 18px", marginBottom: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: UI.accent, margin: "0 0 5px" }}>📸 단정한 증명사진을 1분 만에</p>
          <p style={{ fontSize: 12.5, color: "#B36B85", margin: 0, lineHeight: 1.55 }}>정면·밝은 사진 1~3장을 올리면 원하는 배경·옷·헤어로 변환해요. 여러 장일수록 본인과 더 닮게 나와요.</p>
        </div>

        {!results.length && (
          <>
            {/* 입력 카드 */}
            <div style={{ background: UI.surface, borderRadius: 20, padding: "20px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: UI.text, marginBottom: 10, marginTop: 0 }}>성별</p>
              <div style={{ display: "flex", gap: 8, background: UI.chipBg, borderRadius: 14, padding: 4, marginBottom: 22 }}>
                {([["woman", "여성"], ["man", "남성"]] as const).map(([g, label]) => {
                  const on = gender === g;
                  return (
                    <button key={g} onClick={() => setGender(g)}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 11, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14,
                        background: on ? UI.surface : "transparent", color: on ? UI.accent : UI.chipText,
                        boxShadow: on ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all .15s ease" }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {renderOptions("배경색", BG_OPTIONS, bg, setBg)}
              {renderOptions("옷차림", OUTFIT_OPTIONS, outfit, setOutfit)}
              {renderOptions("헤어", HAIR_OPTIONS, hair, setHair)}

              <p style={{ fontSize: 13, fontWeight: 700, color: UI.text, marginBottom: 10, marginTop: 4 }}>본인 사진 (1~3장)</p>
              <div style={{ display: "flex", gap: 10 }}>
                {[0, 1, 2].map(i => (
                  <label key={i} style={{ flex: 1, aspectRatio: "1", cursor: "pointer" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: 14, border: images[i] ? `1.5px solid ${UI.accent}` : `1.5px dashed #D9DCE2`, background: images[i] ? UI.surface : UI.chipBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 3 }}>
                      {images[i]
                        ? <img src={images[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <><span style={{ fontSize: 24, color: "#C2C6CE" }}>＋</span><span style={{ fontSize: 11, color: UI.sub, fontWeight: 600 }}>{i === 0 ? "필수" : "선택"}</span></>}
                    </div>
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={async e => { if (e.target.files?.[0]) await handleUpload(e.target.files[0], i); }} />
                  </label>
                ))}
              </div>
            </div>

            {/* 만들기 버튼 */}
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{ width: "100%", marginTop: 18, background: canSubmit ? UI.accent : "#E8E9ED", color: canSubmit ? "#fff" : "#AEB2BA", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 18px rgba(255,75,124,0.32)" : "none", transition: "all .15s ease" }}>
              {loading ? `만드는 중... (${elapsed}초)` : "증명사진 만들기 ✨"}
            </button>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
              ※ 본 사진은 AI 생성물로, 여권 등 공적 증명용으로는 사용할 수 없어요.
            </p>
          </>
        )}

        {loading && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>📸</div>
            <p style={{ fontSize: 14, color: UI.sub, marginTop: 10, fontWeight: 600 }}>AI가 증명사진을 만들고 있어요...</p>
          </div>
        )}

        {error && (
          <div style={{ background: UI.accentSoft, border: `1px solid ${UI.accent}33`, borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
            <p style={{ fontSize: 13, color: UI.accent, margin: 0, fontWeight: 700 }}>⚠️ {error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: UI.text, textAlign: "center", margin: "4px 0 18px" }}>완성됐어요! ✨</p>
            <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <img src={results[selected]} alt="증명사진" style={{ width: "100%", display: "block" }} />
            </div>
            {results.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {results.map((url, i) => (
                  <button key={i} onClick={() => setSelected(i)}
                    style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: `2.5px solid ${selected === i ? UI.accent : "transparent"}`, cursor: "pointer", opacity: selected === i ? 1 : 0.55, padding: 0, transition: "all .15s ease" }}>
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDownload}
                style={{ flex: 1, background: UI.accent, color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,75,124,0.3)" }}>
                저장하기
              </button>
              <button onClick={() => { setResults([]); setImages([]); setSelected(0); }}
                style={{ flex: 1, background: UI.surface, color: UI.text, border: `1.5px solid ${UI.line}`, borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                다시 만들기
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#BFC3CB", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
              ※ AI 생성물로, 여권 등 공적 증명용으로는 사용할 수 없어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}