"use client";
// 에러 조회 화면 (관리자 전용).
// ★API가 403이면 여기서도 "없는 페이지"처럼 보여준다 — 관리자 도구의 존재 자체를 노출하지 않는다.
import { useEffect, useState, useCallback } from "react";

type Entry = {
  id: string; at: number; tag: string; message: string;
  uid?: string; route?: string; status?: number; meta?: Record<string, unknown>;
};

const fmt = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export default function AdminErrorsPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const [detail, setDetail] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: "100", ...(uid ? { uid } : {}) });
      const r = await fetch(`/api/admin/errors?${q}`);
      if (r.status === 403) { setDenied(true); return; }
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { void load(); }, [load]);

  if (denied) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff", color: "#191919", fontSize: 15 }}>
        페이지를 찾을 수 없어요
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 20, background: "#fff", minHeight: "100vh", color: "#191919", fontSize: 14 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>에러 기록</h1>
      <p style={{ color: "#7C7C7C", marginBottom: 16 }}>사용자가 말한 번호로 찾을 수 있어요. 상세는 7일 뒤 사라져요.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="uid로 거르기(비우면 전체)"
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ECEAE6", borderRadius: 10, fontSize: 14 }} />
        <button onClick={() => void load()}
          style={{ padding: "10px 18px", background: "#FF4F8B", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
          조회
        </button>
      </div>

      {loading ? <p style={{ color: "#7C7C7C" }}>불러오는 중…</p> : (
        <>
          <p style={{ color: "#7C7C7C", marginBottom: 8 }}>{items.length}건</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #ECEAE6" }}>
                  {["시각", "태그", "라우트", "상태", "메시지", "번호"].map((h) => (
                    <th key={h} style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "#7C7C7C", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #F4F3F1" }}>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{fmt(it.at)}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", fontWeight: 700 }}>{it.tag}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "#7C7C7C" }}>{it.route ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{it.status ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{it.message.slice(0, 80)}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <button onClick={() => setDetail(it)}
                        style={{ background: "none", border: "none", color: "#FF4F8B", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                        {it.id}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p style={{ color: "#7C7C7C", padding: "24px 0" }}>기록이 없어요.</p>}
        </>
      )}

      {detail && (
        <div onClick={() => setDetail(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}>
          <pre onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, padding: 20, maxWidth: 760, maxHeight: "80vh", overflow: "auto", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
            {JSON.stringify(detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
