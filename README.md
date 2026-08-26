# Reminder

React/Vite 프론트엔드, Cloudflare Worker API, Cloudflare D1을 하나의 Worker로 배포하는 학급 알림 서비스입니다.

## 배포 구조

```text
src/                         React UI
worker/index.js              Cloudflare Worker API
migrations/0001_initial.sql  D1 초기 스키마
dist/                        Vite 빌드 결과(커밋 제외)
wrangler.jsonc               Worker + Static Assets + D1 설정
```

Worker가 `/api/*`를 처리하고 나머지는 `dist`의 정적 자산으로 제공합니다. 존재하지 않는 프론트엔드 URL에는 SPA fallback이 적용됩니다.

## 최초 설정

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

### 비밀값

로컬에서는 `.dev.vars.example`을 `.dev.vars`로 복사합니다.

```dotenv
SESSION_SECRET=충분히_긴_무작위_문자열
NEIS_API_KEY=나이스_API_인증키
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

## 명령어

```bash
npm run build
npm run dev
npm run deploy
npm run db:migrate:local
npm run db:migrate:remote
```
