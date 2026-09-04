import Link from "next/link";

// 404 화면. 없으면 Next 내장 영문("This page could not be found")이 뜬다.
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#191919", display: "grid", placeItems: "center", padding: 24, fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔎</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>페이지를 찾을 수 없어요</h1>
        <p style={{ fontSize: 15, color: "#7C7C7C", lineHeight: 1.6, margin: "0 0 22px" }}>
          주소가 바뀌었거나 삭제된 페이지예요.
        </p>
        <Link href="/"
          style={{ display: "block", width: "100%", padding: "15px 0", background: "#FF4F8B", color: "#fff", borderRadius: 14, fontSize: 16, fontWeight: 800, textDecoration: "none" }}>
          홈으로
        </Link>
      </div>
    </div>
  );
}
