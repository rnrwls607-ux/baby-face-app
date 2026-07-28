"use client";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

// 공통 텍스트 스타일 — 법률 문서라 읽기 편한 여백·행간 우선
const st: Record<string, CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 800, color: "#191919", margin: "28px 0 10px" },
  p: { fontSize: 13.5, color: "#555", lineHeight: 1.75, margin: "0 0 10px" },
  small: { fontSize: 12.5, color: "#9B9B9B", lineHeight: 1.7, margin: "0 0 6px" },
  box: { border: "1px solid #EFF0F3", borderRadius: 12, padding: "13px 14px", marginBottom: 10 },
  boxTitle: { fontSize: 13.5, fontWeight: 800, color: "#191919", margin: "0 0 7px" },
  kv: { fontSize: 13, color: "#555", lineHeight: 1.65, margin: "0 0 4px" },
  k: { color: "#9B9B9B", fontWeight: 600 },
};

// 제1조 수집 항목 → 카드형 리스트 (모바일 480px에서 표가 깨지지 않게)
const COLLECT_ITEMS = [
  {
    label: "회원 로그인",
    items: "카카오 계정 고유번호, 닉네임, 프로필 이미지, 이메일(카카오 제공 동의 시)",
    purpose: "회원 식별, 코인·히스토리 등 회원 기능 제공",
    period: "회원 탈퇴 시까지 (탈퇴 시 지체 없이 파기)",
  },
  {
    label: "사진 생성 서비스",
    items: "이용자가 업로드한 사진(얼굴 사진 포함), 생성물",
    purpose: "AI 이미지 생성 및 결과 제공",
    period: "아래 제1조 ② 참조",
  },
  {
    label: "결제",
    items: "주문번호, 결제 승인 정보(수단·금액·일시), 구매 상품 정보",
    purpose: "결제 처리, 환불, 법정 기록 보존",
    period: "전자상거래법에 따라 5년",
  },
  {
    label: "자동 수집",
    items: "접속 기록(IP 주소, 접속 일시), 쿠키, 기기·브라우저 정보",
    purpose: "부정 이용 방지, 서비스 안정 운영",
    period: "제2조의 법정 기간",
  },
  {
    label: "고객 문의",
    items: "이메일 주소, 문의 내용",
    purpose: "문의 처리 및 결과 안내",
    period: "처리 완료 후 3년 (소비자 불만·분쟁 처리 기록)",
  },
];

// 제5조 국외 이전 — 개인정보 보호법 제28조의8 제1항 제3호(계약 이행을 위한 처리위탁·보관)
const OVERSEAS = [
  {
    name: "Google LLC (미국)",
    items: "업로드 사진",
    how: "생성 요청 시 실시간 API 전송",
    purpose: "AI 이미지 생성",
    period: "생성 처리 후 각 사 API 정책에 따라 단기 보관 후 파기",
    contact: "privacy.google.com",
  },
  {
    name: "OpenAI OpCo, LLC (미국)",
    items: "업로드 사진",
    how: "생성 요청 시 실시간 API 전송",
    purpose: "AI 이미지 생성·보정",
    period: "오남용 모니터링 목적 최대 30일 보관 후 파기 (OpenAI API 정책)",
    contact: "privacy@openai.com",
  },
  {
    name: "Replicate, Inc. (미국)",
    items: "업로드 사진·생성물",
    how: "요청 시 실시간 API 전송",
    purpose: "이미지 업스케일·배경 제거",
    period: "처리 완료 후 각 사 정책에 따라 파기",
    contact: "replicate.com/privacy",
  },
  {
    name: "Vercel Inc. (미국)",
    items: "서비스 이용 데이터, 저장 생성물 이미지",
    how: "서비스 이용 시",
    purpose: "호스팅·이미지 저장 인프라",
    period: "회원 탈퇴 또는 제1조의 보유 기간 만료 시까지",
    contact: "vercel.com/legal/privacy-policy",
  },
  {
    name: "Upstash, Inc. (미국)",
    items: "회원번호 기준 이용 수량·코인 잔액",
    how: "서비스 이용 시",
    purpose: "이용량 관리·부정 이용 방지",
    period: "회원 탈퇴 시까지 (단, 웰컴 코인 지급 여부는 재가입 부정 수령 방지를 위해 탈퇴 후에도 보관합니다)",
    contact: "upstash.com",
  },
];

