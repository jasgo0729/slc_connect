import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { certifications, connects, memberships, scoreEvents } from '../schema';

/**
 * G-13 커넥트 랭킹 · 활동 모드 팀 페이지(시안 30~32).
 *
 * 점수 집계 규칙은 아직 확정되지 않았다. 그래서 여기서는 점수를
 * **만들지 않고 읽기만** 한다 — score_events 에 쌓인 것을 더할
 * 뿐이라, 규칙이 바뀌어도 이 파일과 화면은 그대로다.
 * 점수를 쌓는 자리는 lib/db/queries/certifications.ts 의
 * reviewCertification() 안이다.
 *
 * 집계 범위는 누적이다. 이유는 lib/connects/score-events.ts 의
 * RANKING_PERIOD_LABEL 주석 참고. 주간으로 바꿀 때 고칠 곳은
 * 이 파일에서 rawRanking() 의 점수 서브쿼리 한 줄이다.
 */

/* ── 타입 ──────────────────────────────────────────────── */

/**
 * 팀 페이지가 그리는 참여자.
 *
 * 이름 가리기(김OO)는 getConnectDetail 이 이미 하고 있어 그 결과를
 * 그대로 받는다. 여기서 다시 조회하면 가리는 규칙이 두 벌이 되고,
 * 한쪽만 고쳐져 어긋난다.
 */
export interface TeamMember {
  id: string;
  /** '1기 김OO' — 랭킹·팀 페이지에서 이름은 가린다(규칙 14). */
  label: string;
  role: string;
}

export interface ScoreEntry {
  id: string;
  /** '활동 인증' 같은 사람이 읽는 이름. 원본 유형도 함께 남긴다. */
  eventType: string;
  /** 'YYYY-MM-DD'. 표기는 화면에서 한다. */
  date: string;
  points: number;
  /** 운영진이 남긴 근거. 조정 건에서 특히 중요하다. */
  reason: string | null;
}

export interface RankRow {
  /** 부분 공개(partial)에서는 null. 순위 자체를 감춘다. */
  rank: number | null;
  connectId: string;
  name: string;
  campus: string;
  track: string;
  memberCount: number;
  capacity: number;
  /** 부분 공개에서는 null. */
  points: number | null;
}

export type RankingMode = 'full' | 'partial' | 'hidden';

/* ── 랭킹 ──────────────────────────────────────────────── */

/**
 * 인원·점수 서브쿼리.
 *
 * ⚠️ 테이블 이름과 컬럼을 문자열로 그대로 적는다. 드리즐의
 * ${connects.id} 를 select 안에서 쓰면 "id" 한 단어로만 펼쳐지고,
 * 그 "id" 는 서브쿼리 안에서 memberships.id 로 해석되어 결과가
 * 언제나 0이 된다. 이 프로젝트에서 가장 많이 반복된 실수이고,
 * 조용히 틀린 값을 내므로 눈에 띄지도 않는다.
 * lib/db/queries/connects.ts 가 같은 이유로 같은 형태를 쓴다.
 *
 * 별칭(m, se)을 붙이고 양쪽을 모두 수식하는 것이 핵심이다.
 */
const memberCount = sql<number>`(
  SELECT COUNT(*)::int FROM memberships m
  WHERE m.connect_id = connects.id AND m.left_at IS NULL
)`;

/**
 * 집계 범위를 주간으로 좁힐 때 고칠 자리.
 *   AND se.week_start = <이번 주 월요일>
 */
const points = sql<number>`(
  SELECT COALESCE(SUM(se.final_points), 0)::int FROM score_events se
  WHERE se.connect_id = connects.id
)`;

interface RawRank {
  connectId: string;
  name: string;
  campus: string;
  track: string;
  capacity: number;
  memberCount: number;
  points: number;
}

async function rawRanking(): Promise<RawRank[]> {
  return db
    .select({
      connectId: connects.id,
      name: connects.name,
      campus: connects.campus,
      track: connects.track,
      capacity: connects.capacity,

      memberCount,
      points,
    })
    .from(connects)
    // 확정된 팀만 겨룬다. 모집이 끝나지 않았거나 반려된 커넥트가
    // 0점으로 목록 바닥에 깔리면, 활동 중인 팀 수를 알 수 없다.
    .where(eq(connects.status, 'confirmed'));
}

/**
 * 전체 순위.
 *
 * 동점은 같은 순위를 주고 다음 순위를 건너뛴다(1·2·2·4).
 * 30팀 규모라 정렬과 등수 매기기는 여기서 한다 — SQL 윈도우
 * 함수를 쓰면 빨라지지만, 동점 처리 규칙이 코드에서 안 보인다.
 */
