# 미알림 (MiAlrim) — 홈 화면 (`home.md`)

> 목적: 이 문서는 AI(Claude Code 등)가 첨부된 디자인 시안을 보고 **동일한 레이아웃**으로 홈 화면을 구현하되, 화면에 보이는 텍스트를 하드코딩하지 않고 **API/DB에서 실제 데이터를 불러오는 구조**로 만들도록 안내하는 스펙 문서입니다.
> 서비스 요약: 로그인 → 학교/학급 선택 → 학급 페이지 생성 → 인원 초대. 생성자는 자동으로 "회장" 권한을 가지며 "부회장" 권한을 다른 사람에게 부여 가능.

``` 언어
프론트 : React
백엔드 : Node.js
DBP : SQLite
```
---

## 0. 전체 레이아웃 구조

```
┌─────────────┬─────────────────────────────────────────────┐
│  Sidebar    │  Header: [3학년 4반 ▾]         [🔔 알림] [프로필] │
│  - 로고/앱명  ├─────────────────────────────────────────────┤
│  - 홈        │  ┌──────────┬──────────┬──────────┬────────┐ │
│  - 멤버      │  │오늘의 급식 │오늘 시간표 │오늘 일정  │담임&회장│ │
|  - 추가      |  |           |          |          |          |  |
│  - 설정      │  │(API)     │(API)     │(DB)      │공지(DB)│ │
│              │  └──────────┴──────────┴──────────┴────────┘ │
│  권한 안내   │  ┌────────────────────────┬────────────────┐ │
│  박스        │  │ 일정/캘린더 (DB)         │               │ │
│              │  │                          │ 준비물안내(DB)  │ │
│              │  └────────────────────────┴────────────────┘ │
└─────────────┴─────────────────────────────────────────────┘
```

- 좌측 사이드바: 고정폭, 상단 로고 + 메뉴(홈/멤버/설정), 하단에 "권한 안내" 카드 고정
- 헤더: 학급 선택 드롭다운(사용자가 여러 학급에 소속될 수 있음), 알림 벨(뱃지 카운트), 프로필
- 본문: 카드형 그리드. 반응형 시 4열 → 2열 → 1열로 축소

---

## 1. 데이터 소스 분류 (중요)

| 카드 | 데이터 출처 | 갱신 주체 |
|---|---|---|
| 오늘의 급식 | **NEIS Open API** (외부, 실시간 fetch) | 자동 (수정 불가) |
| 오늘 시간표 | **NEIS Open API** (외부, 실시간 fetch) | 자동 (수정 불가, 단 담임이 임시 보강/변경 시 DB 오버라이드 허용) |
| 오늘 일정 | 내부 DB (`schedules` 중 오늘 날짜) | 회장/부회장/선생님 |
| 담임 & 회장 공지 | 내부 DB (`notices`, category=`teacher`/`president`) | 담임: teacher 글, 회장/부회장: president 글 |
| 일정 / 캘린더 | 내부 DB (`schedules`) | 회장/부회장/선생님 |
| 학급 공지 | 내부 DB (`notices`, category=`class`) | 회장/부회장/선생님 |
| 준비물 안내 | 내부 DB (`supplies`) | 회장/부회장/선생님 |

> 화면의 텍스트는 전부 **placeholder**이며, 실제 구현체에서는 아래 API 명세대로 fetch한 값을 바인딩해야 함.

---

## 2. 외부 API — NEIS 교육정보 개방포털 (급식 · 시간표)

- 발급: https://open.neis.go.kr (Open API 인증키 신청)
- 공통 필수 파라미터
  - `KEY`: 인증키
  - `Type`: `json`
  - `ATPT_OFCDC_SC_CODE`: 시도교육청코드 (예: 서울 `B10`)
  - `SD_SCHUL_CODE`: 행정표준코드 (학교마다 고유값, 학교 검색 API로 사전 조회 필요)

