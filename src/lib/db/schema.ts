import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Cross-SLC Connect — 전체 스키마
 * 기준: schema.sql (2026-08-03 갱신본 + 구글 OAuth 개정)
 *
 * 인증 구조
 *   최초 1회 : 구글 로그인 → hd 검사 → 이름·학번 입력 → roster 대조 → 결속
 *   이후     : 구글 로그인만. 학번은 다시 묻지 않는다.
 *   결속은 1:1로 DB 레벨에서 잠긴다(googleSub UNIQUE + studentNo UNIQUE).
 *
 * gen_random_uuid()는 Postgres 13부터 내장이므로 pgcrypto 확장이 필요 없다.
 */

/* ═════════════════════════════════════════════════════════
 * 1. 사람
 * ═════════════════════════════════════════════════════════ */

/** 사전 업로드 명단. 이름·학번 대조의 기준 데이터. */
export const roster = pgTable('roster', {
  studentNo: text('student_no').primaryKey(),
  name: text('name').notNull(),
  cohort: text('cohort').notNull(), // 기수
  campus: text('campus').notNull(), // '인문사회' | '자연과학'
  slc: text('slc').notNull(), // 소속 SLC
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 실제 가입자. 구글 계정과 학번이 1:1로 결속된다. */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 인증 주체. sub은 불변이므로 이메일이 아니라 이걸 기준으로 잡는다.
    googleSub: text('google_sub').notNull().unique(),
    googleEmail: text('google_email').notNull(), // 알림 수신 주소 (A-03 대체)

    // 워크스페이스 도메인. 개인 계정이면 NULL.
    // 로그인 조건으로 쓰지 않고 기록만 한다 — 학번 분쟁이 생겼을 때
    // 학교 계정으로 들어온 사람인지 구분할 근거가 된다.
    googleHd: text('google_hd'),

    // 결속된 학번. roster에 없는 학번은 결속 불가.
    studentNo: text('student_no')
      .notNull()
      .unique()
      .references(() => roster.studentNo),
    boundAt: timestamp('bound_at', { withTimezone: true }).notNull().defaultNow(),
    boundIp: text('bound_ip'), // 결속 분쟁 시 유일한 근거

    role: text('role').notNull().default('member'), // A-08. 직접 DB에서만 변경.

    // A-05 프로필 선택 항목. 전부 NULL 허용 = 빈 프로필이 정상 상태.
    major: text('major'),
    availableTimes: text('available_times'),
    // 방학 중 거주지. G-09 온라인 인정 구간에 만날 수 있는지가 여기 달려 있어
    // 커넥트 상세에서 분포로 보여준다.
    residence: text('residence'),
    bio: text('bio'),
    qualitativeIntro: text('qualitative_intro'), // A-06

    mbtiType: text('mbti_type'), // A-07 최신 결과 캐시

    emailBouncedAt: timestamp('email_bounced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_users_email').on(t.googleEmail),
    check('users_role_chk', sql`${t.role} IN ('member', 'admin')`),
  ],
);

/**
 * 결속 시도 기록. 이름·학번을 바꿔 가며 명단을 캐내는 것을 막는다.
 * 실패 문구는 하나로 통일할 것 — 학번 오류와 이름 불일치를 구분해
 * 알려주면 학번만 알아도 명단의 이름을 알아낼 수 있다.
 * 결속 실패 계정은 users에 없으므로 외래키를 걸지 않는다.
 */
export const bindingAttempts = pgTable(
  'binding_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    googleSub: text('google_sub').notNull(),
    googleEmail: text('google_email').notNull(),
    attemptedNo: text('attempted_no'),
    succeeded: boolean('succeeded').notNull().default(false),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_binding_attempts').on(t.googleSub, t.createdAt.desc())],
);

/**
 * A-04 로그인 유지. 기간은 U-08 미확정이므로 expiresAt으로 조절.
 * 쿠키에는 원본 토큰을, 여기에는 SHA-256 해시만 둔다.
 * DB 백업이 유출돼도 그것만으로 남의 세션을 흉내 낼 수 없다.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_sessions_user').on(t.userId),
    index('idx_sessions_expires').on(t.expiresAt),
  ],
);

/**
 * 시즌 공통 설정. 날짜를 코드에 박으면 일정 변경 때마다 배포해야 한다.
 * 모집 마감일, 팀 확정일, 시험 기간, 방학 구간 등이 모두 여기 들어간다.
 */
