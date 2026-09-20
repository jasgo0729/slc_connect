import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../client';
import { CERT_SPECS, isCertifyExpired, type CertType } from '@/lib/connects/certification';
import { isDeliverableGrade } from '@/lib/scoring/rules';
import { recalculateConnectScores } from './scoring';
import {
  certificationParticipants,
  certifications,
  connects,
  memberships,
  roster,
  users,
} from '../schema';

/**
 * G-04 활동 인증.
 *
 * 인증은 점수의 유일한 근거다(G-14 개인 참여율도 여기서 나온다).
 * 그래서 누가 참여했는지를 사진과 함께 반드시 남긴다 —
 * 사진만 있으면 나중에 "나도 갔는데"를 확인할 방법이 없다.
 */
export type CertBlock =
  | 'NOT_MEMBER'
  | 'NOT_CONFIRMED' // 팀이 확정되기 전에는 활동이 시작되지 않았다
  | 'BAD_PARTICIPANTS'
  | 'FUTURE_DATE'
  | 'EXPIRED' // G-18 다음날 정오를 넘겼다
  | 'BAD_PHOTOS';

export const CERT_MESSAGES: Record<CertBlock, string> = {
  NOT_MEMBER: '참여 중인 커넥트가 아니에요.',
  NOT_CONFIRMED: '팀이 확정된 뒤부터 인증할 수 있어요.',
  BAD_PARTICIPANTS: '참여한 팀원을 골라주세요. 본인도 포함해야 해요.',
  FUTURE_DATE: '아직 오지 않은 날짜예요.',
  EXPIRED: '인증 기한이 지났어요. 활동 다음날 정오까지 올려야 해요.',
  BAD_PHOTOS: '필요한 사진을 모두 올려주세요.',
};

export interface CertInput {
  connectId: string;
  activityDate: string;
  activityType: CertType;
  onlinePlatform?: string | null;
  content: string;
  /** 유형이 요구하는 장수만큼. 순서가 곧 의미다. */
  photoKeys: string[];
  outputLink?: string | null;
  /** 참여한 팀원. 올리는 사람 자신도 들어가야 한다. */
  participantIds: string[];
  /** CCC — 함께한 상대 커넥트와 그쪽 참여자. */
  crossConnectId?: string | null;
  crossParticipantIds?: string[];
}

export type CertResult = { ok: true; id: string } | { ok: false; reason: CertBlock };

export async function submitCertification(
  userId: string,
  input: CertInput,
  today: string,
): Promise<CertResult> {
  if (input.activityDate > today) return { ok: false, reason: 'FUTURE_DATE' };

  // G-18 활동 다음날 정오까지. 서버가 시간을 판정한다 —
  // 브라우저 시계를 믿으면 뒤로 돌려 놓고 올릴 수 있다.
  if (isCertifyExpired(input.activityDate)) return { ok: false, reason: 'EXPIRED' };

  const spec = CERT_SPECS[input.activityType];
  const keys = input.photoKeys.filter(Boolean);
  if (!spec || keys.length !== spec.photos.length) {
    return { ok: false, reason: 'BAD_PHOTOS' };
  }

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: connects.id, status: connects.status, confirmedAt: connects.confirmedAt })
      .from(connects)
      .where(eq(connects.id, input.connectId))
      .limit(1);
    const c = rows[0];
    if (!c) return { ok: false, reason: 'NOT_MEMBER' } as const;

    // 올리는 사람이 이 커넥트 소속인지.
    const mine = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, input.connectId),
          eq(memberships.userId, userId),
          isNull(memberships.leftAt),
        ),
      )
      .limit(1);
    if (mine.length === 0) return { ok: false, reason: 'NOT_MEMBER' } as const;

    // 참여자가 전부 이 커넥트 소속인지. 화면에서 고르게 하지만
    // 액션은 폼을 거치지 않고 부를 수 있다.
    const members = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.connectId, input.connectId), isNull(memberships.leftAt)));

    const valid = new Set(members.map((m) => m.userId));
    const picked = [...new Set(input.participantIds)].filter((id) => valid.has(id));

    // 올린 사람이 빠져 있으면 남의 활동을 대신 올린 것이 된다.
    if (picked.length === 0 || !picked.includes(userId)) {
      return { ok: false, reason: 'BAD_PARTICIPANTS' } as const;
    }

    // CCC — 상대 커넥트 참여자도 그쪽 소속인지 확인한다.
    let crossPicked: string[] = [];
    if (input.activityType === 'cross' && input.crossConnectId) {
      const crossMembers = await tx
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(
          and(eq(memberships.connectId, input.crossConnectId), isNull(memberships.leftAt)),
        );
      const crossValid = new Set(crossMembers.map((m) => m.userId));
      crossPicked = [...new Set(input.crossParticipantIds ?? [])].filter((id) =>
        crossValid.has(id),
      );
      if (crossPicked.length === 0) return { ok: false, reason: 'BAD_PARTICIPANTS' } as const;
    }

    const inserted = await tx
      .insert(certifications)
      .values({
        connectId: input.connectId,
        submittedBy: userId,
        activityDate: input.activityDate,
        activityType: input.activityType,
        onlinePlatform: input.activityType === 'online' ? (input.onlinePlatform ?? null) : null,
        content: input.content,
        photoKeys: keys,
        outputLink: input.outputLink ?? null,
        ownParticipantCount: picked.length,
        crossConnectId: input.activityType === 'cross' ? (input.crossConnectId ?? null) : null,
        crossParticipantCount: input.activityType === 'cross' ? crossPicked.length : null,
      })
      .returning({ id: certifications.id });

    const certId = inserted[0]!.id;
    // 양쪽 참여자를 한 표에 담는다. 개인 참여율(G-14)은 소속과
    // 무관하게 "그날 왔는가"로 세기 때문이다.
    await tx
      .insert(certificationParticipants)
      .values([...picked, ...crossPicked].map((uid) => ({ certificationId: certId, userId: uid })));

    return { ok: true, id: certId } as const;
  });
}

