# Next.js 디렉터리 · 라우트 설계

Cross-SLC Connect 웹사이트 · App Router 기준

---

## 1. 디렉터리 구조

```
app/
├── layout.tsx                      루트 레이아웃. PWA manifest, 폰트, 테마
├── globals.css
│
├── (public)/                       비로그인 접근 가능
│   ├── layout.tsx
│   ├── page.tsx                    랜딩
│   ├── login/page.tsx              구글 로그인 버튼 하나
│   ├── onboarding/page.tsx         학번 결속. 최초 1회만.
│   ├── invite/[token]/page.tsx     C-13 초대 링크 미리보기
│   └── mbti/
│       ├── page.tsx                F-02 검사 진행
│       └── result/[id]/page.tsx    F-03·F-04 결과와 공유
│
├── (app)/                          로그인 + 결속 완료 필수
│   ├── layout.tsx                  세션 검사, 미결속 시 /onboarding 이동
│   ├── connects/
│   │   ├── page.tsx                B-01~B-10 씨앗판
│   │   ├── new/page.tsx            C-01~C-06 개설 폼
│   │   └── [id]/
│   │       ├── page.tsx            B-02 상세, D-01·D-02 신청
│   │       ├── edit/page.tsx       C-09 수정 후 재신청
│   │       ├── manage/page.tsx     팀장 전용. 지원 승인·거절, 조기 마감
│   │       └── certify/page.tsx    G-01·G-02 인증 제출
│   ├── recommend/page.tsx          E-01~E-08
│   ├── ranking/page.tsx            G-11·G-12·G-13
│   ├── games/[key]/page.tsx        F-07·F-08
│   └── me/
│       ├── page.tsx                D-11 신청 현황·배정 결과
│       └── profile/page.tsx        A-05·A-06
│
├── (admin)/                        role = 'admin' 필수
│   ├── layout.tsx                  이중 검사. 미들웨어와 별개로 서버에서 재확인.
│   └── admin/
│       ├── page.tsx                대시보드. "오늘 처리할 것" 다섯 가지.
│       ├── review/page.tsx         G-05 인증 검수 ★ 최대 부하
│       ├── confirm/page.tsx        D-05·D-16 일괄 확정 ★ 되돌릴 수 없음
│       ├── connects/
│       │   ├── page.tsx            J-01 커넥트 관리
│       │   └── pending/page.tsx    J-05 정성 개설 확인·반려
│       ├── members/page.tsx        J-02 인원 관리, J-06 유연 증원 승인
│       ├── scores/page.tsx         J-03 점수 관리·수동 정정
│       ├── notify/page.tsx         J-04 공지·알림 발송
│       └── settings/page.tsx       J-07 랭킹 모드, G-07 배율 구간, 시즌 일정
│
└── api/                            실제 HTTP 엔드포인트가 필요한 것만
    ├── auth/[...nextauth]/route.ts 구글 OAuth 콜백
    ├── uploads/presign/route.ts    S3 presigned URL 발급
    ├── push/subscribe/route.ts     H-01 구독 등록·해제
    ├── recommend/route.ts          E-02 LLM 호출. 스트리밍.
    ├── games/score/route.ts        F-09 점수 서버 검증
    └── webhooks/email/route.ts     반송 처리

lib/
├── db/
│   ├── client.ts                   커넥션 풀
│   ├── schema.ts                   테이블 타입 정의
│   └── queries/                    도메인별 쿼리 모음
│       ├── connects.ts
│       ├── applications.ts
│       ├── certifications.ts
│       └── scores.ts
├── auth/
│   ├── google.ts                   OAuth. hd 클레임 검사 포함.
│   ├── session.ts                  쿠키 발급·검증
│   └── binding.ts                  학번 결속. 트랜잭션과 시도 제한.
├── scoring/                        ★ DB를 모르는 순수 함수
│   ├── rules.ts                    G-06 배점 규칙 상수
│   ├── calculate.ts                인증 1건 → score_events 목록
│   ├── cross.ts                    G-02 크로스 배분
│   └── week.ts                     G-18 주차 귀속 판정
├── storage/s3.ts                   presign 발급, 키 생성 규칙
├── notify/
│   ├── push.ts                     web-push
│   ├── email.ts                    발송 도메인
│   └── templates.ts
└── recommend/
    ├── prompt.ts                   커넥트 설명문 조립
    └── fallback.ts                 E-08 키워드 단순 일치

components/
├── ui/                             버튼, 입력, 모달 등 기본 요소
├── connect/                        카드, 상태 배지, 인원 그래프
├── filters/                        B-05·B-06 필터·정렬 바
└── admin/                          검수 뷰어 등 관리자 전용

actions/                            Server Actions
├── connects.ts                     개설, 수정, 조기 마감
├── applications.ts                 신청, 승인, 거절, 취소
├── certifications.ts               제출, 검수 승인·반려
├── memberships.ts                  이탈(팀장 불가), 유연 증원
└── admin.ts                        일괄 확정, 랭킹 모드 전환

middleware.ts                       세션 존재 여부만 확인. 권한은 레이아웃에서.
```