export const seasonConfig = pgTable('season_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 되돌리기 어려운 관리자 조작의 기록.
 * D-16 일괄 확정, J-07 랭킹 모드 전환, 결속 해제 등.
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    target: text('target'),
    detail: jsonb('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_audit_time').on(t.createdAt.desc())],
);

/* ═════════════════════════════════════════════════════════
 * 2. 태그
 *   U-26(태그 필터 존치 여부) 미확정. 어느 쪽으로 결론 나도 스키마는 그대로.
 * ═════════════════════════════════════════════════════════ */

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  isSuggested: boolean('is_suggested').notNull().default(false), // E-01 예시 칩 후보 (U-14)
});

export const userTags = pgTable(
  'user_tags',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tagId] })],
);

/* ═════════════════════════════════════════════════════════
 * 3. 커넥트
 * ═════════════════════════════════════════════════════════ */

export const connects = pgTable(
  'connects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    track: text('track').notNull(), // 'quantitative' | 'qualitative'
    tagline: text('tagline').notNull(), // C-01 한 줄 소개
    description: text('description'), // C-06. E-02 매칭 품질을 결정하는 재료.
    campus: text('campus').notNull(),
    location: text('location'),

    // 최초 개설자. 기록용이며 바뀌지 않는다.
    // 현재 팀장은 memberships.role = 'leader' 쪽이 진실이다.
    // 권한 판정(관리 화면 접근, D-02 승인·거절, D-06 조기 마감)은
    // 반드시 memberships를 본다. createdBy를 보면 교체 후에도
    // 옛 팀장이 권한을 유지하게 된다.
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    contact: text('contact'), // C-06 연락 수단

    capacity: smallint('capacity').notNull().default(6), // C-03 (U-04 기본값 6)
    availableDays: smallint('available_days').array().notNull().default(sql`'{}'`), // C-04. 0=일 … 6=토
    conditions: text('conditions').array().notNull().default(sql`'{}'`), // C-05 참여 조건 코드

    isPublic: boolean('is_public').notNull().default(true), // C-11
    status: text('status').notNull().default('recruiting'),
    inviteToken: text('invite_token').notNull().unique(), // C-10

    // C-02 정성 트랙 전용
    goalType: text('goal_type'),
    goalDetail: text('goal_detail'),
    goalDate: date('goal_date'),
    activityPeriod: text('activity_period'),

    // C-08 / C-09
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    isPreCreated: boolean('is_pre_created').notNull().default(false), // TF 사전 개설

    // 모집 마감일은 커넥트별 값이 아니라 시즌 공통이다 → seasonConfig
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }), // D-16 일괄 확정 시각
    closedAt: timestamp('closed_at', { withTimezone: true }), // D-06 팀장 조기 마감 시각
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_connects_status').on(t.status).where(sql`${t.isPublic}`),
    index('idx_connects_track').on(t.track),
    index('idx_connects_creator').on(t.createdBy),

    // B-08 모집 상태 6종
    check(
      'connects_status_chk',
      sql`${t.status} IN ('recruiting', 'full_closed', 'early_closed', 'private', 'pending_review', 'confirmed')`,
    ),
    check('connects_track_chk', sql`${t.track} IN ('quantitative', 'qualitative')`),
    check('connects_capacity_chk', sql`${t.capacity} BETWEEN 4 AND 7`),
    check(
      'connects_qual_goal_chk',
      sql`${t.track} <> 'qualitative' OR (${t.goalType} IS NOT NULL AND ${t.goalDetail} IS NOT NULL)`,
    ),
  ],
);

export const connectTags = pgTable(
  'connect_tags',
  {
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.connectId, t.tagId] })],
);

