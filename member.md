# 미알림 (MiAlrim) — 멤버 화면 (`members.md`)

> 목적: 이 문서는 AI(Claude Code 등)가 첨부된 멤버 화면 디자인 시안을 참고하여 **홈 화면(`home.md`)과 동일한 디자인과 구조의 멤버 화면을 구현**하도록 안내하는 스펙 문서입니다.
>
> 멤버 정보는 화면에 하드코딩하지 않고 **Node.js 백엔드와 SQLite DB에서 실제 데이터를 가져오는 구조**로 구현합니다.
>
> **중요:** 멤버 기능에는 NEIS API를 사용하지 않습니다. 별도의 외부 API 키도 필요하지 않습니다.
>
> 기술 스택:
>
> ```text
> 프론트 : React
> 백엔드 : Node.js
> DB : SQLite
> ```

---

# 0. 전체 레이아웃

멤버 화면은 `home.md`에서 정의한 공통 레이아웃을 그대로 사용합니다.

```text
┌─────────────┬─────────────────────────────────────────────┐
│  Sidebar    │  Header: [3학년 4반 ▾]         [🔔 알림] [프로필] │
│  - 로고/앱명  ├─────────────────────────────────────────────┤
│  - 홈        │                                             │
│  - 멤버      │              멤버 목록                      │
│  - 설정      │                                             │
│              │  ┌───────────────────────────────────────┐  │
│  권한 안내   │  │ 멤버 목록                              │  │
│  박스        │  │ 이 학급에 참여하고 있는 학생들입니다. │  │
│              │  │                                       │  │
│              │  │ [🔍 학생 검색...]          [초대하기] │  │
│              │  │                                       │  │
│              │  │ 순번 이름 이메일 상태 역할            │  │
│              │  │ ────────────────────────────────────  │  │
│              │  │ 1  김태환 ...   수락됨  회장           │  │
│              │  │ 2  박예서 ...   수락됨  부회장         │  │
│              │  │ 3  이소영 ...   대기중  멤버           │  │
│              │  └───────────────────────────────────────┘  │
└─────────────┴─────────────────────────────────────────────┘
```

`home.md`에 이미 구현되어 있는 다음 요소는 재사용합니다.

* Sidebar
* Header
* 학급 선택 드롭다운
* 알림
* 프로필
* 권한 안내 카드
* 전체 페이지의 폰트
* 전체 페이지의 색상
* 버튼 스타일
* 카드 스타일

**새로운 Sidebar나 Header를 만들지 않습니다.**

---

# 1. 멤버 화면 진입

홈 화면의 Sidebar에 있는

**멤버**

메뉴를 클릭하면 멤버 화면이 표시되어야 합니다.

```text
홈
 └── 멤버 클릭
       ↓
멤버 화면
```

현재 선택된 학급의 `classId`를 기준으로 멤버를 조회합니다.

예:

```text
현재 선택된 학급
3학년 4반
      ↓
classId = 1
      ↓
GET /api/classes/1/members
```

사용자가 Header의 학급 선택 드롭다운에서 다른 학급을 선택하면 멤버 화면도 선택된 학급의 멤버로 변경되어야 합니다.

---

# 2. 멤버 화면 UI

첨부된 **멤버 목록 참고 이미지**를 주요 디자인 참고 자료로 사용합니다.

참고 이미지의 다음 요소를 적극적으로 참고합니다.

* 멤버 목록 카드
* 검색창
* 초대하기 버튼
* 프로필 이미지
* 상태 배지
* 역할 표시
* 페이지네이션
* 모달
* 보라색 포인트 컬러
* 둥근 모서리
* 부드러운 그림자
* 여백

단, 이미지의 디자인을 그대로 복사하지 말고 **MiAlrim의 기존 홈 화면 디자인과 통일**합니다.

---

# 3. 멤버 목록

화면 상단에는 다음을 표시합니다.

```text
멤버 목록

이 학급에 참여하고 있는 학생들입니다.
```

그 아래에 검색창과 초대하기 버튼을 배치합니다.

