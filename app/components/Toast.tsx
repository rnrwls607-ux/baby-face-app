"use client";
import { useState, useEffect } from "react";
import { TOAST_EVENT } from "../lib/toast";

export default function Toast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer); // 새 토스트가 오면 이전 타이머를 취소하고 교체
      timer = setTimeout(() => setMsg(null), 2000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;

  return (
    <div
      className="fade-up"
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1A1A1A",
        color: "#fff",
        borderRadius: 18,
        padding: "12px 20px",
        fontSize: 14,
        fontWeight: 600,
        zIndex: 9999,
        maxWidth: "90vw",
        textAlign: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  );
}