/* ═════════════════════════════════════════════════════════
 * 4. 지원과 참여
 *   applications = 지원 이력 / memberships = 현재 소속
 *   합치면 이탈 후 재합류한 사람의 이력을 잃는다.
 * ═════════════════════════════════════════════════════════ */

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: uuid('decided_by').references(() => users.id),
    rejectReason: text('reject_reason'), // D-03 정형 문구
  },
  (t) => [
    // 살아 있는 지원만 중복 차단. 취소/반려 건은 남겨 재신청을 허용한다.
    uniqueIndex('uq_applications_active')
      .on(t.connectId, t.userId)
      .where(sql`${t.status} IN ('pending', 'approved')`),
    index('idx_applications_connect').on(t.connectId),
    index('idx_applications_user').on(t.userId),
    // cancelled = D-12. 확정 전 자유 취소.
    check(
      'applications_status_chk',
      sql`${t.status} IN ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
  ],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // 'leader' | 'member'
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }), // G-15
  },
  (t) => [
    uniqueIndex('uq_memberships_active')
      .on(t.connectId, t.userId)
      .where(sql`${t.leftAt} IS NULL`),
    index('idx_memberships_user').on(t.userId).where(sql`${t.leftAt} IS NULL`),
    // 커넥트당 현재 팀장은 한 명.
    uniqueIndex('uq_memberships_leader')
      .on(t.connectId)
      .where(sql`${t.role} = 'leader' AND ${t.leftAt} IS NULL`),
    check('memberships_role_chk', sql`${t.role} IN ('leader', 'member')`),
  ],
);

/*
 * 인원 계산 기준: 팀장을 포함한 수다.
 *   현재 인원 = COUNT(memberships WHERE connectId = ? AND leftAt IS NULL)
 *   capacity(4~7)도, G-15의 최소 4명도 이 숫자를 쓴다.
 *   따라서 개설 시점의 인원은 0이 아니라 1이다.
 *
 * ── 이탈 규칙은 확정 전후로 다르다 ──────────────────────────
 * 판정 스위치: connects.confirmedAt 이 채워졌는지 여부.
 *
 * [확정 전 · 모집 기간] 자유롭게 들어오고 나간다.
 *   전원 동의도 최소 4명도 적용하지 않는다. 미달은 D-14 인원 흡수로 채운다.
 *   D-12 지원 취소도 같은 이유로 허용한다(U-02 결론).
 *   팀장은 후임 지정과 함께라면 나갈 수 있다.
 *
 * [확정 후 · 활동 기간] G-15가 발효된다.
 *   전원 동의 / 4명 미만 불가 / 팀장은 후임 지정 필수.
 *   점수와 상금이 걸린 구성이므로 함부로 바뀌면 안 된다.
 *
 * 주의 1: "4명 미만 불가"는 SQL 제약으로 표현할 수 없다.
 *         확정 후 이탈 트랜잭션 안에서 잔여 인원을 세고 거절할 것.
 * 주의 2: D-04 정원 초과도 마찬가지. 승인 시 SELECT … FOR UPDATE로
 *         커넥트 행을 잠그고 현재 인원을 셀 것.
 * 주의 3: 커넥트 생성과 팀장 membership 삽입은 같은 트랜잭션이어야 한다.
 *         커넥트만 만들어지면 관리 화면에 아무도 들어갈 수 없다.
 * 주의 4: 팀장 이탈은 후임 지정이 필수 입력이다. 한 트랜잭션 안에서
 *         ① 기존 leader를 member로 내리고 ② 후임을 leader로 올린 뒤
 *         ③ 기존 팀장의 leftAt을 채운다. 순서를 지켜야 한다.
 *         후임을 먼저 올리면 uq_memberships_leader 에 걸려 실패한다.
 *         후임 미지정이면 진행 자체를 막아 팀장 없는 상태를 만들지 않는다.
 * 주의 5: 확정 후 전원 동의 요건은 팀 내부 합의로 처리하며
 *         시스템이 동의를 수집하지 않는다(화면 없음).
 */

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.connectId] }),
    index('idx_favorites_created').on(t.createdAt), // B-07 당일 집계
  ],
);

/* ═════════════════════════════════════════════════════════
 * 5. 인증
 * ═════════════════════════════════════════════════════════ */

export const certifications = pgTable(
  'certifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => users.id),

    activityDate: date('activity_date').notNull(), // G-18 주차 귀속 기준
    activityType: text('activity_type').notNull().default('offline'), // 'offline' | 'online' (G-09)
    onlinePlatform: text('online_platform'),
    content: text('content').notNull(),

    photoKey: text('photo_key').notNull(), // S3 오브젝트 키. 파일은 DB에 넣지 않는다.
    photoWidth: integer('photo_width'),
    photoHeight: integer('photo_height'),

    // G-02 크로스 커넥트. 전용 창구 없이 이 항목으로 처리.
    crossConnectId: uuid('cross_connect_id').references(() => connects.id),
    ownParticipantCount: smallint('own_participant_count').notNull(),
    crossParticipantCount: smallint('cross_participant_count'),

    // G-05 관리자 검수 (주 60~90건이 여기로 들어온다)
    reviewStatus: text('review_status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectReason: text('reject_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_cert_pending')
      .on(t.createdAt)
      .where(sql`${t.reviewStatus} = 'pending'`),
    index('idx_cert_connect_date').on(t.connectId, t.activityDate),
    check('cert_review_chk', sql`${t.reviewStatus} IN ('pending', 'approved', 'rejected')`),
    check(
      'cert_cross_chk',
      sql`(${t.crossConnectId} IS NULL AND ${t.crossParticipantCount} IS NULL) OR (${t.crossConnectId} IS NOT NULL AND ${t.crossParticipantCount} IS NOT NULL)`,
    ),
  ],
);

/** G-14 개인별 참여율(50% 기준)의 유일한 산정 근거. */
export const certificationParticipants = pgTable(
  'certification_participants',
  {
    certificationId: uuid('certification_id')
      .notNull()
      .references(() => certifications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.certificationId, t.userId] }),
    index('idx_cert_participants_user').on(t.userId),
  ],
);

/* ═════════════════════════════════════════════════════════
 * 6. 점수
 *   합계 컬럼을 두지 않는다. 사건을 쌓고 SUM으로 뽑는다.
 *   배율과 가산이 겹치므로 근거가 남아야 정정과 소명이 가능하다.
 * ═════════════════════════════════════════════════════════ */

/** G-07 이벤트 배율 (2배 주간, 버닝 타임) */
export const scoreMultiplierWindows = pgTable('score_multiplier_windows', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  multiplier: numeric('multiplier', { precision: 3, scale: 1 }).notNull().default('1.0'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
});

export const scoreEvents = pgTable(
  'score_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectId: uuid('connect_id')
      .notNull()
      .references(() => connects.id, { onDelete: 'cascade' }),
    certificationId: uuid('certification_id').references(() => certifications.id, {
      onDelete: 'set null',
    }),

    eventType: text('event_type').notNull(),
    basePoints: integer('base_points').notNull(), // 배율 적용 전
    multiplier: numeric('multiplier', { precision: 3, scale: 1 }).notNull().default('1.0'),
    finalPoints: integer('final_points').notNull(), // 실제 인정 점수 (G-16 분리 저장)

    weekStart: date('week_start').notNull(), // G-18 주차 귀속. 검수 시점에 확정해 저장.
    reason: text('reason'), // 사람이 읽을 근거
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_score_events_connect').on(t.connectId),
    index('idx_score_events_week').on(t.weekStart),
    check(
      'score_event_type_chk',
      sql`${t.eventType} IN ('base_activity', 'excess_activity', 'headcount_bonus', 'deliverable_bonus', 'cross_connect', 'exam_special', 'manual_adjustment')`,
    ),
  ],
);

/** G-10 패스 구간, G-11 점수판, G-12 랭킹보드가 전부 여기서 파생된다. */
export const connectScores = pgView('connect_scores', {
  connectId: uuid('connect_id').notNull(),
  name: text('name').notNull(),
  totalPoints: bigint('total_points', { mode: 'number' }).notNull(),
}).as(
  sql`SELECT c.id AS connect_id, c.name, COALESCE(SUM(se.final_points), 0) AS total_points
      FROM connects c
      LEFT JOIN score_events se ON se.connect_id = c.id
      GROUP BY c.id, c.name`,
);

/* ═════════════════════════════════════════════════════════
 * 7. 알림
 *   수신 주소는 users.googleEmail (전부 @g.skku.edu)
 *   발신은 프로젝트 도메인. 학교 계정으로 대량 발송하지 않는다.
 * ═════════════════════════════════════════════════════════ */

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_push_user').on(t.userId)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    channel: text('channel').notNull().default('push'), // 'push' | 'email'
    deliveryStatus: text('delivery_status').notNull().default('queued'), // queued/sent/bounced/failed
    errorDetail: text('error_detail'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_notifications_user').on(t.userId, t.createdAt.desc()),
    index('idx_notifications_bounced')
      .on(t.userId)
      .where(sql`${t.deliveryStatus} = 'bounced'`),
  ],
);

/* ═════════════════════════════════════════════════════════
 * 8. 참여형 콘텐츠
 * ═════════════════════════════════════════════════════════ */

export const mbtiResults = pgTable('mbti_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  // 비로그인 응시를 허용하므로 NULL 가능.
  // 결과 화면에서 로그인하면 그 시점에 userId를 채우고
  // users.mbtiType에도 반영한다(A-07).
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  typeCode: text('type_code').notNull(),
  axisScores: jsonb('axis_scores').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gameScores = pgTable(
  'game_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameKey: text('game_key').notNull(),
    score: integer('score').notNull(),
    isValid: boolean('is_valid').notNull().default(true), // F-09 서버 검증 결과
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_game_scores_rank')
      .on(t.gameKey, t.score.desc())
      .where(sql`${t.isValid}`),
  ],
);

/* ═════════════════════════════════════════════════════════
 * 9. 추천
 * ═════════════════════════════════════════════════════════ */

/** E-09 호출 제한의 근거. 메모리 카운터로 두면 안 된다. */
export const recommendationLogs = pgTable(
  'recommendation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    mode: text('mode'), // E-02 'named' | 'open'
    resultIds: uuid('result_ids').array(),
    isFallback: boolean('is_fallback').notNull().default(false), // E-08 폴백 사용 여부
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_reco_user_time').on(t.userId, t.createdAt.desc())],
);

/* ═════════════════════════════════════════════════════════
 * 10. 운영 콘텐츠
 * ═════════════════════════════════════════════════════════ */

/** K-01 B급 사진전. 제보 순서가 조 편성의 근거이므로 시각이 핵심 데이터. */
export const photoContestEntries = pgTable(
  'photo_contest_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectId: uuid('connect_id')
      .notNull()
      .unique()
      .references(() => connects.id, { onDelete: 'cascade' }),
    photoKey: text('photo_key').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_photo_contest_order').on(t.submittedAt)],
);

/* ═════════════════════════════════════════════════════════
 * 관계 정의 — db.query.* 를 쓸 때 필요하다.
 * ═════════════════════════════════════════════════════════ */

export const rosterRelations = relations(roster, ({ one }) => ({
  user: one(users, { fields: [roster.studentNo], references: [users.studentNo] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  rosterEntry: one(roster, {
    fields: [users.studentNo],
    references: [roster.studentNo],
  }),
  sessions: many(sessions),
  applications: many(applications),
  memberships: many(memberships),
  favorites: many(favorites),
  tags: many(userTags),
  notifications: many(notifications),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const connectsRelations = relations(connects, ({ one, many }) => ({
  creator: one(users, { fields: [connects.createdBy], references: [users.id] }),
  applications: many(applications),
  memberships: many(memberships),
  favorites: many(favorites),
  certifications: many(certifications, { relationName: 'submitter' }),
  crossCertifications: many(certifications, { relationName: 'crossPartner' }),
  scoreEvents: many(scoreEvents),
  tags: many(connectTags),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  connect: one(connects, {
    fields: [applications.connectId],
    references: [connects.id],
  }),
  user: one(users, { fields: [applications.userId], references: [users.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  connect: one(connects, { fields: [memberships.connectId], references: [connects.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  connect: one(connects, { fields: [favorites.connectId], references: [connects.id] }),
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
}));

export const certificationsRelations = relations(certifications, ({ one, many }) => ({
  connect: one(connects, {
    fields: [certifications.connectId],
    references: [connects.id],
    relationName: 'submitter',
  }),
  crossConnect: one(connects, {
    fields: [certifications.crossConnectId],
    references: [connects.id],
    relationName: 'crossPartner',
  }),
  participants: many(certificationParticipants),
  scoreEvents: many(scoreEvents),
}));

export const certificationParticipantsRelations = relations(
  certificationParticipants,
  ({ one }) => ({
    certification: one(certifications, {
      fields: [certificationParticipants.certificationId],
      references: [certifications.id],
    }),
    user: one(users, {
      fields: [certificationParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const scoreEventsRelations = relations(scoreEvents, ({ one }) => ({
  connect: one(connects, { fields: [scoreEvents.connectId], references: [connects.id] }),
  certification: one(certifications, {
    fields: [scoreEvents.certificationId],
    references: [certifications.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  users: many(userTags),
  connects: many(connectTags),
}));

export const userTagsRelations = relations(userTags, ({ one }) => ({
  user: one(users, { fields: [userTags.userId], references: [users.id] }),
  tag: one(tags, { fields: [userTags.tagId], references: [tags.id] }),
}));

export const connectTagsRelations = relations(connectTags, ({ one }) => ({
  connect: one(connects, { fields: [connectTags.connectId], references: [connects.id] }),
  tag: one(tags, { fields: [connectTags.tagId], references: [tags.id] }),
}));

/* ═════════════════════════════════════════════════════════
 * 타입
 * ═════════════════════════════════════════════════════════ */

export type Roster = typeof roster.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Connect = typeof connects.$inferSelect;
export type NewConnect = typeof connects.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type NewCertification = typeof certifications.$inferInsert;
export type ScoreEvent = typeof scoreEvents.$inferSelect;
export type NewScoreEvent = typeof scoreEvents.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
