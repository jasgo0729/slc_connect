-- =============================================================
-- Cross-SLC Connect — Postgres 스키마
-- 기준 문서: 웹사이트 기능 요구사항 (2026-08-03 갱신본)
-- 개정: 구글 OAuth(g.skku.edu) 인증 반영
--
-- 인증 구조
--   최초 1회 : 구글 로그인 → hd 검사 → 학번 입력 → roster 대조 → 결속
--   이후     : 구글 로그인만. 학번은 다시 묻지 않는다.
--   결속은 1:1로 DB 레벨에서 잠긴다(google_sub UNIQUE + student_no UNIQUE).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. 사람
-- =============================================================

-- 사전 업로드 명단. 학번 대조의 기준 데이터.
CREATE TABLE roster (
    student_no   TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    cohort       TEXT NOT NULL,              -- 기수
    campus       TEXT NOT NULL,              -- '인문사회' | '자연과학'
    slc          TEXT NOT NULL,              -- 소속 SLC
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 실제 가입자. 구글 계정과 학번이 1:1로 결속된다.
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 인증 주체. sub은 불변이므로 이메일이 아니라 이걸 기준으로 잡는다.
    google_sub     TEXT NOT NULL UNIQUE,
    google_email   TEXT NOT NULL,            -- 알림 수신 주소 (A-03 대체)

    -- 결속된 학번. roster에 없는 학번은 결속 불가.
    student_no     TEXT NOT NULL UNIQUE REFERENCES roster(student_no),
    bound_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    bound_ip       TEXT,                     -- 결속 분쟁 시 유일한 근거

    role           TEXT NOT NULL DEFAULT 'member',   -- A-08. 직접 DB에서만 변경.

    -- A-05 프로필 선택 항목. 전부 NULL 허용 = 빈 프로필이 정상 상태.
    major             TEXT,
    available_times   TEXT,
    bio               TEXT,
    qualitative_intro TEXT,                  -- A-06

    mbti_type      TEXT,                     -- A-07 최신 결과 캐시

    email_bounced_at TIMESTAMPTZ,            -- 반송 누적 시 발송 대상에서 제외
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ,

    CONSTRAINT users_role_chk CHECK (role IN ('member', 'admin'))
);
CREATE INDEX idx_users_email ON users(google_email);

-- 결속 시도 기록. 학번을 하나씩 넣어 보며 명단을 캐내는 것을 막는다.
-- 실패 응답 문구는 "확인할 수 없습니다" 하나로 통일할 것.
-- (학번 오류와 명단 부재를 구분해 알려주면 명단 조회 도구가 된다)
CREATE TABLE binding_attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub   TEXT NOT NULL,
    google_email TEXT NOT NULL,
    attempted_no TEXT,
    succeeded    BOOLEAN NOT NULL DEFAULT false,
    ip           TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_binding_attempts ON binding_attempts(google_sub, created_at DESC);

-- A-04 로그인 유지. 기간은 U-08 미확정이므로 expires_at으로 조절.
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- 시즌 공통 설정. 날짜를 코드에 박으면 일정 변경 때마다 배포해야 한다.
-- 모집 마감일, 팀 확정일, 시험 기간, 방학 구간 등이 모두 여기 들어간다.
CREATE TABLE season_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 되돌리기 어려운 관리자 조작의 기록.
-- D-16 일괄 확정, J-07 랭킹 모드 전환, 결속 해제 등.
CREATE TABLE admin_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    target      TEXT,
    detail      JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_time ON admin_audit_log(created_at DESC);

-- =============================================================
-- 2. 태그
--   U-26(태그 필터 존치 여부) 미확정. 어느 쪽으로 결론 나도 스키마는 그대로.
-- =============================================================

CREATE TABLE tags (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    is_suggested BOOLEAN NOT NULL DEFAULT false   -- E-01 예시 칩 후보 (U-14)
);

CREATE TABLE user_tags (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id  INT  NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
);

-- =============================================================
-- 3. 커넥트
-- =============================================================