```text
[ 🔍 학생 검색...                         ] [초대하기]
```

멤버 목록은 다음 정보를 표시합니다.

| 항목  | 설명         |
| --- | ---------- |
| 순번  | 멤버 번호      |
| 프로필 | 학생 프로필 이미지 |
| 이름  | 학생 이름      |
| 이메일 | 학교 이메일     |
| 상태  | 초대 상태      |
| 역할  | 학급 역할      |

---

# 4. 멤버 데이터

멤버 정보는 **SQLite DB에서 가져옵니다.**

화면에 다음과 같은 데이터를 직접 하드코딩하지 않습니다.

```text
김태환
박예서
이소영
정수현
...
```

위와 같은 이름은 UI 테스트용 초기 데이터로만 사용할 수 있습니다.

실제 서비스에서는:

```text
SQLite
   ↓
Node.js API
   ↓
React
   ↓
멤버 목록
```

구조로 데이터를 가져옵니다.

---

# 5. 데이터베이스 구조

기존 `home.md`의 `users`, `classes`, `class_members` 구조와 호환되도록 구현합니다.

## users

```text
id
name
email
profile_image
created_at
```

## classes

```text
id
school_name
grade
class_number
created_by
created_at
```

## class_members

```text
id
class_id
user_id
role
status
invited_at
joined_at
created_at
```

필요한 경우 초대 기능을 별도로 관리하기 위해 `invitations` 테이블을 사용할 수 있습니다.

## invitations

```text
id
class_id
invited_email
invited_by
status
token
expires_at
created_at
```

기존 프로젝트에 이미 비슷한 테이블이 존재한다면 새로운 테이블을 만들지 말고 기존 구조를 재사용합니다.

---

# 6. Role

`home.md`에서 정의한 Role을 그대로 사용합니다.

```text
teacher
president
vice_president
member
```

화면 표시:

```text
teacher         → 선생님
president       → 회장
vice_president  → 부회장
member          → 멤버
```

**Role 이름을 새로 만들거나 기존 Role 이름을 변경하지 않습니다.**

---

# 7. 권한

`home.md`의 권한 정책을 그대로 사용합니다.

| Role           | 멤버 조회 | 검색 | 초대 | 역할 관리 | 삭제 |
| -------------- | ----: | -: | -: | ----: | -: |
| teacher        |     O |  O |  O |     O |  O |
| president      |     O |  O |  O |    O* | O* |
| vice_president |     O |  O |  X |     X |  X |
| member         |     O |  O |  X |     X |  X |

* 회장은 부회장 임명/해임 등 허용된 관리 기능만 수행할 수 있습니다.

### 중요

권한을 프론트엔드에서 버튼을 숨기는 것만으로 구현하지 않습니다.

**Node.js 백엔드에서도 반드시 Role을 검증합니다.**

---

# 8. 상태

멤버 상태는 다음 두 가지를 사용합니다.

```text
accepted
pending
```

화면에서는 다음과 같이 표시합니다.

```text
accepted → 초대 수락됨
pending  → 초대 대기 중
```

### 디자인

`accepted`

* 초록색 계열 배지

`pending`

* 노란색 계열 배지

---

# 9. 프로필

각 멤버의 프로필 이미지를 원형으로 표시합니다.

프로필 이미지가 없으면 기본 프로필 아이콘을 사용합니다.

```text
profile_image가 존재
→ 실제 이미지 표시

profile_image가 없음
→ 기본 프로필 이미지
```

---

# 10. 멤버 검색

검색창:

```text
학생 검색...
```

검색 대상:

* 이름
* 이메일

API:

```http
GET /api/classes/:classId/members?search=
```

예:

```http
GET /api/classes/1/members?search=김태환
```

검색어가 없으면 전체 멤버를 표시합니다.

검색 결과가 없으면:

```text
검색 결과가 없습니다.
```

를 표시합니다.

검색 기능은 실제로 동작해야 합니다.

---

# 11. 멤버 목록 API

```http
GET /api/classes/:classId/members
```

검색:

