# SC23 WebHwp Migration Plan

## Goal

`RoosterJS` 기반 회의록 편집기를 한컴 `웹한글 기안기(WebHwp)` 기반으로 전환할 수 있도록, 현재 `SC23` 구조에 맞는 단계별 설계안을 정의한다.

이 문서는 바로 구현에 들어가기 위한 초안이 아니라, 다음 3가지를 먼저 분명히 하는 데 목적이 있다.

1. 지금 구조에서 무엇을 유지하고 무엇을 교체할지
2. 라이선스 확보 전에도 선행 가능한 작업이 무엇인지
3. 실제 도입 시 프론트/서버/API/저장 구조가 어떻게 바뀌는지

## Current State

현재 회의록 편집 흐름은 아래와 같다.

- 화면: [src/pages/MeetingsPage.jsx](C:/Users/juna.DESKTOP-PPGTQQM/Documents/Playground/SC23-feature-editor-save/src/pages/MeetingsPage.jsx)
- 에디터 앱: [src/components/RoosterEditor/RoosterApp.tsx](C:/Users/juna.DESKTOP-PPGTQQM/Documents/Playground/SC23-feature-editor-save/src/components/RoosterEditor/RoosterApp.tsx)
- API 클라이언트: [src/utils/apiClient.js](C:/Users/juna.DESKTOP-PPGTQQM/Documents/Playground/SC23-feature-editor-save/src/utils/apiClient.js)
- 서버 저장: [server/groupware-api.js](C:/Users/juna.DESKTOP-PPGTQQM/Documents/Playground/SC23-feature-editor-save/server/groupware-api.js)

현재 데이터 모델 특징:

- 회의록 본문이 `meeting.content`에 HTML 문자열로 저장된다.
- 회의 메타데이터와 본문이 하나의 JSON 레코드에 함께 들어간다.
- 서버 저장소는 기본적으로 `server/db/meetings-db.json` 또는 PostgreSQL `meetings` namespace다.
- 화면은 `RoosterApp` 내부 동작을 전제로 `onChangeHtml`, `initialHtml`, `editorRef`에 강하게 결합되어 있다.

## Why Change

`RoosterJS`를 계속 쓰는 경우의 부담:

- 표 편집 UX를 직접 계속 손봐야 한다.
- 한글 문서 양식, 인쇄, 기안서 스타일 호환을 직접 맞춰야 한다.
- 문서 편집 품질 이슈가 생길 때 앱 코드로 우회 구현이 계속 늘어난다.

`WebHwp`를 쓰는 경우 기대 효과:

- 표, 문단, 문서 양식, 출력 품질이 한글 문서 흐름에 더 가깝다.
- 기안서, 결재 문서, 공문 형태 요구사항에 맞추기 쉽다.
- API로 문서 열기, 저장, 인쇄, 필드 치환 같은 문서 제어를 표준화할 수 있다.

## Important Assumption

이 전환은 "에디터 라이브러리 교체"가 아니라 "문서 엔진 교체"에 가깝다.

즉 아래 전제가 필요하다.

- 한컴 `웹한글 기안기` 라이선스 확보 가능
- 서비스 또는 테스트 환경에 WebHwp 서버 설치 가능
- 문서 저장 포맷을 HTML 중심에서 `HWP/HWPX/바이너리 파일 + 메타데이터` 구조로 바꿔도 됨

이 세 가지 중 하나라도 막히면 완전 전환보다 하이브리드 전략이 더 적합하다.

## Recommended Strategy

추천 전략은 "전체 교체"가 아니라 "회의록 단일 화면부터 단계적 전환"이다.

### Phase 0. Pre-check

구현 전에 아래를 먼저 확인한다.

- 한컴 도입 방식
  - 온프레미스 설치형인지
  - 개발/운영 라이선스 구성이 어떻게 되는지
  - 테스트 환경 사용 범위가 어디까지인지
- 저장 포맷
  - 서버에 `HWPX` 파일 저장이 가능한지
  - DB에는 파일 메타데이터만 저장할지
  - 파일 스토리지를 로컬 디스크로 시작해도 되는지
- 문서 편집 범위
  - 회의록만 우선 전환할지
  - 프로그램 계획서/공문/결재 문서까지 확장할지

### Phase 1. Decouple Editor From Meetings Page

라이선스가 없어도 먼저 할 수 있는 단계다.

목표:

- `MeetingsPage.jsx`가 `RoosterApp`에 직접 묶여 있는 구조를 끊는다.
- 회의록 화면이 "편집기 어댑터"를 통해 동작하게 만든다.

권장 구조:

- `src/features/editor/adapters/EditorAdapter.ts`
- `src/features/editor/adapters/RoosterAdapter.tsx`
- `src/features/editor/adapters/WebHwpAdapter.tsx`
- `src/features/editor/types.ts`