CREATE TABLE connects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    track         TEXT NOT NULL,              -- 'quantitative' | 'qualitative'
    tagline       TEXT NOT NULL,              -- C-01 한 줄 소개
    description   TEXT,                       -- C-06. E-02 매칭 품질을 결정하는 재료.
    campus        TEXT NOT NULL,
    location      TEXT,

    -- 최초 개설자. 기록용이며 바뀌지 않는다.
    -- 현재 팀장은 memberships.role = 'leader' 쪽이 진실이다.
    -- 권한 판정(관리 화면 접근, D-02 승인·거절, D-06 조기 마감)은
    -- 반드시 memberships를 본다. created_by를 보면 교체 후에도
    -- 옛 팀장이 권한을 유지하게 된다.
    created_by    UUID NOT NULL REFERENCES users(id),
    contact       TEXT,                             -- C-06 연락 수단

    capacity      SMALLINT NOT NULL DEFAULT 6,      -- C-03 (U-04 기본값 6)
    available_days SMALLINT[] NOT NULL DEFAULT '{}',-- C-04. 0=일 ... 6=토
    conditions    TEXT[] NOT NULL DEFAULT '{}',     -- C-05 참여 조건 코드

    is_public     BOOLEAN NOT NULL DEFAULT true,    -- C-11
    status        TEXT NOT NULL DEFAULT 'recruiting',
    invite_token  TEXT NOT NULL UNIQUE,             -- C-10

    -- C-02 정성 트랙 전용
    goal_type       TEXT,
    goal_detail     TEXT,
    goal_date       DATE,
    activity_period TEXT,

    -- C-08 / C-09
    reviewed_by      UUID REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,

    is_pre_created BOOLEAN NOT NULL DEFAULT false,  -- TF 사전 개설

    -- 모집 마감일은 커넥트별 값이 아니라 시즌 공통이다 → season_config
    confirmed_at     TIMESTAMPTZ,             -- D-16 일괄 확정 시각
    closed_at        TIMESTAMPTZ,             -- D-06 팀장 조기 마감 시각
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- B-08 모집 상태 6종
    CONSTRAINT connects_status_chk CHECK (status IN (
        'recruiting',      -- 모집 중
        'full_closed',     -- 정원 도달 마감
        'early_closed',    -- 조기 마감 (신청은 계속, 승인제)
        'private',         -- 비공개
        'pending_review',  -- 정성 확인 대기
        'confirmed'        -- 확정 후 열람 전용 (B-09)
    )),
    CONSTRAINT connects_track_chk CHECK (track IN ('quantitative', 'qualitative')),
    CONSTRAINT connects_capacity_chk CHECK (capacity BETWEEN 4 AND 7),
    CONSTRAINT connects_qual_goal_chk CHECK (
        track <> 'qualitative' OR (goal_type IS NOT NULL AND goal_detail IS NOT NULL)
    )
);
CREATE INDEX idx_connects_status ON connects(status) WHERE is_public;
CREATE INDEX idx_connects_track  ON connects(track);
CREATE INDEX idx_connects_creator ON connects(created_by);

CREATE TABLE connect_tags (
    connect_id UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    tag_id     INT  NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (connect_id, tag_id)
);

-- =============================================================
-- 4. 지원과 참여
--   applications = 지원 이력 / memberships = 현재 소속
--   합치면 이탈 후 재합류한 사람의 이력을 잃는다.
-- =============================================================

CREATE TABLE applications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connect_id    UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending',
    applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ,
    decided_by    UUID REFERENCES users(id),
    reject_reason TEXT,                       -- D-03 정형 문구
    CONSTRAINT applications_status_chk CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled'   -- cancelled = D-12 (U-02)
    ))
);
-- 살아 있는 지원만 중복 차단. 취소/반려 건은 남겨 재신청을 허용한다.
CREATE UNIQUE INDEX uq_applications_active
    ON applications(connect_id, user_id)
    WHERE status IN ('pending', 'approved');
CREATE INDEX idx_applications_connect ON applications(connect_id);
CREATE INDEX idx_applications_user    ON applications(user_id);

CREATE TABLE memberships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connect_id  UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'member',   -- 'leader' | 'member'
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ,                      -- G-15
    CONSTRAINT memberships_role_chk CHECK (role IN ('leader', 'member'))
);
CREATE UNIQUE INDEX uq_memberships_active
    ON memberships(connect_id, user_id) WHERE left_at IS NULL;