```http
GET /api/classes/:classId/members?search=김태환
```

응답 예시:

```json
{
  "members": [
    {
      "id": 1,
      "name": "김태환",
      "email": "kim.th@mirim.hs.kr",
      "profileImage": null,
      "role": "president",
      "status": "accepted"
    }
  ]
}
```

서버에서는 반드시 현재 로그인 사용자가 해당 `classId`의 멤버인지 확인합니다.

다른 학급의 `classId`를 임의로 입력해도 해당 학급의 멤버를 조회할 수 없어야 합니다.

---

# 12. 멤버 초대

멤버 목록 오른쪽 상단에 **초대하기** 버튼을 표시합니다.

초대하기 버튼은 다음 사용자에게 표시합니다.

```text
teacher
president
```

`vice_president`와 `member`에게는 표시하지 않습니다.

---

# 13. 초대 모달

초대하기를 클릭하면 모달을 표시합니다.

```text
┌─────────────────────────────┐
│ 학생 초대                    │
│                             │
│ 학교 이메일                 │
│ [                       ]   │
│                             │
│       [취소] [초대 보내기]   │
└─────────────────────────────┘
```

이메일 입력값을 확인합니다.

서비스 정책상 학교 이메일:

```text
@mirim.hs.kr
```

만 허용합니다.

잘못된 이메일:

```text
올바른 학교 이메일을 입력해주세요.
```

이미 멤버인 경우:

```text
이미 학급에 참여하고 있는 학생입니다.
```

이미 초대된 경우:

```text
이미 초대가 진행 중인 학생입니다.
```

---

# 14. 초대 API

```http
POST /api/classes/:classId/members/invite
```

Request:

```json
{
  "email": "student@mirim.hs.kr"
}
```

서버에서 다음을 검증합니다.

1. 로그인 여부
2. 해당 학급의 멤버인지
3. `teacher` 또는 `president`인지
4. 학교 이메일인지
5. 해당 사용자가 존재하는지
6. 이미 멤버인지
7. 이미 초대되어 있는지

모든 검증을 통과하면 `pending` 상태의 멤버 또는 초대 데이터를 생성합니다.

---

# 15. 초대 수락

초대를 받은 사용자가 초대를 수락하면 상태를 변경합니다.

```text
pending
   ↓
accepted
```

예시 API:

```http
POST /api/classes/invitations/:invitationId/accept
```

초대 수락은 초대를 받은 사용자 본인만 수행할 수 있도록 서버에서 검증합니다.

---

# 16. 부회장 임명

`president`는 다른 멤버를 `vice_president`로 임명할 수 있습니다.

멤버 상세 정보 또는 멤버 관리 메뉴에서:

```text
부회장으로 임명
```

기능을 제공합니다.

API:

```http
PATCH /api/classes/:classId/members/:memberId/role
```

Request:

```json
{
  "role": "vice_president"
}
```

서버에서는 반드시 로그인 사용자가 해당 학급의 `president`인지 확인합니다.

---

# 17. 부회장 해임

현재 부회장을 일반 멤버로 변경할 수 있습니다.

```http
PATCH /api/classes/:classId/members/:memberId/role
```

Request:

```json
{
  "role": "member"
}
```

회장만 수행할 수 있도록 서버에서 검증합니다.

---

# 18. 멤버 상세 정보

멤버를 클릭하면 간단한 상세 모달을 표시합니다.

```text
┌──────────────────────────────┐
│ 멤버 정보                     │
│                              │
│          👤                  │
│                              │
│          김태환               │
│     kim.th@mirim.hs.kr       │
│                              │
│     역할 : 회장               │
│     상태 : 초대 수락됨        │
│                              │
│                         [닫기]│
└──────────────────────────────┘
```

관리 권한이 있는 사용자에게만 필요한 관리 버튼을 추가합니다.

예:

```text
부회장으로 임명
부회장 해임
학급에서 내보내기
```

일반 `member`에게는 이러한 관리 버튼을 표시하지 않습니다.

---

# 19. 멤버 삭제

