import { and, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { applications, connects, memberships, roster, users } from '../schema';

/**
 * B-02 커넥트 상세.
 *
 * 로그인한 사람에게만 보이는 화면이라 참여자 이름을 함께 가져온다.
 * 이름은 성만 남기고 가린다(김OO) — 목록(카드)에는 인원 수까지,
 * 상세에는 이름·기수·SLC까지, 프로필을 눌러야 선택 항목까지 보이는
 * 3층 구조의 가운데다(All-04).
 */

export interface ConnectDetail {
  id: string;
  name: string;
  track: string;
  tagline: string;
  description: string | null;
  campus: string;
  location: string | null;
  contact: string | null;
  capacity: number;
  status: string;
  isPublic: boolean;
  /** TF가 미리 열어 둔 커넥트. 성격이 달라 안내가 필요하다. */
  isPreCreated: boolean;
  inviteToken: string;
  availableDays: number[];
  conditions: string[];
  goalType: string | null;
  goalDetail: string | null;
  goalDate: string | null;
  activityPeriod: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  /** C-09 개설 반려 사유. 팀장에게만 의미가 있다. */
  rejectionReason: string | null;

  members: { id: string; label: string; residence: string | null; role: string }[];
  /** 보는 사람의 상태. 화면 하단 버튼이 이 값으로 갈린다. */
  viewer: {
    isLeader: boolean;
    isMember: boolean;
    application: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
    /** D-12 취소에 필요하다. */
    applicationId: string | null;
    /** D-03 거절 사유. 결과 화면에서 신청자에게 보여준다. */
    rejectReason: string | null;
  };
}

/** 이름 가리기. 성만 남긴다. */
function maskName(name: string): string {
  const n = name.trim();
  if (n.length <= 1) return n;
  return n[0] + 'O'.repeat(Math.min(n.length - 1, 2));
}

export async function getConnectDetail(
  id: string,
  viewerId: string,
): Promise<ConnectDetail | null> {
  const rows = await db.select().from(connects).where(eq(connects.id, id)).limit(1);
  const c = rows[0];
  if (!c) return null;

  const memberRows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      joinedAt: memberships.joinedAt,
      name: roster.name,
      cohort: roster.cohort,
      residence: users.residence,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(roster, eq(users.studentNo, roster.studentNo))
    .where(and(eq(memberships.connectId, id), sql`${memberships.leftAt} IS NULL`))
    .orderBy(memberships.joinedAt);

  const appRows = await db
    .select({
      id: applications.id,
      status: applications.status,
      rejectReason: applications.rejectReason,
    })
    .from(applications)
    .where(and(eq(applications.connectId, id), eq(applications.userId, viewerId)))
    .orderBy(sql`${applications.appliedAt} DESC`)
    .limit(1);

  const mine = memberRows.find((m) => m.userId === viewerId);

  return {
    id: c.id,
    name: c.name,
    track: c.track,
    tagline: c.tagline,
    description: c.description,
    campus: c.campus,
    location: c.location,
    contact: c.contact,
    capacity: c.capacity,
    status: c.status,
    isPublic: c.isPublic,
    isPreCreated: c.isPreCreated,
    inviteToken: c.inviteToken,
    availableDays: c.availableDays ?? [],
    conditions: c.conditions ?? [],
    goalType: c.goalType,
    goalDetail: c.goalDetail,
    goalDate: c.goalDate,
    activityPeriod: c.activityPeriod,
    confirmedAt: c.confirmedAt,
    createdAt: c.createdAt,
    rejectionReason: c.rejectionReason,

    members: memberRows.map((m) => ({
      id: m.userId,
      label: `${m.cohort} ${maskName(m.name)}`,
      residence: m.residence,
      role: m.role,
    })),

    viewer: {
      isLeader: mine?.role === 'leader',
      isMember: Boolean(mine),
      application: (appRows[0]?.status as ConnectDetail['viewer']['application']) ?? null,
      applicationId: appRows[0]?.id ?? null,
      rejectReason: appRows[0]?.rejectReason ?? null,
    },
  };
}

/**
 * 방학 중 거주지 분포.
 *
 * 시·도 단위까지만 묶는다. "서울특별시 강남구"를 그대로 보여주면
 * 네 명뿐인 팀에서 누가 어디 사는지가 사실상 드러난다.
 * 입력하지 않은 사람은 세지 않는다.
 */
export function summarizeResidence(
  members: { residence: string | null }[],
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    if (!m.residence?.trim()) continue;
    const region = m.residence.trim().split(/\s+/)[0]!;
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
