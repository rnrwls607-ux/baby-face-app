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
        {children}
        <Toast />
        <CoinNeededSheet />
        <BackButtonBridge />
      </body>
    </html>
  );
}