// 제2조 법정 보유
const LEGAL_KEEP = [
  { what: "계약 또는 청약철회 등에 관한 기록", term: "5년 (전자상거래법)" },
  { what: "대금결제 및 재화 등의 공급에 관한 기록", term: "5년 (전자상거래법)" },
  { what: "소비자의 불만 또는 분쟁 처리에 관한 기록", term: "3년 (전자상거래법)" },
  { what: "서비스 접속 기록", term: "3개월 (통신비밀보호법)" },
];

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F7F8FA", fontFamily: "var(--font-noto), 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 56, position: "sticky", top: 0, background: "#fff", zIndex: 10, borderBottom: "1px solid #EFF0F3" }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: "#191919", padding: "4px 8px", lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#191919" }}>개인정보 처리방침</span>
      </div>
      <div style={{ padding: "18px 18px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "22px 20px 26px" }}>
          <p style={st.p}>퍼스트컴퍼니(이하 &quot;회사&quot;)는 MOSPIC(모스픽) 서비스 이용자의 개인정보를 「개인정보 보호법」 등 관계 법령에 따라 적법하게 처리하고 안전하게 관리하며, 개인정보 보호법 제30조에 따라 처리 기준을 다음과 같이 공개합니다.</p>
          <p style={{ ...st.p, fontWeight: 700, color: "#191919" }}>시행일: 2026년 7월 26일</p>

          <p style={st.h2}>제1조 (수집하는 개인정보, 이용 목적, 보유 기간)</p>
          <p style={st.p}>회사는 서비스 제공에 필요한 최소한의 개인정보만 수집·이용합니다.</p>
          {COLLECT_ITEMS.map(c => (
            <div key={c.label} style={st.box}>
              <p style={st.boxTitle}>{c.label}</p>
              <p style={st.kv}><span style={st.k}>항목 · </span>{c.items}</p>
              <p style={st.kv}><span style={st.k}>이용 목적 · </span>{c.purpose}</p>
              <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>보유 기간 · </span>{c.period}</p>
            </div>
          ))}
          <p style={st.p}>② 사진 생성 서비스의 보유 기간은 다음과 같습니다.</p>
          <p style={st.p}>· <b>업로드 사진</b>: 생성 처리 목적으로만 이용하며 서버에 저장하지 않습니다.</p>
          <p style={st.p}>· <b>생성물(회원)</b>: 히스토리용 축소 이미지(최대 500개) 및 유료 생성물 원본(생성일로부터 1년)을 보관합니다. 이용자가 삭제하거나 회원 탈퇴하면 즉시 파기하며, 그 밖에는 보유 기간이 지나면 파기됩니다.</p>
          <p style={st.p}>· <b>생성물(비회원)</b>: 서버에 저장하지 않으며 이용 기기에만 저장됩니다.</p>
          <p style={st.p}>③ 신용카드 번호 등 민감한 결제 정보는 결제대행사(토스페이먼츠) 또는 앱 마켓이 처리하며 회사는 저장하지 않습니다.</p>

          <p style={st.h2}>제2조 (법령에 따른 보유)</p>
          <p style={st.p}>관계 법령에 따라 다음 정보는 명시된 기간 동안 보관 후 파기합니다.</p>
          <div style={st.box}>
            {LEGAL_KEEP.map((l, i) => (
              <p key={l.what} style={i === LEGAL_KEEP.length - 1 ? { ...st.kv, margin: 0 } : st.kv}>
                <span style={st.k}>{l.what} · </span>{l.term}
              </p>
            ))}
          </div>

          <p style={st.h2}>제3조 (만 14세 미만 아동)</p>
          <p style={st.p}>회사는 만 14세 이상의 이용자를 대상으로 서비스를 제공하며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 수집된 사실을 인지하는 경우 지체 없이 파기합니다.</p>

          <p style={st.h2}>제4조 (제3자 제공)</p>
          <p style={st.p}>회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 이용자가 별도로 동의하거나 법령에 근거가 있는 경우에만 예외적으로 제공됩니다.</p>

          <p style={st.h2}>제5조 (처리 위탁 및 국외 이전)</p>
          <p style={st.p}>① 회사는 서비스 제공을 위해 결제 처리를 토스페이먼츠(국내)에 위탁합니다.</p>
          <p style={st.p}>② AI 이미지 생성과 서비스 운영에 필수적인 처리를 위해, 개인정보 보호법 제28조의8 제1항 제3호(계약 이행을 위한 처리위탁·보관)에 따라 다음과 같이 개인정보를 국외 사업자에 위탁·보관합니다. 이전은 각 시점에 암호화된 통신(HTTPS)으로 이루어집니다.</p>
          {OVERSEAS.map(o => (
            <div key={o.name} style={st.box}>
              <p style={st.boxTitle}>{o.name}</p>
              <p style={st.kv}><span style={st.k}>이전 항목 · </span>{o.items}</p>
              <p style={st.kv}><span style={st.k}>이전 시점·방법 · </span>{o.how}</p>
              <p style={st.kv}><span style={st.k}>이전 목적 · </span>{o.purpose}</p>
              <p style={st.kv}><span style={st.k}>보유 기간 · </span>{o.period}</p>
              <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>문의처 · </span>{o.contact}</p>
            </div>
          ))}
          <p style={st.p}>③ 회사는 이용자의 사진을 자체 AI 모델 학습에 사용하지 않으며, 수탁사에도 생성 목적 외 이용(모델 학습 포함)을 허용하지 않는 조건의 API를 이용합니다.</p>
          <p style={st.p}>④ 이용자는 국외 이전을 거부할 수 있으나, 이전이 서비스 제공에 필수적이므로 이 경우 사진 생성 서비스 이용이 불가능합니다.</p>

          <p style={st.h2}>제6조 (파기)</p>
          <p style={st.p}>보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제하며, 법령상 보존이 필요한 정보는 다른 정보와 분리하여 보관 후 기간 만료 시 파기합니다.</p>

          <p style={st.h2}>제7조 (쿠키 등 자동 수집 장치)</p>
          <p style={st.p}>① 회사는 로그인 상태 유지 목적의 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 이 경우 로그인 등 일부 기능 이용이 제한될 수 있습니다.</p>
          <p style={st.p}>② 회사는 광고 식별자를 수집하지 않으며, 제3자 광고·마케팅·행태 분석 도구를 사용하지 않습니다.</p>

          <p style={st.h2}>제8조 (이용자의 권리와 행사 방법)</p>
          <p style={st.p}>① 이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며, 제10조의 문의처(이메일)로 요청하면 지체 없이 조치합니다.</p>
          <p style={st.p}>② 히스토리 삭제, 회원 탈퇴 등은 서비스 내 기능으로 직접 행사할 수 있습니다.</p>
          <p style={st.p}>③ 권리 행사는 법정대리인이나 위임받은 자를 통해서도 할 수 있으며, 이 경우 관계 법령 서식에 따른 위임장을 제출해야 합니다.</p>
          <p style={st.p}>④ 열람·처리정지 요구는 개인정보 보호법 등 관계 법령에 따라 제한될 수 있으며, 다른 법령에서 수집 대상으로 명시된 정보는 삭제를 요구할 수 없습니다.</p>

          <p style={st.h2}>제9조 (안전성 확보 조치)</p>
          <p style={st.p}>회사는 개인정보 보호를 위해 전송 구간 암호화(HTTPS), 접근 권한 최소화 및 관리 기능 접근 통제, 개인정보 수집 최소화, 보안 위협 모니터링 등의 조치를 시행합니다.</p>

          <p style={st.h2}>제10조 (개인정보 보호책임자)</p>
          <div style={st.box}>
            <p style={st.kv}><span style={st.k}>성명 · </span>최민준</p>
            <p style={st.kv}><span style={st.k}>직책 · </span>대표</p>
            <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>연락처 · </span>rnrwls159@naver.com</p>
          </div>
          <p style={st.p}>이용자는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등을 개인정보 보호책임자에게 문의할 수 있습니다.</p>

          <p style={st.h2}>제11조 (권익침해 구제)</p>
          <p style={st.p}>개인정보 침해에 대한 신고·상담은 아래 기관에 문의할 수 있습니다.</p>
          <p style={st.small}>· 개인정보침해 신고센터 (privacy.kisa.or.kr / 국번 없이 118)</p>
          <p style={st.small}>· 개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</p>
          <p style={st.small}>· 대검찰청 (www.spo.go.kr / 1301)</p>
          <p style={st.small}>· 경찰청 (ecrm.police.go.kr / 182)</p>

          {/* 계정 삭제 안내 — Play Console "계정 삭제 URL"이 가리키는 앵커(#delete-account).
              조 번호를 붙이지 않는다: 법률 조항이 아니라 절차 안내이고, 붙이면 이후 조문
              번호가 전부 밀린다. 상단 스티키 헤더(56px)에 제목이 가리지 않도록 scrollMarginTop. */}
          <p id="delete-account" style={{ ...st.h2, scrollMarginTop: 68 }}>회원 탈퇴 방법</p>
          <p style={st.p}>앱 또는 웹에서 로그인한 뒤 <b>설정 &gt; 회원탈퇴</b>에서 직접 탈퇴할 수 있습니다. 탈퇴 시 데이터 처리 범위는 제1조·제5조를 참조해 주세요.</p>

          <p style={st.h2}>제12조 (방침의 적용 범위와 변경)</p>
          <p style={st.p}>① 이 방침은 MOSPIC 서비스(웹·앱)에 적용되며, 서비스에 연결된 외부 사이트의 개인정보 처리에는 적용되지 않습니다.</p>
          <p style={st.p}>② 방침을 변경하는 경우 적용 7일 전(이용자에게 불리한 중대한 변경은 30일 전)에 서비스 내 공지합니다.</p>
          <p style={st.small}>· 공고일자: 2026년 7월 26일</p>
          <p style={st.small}>· 시행일자: 2026년 7월 26일</p>
        </div>
      </div>
    </div>
  );
}