CREATE INDEX idx_memberships_user ON memberships(user_id) WHERE left_at IS NULL;

-- 커넥트당 현재 팀장은 한 명.
CREATE UNIQUE INDEX uq_memberships_leader
    ON memberships(connect_id) WHERE role = 'leader' AND left_at IS NULL;

-- 인원 계산 기준: 팀장을 포함한 수다.
--   현재 인원 = COUNT(memberships WHERE connect_id = ? AND left_at IS NULL)
--   capacity(4~7)도, G-15의 최소 4명도 이 숫자를 쓴다.
--   따라서 개설 시점의 인원은 0이 아니라 1이다.

-- 주의 1: G-15 "4명 미만 불가"는 SQL 제약으로 표현할 수 없다.
--         이탈 처리 트랜잭션 안에서 잔여 인원을 세고 거절할 것.
-- 주의 2: D-04 정원 초과도 마찬가지. 승인 시 SELECT ... FOR UPDATE로
--         커넥트 행을 잠그고 현재 인원을 셀 것.
-- 주의 3: 커넥트 생성과 팀장 membership 삽입은 같은 트랜잭션이어야 한다.
--         커넥트만 만들어지면 관리 화면에 아무도 들어갈 수 없다.
-- 주의 4: 팀장(role='leader')은 이탈할 수 없다. 이탈 처리 시 role을 확인해
--         거절할 것. 따라서 팀장 없는 커넥트는 구조적으로 생기지 않는다.
--         부득이한 경우는 관리자가 DB에서 직접 처리한다(화면 없음).

CREATE TABLE favorites (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connect_id UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, connect_id)
);
CREATE INDEX idx_favorites_created ON favorites(created_at);   -- B-07 당일 집계

-- =============================================================
-- 5. 인증
-- =============================================================

CREATE TABLE certifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connect_id    UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    submitted_by  UUID NOT NULL REFERENCES users(id),

    activity_date   DATE NOT NULL,            -- G-18 주차 귀속 기준
    activity_type   TEXT NOT NULL DEFAULT 'offline',  -- 'offline' | 'online' (G-09)
    online_platform TEXT,
    content         TEXT NOT NULL,

    photo_key     TEXT NOT NULL,              -- S3 오브젝트 키. 파일은 DB에 넣지 않는다.
    photo_width   INT,
    photo_height  INT,

    -- G-02 크로스 커넥트. 전용 창구 없이 이 항목으로 처리.
    cross_connect_id        UUID REFERENCES connects(id),
    own_participant_count   SMALLINT NOT NULL,
    cross_participant_count SMALLINT,

    -- G-05 관리자 검수 (주 60~90건이 여기로 들어온다)
    review_status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by   UUID REFERENCES users(id),
    reviewed_at   TIMESTAMPTZ,
    reject_reason TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cert_review_chk CHECK (review_status IN ('pending','approved','rejected')),
    CONSTRAINT cert_cross_chk CHECK (
        (cross_connect_id IS NULL AND cross_participant_count IS NULL)
        OR (cross_connect_id IS NOT NULL AND cross_participant_count IS NOT NULL)
    )
);
CREATE INDEX idx_cert_pending ON certifications(created_at) WHERE review_status = 'pending';
CREATE INDEX idx_cert_connect_date ON certifications(connect_id, activity_date);

-- G-14 개인별 참여율(50% 기준)의 유일한 산정 근거.
CREATE TABLE certification_participants (
    certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (certification_id, user_id)
);
CREATE INDEX idx_cert_participants_user ON certification_participants(user_id);

-- =============================================================
-- 6. 점수
--   합계 컬럼을 두지 않는다. 사건을 쌓고 SUM으로 뽑는다.
--   배율과 가산이 겹치므로 근거가 남아야 정정과 소명이 가능하다.
-- =============================================================

