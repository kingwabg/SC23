# TASKS: SC23 개발 계획

## [단계 1] 환경 설정 및 기초 정리 (완료)
- [x] 프로젝트 구조 분석 및 기술 스택 확인
- [x] `npm install` 및 의존성 충돌 해결 (`--legacy-peer-deps`)
- [x] 텔레グラム 알림 시스템 연동 테스트 (`node test_telegram.mjs`)
- [x] `PRD.md` 및 `TASKS.md` 작성 (3-File System 규칙 적용)

## [단계 2] 로컬 서버 구동 및 화면 확인 (완료)
- [x] Auth API 서버 실행 및 Vite 서버 구동
- [x] 무한 새로고침 버그 수정 (Hydration Error & SW Loop)

## [단계 3] 표(Table) 관리 시스템 고도화 (진행중)
- [ ] `MeetingPage.jsx` 내 표 컨텍스트 메뉴 UI 개선 (스타일 및 아이콘 보강)
- [ ] 행/열 추가/삭제 시 Lexical 에디터 상태와 동기화 버그 점검
- [ ] 셀 배경색 선택 기능 다양화

## [단계 4] 데이터 자동 집계 엔진 강화
- [ ] 아동 리스트 및 종사자 리스트 스캔 로직 최적화
- [ ] `generateAggregationTableHtml` 함수의 HTML 구조를 최신 디자인 시스템에 맞춰 업데이트
- [ ] 확정 버튼 클릭 시 데이터 주입 위치 최적화 (기존 내용 유지하며 최상단 삽입)

## [단계 5] 결재 및 직인 시스템 완성
- [ ] `generateOfficialSignatureHeaderHtml` 내 직인(Seal) 디자인 고도화 (CSS 애니메이션 등)
- [ ] 최종 확정 시 에디터를 '읽기 전용' 모드로 강제 전환하는 로직 추가
- [ ] PDF 출력 시 레이아웃 깨짐 방지 CSS 보완

## [단계 6] 마무리 및 알림
- [ ] 전체 기능 통합 테스트
- [ ] 작업 완료 텔레그램 알림 발송
