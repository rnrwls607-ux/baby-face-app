import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@upstash/redis"],
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      // Capacitor 원격 모드에서 웹뷰가 홈 HTML을 캐시로 서빙하면 브리지 주입
      // (응답 가로채기)이 우회되어 재실행마다 Cap=false가 되던 결함 — 문서만 no-store로
      // 캐시 엔트리 자체를 없애 매 실행 네트워크 경유를 강제. 정적 자원 캐시는 유지.
      //   패턴: _next/(정적 자원)·api/·확장자 있는 파일(webp·png·js…)을 뺀 나머지 = 문서 라우트
      {
        source: "/((?!_next/|api/|.*\\..*).*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;