### 2-1. 급식 조회 — `mealServiceDietInfo`
```
GET https://open.neis.go.kr/hub/mealServiceDietInfo
  ?KEY={API_KEY}
  &Type=json
  &ATPT_OFCDC_SC_CODE={시도교육청코드}
  &SD_SCHUL_CODE={학교코드}
  &MLSV_YMD={YYYYMMDD}   // 오늘 날짜
```
- 응답 주요 필드: `MMEAL_SC_NM`(식사구분: 조식/중식/석식), `DDISH_NM`(메뉴, `<br/>` 구분자 포함 문자열 → 파싱해서 리스트로 변환), `CAL_INFO`(칼로리)
- UI 매핑: "오늘의 급식" 카드의 불릿 리스트 = `DDISH_NM`을 `<br/>` 기준 split한 배열
- 하단 문구("맛있게 식사하세요!")는 정적 텍스트로 유지 가능(데이터 아님)

### 2-2. 시간표 조회 — 학교급별 API
- 초등: `elsTimetable`, 중학교: `misTimetable`, 고등학교: `hisTimetable`
```
GET https://open.neis.go.kr/hub/hisTimetable
  ?KEY={API_KEY}
  &Type=json
  &ATPT_OFCDC_SC_CODE={시도교육청코드}
  &SD_SCHUL_CODE={학교코드}
  &GRADE={학년}
  &CLASS_NM={반}
  &ALL_TI_YMD={YYYYMMDD}   // 오늘 날짜
```
- 응답 주요 필드: `PERIO`(교시), `ITRT_CNTNT`(과목명)
- UI 매핑: "오늘 시간표" 표의 각 행 = `PERIO` 오름차순 정렬 후 `{교시}교시 | {ITRT_CNTNT}`
- 하단 안내문("3교시는 양식입니다!") 같은 자유 텍스트는 **담임 오버라이드 메모**(DB, `timetable_notes` 테이블, 특정 교시에 대한 1줄 메모)로 구현 → 없으면 카드 하단 숨김

> ⚠️ 학교코드/시도교육청코드는 학급 페이지 생성 시(학교 선택 단계) 저장해두고, 이후 매 요청마다 재사용.
> ⚠️ NEIS API는 CORS 미지원 → 반드시 백엔드 서버에서 프록시 호출 후 프론트에 내려줄 것.

---

## 3. 내부 DB 기반 카드 명세

### 3-1. 오늘 일정 (홈 상단 4번째 카드 중 "오늘 일정")
- 소스: `schedules` 테이블 where `date = 오늘`
- 데이터 없을 때: 카드 중앙에 빈 캘린더 아이콘 + "오늘은 등록된 일정이 없어요." 문구 (스크린샷과 동일)
- 데이터 있을 때: 리스트로 표시 (제목, 시간)

### 3-2. 담임 & 회장 공지
- 소스: `notices` where `category IN ('teacher','president')` order by `created_at desc` limit 2~3
- 뱃지: `teacher` → "담임" (보라 배지), `president` → "회장" (빨강 배지)
- 각 항목: 배지, 제목, 날짜(`MM.DD`), 본문 1~2줄 미리보기
- "더보기" 클릭 → 공지 전체 목록 페이지 (`/notices?category=teacher,president`)
- **작성 권한**: `teacher` 카테고리는 role=`teacher`만 작성 가능, `president` 카테고리는 role=`president`/`vice_president`만 작성 가능 (서버에서 role 검증)

### 3-3. 일정 / 캘린더 (하단 좌측, 넓은 카드)
- 상단: 요일 스트립 (일~토), 현재 선택 날짜 하이라이트, `<` `>` 로 주 단위 이동
- 하단: 리스트형 — 다가오는 일정들 (`schedules` where `date >= today` order by date asc limit 4)
  - 각 항목 앞 점 색상은 일정 유형(`type`)에 따라 다름 (예: 프로젝트=보라, 시험=파랑, 체험학습=주황/빨강 등 → `schedule_types` 매핑 테이블)