관리자가 멤버를 학급에서 내보낼 수 있도록 합니다.

API:

```http
DELETE /api/classes/:classId/members/:memberId
```

권한:

```text
teacher → 가능
president → 가능
vice_president → 불가능
member → 불가능
```

삭제 전 확인 모달:

```text
정말 이 학생을 학급에서 내보내시겠습니까?

[취소] [내보내기]
```

회장 본인을 일반 멤버 삭제 API를 통해 삭제하거나 회장 권한을 제거하지 못하도록 합니다.

---

# 20. 페이지네이션

멤버가 많아질 것을 고려하여 페이지네이션을 지원합니다.

```text
<   1   2   3   >
```

API:

```http
GET /api/classes/:classId/members?page=1&limit=10
```

응답:

```json
{
  "members": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

멤버가 10명 이하라면 페이지네이션을 숨길 수 있습니다.

---

# 21. Empty State

멤버 목록을 불러왔는데 표시할 멤버가 없는 경우:

```text
        👥

등록된 멤버가 없습니다.

학생을 초대해보세요.

       [학생 초대]
```

단, 학급 생성자는 자동으로 `president`가 되므로 일반적인 학급에서는 최소 한 명의 멤버가 존재합니다.

---

# 22. Loading State

API 데이터를 가져오는 동안 Skeleton UI 또는 로딩 표시를 사용합니다.

예:

```text
멤버 목록을 불러오는 중...
```

API 요청에 실패하면:

```text
멤버 목록을 불러오지 못했습니다.

[다시 시도]
```

를 표시합니다.

---

# 23. 데이터 보안

멤버 정보에는 학생 이름과 이메일이 포함되므로 접근 권한을 확인합니다.

반드시 다음을 적용합니다.

* 로그인하지 않은 사용자는 멤버 화면 접근 불가
* 해당 학급의 멤버만 멤버 목록 조회 가능
* 다른 학급의 `classId` 조회 차단
* 관리 API는 Node.js 서버에서 Role 검증
* 이메일은 `@mirim.hs.kr` 도메인 검증
* 역할 변경 대상이 실제 해당 학급의 멤버인지 서버에서 확인
* 삭제 대상이 실제 해당 학급의 멤버인지 서버에서 확인

---

# 24. API 키 관련

**멤버 기능에서는 NEIS 교육정보 Open API를 사용하지 않습니다.**

급식, 시간표, 학교 정보 검색 등은 `home.md`에서 정의한 NEIS API 기능이므로 해당 기능을 담당하는 코드에서 처리합니다.

멤버 기능의 데이터는 전부:

```text
React
  ↓
Node.js API
  ↓
SQLite
```

구조로 처리합니다.

따라서 멤버 기능을 구현하기 위해 **추가적인 외부 API 키를 발급받지 않습니다.**

---

# 25. React 컴포넌트 구조

기존 프로젝트의 구조가 있다면 기존 구조를 우선 사용합니다.

구조가 정해져 있지 않다면 다음과 같이 분리할 수 있습니다.

```text
src/
├── pages/
│   └── MembersPage.jsx
│
├── components/
│   └── members/
│       ├── MemberList.jsx
│       ├── MemberRow.jsx
│       ├── MemberSearch.jsx
│       ├── InviteMemberModal.jsx
│       ├── MemberDetailModal.jsx
│       ├── StatusBadge.jsx
│       ├── RoleBadge.jsx
│       └── RemoveMemberModal.jsx
│
└── api/
    └── members.js
```

중복 컴포넌트가 이미 존재한다면 새로 만들지 말고 기존 컴포넌트를 재사용합니다.

---

# 26. 멤버 화면과 홈 화면의 연결

홈 화면은 다른 팀원이 개발합니다.

따라서 다음을 절대로 임의로 변경하지 않습니다.

* 홈 화면 카드
* 급식
* 시간표
* 오늘 일정
* 담임 & 회장 공지
* 학급 공지
* 준비물
* Sidebar 디자인
* Header 디자인

홈 화면의 Sidebar에 있는:

```text
멤버
```

버튼을 통해 멤버 화면으로 이동하도록 연결합니다.

---

# 27. 학급 선택과 연동

홈 화면의 Header에는:

```text
[3학년 4반 ▾]
```

학급 선택 기능이 있습니다.

멤버 화면에서도 동일한 현재 선택 학급을 사용합니다.

학급 변경:

```text
3학년 4반
     ↓
