import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "babyface · 우리 아기 얼굴은?",
  description: "엄마 아빠 사진으로 AI가 아기 얼굴을 예측해드려요!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} antialiased`} style={{ fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