- "+ 일정 추가" 버튼: `POST /schedules` 모달 오픈, **회장/부회장/선생님만 노출**

### 3-4. 학급 공지 (하단 우측 상단)
- 소스: `notices` where `category='class'` order by `created_at desc` limit 4
- 각 항목: 제목 + 날짜(`MM.DD`), 클릭 시 상세

### 3-5. 준비물 안내 (하단 우측 하단)
- 소스: `supplies` where `date = 다음 등교일` (또는 관리자가 지정한 대상 날짜)
- 표시: "다음 주 월요일 (8/18)" 같은 날짜 헤더 + 불릿 리스트
- **작성/수정 권한**: 회장/부회장/선생님

---

## 4. 권한 (Role) 모델

| Role | 설명 | 권한 |
|---|---|---|
| `teacher` (선생님) | 담임 | 모든 관리 및 수정 가능 (전 카테고리 CRUD, 멤버 관리) |
| `president` (회장) | 학급 페이지 최초 생성자 | 공지 작성/수정, 일정 추가, 준비물 등록, 부회장 임명 |
| `vice_president` (부회장) | 회장이 임명 | president와 동일한 콘텐츠 CRUD 권한 (멤버 초대/강퇴 등 관리 권한은 제외 가능) |
| `member` (일반 학생) | 나머지 학생 | 조회만 가능(읽기 전용) |

- 사이드바 하단 "권한 안내" 카드는 **로그인한 사용자의 role과 무관하게 항상 두 항목(선생님 / 회장·부회장)의 설명을 고정 노출** (스크린샷 기준). 필요 시 내 role 뱃지를 강조 표시하도록 확장 가능.
- 로그인: 학교 이메일(`@mirim.hs.kr`) 도메인 검증 필수 → 이 도메인이 아니면 가입/로그인 차단.
- 학급 페이지 생성 플로우: 로그인 → 학교 검색(NEIS 학교코드 검색 API, `schoolInfo`) → 학년/반 선택 → 페이지 생성 → 생성자는 `president`로 자동 등록 → 초대 링크/코드로 멤버 초대.

---

## 5. 헤더

- `[3학년 4반 ▾]`: 사용자가 속한 학급 목록 드롭다운. 데이터: `GET /me/classes`
- 알림 벨: 안 읽은 알림 개수 뱃지 (`GET /notifications/unread-count`), 클릭 시 알림 리스트 드롭다운
- 프로필 아이콘: 클릭 시 `/settings/profile` 이동

---

## 6. 제안 API 엔드포인트 (내부 백엔드)

```
GET  /api/classes/:classId/meal?date=YYYY-MM-DD        # NEIS 프록시
GET  /api/classes/:classId/timetable?date=YYYY-MM-DD   # NEIS 프록시 + 담임 메모 병합
GET  /api/classes/:classId/schedules?from=&to=
POST /api/classes/:classId/schedules                   # role: president/vice/teacher
GET  /api/classes/:classId/notices?category=teacher,president,class&limit=
POST /api/classes/:classId/notices                     # category별 role 검증
GET  /api/classes/:classId/supplies?date=
POST /api/classes/:classId/supplies                    # role: president/vice/teacher
GET  /me/classes
GET  /notifications/unread-count
```

---

## 7. 다음 단계 (구현 우선순위 제안)

1. 로그인/도메인 검증 + 학급 페이지 생성 플로우
2. NEIS 프록시 API (급식/시간표) — 캐싱 필수 (하루 1회 갱신, 학교 특성상 자주 안 바뀜)
3. 공지/일정/준비물 CRUD + role 기반 권한 미들웨어
4. 홈 화면 카드 조립 (위 컴포넌트 단위로 분리 구현, 데이터 없는 empty state 필수 처리)