/* ── 조회 ──────────────────────────────────────────────── */

export interface CertRow {
  id: string;
  connectId: string;
  connectName: string;
  activityDate: string;
  activityType: string;
  onlinePlatform: string | null;
  content: string;
  photoKeys: string[];
  outputLink: string | null;
  participantCount: number;
  crossConnectName: string | null;
  reviewStatus: string;
  rejectReason: string | null;
  submittedByName: string;
  createdAt: Date;
  /** §6.4 검수에서 표시한 친목 활동 여부. */
  isSocial: boolean;
  /** §6.6 검수에서 매긴 산출물 등급. null 이면 평가하지 않았다. */
  deliverableScore: number | null;
  /** §6.3 기준 인원 판정에 쓰는 정원. 검수 화면이 미달을 알려준다. */
  capacity: number;
}

const BASE = {
  id: certifications.id,
  connectId: certifications.connectId,
  connectName: connects.name,
  activityDate: certifications.activityDate,
  activityType: certifications.activityType,
  onlinePlatform: certifications.onlinePlatform,
  content: certifications.content,
  photoKeys: certifications.photoKeys,
  outputLink: certifications.outputLink,
  participantCount: certifications.ownParticipantCount,
  crossConnectName: sql<string | null>`(
    SELECT c2.name FROM connects c2 WHERE c2.id = certifications.cross_connect_id
  )`,
  reviewStatus: certifications.reviewStatus,
  rejectReason: certifications.rejectReason,
  submittedByName: roster.name,
  createdAt: certifications.createdAt,
  isSocial: certifications.isSocial,
  deliverableScore: certifications.deliverableScore,
  capacity: connects.capacity,
};

