import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { connects, memberships } from '../schema';
import type { Connect } from '../schema';

/** 개설을 막는 상태. 지워지거나 반려된 커넥트는 세지 않는다. */
const ACTIVE = ['recruiting', 'full_closed', 'early_closed', 'private', 'pending_review', 'confirmed'];

/**
 * 이미 같은 트랙의 커넥트에 속해 있는지.
 *
 * 한 사람은 트랙당 하나에만 속한다 — 취미 하나, 도전 하나까지.
 * 개설이든 참여든 같은 제한이다. 팀장 역할만 세면 이미 다른 팀에
 * 참여 중인 사람이 같은 트랙의 팀을 또 만들 수 있게 된다.
 *
 * 두 트랙을 병행하는 것은 허용한다. 성격과 점수 계산이 아예 달라
 * 서로 방해하지 않는다.
 */
export async function hasConnectInTrack(userId: string, track: string): Promise<boolean> {
  const rows = await db
    .select({ id: connects.id })
    .from(memberships)
    .innerJoin(connects, eq(memberships.connectId, connects.id))
    .where(
      and(
        eq(memberships.userId, userId),
        sql`${memberships.leftAt} IS NULL`,
        eq(connects.track, track),
        inArray(connects.status, ACTIVE),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * C-01~C-10 커넥트 개설.
 *
 * 커넥트 생성과 팀장 membership 삽입은 반드시 같은 트랜잭션이어야 한다.
 * 커넥트만 만들어지고 팀장이 없으면 관리 화면에 아무도 들어갈 수 없고,
 * 인원이 0이라 정원 계산도 어긋난다(schema.ts 주의 3).
 *
 * 인원은 팀장을 포함해 세므로 개설 직후 memberCount는 1이다.
 */
export interface CreateInput {
  name: string;
  track: 'quantitative' | 'qualitative';
  tagline: string;
  description: string;
  campus: string;
  location?: string | null;
  capacity: number;
  availableDays: number[];
  conditions: string[];
  contact?: string | null;
  isPublic: boolean;
  goalType?: string | null;
  goalDetail?: string | null;
  goalDate?: string | null;
  activityPeriod?: string | null;
}

export async function createConnect(userId: string, input: CreateInput): Promise<Connect> {
  const isQual = input.track === 'qualitative';

  // C-07 정량은 즉시 등록, C-08 정성은 확인 대기.
  // C-11 비공개는 목록에 오르지 않는다.
  const status = isQual ? 'pending_review' : input.isPublic ? 'recruiting' : 'private';

  // C-10 초대 링크. 추측할 수 없어야 하므로 난수로 만든다.
  const inviteToken = randomBytes(12).toString('base64url');

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(connects)
      .values({
        name: input.name,
        track: input.track,
        tagline: input.tagline,
        description: input.description,
        campus: input.campus,
        location: input.location ?? null,
        createdBy: userId,
        contact: input.contact ?? null,
        capacity: input.capacity,
        availableDays: input.availableDays,
        conditions: input.conditions,
        isPublic: input.isPublic,
        status,
        inviteToken,
        goalType: isQual ? (input.goalType ?? null) : null,
        goalDetail: isQual ? (input.goalDetail ?? null) : null,
        goalDate: isQual ? (input.goalDate ?? null) : null,
        activityPeriod: isQual ? (input.activityPeriod ?? null) : null,
      })
      .returning();

    const created = rows[0]!;

    await tx.insert(memberships).values({
      connectId: created.id,
      userId,
      role: 'leader',
    });

    return created;
  });
}
