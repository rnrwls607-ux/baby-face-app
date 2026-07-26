"use client";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

// 공통 텍스트 스타일 — privacy 페이지와 동일 규격(법률 문서라 읽기 편한 여백·행간 우선)
const st: Record<string, CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 800, color: "#191919", margin: "28px 0 10px" },
  p: { fontSize: 13.5, color: "#555", lineHeight: 1.75, margin: "0 0 10px" },
  small: { fontSize: 12.5, color: "#9B9B9B", lineHeight: 1.7, margin: "0 0 6px" },
  box: { border: "1px solid #EFF0F3", borderRadius: 12, padding: "13px 14px", marginBottom: 10 },
  boxTitle: { fontSize: 13.5, fontWeight: 800, color: "#191919", margin: "0 0 7px" },
  kv: { fontSize: 13, color: "#555", lineHeight: 1.65, margin: "0 0 4px" },
  k: { color: "#9B9B9B", fontWeight: 600 },
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
          <p style={{ fontSize: 17, fontWeight: 900, color: "#191919", letterSpacing: -0.3, margin: "0 0 10px" }}>MOSPIC 이용약관</p>
          <p style={{ ...st.p, fontWeight: 700, color: "#191919" }}>시행일: 2026년 7월 26일</p>

          <p style={st.h2}>제1조 (목적)</p>
          <p style={st.p}>이 약관은 퍼스트컴퍼니(이하 &quot;회사&quot;)가 제공하는 MOSPIC(모스픽) 및 관련 제반 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 정함을 목적으로 합니다.</p>

          <p style={st.h2}>제2조 (정의)</p>
          <p style={st.p}>① &quot;서비스&quot;란 이용자가 업로드한 사진을 인공지능(AI) 기술로 변환·보정하여 이미지를 생성·제공하는 MOSPIC 웹 및 앱 서비스를 말합니다.</p>
          <p style={st.p}>② &quot;회원&quot;이란 카카오 계정 연동 등 회사가 정한 방법으로 로그인하여 서비스를 이용하는 자를 말합니다.</p>
          <p style={st.p}>③ &quot;코인&quot;이란 유료 기능 이용을 위해 서비스 내에서 사용하는 선불형 전자 재화를 말합니다.</p>
          <p style={st.p}>④ &quot;생성물&quot;이란 이용자가 업로드한 사진을 바탕으로 서비스가 생성한 이미지를 말합니다.</p>
          <p style={st.p}>⑤ &quot;업로드 콘텐츠&quot;란 이용자가 생성물 제작을 위해 서비스에 올린 사진 등 자료를 말합니다.</p>

          <p style={st.h2}>제3조 (약관의 게시와 개정)</p>
          <p style={st.p}>① 회사는 이 약관을 서비스 내에 게시합니다.</p>
          <p style={st.p}>② 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자와 사유를 명시하여 적용일 7일 전(이용자에게 불리한 변경은 30일 전)부터 공지합니다.</p>
          <p style={st.p}>③ 이용자가 적용일까지 거부 의사를 표시하지 않고 서비스를 계속 이용하는 경우 개정 약관에 동의한 것으로 봅니다.</p>

          <p style={st.h2}>제4조 (이용계약의 체결)</p>
          <p style={st.p}>① 서비스의 일부는 로그인 없이 이용할 수 있으며, 코인 구매·클라우드 보관 등 일부 기능은 회원만 이용할 수 있습니다.</p>
          <p style={st.p}>② 만 14세 미만은 서비스를 이용할 수 없습니다.</p>
          <p style={st.p}>③ 타인의 계정·정보 도용, 부정한 용도의 이용, 기타 법령·약관 위반이 확인되는 경우 회사는 이용을 승낙하지 않거나 이용계약을 해지할 수 있습니다.</p>

          <p style={st.h2}>제5조 (계정 관리)</p>
          <p style={st.p}>① 회원은 로그인 수단(카카오 계정 등)을 스스로 안전하게 관리해야 하며, 제3자가 이용하게 해서는 안 됩니다.</p>
          <p style={st.p}>② 계정 도용이 의심되는 경우 회원은 즉시 회사에 알리고 안내에 따라야 합니다.</p>

          <p style={st.h2}>제6조 (서비스의 내용)</p>
          <p style={st.p}>① 회사는 AI 이미지 생성·보정, 생성물의 저장·다운로드, 회원 대상 클라우드 히스토리 등 서비스를 제공합니다.</p>
          <p style={st.p}>② 제공되는 컨셉·기능의 종류와 세부 내용은 서비스 화면에 표시된 바에 따르며, 회사는 품질 향상을 위해 이를 수시로 추가·변경할 수 있습니다.</p>
          <p style={st.p}>③ AI 기술의 특성상 같은 사진으로도 생성할 때마다 다른 결과가 나올 수 있으며, 결과물의 품질은 입력 사진의 상태에 따라 달라질 수 있습니다.</p>

          <p style={st.h2}>제7조 (서비스의 변경·중단)</p>
          <p style={st.p}>회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 이용자에게 불리한 중대한 변경·중단은 사전에 공지합니다. 시스템 점검, 장애, 천재지변 등 부득이한 경우에는 사전 공지 없이 일시 중단될 수 있습니다.</p>

          <p style={st.h2}>제8조 (코인)</p>
          <p style={st.p}>① 코인은 회사가 정한 가격과 상품 단위로 구매할 수 있으며, 앱 마켓(구글 플레이 등) 또는 회사가 제공하는 결제수단으로 결제합니다.</p>
          <p style={st.p}>② 코인은 생성이 성공한 경우에만 차감되며, 생성 실패·오류 시에는 차감되지 않습니다(이미 차감된 경우 자동 복구).</p>
          <p style={st.p}>③ 회사는 프로모션 목적으로 무상 코인(웰컴 코인 등)을 지급할 수 있습니다. 무상 코인의 유효기간과 조건은 지급 시 고지한 바에 따르며, 별도 고지가 없으면 유효기간은 지급일로부터 1년입니다.</p>
          <p style={st.p}>④ 유상으로 구매한 코인의 유효기간은 구매일로부터 5년입니다.</p>
          <p style={st.p}>⑤ 코인은 타인에게 양도·판매·대여할 수 없으며, 현금으로 교환되지 않습니다.</p>

          <p style={st.h2}>제9조 (청약철회 및 환불)</p>
          <p style={st.p}>① 이용자는 유상 코인 결제일로부터 7일 이내에 해당 결제 건의 코인을 전혀 사용하지 않은 경우 청약철회(결제 취소)할 수 있습니다.</p>
          <p style={st.p}>② 그 외의 경우에도 잔여 유상 코인에 대해 환불을 요청할 수 있으며, 회사는 결제 금액에서 사용분(사용 수량 × 해당 결제 단가)을 공제한 금액을 환불합니다. 무상 코인은 환불 대상이 아닙니다.</p>
          <p style={st.p}>③ 앱 마켓을 통해 결제한 경우 환불 절차와 기준은 해당 마켓 사업자의 운영정책이 우선 적용될 수 있습니다.</p>
          <p style={st.p}>④ 회사의 귀책사유로 서비스를 이용하지 못한 경우 회사는 해당 코인을 복구하거나 환불합니다.</p>
          <p style={st.p}>⑤ 환불 시 해당 결제와 함께 지급된 무상 코인·혜택은 회수될 수 있습니다.</p>
          <p style={st.p}>⑥ 관련 법령이 이 조보다 이용자에게 유리한 경우 법령을 따릅니다.</p>

          <p style={st.h2}>제10조 (업로드 콘텐츠에 대한 권리와 책임)</p>
          <p style={st.p}>① 업로드 콘텐츠에 대한 권리는 이용자(또는 정당한 권리자)에게 있습니다.</p>
          <p style={st.p}>② 이용자는 본인의 사진 또는 촬영·이용에 관하여 정당한 권리나 동의를 확보한 사진만 업로드해야 합니다. 아동의 사진은 법정대리인의 동의가 필요합니다.</p>
          <p style={st.p}>③ 회사는 업로드 콘텐츠를 생성물 제작 목적으로만 처리하며, 보관·파기 등 세부 사항은 개인정보처리방침에 따릅니다.</p>
          <p style={st.p}>④ 제2항 위반으로 발생하는 분쟁과 손해에 대한 책임은 이용자에게 있습니다.</p>

          <p style={st.h2}>제11조 (생성물의 권리와 이용)</p>
          <p style={st.p}>① 생성물은 이용자가 개인적·상업적 용도로 자유롭게 이용할 수 있습니다.</p>
          <p style={st.p}>② 회사는 이용자의 별도 동의 없이 생성물을 홍보 등 다른 목적에 사용하지 않습니다.</p>
          <p style={st.p}>③ 회사는 AI 생성 이미지임을 표시하기 위하여 생성물 파일에 비가시적 메타데이터를 삽입합니다.</p>
          <p style={st.p}>④ AI 기술의 특성상 생성물이 제3자의 초상·저작물 등과 우연히 유사할 수 있습니다. 생성물 이용 과정에서 제3자의 권리를 침해하지 않을 책임은 이용자에게 있습니다.</p>

          <p style={st.h2}>제12조 (공적 증명 용도 제한)</p>
          <p style={st.p}>① 서비스의 증명사진 등 생성물은 AI가 생성한 이미지로서, 여권·주민등록증·운전면허증 등 관공서 제출 및 공적 신분증명 용도로 사용할 수 없습니다.</p>
          <p style={st.p}>② 이를 위반한 사용에 대한 책임은 전적으로 이용자에게 있습니다.</p>

          <p style={st.h2}>제13조 (금지행위)</p>
          <p style={st.p}>① 이용자는 다음 각 호의 행위를 해서는 안 됩니다.</p>
          <p style={st.p}>1. 타인의 사진을 동의 없이 업로드하거나 타인을 사칭·기망할 목적으로 생성물을 만드는 행위</p>
          <p style={st.p}>2. 음란물 또는 아동·청소년을 대상으로 한 성적 이미지, 명예훼손·차별·혐오 목적의 생성물을 제작·유포하는 행위</p>
          <p style={st.p}>3. 허위 정보(딥페이크 등)로 타인에게 피해를 주는 행위</p>
          <p style={st.p}>4. 공문서 위조 등 범죄 목적의 이용</p>
          <p style={st.p}>5. 서비스에 대한 역설계, 크롤링 등 자동화 수단을 통한 비정상 접근, 서비스의 재판매</p>
          <p style={st.p}>6. 회사 또는 제3자의 지식재산권·초상권 등 권리를 침해하는 행위</p>
          <p style={st.p}>7. 기타 관련 법령, 이 약관 및 운영정책을 위반하는 행위</p>
          <p style={st.p}>② 회사는 위반 행위에 대해 사전 통지 후(긴급한 경우 사후 통지) 이용 제한, 계약 해지 등의 조치를 할 수 있으며, 필요한 경우 수사기관에 협조할 수 있습니다.</p>

          <p style={st.h2}>제14조 (회원 탈퇴 및 계약 해지)</p>
          <p style={st.p}>① 회원은 언제든지 서비스 내 기능 또는 고객센터를 통해 탈퇴할 수 있습니다.</p>
          <p style={st.p}>② 탈퇴 시 클라우드 히스토리 등 회원 데이터는 개인정보처리방침에 따라 삭제·파기되며, 잔여 코인은 소멸됩니다. 유상 코인의 환불을 원하는 경우 탈퇴 전에 제9조의 절차를 이용해야 합니다.</p>
          <p style={st.p}>③ 회사가 제13조에 따라 계약을 해지하는 경우 부정하게 취득한 혜택은 회수될 수 있습니다.</p>

          <p style={st.h2}>제15조 (회사의 의무)</p>
          <p style={st.p}>회사는 관련 법령과 이 약관을 준수하고 안정적인 서비스 제공을 위해 노력하며, 이용자의 정당한 의견과 불만을 적절한 절차로 처리합니다.</p>

          <p style={st.h2}>제16조 (면책)</p>
          <p style={st.p}>① 생성물은 AI가 만든 이미지로서 실제 인물·사물과의 유사도, 품질, 특정 목적에 대한 적합성이 보장되지 않으며, 결과가 이용자의 기대와 다르다는 사정만으로는 회사가 책임을 지지 않습니다. 다만 제8조 제2항 및 제9조 제4항은 그대로 적용됩니다.</p>
          <p style={st.p}>② 회사는 천재지변, 통신 장애, 외부 AI 엔진 제공사의 장애 등 회사의 합리적 통제를 벗어난 사유로 인한 손해에 대하여 책임을 지지 않습니다.</p>
          <p style={st.p}>③ 무료로 제공되는 서비스의 장애·중단에 대해서는 회사의 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</p>
          <p style={st.p}>④ 이용자 상호 간 또는 이용자와 제3자 간의 분쟁에 대해 회사는 책임을 지지 않습니다.</p>

          <p style={st.h2}>제17조 (손해배상)</p>
          <p style={st.p}>회사 또는 이용자가 이 약관을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상할 책임이 있습니다. 회사의 책임은 회사의 고의 또는 과실이 있는 경우로 한정됩니다.</p>

          <p style={st.h2}>제18조 (준거법 및 관할)</p>
          <p style={st.p}>이 약관은 대한민국 법률에 따라 해석되며, 분쟁이 발생한 경우 민사소송법에 따른 관할법원에 소를 제기할 수 있습니다.</p>

          <p style={st.h2}>제19조 (개인정보 보호)</p>
          <p style={st.p}>회사는 이용자의 개인정보를 관련 법령 및 개인정보처리방침에 따라 보호합니다.</p>

          <p style={st.h2}>부칙</p>
          <p style={st.p}>이 약관은 2026년 7월 26일부터 시행합니다.</p>

          <div style={{ ...st.box, marginTop: 22, marginBottom: 0 }}>
            <p style={st.boxTitle}>사업자 정보</p>
            <p style={st.kv}><span style={st.k}>상호 · </span>퍼스트컴퍼니</p>
            <p style={st.kv}><span style={st.k}>대표 · </span>최민준</p>
            <p style={st.kv}><span style={st.k}>주소 · </span>대구광역시 달서구 성서로45길 29, 1층 8호 (갈산동)</p>
            <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>문의 · </span>rnrwls159@naver.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
