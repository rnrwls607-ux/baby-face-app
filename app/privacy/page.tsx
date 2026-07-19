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

// 제2조 표 → 카드형 리스트 (모바일 480px에서 표가 깨지지 않게)
const COLLECT_ITEMS = [
  { label: "회원 정보", items: "카카오 회원번호, 닉네임, 이메일(카카오 제공 동의 시)", method: "카카오 로그인" },
  { label: "생성 요청 정보", items: "이용자가 업로드하는 사진(얼굴 등 개인 식별 정보가 포함될 수 있음)", method: "이용자 직접 업로드" },
  { label: "자동 수집 정보", items: "쿠키(로그인 세션, 무료 이용 횟수), 서비스 이용 기록", method: "서비스 이용 과정에서 자동 생성" },
];

// 제6조 국외 이전 표 → 수탁자별 카드
const TRANSFER_ITEMS = [
  { name: "Google LLC", country: "미국", items: "업로드 사진", how: "이용자가 생성을 요청한 시점에 API를 통한 암호화 전송", purpose: "AI 이미지 생성(Gemini)", period: "생성 처리 후 지체 없이 파기 (수탁자 정책에 따름)" },
  { name: "OpenAI, L.L.C.", country: "미국", items: "업로드 사진", how: "상동", purpose: "AI 이미지 생성(GPT Image)", period: "상동" },
  { name: "Replicate, Inc.", country: "미국", items: "업로드 사진 또는 생성 결과물", how: "상동", purpose: "이미지 업스케일·배경 제거", period: "상동" },
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
          <p style={st.p}>퍼스트컴퍼니(이하 &quot;회사&quot;)는 모스픽(MOSPIC, 이하 &quot;서비스&quot;)을 운영함에 있어 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>
          <p style={{ ...st.p, fontWeight: 700, color: "#191919" }}>시행일: 2026년 [__]월 [__]일</p>

          <p style={st.h2}>제1조 (개인정보의 처리 목적)</p>
          <p style={st.p}>회사는 다음의 목적을 위하여 개인정보를 처리하며, 목적 이외의 용도로는 이용하지 않습니다. 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.</p>
          <p style={st.p}>1. <b>회원 가입 및 관리</b>: 카카오 계정을 통한 회원 식별, 로그인 상태 유지, 부정 이용 방지</p>
          <p style={st.p}>2. <b>AI 이미지 생성 서비스 제공</b>: 이용자가 업로드한 사진을 인공지능 모델로 변환하여 결과물을 제공</p>
          <p style={st.p}>3. <b>서비스 운영</b>: 무료 이용 횟수 관리, 문의 응대, 서비스 품질 개선</p>

          <p style={st.h2}>제2조 (처리하는 개인정보의 항목)</p>
          {COLLECT_ITEMS.map(c => (
            <div key={c.label} style={st.box}>
              <p style={st.boxTitle}>{c.label}</p>
              <p style={st.kv}><span style={st.k}>항목 · </span>{c.items}</p>
              <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>수집 방법 · </span>{c.method}</p>
            </div>
          ))}

          <p style={st.h2}>제3조 (개인정보의 처리 및 보유 기간)</p>
          <p style={st.p}>1. <b>회원 정보</b>: 회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기합니다.</p>
          <p style={st.p}>2. <b>업로드 사진</b>: <b>회사는 이용자가 업로드한 원본 사진을 서버에 저장하지 않습니다.</b> 업로드된 사진은 AI 이미지 생성 목적으로만 일시적으로 처리(제6조의 수탁자에게 전송)되며, 생성 처리 완료 후 지체 없이 폐기됩니다.</p>
          <p style={st.p}>3. <b>생성 결과물</b>: 생성 결과물은 기본적으로 이용자 기기에 저장됩니다. 로그인 이용자의 경우 히스토리 기능 제공을 위해 생성 결과물(축소본)이 회사가 이용하는 클라우드 저장소에 보관되며, 이용자는 앱 내 개별·전체 삭제 기능으로 언제든지 파기할 수 있습니다. 유료 생성물 원본의 보관·파기는 제5항에 따릅니다.</p>
          <p style={st.p}>4. <b>쿠키</b>: 각 쿠키의 유효기간 만료 또는 이용자의 삭제 시까지.</p>
          <p style={st.p}>5. <b>유료 생성물 원본</b>: 유료(코인 차감) 생성물의 원본 이미지는 서비스 제공을 위해 생성일로부터 1년간 보관 후 지체 없이 파기하며, 이용자가 해당 항목을 삭제하는 경우 즉시 파기합니다.</p>

          <p style={st.h2}>제4조 (개인정보의 파기 절차 및 방법)</p>
          <p style={st.p}>1. 회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
          <p style={st.p}>2. 전자적 파일 형태의 정보는 복구할 수 없는 기술적 방법으로 삭제합니다.</p>

          <p style={st.h2}>제5조 (개인정보의 제3자 제공)</p>
          <p style={st.p}>회사는 이용자의 개인정보를 제1조의 목적 범위 내에서만 처리하며, 이용자의 사전 동의 또는 법령의 특별한 규정 없이는 제3자에게 제공하지 않습니다.</p>

          <p style={st.h2}>제6조 (개인정보 처리의 위탁 및 국외 이전)</p>
          <p style={st.p}>① 회사는 AI 이미지 생성 서비스 제공을 위하여, 이용자가 업로드한 사진의 처리를 아래 국외 사업자에게 위탁하고 있으며, 이 과정에서 개인정보가 국외로 이전됩니다.</p>
          {TRANSFER_ITEMS.map(t => (
            <div key={t.name} style={st.box}>
              <p style={st.boxTitle}>{t.name} <span style={{ fontWeight: 600, color: "#9B9B9B" }}>({t.country})</span></p>
              <p style={st.kv}><span style={st.k}>이전 항목 · </span>{t.items}</p>
              <p style={st.kv}><span style={st.k}>이전 일시 및 방법 · </span>{t.how}</p>
              <p style={st.kv}><span style={st.k}>이용 목적 · </span>{t.purpose}</p>
              <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>보유·이용 기간 · </span>{t.period}</p>
            </div>
          ))}
          <p style={st.p}>② 이용자는 개인정보의 국외 이전을 원하지 않을 경우 사진 업로드(생성 요청)를 하지 않을 수 있습니다. 다만 이 경우 AI 이미지 생성 서비스의 이용이 불가능합니다.</p>

          <p style={st.h2}>제7조 (개인정보의 안전성 확보조치)</p>
          <p style={st.p}>1. 전송 구간 암호화(HTTPS) 적용</p>
          <p style={st.p}>2. 원본 사진의 서버 미저장 원칙 운영</p>
          <p style={st.p}>3. 개인정보에 대한 접근 권한 최소화</p>

          <p style={st.h2}>제8조 (쿠키 등 자동 수집 장치의 설치·운영 및 거부)</p>
          <p style={st.p}>① 회사는 로그인 상태 유지와 무료 이용 횟수 관리를 위하여 쿠키를 사용합니다.</p>
          <p style={st.p}>② 이용자는 웹 브라우저의 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만 쿠키 저장을 거부할 경우 로그인이 필요한 서비스 이용에 어려움이 있을 수 있습니다.</p>

          <p style={st.h2}>제9조 (정보주체의 권리·의무 및 행사 방법)</p>
          <p style={st.p}>① 이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
          <p style={st.p}>② 권리 행사는 서비스 내 설정 메뉴(회원 탈퇴, 생성 기록 삭제) 또는 제11조의 개인정보 보호책임자에게 이메일로 요청할 수 있으며, 회사는 지체 없이 조치합니다.</p>
          <p style={st.p}>③ 회원 탈퇴(동의 철회) 시 회원 정보는 지체 없이 파기됩니다.</p>

          <p style={st.h2}>제10조 (만 14세 미만 아동의 개인정보)</p>
          <p style={st.p}>본 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>

          <p style={st.h2}>제11조 (개인정보 보호책임자)</p>
          <div style={st.box}>
            <p style={st.kv}><span style={st.k}>성명 · </span>[대표자 성명 — 채워주세요]</p>
            <p style={st.kv}><span style={st.k}>직책 · </span>대표</p>
            <p style={{ ...st.kv, margin: 0 }}><span style={st.k}>연락처 · </span>rnrwls159@naver.com</p>
          </div>
          <p style={st.p}>이용자는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등을 개인정보 보호책임자에게 문의할 수 있습니다.</p>
          <p style={st.p}>기타 개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
          <p style={st.small}>· 개인정보침해신고센터 (국번없이 118 / privacy.kisa.or.kr)</p>
          <p style={st.small}>· 개인정보분쟁조정위원회 (1833-6972 / kopico.go.kr)</p>

          <p style={st.h2}>제12조 (개인정보 처리방침의 변경)</p>
          <p style={st.p}>이 개인정보 처리방침은 시행일로부터 적용되며, 내용의 추가·삭제·수정이 있는 경우 개정 사항을 시행 7일 전부터 서비스 내 공지사항을 통해 고지합니다.</p>
          <p style={st.small}>· 공고일자: 2026년 [__]월 [__]일</p>
          <p style={st.small}>· 시행일자: 2026년 [__]월 [__]일</p>
        </div>
      </div>
    </div>
  );
}