2학년 3반
     ↓
멤버 화면도 2학년 3반의 멤버 목록으로 변경
```

따라서 멤버 데이터에 학급 정보를 하드코딩하지 않습니다.

---

# 28. 디자인 통일

멤버 화면은 첨부된 참고 이미지의 디자인을 참고합니다.

하지만 최종 디자인 기준은 **MiAlrim의 `home.md` 디자인**입니다.

다음 요소를 모든 화면에서 통일합니다.

```text
폰트
색상
버튼
카드
아이콘
border-radius
shadow
spacing
Sidebar
Header
```

멤버 화면만 다른 서비스처럼 보이지 않도록 합니다.

---

# 29. 반응형

PC에서는 참고 이미지처럼 테이블 형태를 사용합니다.

태블릿에서는 필요한 컬럼을 축소합니다.

모바일에서는 멤버 정보를 카드 형태로 변경할 수 있습니다.

```text
PC
→ 멤버 테이블

Tablet
→ 축소된 테이블

Mobile
→ 멤버 카드
```

긴 이메일 때문에 화면이 깨지지 않도록 처리합니다.

---

# 30. 최종 API 목록

멤버 기능에 필요한 API:

```http
GET    /api/classes/:classId/members
GET    /api/classes/:classId/members?search=
POST   /api/classes/:classId/members/invite
PATCH  /api/classes/:classId/members/:memberId/role
DELETE /api/classes/:classId/members/:memberId

POST   /api/classes/invitations/:invitationId/accept
```

필요한 경우 기존 프로젝트의 API 구조에 맞게 경로를 조정합니다.

이미 동일한 API가 존재한다면 중복 생성하지 않습니다.

---

# 31. 구현 우선순위

다음 순서로 구현합니다.

1. 기존 Sidebar/Header 재사용
2. 멤버 화면 연결
3. 현재 선택된 `classId` 연동
4. SQLite 멤버 데이터 조회
5. Node.js 멤버 조회 API
6. 멤버 목록 표시
7. 검색 기능
8. Role 표시
9. Status 표시
10. 권한에 따른 UI 표시
11. 멤버 초대
12. 초대 상태 관리
13. 부회장 임명/해임
14. 멤버 상세 정보
15. 멤버 삭제
16. 페이지네이션
17. Loading / Error / Empty State
18. 반응형 UI
19. 서버 측 권한 검증

---

# 32. 최종 목표

최종적으로 다음 구조가 완성되어야 합니다.

```text
미알림 홈
   │
   ├── 홈
   │
   ├── 멤버
   │      ↓
   │   멤버 목록
   │      ├── 학생 검색
   │      ├── 멤버 정보 확인
   │      ├── 초대하기
   │      ├── 역할 관리
   │      └── 멤버 관리
   │
   └── 설정
```

멤버 화면의 실제 데이터 흐름:

```text
SQLite
   ↓
Node.js / Express API
   ↓
React
   ↓
멤버 화면
```

예시 학생 데이터는 디자인 확인용으로만 사용하고, 최종 구현에서는 **SQLite의 실제 데이터를 API를 통해 불러와 화면에 표시**합니다.

또한 `home.md`에서 정의한 인증, 학급 선택, Role 체계, Sidebar, Header를 그대로 재사용합니다.

**NEIS API는 멤버 기능에서 사용하지 않으며, 추가적인 외부 API 키도 발급받지 않습니다.**

첨부된 멤버 화면 참고 이미지를 기반으로 UI를 구현하되, 최종적으로는 홈 화면과 완전히 통일된 **하나의 MiAlrim 학급 관리 서비스**처럼 보이도록 구현합니다.
