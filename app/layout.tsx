import type { Metadata, Viewport } from "next";
import "./globals.css";
import Toast from "./components/Toast";
import CoinNeededSheet from "./components/CoinNeededSheet";
import BackButtonBridge from "./components/BackButtonBridge";

export const metadata: Metadata = {
  metadataBase: new URL("https://mospic.com"),
  title: "MOSPIC — 셀카 한 장이, 작품이 되다",
  description: "AI 프로필 · 증명사진 · 화보. 셀카 한 장으로 스튜디오급 사진을 만들어보세요.",
  openGraph: {
    title: "MOSPIC — 셀카 한 장이, 작품이 되다",
    description: "AI 프로필 · 증명사진 · 화보. 셀카 한 장으로 스튜디오급 사진을 만들어보세요.",
    url: "https://mospic.com",
    siteName: "MOSPIC",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "MOSPIC",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily:
            "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        }}
      >
        {/* 뒤로가기 재연 프리하이드레이션 가드 — 하이드레이션 전 서버 HTML(빈 홈) 노출 차단.
            ctx는 peek만(소비는 React 복원 몫). replaceState는 착지 유령 칸의 __backClose를 중화해
            useBackClose 좌초 자동 통과(back 발사)와 복원의 경합을 제거. 1200ms 백스톱 타이머로
            복원 실패 시에도 빈 화면에 갇히지 않음. ctx 없으면 완전 무동작. */}
        <style dangerouslySetInnerHTML={{ __html: "html[data-mospic-restoring] body::before{content:'';position:fixed;inset:0;background:#FAFAF8;z-index:9999}" }} />
        {/* ★임시 진단(제거 예정) — document.title='[D0] '+… 1줄만 덧댐. 기존 로직 무접촉.
            스크립트 환경이라 배지를 못 쓴다. 단 셸 앱에는 탭 타이틀이 보이지 않아
            D0는 브라우저에서만 판독 가능하다 — 같은 순간을 D1(ctx 있음/없음)이 화면으로 덮는다. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('mospic_back_ctx')){document.title='[D0] '+document.title;document.documentElement.setAttribute('data-mospic-restoring','1');history.replaceState({},'',location.href);setTimeout(function(){document.documentElement.removeAttribute('data-mospic-restoring')},1200)}}catch(e){}" }} />
        {children}
        <Toast />
        <CoinNeededSheet />
        <BackButtonBridge />
      </body>
    </html>
  );
}