export async function listRanking(mode: RankingMode): Promise<RankRow[]> {
  if (mode === 'hidden') return [];

  const raw = await rawRanking();
  raw.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'ko'));

  let rank = 0;
  let prev: number | null = null;
  const ranked = raw.map((r, i) => {
    if (prev === null || r.points !== prev) {
      rank = i + 1;
      prev = r.points;
    }
    return { ...r, rank };
  });

  if (mode === 'partial') {
    // 상위 5팀의 팀명만 보여준다(G-13 막판 비공개 구간).
    // 순위와 점수를 비우는 것만으로는 부족하다 — 목록 순서가
    // 곧 등수라서, 이름순으로 다시 섞어야 5팀 안의 서열이
    // 드러나지 않는다.
    return ranked
      .slice(0, 5)
      .map((r) => ({ ...r, rank: null, points: null }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  return ranked;
}

/** 히어로 카드에 띄울 상위 몇 팀. 목록과 같은 함수를 거쳐 기준이 어긋나지 않게 한다. */
export async function listTopRanking(mode: RankingMode, limit = 3): Promise<RankRow[]> {
  const rows = await listRanking(mode);
  return rows.slice(0, limit);
}

/**
 * 내가 속한 확정 커넥트.
 *
 * 한 사람은 트랙당 하나에만 속하므로 최대 2개다(취미 1 + 도전 1).
 * 시안은 한 팀만 그리지만 둘일 수 있어 목록으로 돌려준다.
 */
export async function getMyConfirmedConnectIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ connectId: memberships.connectId })
    .from(memberships)
    .innerJoin(connects, eq(memberships.connectId, connects.id))
    .where(
      and(
        eq(memberships.userId, userId),
        isNull(memberships.leftAt),
        eq(connects.status, 'confirmed'),
      ),
    );
  return rows.map((r) => r.connectId);
}

/* ── 팀 페이지 ─────────────────────────────────────────── */

export interface TeamView {
  /** 랭킹에 오르지 않은 커넥트(미확정 등)는 null. */
  rank: number | null;
  points: number | null;
  instagram: string | null;
  scores: ScoreEntry[];
}

/**
 * 시안 31·32에 필요한 것.
 *
 * 점수 내역은 팀원에게만 의미가 있어 withScores 로 가른다.
 * 남의 팀 점수 내역을 누구나 볼 이유가 없고, 조회마다 인증
 * 조인을 돌릴 이유도 없다.
 */
export async function getTeamView(
  connectId: string,
  opts: { mode: RankingMode; withScores: boolean },
): Promise<TeamView> {
  const [row] = await db
    .select({ instagram: connects.instagram })
    .from(connects)
    .where(eq(connects.id, connectId))
    .limit(1);

  const ranking = await listRanking(opts.mode);
  const mine = ranking.find((r) => r.connectId === connectId) ?? null;

  const scores = opts.withScores ? await listTeamScores(connectId) : [];

  return {
    rank: mine?.rank ?? null,
    points: mine?.points ?? null,
    instagram: row?.instagram ?? null,
    scores,
  };
}

/**
 * 최근 점수 획득 내역.
 *
 * 날짜는 활동일을 쓴다. score_events.week_start 는 검수 시점에
 * 정해지는 값이라, 그대로 보여주면 "우리가 모인 날"과 다른
 * 날짜가 뜬다. 인증과 이어지지 않은 조정 건만 week_start 로
 * 대신한다.
 *
 * 20건에서 끊는다. 한 학기 내역을 다 그리면 화면 아래 버튼이
 * 한참 밀려나고, 정작 필요한 것은 최근 몇 건이다.
 */
export async function listTeamScores(connectId: string, limit = 20): Promise<ScoreEntry[]> {
  const rows = await db
    .select({
      id: scoreEvents.id,
      eventType: scoreEvents.eventType,
      points: scoreEvents.finalPoints,
      reason: scoreEvents.reason,
      weekStart: scoreEvents.weekStart,
      activityDate: certifications.activityDate,
      createdAt: scoreEvents.createdAt,
    })
    .from(scoreEvents)
    .leftJoin(certifications, eq(scoreEvents.certificationId, certifications.id))
    .where(eq(scoreEvents.connectId, connectId))
    .orderBy(
      desc(sql`COALESCE(${certifications.activityDate}, ${scoreEvents.weekStart})`),
      desc(scoreEvents.createdAt),
    )
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    date: r.activityDate ?? r.weekStart,
    points: r.points,
    reason: r.reason,
  }));
}

/* ── 인스타그램 ────────────────────────────────────────── */

export type InstagramResult = { ok: true; value: string | null } | { ok: false; reason: string };

/**
 * 커넥트 인스타그램 저장. 팀장만.
 *
 * 권한 검사를 별도 SELECT 로 먼저 하지 않고 UPDATE 의 조건에
 * 넣었다. 두 문장으로 나누면 그 사이에 팀장이 바뀔 수 있고,
 * 무엇보다 "검사를 깜빡한 경로"가 생길 여지가 없어진다.
 * 서버 액션은 폼을 거치지 않고 직접 부를 수 있으므로(규칙 6)
 * 화면에서 버튼을 감추는 것만으로는 모자란다.
 *
 * 값은 이미 정규화된 것이 들어온다(normalizeInstagram).
 * null 이면 지운다.
 */
export async function setInstagram(
  userId: string,
  connectId: string,
  value: string | null,
): Promise<InstagramResult> {
  const updated = await db
    .update(connects)
    .set({ instagram: value })
    .where(
      and(
        eq(connects.id, connectId),
        // 위와 같은 이유로 테이블·컬럼을 그대로 적는다. 값(userId)만
        // 바인딩한다.
        sql`EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.connect_id = connects.id
            AND m.user_id = ${userId}
            AND m.role = 'leader'
            AND m.left_at IS NULL
        )`,
      ),
    )
    .returning({ instagram: connects.instagram });

  // 행이 없다는 것은 커넥트가 없거나 팀장이 아니라는 뜻이다.
  // 둘을 구분해 알려주지 않는다 — 어느 쪽이든 할 수 있는 일이 같다.
  if (updated.length === 0) {
    return { ok: false, reason: '팀장만 수정할 수 있어요.' };
  }
  return { ok: true, value: updated[0]!.instagram };
}
