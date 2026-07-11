"use client";
import type { ReactNode } from "react";

// 업로드 존 — 1장/다장 겸용.
// max === 1  → 큰 단일 업로드 카드 (카메라 아이콘)
// max > 1    → 썸네일 그리드 + 추가 타일 + 안내문 (게이트 페이지는 renderBadge 로 GateBadge 주입)
//
// 페이지의 state·핸들러를 그대로 연결한다:
//   images   : 현재 이미지 목록 (1장이면 [단일] 또는 [])
//   onPick   : (files: FileList) => void  — 파일 선택 콜백 (페이지의 handleUpload)
//   onRemove : (idx) => void              — 썸네일 삭제 (없으면 × 버튼 미표시)
//   renderBadge : (idx) => ReactNode      — 썸네일 위 오버레이 (게이트 배지 등)
type Props = {
  label: string;
  images: string[];
  max: number;
  onPick: (files: FileList) => void;
  onRemove?: (idx: number) => void;
  renderBadge?: (idx: number) => ReactNode;
  accent?: string;
  uploadTitle?: string;
  uploadHint?: string;
  gridHint?: string;
};

export default function UploadZone({
  label, images, max, onPick, onRemove, renderBadge,
  accent = "#FF4B7C",
  uploadTitle = "사진 올리기",
  uploadHint = "갤러리에서 선택하거나 바로 촬영해요",
  gridHint,
}: Props) {
  const multi = max > 1;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 12px" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#191919", letterSpacing: -0.3 }}>
          {label}<span style={{ color: accent }}>.</span>
        </p>
        {multi && (
          <span style={{ fontSize: 13, fontWeight: 700, color: images.length > 0 ? accent : "#9B9B9B" }}>{images.length}/{max}장</span>
        )}
      </div>

      {!multi ? (
        <label style={{ display: "block", cursor: "pointer" }}>
          <div style={{
            width: "100%", aspectRatio: images[0] ? "1" : "16 / 10",
            borderRadius: 18, border: images[0] ? `1.5px solid ${accent}` : "1.5px dashed #D5D8DE",
            background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            overflow: "hidden", gap: 8, boxShadow: "0 2px 14px rgba(0,0,0,0.04)",
          }}>
            {images[0]
              ? <img src={images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <>
                  <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}><CameraIcon /></span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#191919" }}>{uploadTitle}</span>
                  <span style={{ fontSize: 12.5, color: "#9B9B9B", fontWeight: 500, textAlign: "center", padding: "0 24px", lineHeight: 1.45 }}>{uploadHint}</span>
                </>}
          </div>
          <input type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) { onPick(e.target.files); e.target.value = ""; } }} />
        </label>
      ) : (
        <div style={{ background: "#fff", borderRadius: 18, padding: 16, boxShadow: "0 2px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: `1.5px solid ${accent}` }}>
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {idx === 0 && (
                  <span style={{ position: "absolute", top: 4, left: 4, zIndex: 3, background: accent, color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 6px", borderRadius: 7 }}>대표</span>
                )}
                {renderBadge?.(idx)}
                {onRemove && (
                  <button onClick={() => onRemove(idx)} style={{ position: "absolute", top: 4, right: 4, zIndex: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", fontSize: 13, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                )}
              </div>
            ))}
            {images.length < max && (
              <label style={{ display: "block", cursor: "pointer" }}>
                <div style={{ aspectRatio: "1", borderRadius: 12, border: "1.5px dashed #D5D8DE", background: "#FAFBFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <span style={{ fontSize: 24, color: "#C2C6CE", lineHeight: 1 }}>＋</span>
                  <span style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 600 }}>추가</span>
                </div>
                <input type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) { onPick(e.target.files); e.target.value = ""; } }} />
              </label>
            )}
          </div>
          {gridHint && <p style={{ margin: "12px 2px 0", fontSize: 11.5, color: "#9AA0AA", lineHeight: 1.5 }}>{gridHint}</p>}
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A8F99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
