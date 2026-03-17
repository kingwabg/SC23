# SC23

## Run
1. `npm install`
2. `npm run dev:api`
3. `npm run dev`

## Auth API
- 기본 주소: `http://localhost:5050`
- 로그인 엔드포인트: `POST /api/auth/login`
- 토큰 재발급: `POST /api/auth/refresh`
- 로그아웃: `POST /api/auth/logout`
- 사용자 조회: `GET /api/auth/me`
- 사용자 DB 파일: `server/db/auth-db.json`
- refresh 세션 파일: `server/db/refresh-sessions.json`
- 관리자 API
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/:id/permissions`
  - `PATCH /api/admin/users/:id/password`
  - `PATCH /api/admin/users/:id/active`
  - `GET /api/admin/role-permissions/non-staff`
  - `PUT /api/admin/role-permissions/non-staff`
- 비밀번호 저장 방식: `bcryptjs` 해시(`passwordHash`)
- 기본 개발 계정(환경변수 미설정 시)
  - 관리자: `admin / admin777`
  - 일반종사자: `staff01 / staff777`

## Environment Variables (Optional)
- `AUTH_API_PORT` (default: `5050`)
- `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- `JWT_ACCESS_SECRET` (default: `dev_access_secret_change_me`)
- `JWT_REFRESH_SECRET` (default: `dev_refresh_secret_change_me`)
- `JWT_ACCESS_EXPIRES_IN` (default: `15m`)
- `JWT_REFRESH_EXPIRES_IN` (default: `7d`)
- `ADMIN_ID`, `ADMIN_PASSWORD`
- `STAFF_ID`, `STAFF_PASSWORD`
- `DATABASE_URL`
- `POSTGRES_SSL` (`true`면 SSL 연결)
- `PG_STATE_TABLE` (default: `app_state`)

## PostgreSQL Mode
환경변수 `DATABASE_URL` 이 설정되면 API 서버는 파일 JSON 대신 PostgreSQL을 기본 저장소로 사용합니다.

1. PostgreSQL에 [postgres-schema.sql](/C:/Users/juna.DESKTOP-PPGTQQM/Documents/Playground/SC23/server/db/postgres-schema.sql) 실행
2. `DATABASE_URL` 설정
3. `npm run dev:api`
4. 연결 테스트: `npm run test:db`

특징:
- 기존 JSON DB 파일을 유지한 채 시작 가능
- PostgreSQL 테이블이 비어 있으면 현재 JSON 데이터를 최초 1회 시드
- `DATABASE_URL` 이 없으면 기존 JSON 파일 저장 방식으로 자동 fallback
