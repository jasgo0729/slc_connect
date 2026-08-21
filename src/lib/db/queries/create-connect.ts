import { randomBytes } from 'node:crypto';
import { db } from '../client';
import { connects, memberships } from '../schema';
import type { Connect } from '../schema';

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