---

## 2. 라우트별 요구사항 대응

### 공개 영역

| 경로 | 기능 | 비고 |
| --- | --- | --- |
| `/login` | A-01 | 구글 버튼 하나. `hd` 검사는 서버에서. |
| `/onboarding` | A-01·A-02 | 결속 실패 응답은 "확인할 수 없습니다" 하나로 통일 |
| `/invite/[token]` | C-13·C-14 | 로그인 후 `callbackUrl`로 원래 커넥트 복귀 |
| `/mbti` | F-02~F-06 | 비로그인 응시 허용. 결과에서 이동할 때 로그인 유도. |

**F-06 연결 흐름.** 결과 화면의 씨앗판·추천 버튼을 비로그인 상태에서 누르면 `/login?callbackUrl=...`로 보낸다. 로그인 후 원래 가려던 곳으로 돌아오고, 그 시점에 응시 결과를 계정에 연결한다(`mbti_results.user_id`와 `users.mbti_type`).

**C-14 초대 링크 복귀와 같은 메커니즘이다.** `callbackUrl` 처리를 한 곳에 만들어 두 흐름이 공유한다.

### 씨앗판

`/connects`의 상태는 전부 URL 쿼리스트링에 담는다.

```
/connects?track=qualitative&campus=natural&status=recruiting&sort=popular&page=2
```

이렇게 하면 서버 컴포넌트에서 바로 읽어 쿼리를 만들 수 있고, 필터를 건 화면을 그대로 공유할 수 있다. 클라이언트 상태로 들고 있으면 새로고침에 날아가고 뒤로가기도 어긋난다.

| 쿼리 | 기능 |
| --- | --- |
| `track` | B-04 트랙 탭 |
| `tags`, `campus`, `status`, `slots` | B-05 필터 |
| `sort` | B-06 정렬. 기본값은 `latest` (초반엔 찜이 전부 0) |

**B-06 '마감임박'의 기준은 남은 자리 수다.** 모집 마감일이 전 커넥트 공통이라 남은 시간으로는 정렬이 성립하지 않는다. 대신 `capacity - 현재 인원`을 오름차순으로 정렬해, **자리가 얼마 안 남은 커넥트를 위로 올린다.** 서두르게 만드는 원래 의도에 맞는다.

정원이 찬 커넥트는 이미 `full_closed`로 목록에서 갈라지므로, 실질 최솟값은 "1자리 남음"이다. 인원은 팀장을 포함해 세므로 개설 직후 커넥트는 1명에서 시작한다.

### 팀장 권한 판정

`/connects/[id]/manage`와 D-02 승인·거절, D-06 조기 마감의 권한은 **`memberships.role = 'leader'`로 판정한다.** `connects.created_by`는 최초 개설자 기록일 뿐이고, 팀장은 관리자가 교체할 수 있다. 개설자를 기준으로 판정하면 교체 후에도 옛 팀장이 권한을 유지한다.

팀장 지정은 `/admin/members`에 둔다. 승인·거절·마감 권한이 걸린 조작이므로 `admin_audit_log`에 남긴다.

### 관리자 검수 — `/admin/review`

주 60~90건, 학기 천 건이 이 한 화면을 통과한다. **목록에서 하나씩 눌러 들어가는 구조로 만들면 안 된다.**

- 대기 건을 하나씩 띄우고, 승인·반려 후 자동으로 다음 건으로 이동
- 사진은 크게, 판정에 필요한 정보(날짜·활동 내용·인원·크로스 상대)만 함께
- 키보드 단축키: 승인 / 반려 / 이전 / 다음
- 반려는 사유 선택형

건당 조작 3회와 6회의 차이가 학기 전체로는 3천 번이다.

---

## 3. Server Action과 Route Handler의 경계

**Route Handler로 두는 것** — 실제 HTTP 엔드포인트여야만 하는 다섯 가지.

| 경로 | 이유 |
| --- | --- |
| `/api/auth/[...nextauth]` | 구글이 외부에서 리다이렉트로 돌아온다 |
| `/api/uploads/presign` | 브라우저가 fetch로 직접 호출 |
| `/api/push/subscribe` | 서비스 워커에서 호출 |
| `/api/recommend` | 응답 스트리밍 |
| `/api/games/score` | 클라이언트 게임에서 호출 |

**나머지 변경은 전부 Server Action.** 폼 제출, 승인, 거절, 찜하기, 이탈 처리 등. API 라우트를 따로 만들고 fetch로 호출하는 코드를 쓰지 않아도 되므로 작업량이 눈에 띄게 준다.