핵심 인터페이스 예시:

```ts
export type DocumentBodyValue =
  | { kind: 'html'; html: string }
  | { kind: 'hwpx'; fileId: string; version?: number };

export interface EditorAdapterProps {
  value: DocumentBodyValue;
  onChange?: (next: DocumentBodyValue) => void;
  readOnly?: boolean;
  templateKey?: string;
}
```

이 단계의 효과:

- 당장은 `RoosterAdapter`만 연결해도 기존 기능 유지 가능
- 나중에 `WebHwpAdapter`를 붙일 때 `MeetingsPage` 수정 범위를 최소화 가능

### Phase 2. Split Metadata And Document Body

현재는 회의록 데이터가 대략 아래에 가깝다.

```json
{
  "id": 123,
  "title": "3월 16일 월요일 기안",
  "type": "STAFF_MEETING",
  "status": "작성 중",
  "content": "<div>...</div>"
}
```

전환 후 목표 모델:

```json
{
  "id": "meeting-123",
  "title": "3월 16일 월요일 기안",
  "type": "STAFF_MEETING",
  "status": "작성 중",
  "document": {
    "engine": "webhwp",
    "fileId": "doc_abc123",
    "fileName": "meeting-123.hwpx",
    "mimeType": "application/hancom-hwpx",
    "version": 3,
    "updatedAt": "2026-03-26T10:00:00.000Z"
  }
}
```

설계 원칙:

- 메타데이터는 DB/JSON에 저장
- 문서 본문은 파일 또는 별도 문서 저장소에 저장
- 서버 응답에는 본문 전체 대신 문서 참조 정보만 내려준다

이유:

- HTML 문자열 방식은 WebHwp 문서 포맷과 맞지 않는다
- 버전 관리, 다운로드, 미리보기, 인쇄 분리가 쉬워진다

### Phase 3. Add Document APIs

기존 `/api/meetings` CRUD는 유지하되, 문서 관련 API를 분리한다.

권장 API 초안:

- `POST /api/documents`
  - 새 문서 레코드 생성
- `POST /api/documents/:id/upload`
  - 편집기 결과 파일 업로드
- `GET /api/documents/:id`
  - 문서 메타데이터 조회
- `GET /api/documents/:id/download`
  - 원본 문서 다운로드
- `POST /api/documents/:id/clone`
  - 템플릿 또는 기존 문서 복제
- `POST /api/documents/:id/render-preview`
  - 필요 시 PDF 또는 HTML 미리보기 생성

회의록 API 변경 방향:

- `POST /api/meetings`는 회의 메타데이터 + `documentId`를 받도록 변경
- `PATCH /api/meetings/:id`는 제목, 상태, 작성자 같은 메타데이터만 수정
- 본문 저장은 `/api/documents/:id/upload`로 분리

### Phase 4. Introduce WebHwp Adapter

이 단계에서 실제 한컴 API를 연결한다.

`WebHwpAdapter` 책임:

- WebHwp 컨테이너 초기화
- 신규 문서 열기 또는 템플릿 로드
- 문서 저장 요청
- 읽기 전용 모드 전환
- 필드 자동 채우기
- 인쇄/다운로드/내보내기 기능 래핑

어댑터 내부에 감춰야 할 세부사항:

- WebHwp 스크립트 로딩
- 인스턴스 생성/해제
- 한컴 API 호출 방식
- 문서 저장 결과를 앱 표준 모델로 변환하는 로직

중요:

- `MeetingsPage.jsx`는 WebHwp API 세부 메서드를 직접 몰라야 한다.
- 페이지는 `load`, `save`, `setReadOnly`, `insertTemplateFields` 같은 추상 동작만 호출해야 한다.

### Phase 5. Template-Based Authoring

현재 `initialTemplate`은 HTML 문자열이다.

WebHwp 전환 후에는 아래 구조로 바꾼다.

- `meeting-template.hwpx`
- `approval-template.hwpx`
- `program-template.hwpx`

자동 입력할 필드 예시:

- 회의명
- 일자
- 작성자
- 부서
- 시작/종료 시간
- 결재자명

추천 방식:

- 템플릿 문서는 서버 보관
- 회의 생성 시 템플릿을 복제해서 새 문서를 만든다
- 메타데이터 변경 시 문서 필드를 동기화한다

### Phase 6. Preview, Print, Versioning

WebHwp 도입 시 같이 얻기 쉬운 기능:

- 원본 문서 다운로드
- 인쇄용 출력
- 버전 번호 관리
- 마지막 저장자/저장 시각 기록

권장 메타데이터:

```json
{
  "version": 5,
  "lastSavedBy": "admin",
  "lastSavedAt": "2026-03-26T10:10:00.000Z"
}
```

## Architecture Proposal

### Frontend

- `MeetingsPage`
  - 목록, 메타데이터, 저장 버튼, 상태 관리
