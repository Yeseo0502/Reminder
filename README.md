# Reminder

React/Vite 프론트엔드, Cloudflare Worker API, Cloudflare D1을 하나의 Worker로 배포하는 학급 알림 서비스입니다.

## 주요 기능

- 회원가입, 로그인, 로그아웃
- 학교·학년·반 정보로 학급 생성
- 초대 코드를 이용한 학급 참여
- 나이스 API 기반 조식·중식·석식 및 시간표 조회
- 일정 추가·수정·삭제와 오늘의 일정 연동
- 학급 공지와 준비물 등록
- 새로고침 후에도 D1에 저장된 데이터 유지

로그인하지 않은 사용자는 메인 화면의 빈 상태 UI를 볼 수 있지만 학급 데이터는 조회할 수 없습니다. 일정·공지·준비물 등 학급 기능을 선택하면 로그인 및 방 생성 화면이 표시됩니다.

## 배포 구조

```text
src/                         React UI
worker/index.js              Cloudflare Worker API
migrations/0001_initial.sql  D1 초기 스키마
dist/                        Vite 빌드 결과(커밋 제외)
wrangler.jsonc               Worker + Static Assets + D1 설정
```

Worker가 `/api/*`를 처리하고 나머지는 `dist`의 정적 자산으로 제공합니다. 존재하지 않는 프론트엔드 URL에는 SPA fallback이 적용됩니다.

## 로컬에서 실행하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 로컬 비밀값 설정

`.dev.vars.example`을 복사해 프로젝트 루트에 `.dev.vars`를 만듭니다.

```dotenv
SESSION_SECRET=충분히_긴_무작위_문자열
NEIS_API_KEY=나이스_API_인증키
```

`.env`와 `.dev.vars`는 Git에서 제외됩니다. 실제 키를 `.env.example`, `.dev.vars.example`, `README.md`, `wrangler.jsonc`에 입력하지 마세요.

### 3. 로컬 D1 초기화

처음 실행할 때 한 번 적용합니다.

```bash
npm run db:migrate:local
```

### 4. 개발 서버 실행

```bash
npm run dev
```

Wrangler가 출력하는 주소로 접속합니다. 기본 주소는 `http://localhost:8787`입니다. `npm run dev`는 프론트엔드를 빌드한 다음 Worker, 정적 자산, 로컬 D1을 함께 실행합니다.

## Cloudflare 최초 설정

```bash
npm install
npx wrangler login
npx wrangler d1 create reminder-db
```

마지막 명령이 출력한 `database_id`를 `wrangler.jsonc`의 `REPLACE_WITH_D1_DATABASE_ID` 대신 입력합니다.

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

운영 Secret은 다음 명령으로 등록합니다.

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put NEIS_API_KEY
```

`SESSION_SECRET`은 필수입니다. 비밀값을 `wrangler.jsonc`나 Git에 넣지 마세요.

## 로컬 개발과 배포

```bash
npm run dev
npm run deploy
```

`npm run dev`는 Vite를 빌드하고 Wrangler 로컬 Worker를 실행합니다. 프론트와 API가 동일 origin이므로 별도 CORS가 필요하지 않습니다.

새 migration이 생긴 경우 배포 전에 적용합니다.

```bash
npm run db:migrate:remote
npm run deploy
```

## GitHub → Cloudflare 자동 배포

1. Cloudflare Dashboard → **Workers & Pages** → **Create application**.
2. **Import a repository**에서 `Yeseo0502/Reminder`를 선택합니다.
3. Worker 이름은 `wrangler.jsonc`와 동일한 `reminder`, production branch는 `main`으로 설정합니다.
4. 빌드 설정:

| 항목 | 값 |
|---|---|
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy | `npx wrangler versions upload` |

5. **Settings → Bindings**에서 D1 binding `DB`가 `reminder-db`를 가리키는지 확인합니다.
6. **Settings → Variables & Secrets**에 `SESSION_SECRET`과 `NEIS_API_KEY`를 암호화 Secret으로 등록합니다.
7. 최초 배포 전 로컬 CLI에서 `npm run db:migrate:remote`를 한 번 실행합니다.

이후 `main`에 push하면 Workers Builds가 자동 배포합니다.

## D1 테이블

- `users`: 계정, PBKDF2 비밀번호 해시
- `classes`: 학교·학년·반·초대 코드
- `class_members`: 학급 구성원·역할
- `meals`, `timetables`: 기존 데이터 구조 호환
- `schedules`: 일정
- `notices`: 학급 공지
- `supplies`: 준비물

운영 환경은 SQLite 파일을 사용하지 않으며 모든 쿼리는 `env.DB` D1 binding으로 실행됩니다.

## 인증과 데이터 보호

- 비밀번호는 Web Crypto PBKDF2 해시로 저장하며 평문을 저장하지 않습니다.
- 로그인 성공 시 서명된 Bearer 토큰을 발급합니다.
- 로그아웃하면 브라우저의 토큰, 사용자 ID, 학급 ID를 제거합니다.
- 로그아웃 상태의 `/api/classes/*` 요청은 `401`로 차단됩니다.
- 사용자가 속하지 않은 학급 데이터는 `403`으로 차단됩니다.
- 프론트와 API는 동일한 Worker 주소를 사용하므로 API 주소를 localhost로 고정하지 않습니다.

## 문제 해결

### 변경 내용이 화면에 반영되지 않을 때

실행 중인 서버를 `Ctrl+C`로 종료한 다음 다시 실행합니다.

```bash
npm run dev
```

### 데이터베이스 테이블이 없다는 오류가 날 때

```bash
npm run db:migrate:local
```

### 급식 또는 시간표가 표시되지 않을 때

`.dev.vars`의 `NEIS_API_KEY`와 학급의 학교·학년·반 정보를 확인한 뒤 서버를 재시작합니다. 나이스에 해당 날짜의 데이터가 등록되지 않은 경우에는 빈 상태로 표시됩니다.

### 로그아웃했는데 이전 학급 데이터가 보일 때

최신 코드를 받은 뒤 서버를 재시작하고 브라우저를 새로고침합니다. 로그아웃 상태에서는 학급 API가 데이터를 반환하지 않습니다.

## 명령어

```bash
npm run build
npm run dev
npm run deploy
npm run db:migrate:local
npm run db:migrate:remote
```
