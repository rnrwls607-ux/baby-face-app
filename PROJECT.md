# 우리 아기 얼굴은? — 프로젝트 개요 (PROJECT.md)

> 이 앱이 무엇인가를 한눈에 보는 곳. 새 세션 시작 시 가장 먼저 읽는다.

## 한 줄 비전
부모 사진으로 아기 얼굴을 만드는 데서 시작해, "AI 사진 생성 + 실사 인화
(증명·여권·가족사진·키링·굿즈) 판매"까지. 핵심은 '닮으면서 자연스러운' 최고 품질.

## 현재 상태
완료
- [x] 부모 사진 업로드(512px 압축), 성별 선택
- [x] AI 아기 얼굴 3장 생성 + 선택, 저장/공유
- [x] 로딩 화면, Vercel 배포 + PWA
- [x] 카카오 로그인(직접 구현, 쿠키), 무료 3회 제한

진행 중 (세부 내용 추후 점검 필요)
- [ ] 증명사진 기능 (app/api/id-photo)
- [ ] 결제 기능 (app/api/payments, app/payment)

## 기술 스택
- Next.js 16 (App Router, Turbopack) ※ 정확한 버전은 package.json 참고
- 배포: Vercel / 저장소: GitHub rnrwls607-ux/baby-face-app (main)
- 배포: git add . → git commit -m "메시지" → git push

## 사용 API (키 값은 .env.local 에만, 여기엔 이름만)
- Replicate(아기 얼굴 생성): REPLICATE_API_TOKEN
- Anthropic Claude(얼굴 특징 추출): ANTHROPIC_API_KEY
- 카카오 로그인: KAKAO_REST_API_KEY

## 폴더 구조 (주요)
app/api/{auth, download, generate, id-photo, payments, usage}
app/payment, app/page.tsx, app/layout.tsx, app/globals.css
public/, AGENTS.md(AI용 안내), CLAUDE.md, package.json 등

## 일하는 원칙
1. 한 세션 = 작은 미션 하나. 끝나면 반드시 git commit & push.
2. 큰 변경 전엔 Claude 설명 → 내 승인 후 진행.
3. 비밀 키는 절대 코드/문서에 안 쓰고 .env.local 에만.
4. 사진 컨셉은 '프리셋(설정 데이터)'으로 추가 (핵심 코드 안 건드림).
5. Next.js 16은 최신 버전이라, 코드 작성 시 옛 문법 주의.