- `MeetingDocumentPanel`
  - 현재 문서 로드/저장 흐름 담당
- `EditorAdapter`
  - 공통 인터페이스
- `RoosterAdapter`
  - 기존 HTML 편집기 유지
- `WebHwpAdapter`
  - 향후 한컴 편집기 구현

### Backend

- `meeting` 도메인
  - 제목, 상태, 작성자, 문서 연결 정보 저장
- `document` 도메인 신설
  - 파일 저장, 버전 관리, 다운로드 처리
- 저장소
  - 1차: 로컬 디스크 `server/storage/documents`
  - 2차: S3 또는 NAS 같은 외부 스토리지 고려 가능

### Data Model

회의록과 문서를 분리한다.

```ts
type MeetingRecord = {
  id: string;
  title: string;
  type: 'STAFF_MEETING' | 'LOG';
  status: string;
  date: string;
  author: string;
  dept?: string;
  documentId?: string;
};

type DocumentRecord = {
  id: string;
  ownerType: 'meeting';
  ownerId: string;
  engine: 'rooster' | 'webhwp';
  storageType: 'inline' | 'file';
  html?: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
```

## Migration Path

기존 데이터를 버리지 않고 옮기는 전략이 필요하다.

### Step A. Dual Model Support

일정 기간 동안 서버가 아래 둘 다 읽을 수 있게 한다.

- 구형: `meeting.content` HTML
- 신형: `meeting.documentId` 참조

서버 응답 규칙:

- `documentId`가 있으면 신형 문서 사용
- 없으면 `content`를 읽어 `RoosterAdapter`로 표시

### Step B. Lazy Migration

기존 회의록을 일괄 변환하지 않고, 문서를 열거나 저장할 때 점진적으로 옮긴다.

예시:

1. 기존 HTML 회의록을 연다
2. 사용자가 "한글 문서로 전환"을 누른다
3. 서버가 새 문서 레코드와 파일을 만든다
4. 기존 `content`는 백업 필드로 남기고 `documentId`를 연결한다

### Step C. Final Cleanup

전환 완료 후:

- 새 문서는 더 이상 `content`에 저장하지 않는다
- 구형 HTML 편집기는 읽기 전용 fallback으로만 남긴다
- 충분한 검증 후 `RoosterJS` 의존성 제거를 검토한다

## Risks

### Product Risk

- 라이선스 비용과 운영 방식이 예상보다 클 수 있다
- 개발 환경과 운영 환경 정책이 다를 수 있다

### Technical Risk

- 현재 HTML 기반 데이터와 WebHwp 포맷 간 직접 변환 품질이 낮을 수 있다
- 브라우저 내 저장 이벤트와 서버 업로드 타이밍을 다시 설계해야 한다
- 인쇄/미리보기 방식이 기존 `window.print()`와 달라질 수 있다

### UX Risk

- 기존 툴바/사이드바 조작 흐름이 바뀐다
- 메타데이터 수정과 문서 내부 필드 값이 어긋날 수 있다

## What We Can Do Now Without License

라이선스 확보 전에도 아래 작업은 바로 진행 가능하다.

1. 회의록 화면을 `EditorAdapter` 구조로 리팩터링
2. 서버에 `document` 도메인과 파일 저장 API 초안 추가
3. `meeting.content`와 `meeting.documentId`를 함께 처리하는 호환 레이어 구현
4. HTML 템플릿을 `templateKey` 기반 구조로 정리
5. 향후 `WebHwpAdapter`가 들어갈 자리와 인터페이스를 고정

## Recommended Next Implementation

실행 우선순위는 아래 순서가 가장 안전하다.

1. `MeetingsPage`에서 `RoosterApp` 직접 참조 제거
2. `EditorAdapter` 인터페이스 도입
3. `DocumentRecord` 저장 구조 추가
4. `/api/documents` 계열 API 추가
5. 기존 회의록 저장을 `content` + `documentId` 겸용으로 변경
6. 이후 라이선스 확보 시 `WebHwpAdapter` 구현

## Decision Summary

이 프로젝트에서 `웹한글 기안기` 도입은 충분히 검토할 가치가 있다.

다만 바로 붙이는 방식보다 아래 결론으로 진행하는 것이 맞다.

- 지금 당장은 `RoosterJS` 제거가 아니라 "교체 가능한 구조"를 먼저 만든다
- 저장 구조를 HTML 문자열 중심에서 문서 참조 중심으로 바꾼다
- 회의록 화면만 먼저 전환 대상으로 잡는다
- 라이선스 확보 전에는 어댑터/서버/API/데이터 모델까지 선행 정비한다

이렇게 하면 라이선스를 확보한 뒤 실제 WebHwp 연동 작업은 `WebHwpAdapter`와 문서 저장 파이프라인 구현에 집중할 수 있다.
