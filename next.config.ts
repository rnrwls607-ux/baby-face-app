import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ★sharp는 네이티브 바이너리라 번들에 말아넣으면 안 된다 — 서버 외부 패키지로 둔다.
  //   (2026-09-03 c1d9f61 회귀 수습: devDependencies로 옮겨져 프로덕션에서 통째로 빠졌고,
  //    sharp를 import하는 라우트가 전부 모듈 로드 실패 → HTML 500이 됐다.)
  serverExternalPackages: ["@upstash/redis", "sharp"],
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      // Capacitor 원격 모드에서 웹뷰가 HTML을 디스크 캐시로 서빙하면 배포한 새 번들이
      // 반영되지 않던 실증 문제(진단 배지 미표시 사건) 방어 — 문서만 no-store로 매 실행
      // 네트워크 경유 강제, 정적 자원 캐시는 유지.
      // ※한때 재실행 Cap=false의 원인으로 지목했으나 그 진범은 폰의 WebAPK 오인으로
      //   확정(WORKLOG 07-26 2차).
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