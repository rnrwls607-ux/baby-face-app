"use client";
import { usePathname } from "next/navigation";

const REPORT_EMAIL = "rnrwls159@naver.com";

export function aiReportMailto(concept: string): string {
  const subject = encodeURIComponent(`[AI 생성물 신고] ${concept}`);
  const body = encodeURIComponent("문제가 된 이미지의 생성 일시와 내용을 적어주세요:\n\n");
  return `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function AiReportLink() {
  const pathname = usePathname();
  const concept = (pathname || "/").replace(/^\//, "") || "home";
  return (
    <span>
      {" · "}
      <a href={aiReportMailto(concept)} style={{ color: "inherit", textDecoration: "underline" }}>문제가 있나요?</a>
    </span>
  );
}