-- G-07 이벤트 배율 (2배 주간, 버닝 타임)
CREATE TABLE score_multiplier_windows (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    starts_at  TIMESTAMPTZ NOT NULL,
    ends_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE score_events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connect_id       UUID NOT NULL REFERENCES connects(id) ON DELETE CASCADE,
    certification_id UUID REFERENCES certifications(id) ON DELETE SET NULL,

    event_type   TEXT NOT NULL,
    base_points  INT NOT NULL,                -- 배율 적용 전
    multiplier   NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    final_points INT NOT NULL,                -- 실제 인정 점수 (G-16 분리 저장)

    week_start   DATE NOT NULL,               -- G-18 주차 귀속. 검수 시점에 확정해 저장.
    reason       TEXT,                        -- 사람이 읽을 근거
    created_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT score_event_type_chk CHECK (event_type IN (
        'base_activity',      -- G-06 회당 10점 (주 2회)
        'excess_activity',    -- G-06 초과분 회당 2점
        'headcount_bonus',    -- G-06 6명 이상 +4점 (주 1회)
        'deliverable_bonus',  -- G-06 산출물 가산
        'cross_connect',      -- G-02 자기 팀 인원 1명당 5점, 회당 최대 20점
        'exam_special',       -- G-08 시험 기간 특례
        'manual_adjustment'   -- 관리자 정정
    ))
);
CREATE INDEX idx_score_events_connect ON score_events(connect_id);
CREATE INDEX idx_score_events_week    ON score_events(week_start);

-- G-10 패스 구간, G-11 점수판, G-12 랭킹보드가 전부 여기서 파생된다.
CREATE VIEW connect_scores AS
SELECT c.id AS connect_id,
       c.name,
       COALESCE(SUM(se.final_points), 0) AS total_points
FROM connects c
LEFT JOIN score_events se ON se.connect_id = c.id
GROUP BY c.id, c.name;

-- =============================================================
-- 7. 알림
--   수신 주소는 users.google_email (전부 @g.skku.edu)
--   발신은 프로젝트 도메인. 학교 계정으로 대량 발송하지 않는다.
-- =============================================================

CREATE TABLE push_subscriptions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    link            TEXT,
    channel         TEXT NOT NULL DEFAULT 'push',   -- 'push' | 'email'
    delivery_status TEXT NOT NULL DEFAULT 'queued', -- queued/sent/bounced/failed
    error_detail    TEXT,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_bounced ON notifications(user_id)
    WHERE delivery_status = 'bounced';

-- =============================================================
-- 8. 참여형 콘텐츠
-- =============================================================

CREATE TABLE mbti_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 비로그인 응시를 허용하므로 NULL 가능.
    -- 결과 화면에서 로그인하면 그 시점에 user_id를 채우고
    -- users.mbti_type에도 반영한다(A-07).
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    type_code   TEXT NOT NULL,
    axis_scores JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game_scores (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_key  TEXT NOT NULL,
    score     INT NOT NULL,
    is_valid  BOOLEAN NOT NULL DEFAULT true,   -- F-09 서버 검증 결과
    played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_scores_rank ON game_scores(game_key, score DESC) WHERE is_valid;

-- =============================================================
-- 9. 추천
-- =============================================================

-- E-09 호출 제한의 근거. 메모리 카운터로 두면 안 된다.
CREATE TABLE recommendation_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    mode        TEXT,                          -- E-02 'named' | 'open'
    result_ids  UUID[],
    is_fallback BOOLEAN NOT NULL DEFAULT false,-- E-08 폴백 사용 여부
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reco_user_time ON recommendation_logs(user_id, created_at DESC);

-- =============================================================
-- 10. 운영 콘텐츠
-- =============================================================

-- K-01 B급 사진전. 제보 순서가 조 편성의 근거이므로 시각이 핵심 데이터.
CREATE TABLE photo_contest_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connect_id   UUID NOT NULL UNIQUE REFERENCES connects(id) ON DELETE CASCADE,
    photo_key    TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photo_contest_order ON photo_contest_entries(submitted_at);

-- =============================================================
-- 후순위 / 미채택 대기
--   9절 커뮤니티(posts, comments) — U-13. 오픈채팅방 대체 가능하므로 보류.
--   K-03 카드뉴스 / K-04 투표 — 필요 시점이 2월이므로 분리.
-- =============================================================