### 예약 작업(크론)은 두지 않는다

모집 마감일이 시즌 공통 날짜이고 운영 조작은 사람이 판단해서 실행하므로, 정해진 시각에 자동으로 도는 배치가 필요 없다.

대신 **관리자 대시보드가 "오늘 처리할 것"을 조회 시점에 계산해서 보여준다.** 판단은 사람이, 계산은 시스템이 한다. D-14가 이미 이 구조로 정의되어 있다 — 웹은 대상자 목록을 뽑아 주고 연락은 사람이 한다.

| 대시보드 항목 | 근거 |
| --- | --- |
| 검수 대기 인증 건수 | G-05 |
| 정성 확인 대기 커넥트 | J-05 |
| 유연 증원 요청 | J-06 |
| 인원 미달 커넥트 | D-10 |
| 신청 0명으로 5일 지난 커넥트 | D-13 |

전부 저장하지 않고 매번 계산한다. 쿼리 다섯 개면 끝난다.

크론을 피하는 실질적 이유가 하나 더 있다. **크론은 조용히 실패해도 아무도 모른다.** 알림이 안 나가고 있는데 며칠 뒤 문의를 받고서야 아는 식이다. 사람이 화면을 보고 누르는 구조면 그런 일이 없다.

---

## 3-1. 일괄 확정 — `/admin/confirm`

D-05 마감일 도달과 D-16 팀 확정이 같은 조작이다. 마감일이 되면 관리자가 한 번 눌러 전원의 상태를 바꾸고 알림을 일괄 발송한다.

**시점 전후의 흐름**

```
마감일 이전   모집 진행. 정원 도달 자동 마감(D-05)만 시스템이 처리.
     ↓
마감일 이후   관리자 수동 구간. 정성 승인 마무리(J-05),
             미달 팀 확인, D-14로 후보 추출해 인원 흡수,
             유연 증원 승인(J-06).
     ↓
일괄 확정     /admin/confirm 에서 한 번. 되돌릴 수 없음.
```

**한 트랜잭션으로 묶는다.** 상태 일괄 전환과 C-12 비공개 커넥트 공개가 함께 성공하거나 함께 실패해야 한다. 절반만 바뀐 상태는 복구가 어렵다.

**알림 발송은 커밋 후 별도로.** 발송이 실패해도 확정 상태는 유지되어야 한다.

**미리보기를 먼저 보여준다.** 확정될 커넥트 수, 인원 미달 수, 발송 대상 인원을 띄우고 확인 후 실행한다. 숫자가 예상과 다르면 그 자리에서 멈출 수 있다.

**`admin_audit_log`에 기록한다.** 누가 언제 눌렀는지와 그 시점의 대상 목록.

---

## 4. 인증 흐름

```
1. /login  → 구글 OAuth
2. 콜백에서 ID 토큰 서버 검증 + hd == 'g.skku.edu' 확인
3. google_sub으로 users 조회
   ├─ 있음  → 세션 발급 → 원래 가려던 곳으로
   └─ 없음  → /onboarding
4. /onboarding에서 학번 입력
   → roster 대조 → 트랜잭션 안에서 결속 → 세션 발급
```

**결속 트랜잭션에서 UNIQUE 위반을 반드시 잡는다.** 두 사람이 같은 학번을 동시에 등록하면 한쪽이 튕기는데, 그 에러를 안내 문구로 바꿔야 한다.

**시도 제한.** 같은 `google_sub`으로 결속 실패가 반복되면 잠근다. 없으면 이 화면이 명단 조회 도구가 된다.

---

## 5. 화면 상태 처리

문서와 PL 피드백에서 반복해 지적된 부분이라 별도로 적는다.

**D-Day에는 모든 커넥트의 인원이 0명이다.** 인원 시각화를 만들면 개설 첫날 전부 빈 그래프가 된다. "아직 아무도 없음"이 실패가 아니라 기회로 보이게 해야 한다.

**B-10 필터 결과 0건.** 빈 화면을 그대로 두지 말고 조건을 완화한 대안이나 개설 유도로 이어지게 한다.

**E-01 빈 입력창을 두지 않는다.** 예시 키워드 칩을 깔아 둔다. 무엇을 할지 모르는 사람이 이 기능의 주 대상이다.

---

## 6. 착수 전 확정이 필요한 것

| 항목 | 영향받는 라우트 |
| --- | --- |
| U-03 검색을 추천에 흡수할지 | `/recommend` 하나로 갈지 `/search`를 따로 둘지 |
| U-26 태그 필터 존치 | `/connects` 쿼리 파라미터와 개설 폼 |
| G-18 인증 마감 시각 | `lib/scoring/week.ts` |
