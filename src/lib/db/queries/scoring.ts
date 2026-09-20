import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '../client';
import { certifications, connects, scoreEvents } from '../schema';
import { calculateScores, sumPoints, type ComputedEvent } from '@/lib/scoring/calculate';

/**
 * G-06 점수 집계 — 규칙서 §6 을 DB 에 반영하는 자리.
 *
 * 규칙 자체는 lib/scoring 에 있다. 여기는 읽고 쓰기만 한다.
 * 그래야 규칙을 DB 없이 검증할 수 있다.
 *
 * ── 쌓지 않고 다시 계산한다 ──
 *
 * 승인할 때마다 이벤트를 하나씩 더하면, 승인 순서가 점수를 가른다.
 * 팀이 월·수·금 활동을 올렸는데 금요일 건을 먼저 승인하면 금요일이
 * "그 주의 첫 번째 활동"이 되어 10점을 받는다. §6.2 의 주 2회는
 * 활동일 기준이지 검수 순서 기준이 아니다.
 *
 * 그래서 승인할 때마다 그 커넥트의 점수를 통째로 다시 만든다.
 * 몇 번을 돌려도 결과가 같고(멱등), 검수 순서가 결과를 바꾸지
 * 않는다. 커넥트 하나당 인증은 많아야 수십 건이라 값도 싸다.
 *
 * 산출물(§6.6)이 전체 기간 5회 한도라 주 단위로 잘라도 닫히지
 * 않는다는 점도 같은 결론을 가리킨다.
 */

/** db.transaction 이 넘겨주는 값. 트랜잭션 안에서 부르기 위한 타입이다. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface RecalcResult {
  total: number;
  /** 방금 검수한 인증에 붙은 점수를 뽑아 보여줄 때 쓴다. */
  events: ComputedEvent[];
}

/**
 * 커넥트 하나의 점수를 전부 다시 계산한다.
 *
 * 수동 정정(manual_adjustment)은 지우지 않는다. 사람이 근거를 적어
 * 넣은 행이라 계산으로 되살릴 수 없다.
 */
export async function recalculateConnectScores(
  tx: Tx,
  connectId: string,
  adminId?: string,
): Promise<RecalcResult> {
  const [c] = await tx
    .select({ capacity: connects.capacity })
    .from(connects)
    .where(eq(connects.id, connectId))
    .limit(1);

  if (!c) return { total: 0, events: [] };

  const rows = await tx
    .select({
      id: certifications.id,
      activityDate: certifications.activityDate,
      participantCount: certifications.ownParticipantCount,
      isSocial: certifications.isSocial,
      deliverableScore: certifications.deliverableScore,
      createdAt: certifications.createdAt,
    })
    .from(certifications)
    .where(
      and(eq(certifications.connectId, connectId), eq(certifications.reviewStatus, 'approved')),
    );

  const events = calculateScores(
    rows.map((r) => ({
      id: r.id,
      activityDate: r.activityDate,
      participantCount: r.participantCount,
      isSocial: r.isSocial,
      deliverableScore: r.deliverableScore,
      createdAt: r.createdAt.getTime(),
    })),
    c.capacity,
  );

  await tx
    .delete(scoreEvents)
    .where(
      and(eq(scoreEvents.connectId, connectId), ne(scoreEvents.eventType, 'manual_adjustment')),
    );

  if (events.length > 0) {
    await tx.insert(scoreEvents).values(
      events.map((e) => ({
        connectId,
        certificationId: e.certificationId,
        eventType: e.eventType,
        basePoints: e.basePoints,
        // G-07 이벤트 배율(2배 주간)은 규칙서 §6 에 없다. 배율을
        // 쓰기로 정해지면 score_multiplier_windows 를 읽어
        // finalPoints 를 곱하면 된다. 지금 1.0 을 넣어 두는 이유는
        // 나중에 배율이 붙어도 basePoints 가 그대로 남아 있어야
        // 정정과 소명이 가능하기 때문이다(§ 스키마 주석 G-16).
        multiplier: '1.0',
        finalPoints: e.finalPoints,
        weekStart: e.weekStart,
        reason: e.reason,
        createdBy: adminId ?? null,
      })),
    );
  }

  return { total: sumPoints(events), events };
}

/**
 * 규칙이 바뀐 뒤 전체를 다시 계산한다.
 *
 * 확정된 커넥트만 대상이다. 커넥트마다 트랜잭션을 따로 잡는다 —
 * 30팀을 한 트랜잭션에 묶으면 한 팀에서 실패했을 때 전부 되돌아가고,
 * 어느 팀에서 멈췄는지도 알기 어렵다.
 */
export async function recalculateAllConnects(
  adminId: string,
): Promise<{ connects: number; total: number }> {
  const targets = await db
    .select({ id: connects.id })
    .from(connects)
    .where(eq(connects.status, 'confirmed'));

  let total = 0;
  for (const t of targets) {
    const r = await db.transaction((tx) => recalculateConnectScores(tx, t.id, adminId));
    total += r.total;
  }
  return { connects: targets.length, total };
}

/* ── 조회 ──────────────────────────────────────────────── */

export interface ScoreBoardRow {
  connectId: string;
  name: string;
  capacity: number;
  total: number;
  /** 승인된 인증 건수. 점수가 0인데 인증이 있으면 규칙을 의심해 볼 자리다. */
  approvedCerts: number;
}

/**
 * 운영진 점수판.
 *
 * ⚠️ 서브쿼리는 테이블 별칭을 붙이고 양쪽을 모두 수식한다.
 * 드리즐의 ${connects.id} 를 select 투영 안에서 쓰면 "id" 한
 * 단어로만 펼쳐져 서브쿼리 안에서 다른 테이블의 id 로 해석된다.
 * 조용히 0 을 내므로 화면만 봐서는 모른다.
 */
const totalPoints = sql<number>`(
  SELECT COALESCE(SUM(se.final_points), 0)::int FROM score_events se
  WHERE se.connect_id = connects.id
)`;

const approvedCerts = sql<number>`(
  SELECT COUNT(*)::int FROM certifications ct
  WHERE ct.connect_id = connects.id AND ct.review_status = 'approved'
)`;

export async function listScoreBoard(): Promise<ScoreBoardRow[]> {
  const rows = await db
    .select({
      connectId: connects.id,
      name: connects.name,
      capacity: connects.capacity,
      total: totalPoints,
      approvedCerts,
    })
    .from(connects)
    .where(eq(connects.status, 'confirmed'));

  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ko'));
}

export interface ScoreEventRow {
  id: string;
  connectName: string;
  eventType: string;
  finalPoints: number;
  weekStart: string;
  reason: string | null;
  createdAt: Date;
}

/** 최근 점수 이벤트. 계산이 의도대로 붙었는지 눈으로 확인하는 용도다. */
export async function listRecentScoreEvents(limit = 60): Promise<ScoreEventRow[]> {
  return db
    .select({
      id: scoreEvents.id,
      connectName: connects.name,
      eventType: scoreEvents.eventType,
      finalPoints: scoreEvents.finalPoints,
      weekStart: scoreEvents.weekStart,
      reason: scoreEvents.reason,
      createdAt: scoreEvents.createdAt,
    })
    .from(scoreEvents)
    .innerJoin(connects, eq(scoreEvents.connectId, connects.id))
    .orderBy(desc(scoreEvents.weekStart), asc(connects.name), desc(scoreEvents.createdAt))
    .limit(limit);
}