/** 커넥트의 인증 목록. 팀원이 본다. */
export async function listByConnect(connectId: string): Promise<CertRow[]> {
  return db
    .select(BASE)
    .from(certifications)
    .innerJoin(connects, eq(certifications.connectId, connects.id))
    .innerJoin(users, eq(certifications.submittedBy, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(eq(certifications.connectId, connectId))
    .orderBy(desc(certifications.activityDate), desc(certifications.createdAt));
}

/**
 * G-05 검수 대기 목록.
 *
 * 오래 기다린 것부터 본다. 늦게 올린 사람이 먼저 처리되면
 * 먼저 올린 팀은 계속 밀린다.
 */
export async function listPendingReview(limit = 50): Promise<CertRow[]> {
  return db
    .select(BASE)
    .from(certifications)
    .innerJoin(connects, eq(certifications.connectId, connects.id))
    .innerJoin(users, eq(certifications.submittedBy, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(eq(certifications.reviewStatus, 'pending'))
    .orderBy(asc(certifications.createdAt))
    .limit(limit);
}

export async function countPendingReview(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(certifications)
    .where(eq(certifications.reviewStatus, 'pending'));
  return rows[0]?.n ?? 0;
}

/** 인증 하나의 참여자 이름. 검수할 때 사진과 대조한다. */
export async function getParticipants(certId: string): Promise<string[]> {
  const rows = await db
    .select({ name: roster.name })
    .from(certificationParticipants)
    .innerJoin(users, eq(certificationParticipants.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(eq(certificationParticipants.certificationId, certId));
  return rows.map((r) => r.name);
}

/* ── 검수 ──────────────────────────────────────────────── */

export type ReviewResult =
  | {
      ok: true;
      connectId: string;
      submittedBy: string;
      connectName: string;
      /** 이 인증에 붙은 점수. 승인 직후 운영진에게 보여준다. */
      awarded: number;
      /** 재계산 뒤 이 커넥트의 총점. */
      total: number;
    }
  | { ok: false; reason: string };

/** §6.4·§6.6 검수자가 함께 정하는 것. 승인할 때만 쓰인다. */
export interface ReviewOptions {
  /** 주제와 무관한 친목 활동으로 표시. 기본 점수 대신 초과분(2점)만 받는다. */
  isSocial?: boolean;
  /** 산출물 등급 0/5/10/15. undefined 면 손대지 않는다. */
  deliverableScore?: number | null;
}

export async function reviewCertification(
  adminId: string,
  certId: string,
  approve: boolean,
  reason?: string,
  opts: ReviewOptions = {},
): Promise<ReviewResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: certifications.id,
        status: certifications.reviewStatus,
        connectId: certifications.connectId,
        submittedBy: certifications.submittedBy,
        connectName: connects.name,
      })
      .from(certifications)
      .innerJoin(connects, eq(certifications.connectId, connects.id))
      .where(eq(certifications.id, certId))
      .for('update')
      .limit(1);

    const c = rows[0];
    if (!c) return { ok: false, reason: '인증을 찾을 수 없어요.' } as const;
    if (c.status !== 'pending') return { ok: false, reason: '이미 처리된 인증이에요.' } as const;

    // 등급은 규칙서에 있는 값만 받는다(§6.6). 화면에서 고르게
    // 하지만 액션은 폼을 거치지 않고 부를 수 있다.
    const grade =
      opts.deliverableScore === undefined || opts.deliverableScore === null
        ? undefined
        : isDeliverableGrade(opts.deliverableScore)
          ? opts.deliverableScore
          : undefined;

    await tx
      .update(certifications)
      .set({
        reviewStatus: approve ? 'approved' : 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: approve ? null : (reason ?? null),
        ...(approve ? { isSocial: opts.isSocial === true } : {}),
        ...(approve && grade !== undefined ? { deliverableScore: grade } : {}),
      })
      .where(eq(certifications.id, certId));

    /* 규칙서 §6 의 점수를 여기서 붙인다.
       한 건을 더하는 것이 아니라 이 커넥트의 점수를 통째로 다시
       계산한다 — 승인 순서가 아니라 활동일 순서로 §6.2 의 주 2회를
       매겨야 하기 때문이다. 자세한 이유는 queries/scoring.ts 참고.

       반려일 때도 돌린다. 이미 승인했던 건을 나중에 되돌리는 길이
       생기면 그때 점수가 저절로 빠져야 한다. 멱등이라 지금 돌려도
       결과는 같다. */
    const recalc = await recalculateConnectScores(tx, c.connectId, adminId);
    const awarded = recalc.events
      .filter((e) => e.certificationId === certId)
      .reduce((n, e) => n + e.finalPoints, 0);

    return {
      ok: true,
      connectId: c.connectId,
      submittedBy: c.submittedBy,
      connectName: c.connectName,
      awarded,
      total: recalc.total,
    } as const;
  });
}

/** 삭제된 인증의 사진 키. S3 에서도 지우려면 필요하다. */
export async function getPhotoKeys(certId: string): Promise<string[]> {
  const rows = await db
    .select({ keys: certifications.photoKeys })
    .from(certifications)
    .where(eq(certifications.id, certId))
    .limit(1);
  return rows[0]?.keys ?? [];
}

/* ── 화면 재료 ─────────────────────────────────────────── */

/** 커넥트의 참여자 이름. 인증 화면의 체크 목록이다. */
export async function getMemberNames(
  connectId: string,
): Promise<{ userId: string; name: string }[]> {
  return db
    .select({ userId: users.id, name: roster.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(and(eq(memberships.connectId, connectId), isNull(memberships.leftAt)))
    .orderBy(desc(memberships.role), asc(memberships.joinedAt));
}

/**
 * CCC 에서 고를 수 있는 다른 커넥트.
 *
 * 확정된 팀만 낸다. 아직 구성 중인 팀과 함께 활동했다고 하면
 * 그 팀의 참여자 목록이 나중에 바뀐다.
 */
export async function getCrossCandidates(excludeId: string): Promise<
  { id: string; name: string; members: { userId: string; name: string }[] }[]
> {
  const rows = await db
    .select({ id: connects.id, name: connects.name })
    .from(connects)
    .where(and(eq(connects.status, 'confirmed'), ne(connects.id, excludeId)))
    .orderBy(asc(connects.name));

  return Promise.all(
    rows.map(async (r) => ({ ...r, members: await getMemberNames(r.id) })),
  );
}
