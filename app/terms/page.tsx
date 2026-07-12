"use client";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const st: Record<string, CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 800, color: "#191919", margin: "28px 0 10px" },
  p: { fontSize: 13.5, color: "#555", lineHeight: 1.75, margin: "0 0 10px" },
  small: { fontSize: 12.5, color: "#9B9B9B", lineHeight: 1.7, margin: "0 0 6px" },
};

export default function TermsPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10, borderBottom: "1px solid #EFF0F3" }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>이용약관</span>
      </div>
      <div style={{ padding: "18px 18px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "22px 20px 26px" }}>
          <p style={{ ...st.p, fontWeight: 700, color: "#191919" }}>시행일: 2026년 [__]월 [__]일</p>

          <p style={st.h2}>제1조 (목적)</p>
          <p style={st.p}>이 약관은 퍼스트컴퍼니(이하 &quot;회사&quot;)가 운영하는 모스픽(MOSPIC, 이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

          <p style={st.h2}>제2조 (정의)</p>
          <p style={st.p}>1. <b>&quot;서비스&quot;</b>란 이용자가 업로드한 사진을 인공지능(AI) 기술로 변환하여 이미지를 생성·제공하는 모스픽 웹 서비스를 말합니다.</p>
          <p style={st.p}>2. <b>&quot;이용자&quot;</b>란 이 약관에 따라 서비스를 이용하는 자를 말합니다.</p>
          <p style={st.p}>3. <b>&quot;회원&quot;</b>이란 카카오 계정으로 로그인하여 서비스를 이용하는 자를 말합니다.</p>
          <p style={st.p}>4. <b>&quot;생성물&quot;</b>이란 이용자의 요청에 따라 서비스의 AI가 생성한 이미지를 말합니다.</p>

          <p style={st.h2}>제3조 (약관의 게시와 개정)</p>
          <p style={st.p}>① 회사는 이 약관을 서비스 내 설정 화면에 게시합니다.</p>
          <p style={st.p}>② 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정 사유를 명시하여 적용일 7일 전부터 공지합니다.</p>

          <p style={st.h2}>제4조 (서비스의 제공)</p>
          <p style={st.p}>① 회사는 다음의 서비스를 제공합니다.</p>
          <p style={st.p}>1. 사진 기반 AI 이미지 생성(증명사진·프로필·화보 등 다양한 콘셉트)</p>
          <p style={st.p}>2. 생성 결과물의 저장·다운로드 기능</p>
          <p style={st.p}>② 서비스는 연중무휴 제공을 원칙으로 하나, 시스템 점검·장애·외부 AI 처리사의 사정 등 운영상 필요에 따라 일시 중단될 수 있습니다.</p>

          <p style={st.h2}>제5조 (회원 가입 및 계정)</p>
          <p style={st.p}>① 회원 가입은 카카오 계정 로그인으로 이루어집니다.</p>
          <p style={st.p}>② 회원은 자신의 계정을 타인에게 양도·대여할 수 없으며, 계정 관리 소홀로 발생한 문제의 책임은 회원 본인에게 있습니다.</p>
          <p style={st.p}>③ 회원은 서비스 내 설정 메뉴를 통해 언제든지 탈퇴할 수 있습니다.</p>

          <p style={st.h2}>제6조 (생성물의 권리와 이용)</p>
          <p style={st.p}>① 이용자는 자신이 생성한 생성물을 관련 법령과 이 약관을 준수하는 범위에서 개인적·상업적 용도로 자유롭게 이용할 수 있습니다.</p>
          <p style={st.p}>② 회사는 이용자의 생성물에 대해 별도의 권리를 주장하지 않습니다.</p>
          <p style={st.p}>③ 생성물의 이용으로 발생하는 모든 법적 책임(초상권·저작권·명예훼손 등 제3자 권리 침해를 포함)은 이용자 본인에게 있습니다.</p>

          <p style={st.h2}>제7조 (금지행위)</p>
          <p style={st.p}>① 이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <p style={st.p}>1. <b>본인이 아닌 타인의 사진을 그 사람의 동의 없이 업로드하는 행위</b></p>
          <p style={st.p}>2. <b>연예인·유명인 등 제3자의 사진을 무단으로 사용하는 행위</b></p>
          <p style={st.p}>3. <b>아동·청소년이 등장하는 부적절한 이미지를 생성하거나 시도하는 행위</b></p>
          <p style={st.p}>4. <b>생성물을 딥페이크 등 허위 정보 유포, 명예훼손, 사기, 괴롭힘, 성적 목적 등 불법적 용도로 사용·유포하는 행위</b></p>
          <p style={st.p}>5. 서비스의 정상적인 운영을 방해하거나 시스템에 부정하게 접근하는 행위</p>
          <p style={st.p}>6. 기타 관련 법령에 위반되는 행위</p>
          <p style={st.p}>② 이용자가 제1항을 위반한 경우, 회사는 사전 통지 없이 해당 이용자의 서비스 이용을 제한하거나 회원 자격을 상실시킬 수 있습니다.</p>
          <p style={st.p}>③ <b>제1항 위반으로 발생하는 모든 민·형사상 책임은 해당 이용자 본인에게 있으며</b>, 회사는 수사기관의 적법한 요청이 있는 경우 관련 법령에 따라 협조할 수 있습니다.</p>

          <p style={st.h2}>제8조 (공적 증명 용도 사용 금지)</p>
          <p style={st.p}>① 서비스의 생성물은 인공지능이 생성한 이미지로서, <b>여권, 주민등록증, 운전면허증, 비자 등 공적 신분 증명 용도로 사용할 수 없습니다.</b></p>
          <p style={st.p}>② 이용자가 이를 위반하여 발생하는 불이익 및 법적 책임은 이용자 본인에게 있습니다.</p>

          <p style={st.h2}>제9조 (AI 생성물의 특성 고지)</p>
          <p style={st.p}>① 생성물은 인공지능 기술의 특성상 이용자의 기대와 다르게 표현될 수 있으며(인물의 특징·포즈·배경 등의 차이 포함), 회사는 생성물의 품질이나 특정 결과를 보증하지 않습니다.</p>
          <p style={st.p}>② 동일한 사진으로 생성하더라도 매번 다른 결과가 나올 수 있습니다.</p>
          <p style={st.p}>③ 모든 생성물에는 관련 법령(인공지능기본법 등)에 따라 AI 생성물임을 알리는 고지 또는 표시가 적용될 수 있습니다.</p>

          <p style={st.h2}>제10조 (유료 서비스)</p>
          <p style={st.p}>유료 서비스(코인 결제 등)를 도입하는 경우, 결제·환불 등 관련 사항은 관련 법령(전자상거래법 등)에 따라 별도로 정하여 사전에 고지합니다.</p>

          <p style={st.h2}>제11조 (책임의 한계)</p>
          <p style={st.p}>① 회사는 천재지변, 외부 AI 처리사의 서비스 중단 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</p>
          <p style={st.p}>② 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
          <p style={st.p}>③ 회사는 이용자가 서비스를 통해 기대하는 효용을 얻지 못한 것에 대하여 책임을 지지 않습니다.</p>

          <p style={st.h2}>제12조 (준거법 및 재판 관할)</p>
          <p style={st.p}>① 회사와 이용자 간 발생한 분쟁에 대하여는 대한민국 법을 적용합니다.</p>
          <p style={st.p}>② 서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.</p>

          <div style={{ borderTop: "1px solid #EFF0F3", marginTop: 24, paddingTop: 16 }}>
            <p style={st.small}>문의: rnrwls159@naver.com</p>
            <p style={st.small}>· 공고일자: 2026년 [__]월 [__]일</p>
            <p style={st.small}>· 시행일자: 2026년 [__]월 [__]일</p>
          </div>
        </div>
      </div>
    </div>
  );
}
