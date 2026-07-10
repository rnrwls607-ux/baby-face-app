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
    // 바깥: 위치·좌우 중앙 정렬만 담당 (transform 없음)
    <div
      style={{
        position: "fixed",
        bottom: "calc(100px + env(safe-area-inset-bottom))",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* 안쪽: 모양·애니메이션만 담당. fade-up의 translateY가 정렬을 깨지 않는다 */}
      <div
        className="fade-up"
        style={{
          background: "#1A1A1A",
          color: "#fff",
          borderRadius: 18,
          padding: "12px 20px",
          fontSize: 14,
          fontWeight: 600,
          maxWidth: "90vw",
          textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        {msg}
      </div>
    </div>
  );
}
