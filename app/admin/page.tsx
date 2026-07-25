"use client";
// 🛠️ 관리자 CS 화면 (2026-07-25) — /admin 으로 직접 접근만. 홈·설정 어디에도 링크 없음.
// 조회 전용 화면이다. 삭제 버튼은 두지 않았다 — 정리·파기는 API를 직접 호출해야 하고
// 그마저 confirm:"DELETE"가 있어야 실행된다(오클릭으로 남의 데이터가 지워질 여지 차단).
import { useState } from "react";

type Res = {
  uid: string; exists: boolean;
  coin: { balance: number; welcomeGiven: boolean; recentLog: { type?: string; amount?: number; ref?: string; atText?: string | null }[] };
  history: { count: number; capacity: number; recent: { id?: string; concept?: string; url?: string; createdAtText?: string | null; hasOriginal?: boolean }[] };
  originals: { count: number; retentionDays: number; expiredCount: number; recent: { id?: string; concept?: string; coins?: number; files?: number; atText?: string | null; expireAtText?: string | null; daysLeft?: number | null; expired?: boolean }[] };
};

const box: React.CSSProperties = { background: "#fff", border: "1px solid #EFF0F3", borderRadius: 14, padding: 16, marginBottom: 14 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, color: "#8A8F99", fontWeight: 700, padding: "6px 8px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { fontSize: 12, color: "#333", padding: "6px 8px", borderTop: "1px solid #F4F5F7", whiteSpace: "nowrap" };

export default function AdminPage() {
  const [uid, setUid] = useState("");
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!uid.trim()) return;
    setLoading(true); setErr(""); setData(null);
    try {
      const res = await fetch(`/api/admin/user?uid=${encodeURIComponent(uid.trim())}`);
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "조회 실패"); return; }
      setData(j);
    } catch { setErr("네트워크 오류"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "var(--font-noto), sans-serif", background: "#F7F8FA", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: "#191919", margin: "0 0 4px" }}>MOSPIC 관리자 — 사용자 조회</h1>
      <p style={{ fontSize: 12, color: "#8A8F99", margin: "0 0 16px" }}>조회 전용입니다. 개인정보를 다루므로 모든 접근이 서버 로그에 기록됩니다.</p>

      <div style={{ ...box, display: "flex", gap: 8 }}>
        <input value={uid} onChange={e => setUid(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void load(); }}
          placeholder="카카오 ID (숫자)" inputMode="numeric"
          style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none" }} />
        <button onClick={() => void load()} disabled={loading || !uid.trim()}
          style={{ background: loading || !uid.trim() ? "#E8E9ED" : "#191919", color: loading || !uid.trim() ? "#AEB2BA" : "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: loading || !uid.trim() ? "not-allowed" : "pointer" }}>
          {loading ? "조회 중..." : "조회"}
        </button>
      </div>

      {err && <div style={{ ...box, borderColor: "#FFD9E3", background: "#FFF5F8" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#FF4B7C", fontWeight: 700 }}>⚠️ {err}</p>
      </div>}

      {data && (
        <>
          <div style={box}>
            <p style={{ fontSize: 13, fontWeight: 800, margin: "0 0 10px" }}>코인 · uid {data.uid} {data.exists ? "" : "(기록 없음)"}</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", color: "#FF4B7C" }}>{data.coin.balance}개</p>
            <p style={{ fontSize: 11, color: "#8A8F99", margin: "0 0 10px" }}>웰컴 코인 {data.coin.welcomeGiven ? "지급됨" : "미지급"}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={th}>유형</th><th style={th}>증감</th><th style={th}>컨셉</th><th style={th}>시각</th></tr></thead>
                <tbody>
                  {data.coin.recentLog.length === 0 && <tr><td style={td} colSpan={4}>내역 없음</td></tr>}
                  {data.coin.recentLog.map((l, i) => (
                    <tr key={i}><td style={td}>{l.type}</td><td style={{ ...td, color: (l.amount ?? 0) < 0 ? "#FF4B7C" : "#1B7A4A", fontWeight: 700 }}>{(l.amount ?? 0) > 0 ? "+" : ""}{l.amount}</td><td style={td}>{l.ref || "-"}</td><td style={td}>{l.atText?.slice(0, 19).replace("T", " ")}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={box}>
            <p style={{ fontSize: 13, fontWeight: 800, margin: "0 0 10px" }}>히스토리 — {data.history.count}건 / 상한 {data.history.capacity}</p>
            {data.history.count >= data.history.capacity && <p style={{ fontSize: 11, color: "#C77700", margin: "0 0 8px" }}>⚠️ 상한 도달 — 밀려난 항목의 파일이 고아로 남아 있을 수 있습니다.</p>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={th}>컨셉</th><th style={th}>생성</th><th style={th}>원본</th><th style={th}>URL</th></tr></thead>
                <tbody>
                  {data.history.recent.length === 0 && <tr><td style={td} colSpan={4}>없음</td></tr>}
                  {data.history.recent.map((h, i) => (
                    <tr key={i}><td style={td}>{h.concept || "-"}</td><td style={td}>{h.createdAtText?.slice(0, 19).replace("T", " ")}</td><td style={td}>{h.hasOriginal ? "있음" : "-"}</td>
                      {/* ★이미지로 렌더하지 않는다 — 링크 텍스트만 */}
                      <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{h.url ? <a href={h.url} target="_blank" rel="noreferrer" style={{ color: "#3B5BA5" }}>열기</a> : "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={box}>
            <p style={{ fontSize: 13, fontWeight: 800, margin: "0 0 10px" }}>유료 원본 — {data.originals.count}건 (보관 {data.originals.retentionDays}일)</p>
            {data.originals.expiredCount > 0 && <p style={{ fontSize: 11, color: "#FF4B7C", margin: "0 0 8px", fontWeight: 700 }}>만료 대상 {data.originals.expiredCount}건 — purge-expired 실행 필요</p>}
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={th}>컨셉</th><th style={th}>코인</th><th style={th}>파일</th><th style={th}>생성</th><th style={th}>만료</th><th style={th}>남은일</th></tr></thead>
                <tbody>
                  {data.originals.recent.length === 0 && <tr><td style={td} colSpan={6}>없음</td></tr>}
                  {data.originals.recent.map((o, i) => (
                    <tr key={i}><td style={td}>{o.concept || "-"}</td><td style={td}>{o.coins}</td><td style={td}>{o.files}</td><td style={td}>{o.atText?.slice(0, 10)}</td><td style={td}>{o.expireAtText?.slice(0, 10)}</td>
                      <td style={{ ...td, color: o.expired ? "#FF4B7C" : "#333", fontWeight: o.expired ? 700 : 400 }}>{o.expired ? "만료" : `${o.daysLeft}일`}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
