"use client";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const st: Record<string, CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 800, color: "#191919", margin: "28px 0 10px" },
  p: { fontSize: 13.5, color: "#555", lineHeight: 1.75, margin: "0 0 10px" },
  small: { fontSize: 12.5, color: "#9B9B9B", lineHeight: 1.7, margin: "0 0 6px" },
};

export default function AiNoticePage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10, borderBottom: "1px solid #EFF0F3" }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>AI 생성물 안내</span>
      </div>
      <div style={{ padding: "18px 18px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "22px 20px 26px" }}>
          <p style={st.p}>모스픽을 이용해 주셔서 감사합니다. 안전하고 즐거운 이용을 위해 꼭 알아두실 내용을 안내드립니다.</p>
          <p style={{ ...st.p, fontWeight: 700, color: "#191919" }}>시행일: 2026년 [__]월 [__]일</p>

          <p style={st.h2}>1. 모든 결과물은 AI가 생성한 이미지입니다</p>
          <p style={st.p}>모스픽에서 만들어지는 모든 사진은 인공지능(AI)이 생성한 이미지입니다. 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」에 따라 이 사실을 안내드리며, 생성물에는 AI 생성물임을 알 수 있는 표시가 적용될 수 있습니다.</p>

          <p style={st.h2}>2. 공적 신분 증명에는 사용할 수 없어요</p>
          <p style={st.p}>AI로 생성된 사진은 <b>여권, 주민등록증, 운전면허증, 비자 등 공적 신분 증명 용도로 사용할 수 없습니다.</b> 관공서·기관 제출용 증명사진은 반드시 실제 촬영된 사진을 사용해 주세요. 모스픽의 증명사진·프로필 콘셉트는 SNS 프로필, 이력서 첨부(제출처 정책 확인 필요), 개인 소장 등 일상적 용도를 위한 것입니다.</p>

          <p style={st.h2}>3. 본인 또는 동의받은 분의 사진만 올려주세요</p>
          <p style={st.p}>· 사진 업로드는 <b>본인의 사진</b> 또는 <b>당사자의 동의를 받은 사진</b>만 가능합니다.</p>
          <p style={st.p}>· 연예인 등 타인의 사진을 동의 없이 사용하는 것은 초상권 침해 등 법적 문제가 될 수 있으며, 그 책임은 이용자 본인에게 있습니다.</p>
          <p style={st.p}>· 생성물을 딥페이크 등 타인에게 피해를 주는 용도로 사용하는 것은 법으로 금지되어 있습니다.</p>

          <p style={st.h2}>4. 결과가 기대와 다를 수 있어요</p>
          <p style={st.p}>AI 기술의 특성상 인물의 특징, 표정, 포즈, 배경 등이 기대와 다르게 표현될 수 있습니다. 같은 사진으로 다시 생성해도 매번 조금씩 다른 결과가 나옵니다. 더 닮은 결과를 원하시면 밝은 곳에서 찍은 또렷한 정면 사진을 사용해 주세요.</p>

          <p style={st.h2}>5. 업로드한 사진은 안전하게 처리돼요</p>
          <p style={st.p}>· 업로드하신 원본 사진은 <b>서버에 저장되지 않으며</b>, AI 생성 목적으로만 일시 처리된 후 폐기됩니다.</p>
          <p style={st.p}>· 생성 결과물은 이용자님의 기기에만 저장됩니다.</p>
          <p style={st.p}>· 자세한 내용은 <button onClick={() => { window.location.href = "/privacy"; }} style={{ background: "none", border: "none", padding: 0, color: "#FF4B7C", fontWeight: 700, fontSize: 13.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>개인정보 처리방침</button>을 확인해 주세요.</p>

          <div style={{ borderTop: "1px solid #EFF0F3", marginTop: 24, paddingTop: 16 }}>
            <p style={st.small}>궁금한 점이 있으시면 언제든 문의해 주세요.</p>
            <p style={st.small}>문의: rnrwls159@naver.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
