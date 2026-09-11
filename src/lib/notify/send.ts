import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { favorites, memberships, notifications } from '@/lib/db/schema';

/**
 * 알림 발송 (H절).
 *
 * 지금은 앱 안의 알림함에만 쌓는다. 웹 푸시와 이메일은 붙는 대로
 * 같은 자리에서 함께 나가게 하면 된다.
 *
 * 중요한 것만 보낸다. 찜이나 조회 같은 것까지 알리면 알림함이
 * 잡음으로 차고, 정작 승인 결과를 놓친다.
 *
 * 어떤 함수도 예외를 던지지 않는다. 알림을 못 보낸 것 때문에
 * 승인이나 개설 같은 본 작업이 되돌려지면 안 된다.
 */
export type NotifyType =
  | 'connect_approved' // 도전 개설이 승인됨
  | 'connect_rejected' // 도전 개설이 반려됨
  | 'application_received' // 내 커넥트에 신청이 들어옴
  | 'member_joined' // 취미 커넥트에 바로 합류함
  | 'application_approved' // 내 신청이 승인됨
  | 'application_rejected' // 내 신청이 거절됨
  | 'favorite_milestone' // 내 커넥트가 관심을 받음 (1·5·10건)
  | 'favorite_capacity' // 찜한 커넥트의 정원이 바뀜
  | 'favorite_closing' // 찜한 커넥트의 자리가 얼마 안 남음
  | 'short_warning' // 인원 미달 경고 (D-10)
  | 'season_confirmed'
  | 'notice';

interface Payload {
  userId: string;
  type: NotifyType;
  title: string;
  body: string;
  link?: string | null;
}

async function push(rows: Payload[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    await db.insert(notifications).values(
      rows.map((r) => ({
        userId: r.userId,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link ?? null,
      })),
    );
  } catch (err) {
    // 알림은 부수적이다. 실패해도 본 작업은 이미 끝났다.
    console.error('[notify] 발송 실패', err);
  }
}

/** 커넥트의 현재 팀장. 없으면 null(사전 개설 커넥트). */
async function leaderOf(connectId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.connectId, connectId),
          eq(memberships.role, 'leader'),
          sql`${memberships.leftAt} IS NULL`,
        ),
      )
      .limit(1);
    return rows[0]?.userId ?? null;
  } catch {
    return null;
  }
}

/* ── J-05 개설 확인 결과 → 개설자 ─────────────────────── */

export async function notifyConnectApproved(
  userId: string,
  connectId: string,
  name: string,
): Promise<void> {
  await push([
    {
      userId,
      type: 'connect_approved',
      title: '커넥트가 승인됐어요',
      body: `'${name}'이(가) 씨앗판에 올라갔어요. 이제 신청을 받을 수 있어요.`,
      link: `/connects/${connectId}`,
    },
  ]);
}

export async function notifyConnectRejected(
  userId: string,
  connectId: string,
  name: string,
  reason: string,
): Promise<void> {
  await push([
    {
      userId,
      type: 'connect_rejected',
      title: '커넥트가 반려됐어요',
      // 사유를 알림에 담는다. 들어가서 다시 찾게 하면 그만큼 늦어진다.
      body: `'${name}' — ${reason}`,
      link: `/connects/${connectId}/edit`,
    },
  ]);
}

/* ── D-01 신청 도착 → 팀장 ────────────────────────────── */

export async function notifyApplicationReceived(
  connectId: string,
  connectName: string,
  applicantName: string,
  immediate: boolean,
): Promise<void> {
  const leader = await leaderOf(connectId);
  if (!leader) return;

  await push([
    {
      userId: leader,
      type: immediate ? 'member_joined' : 'application_received',
      title: immediate ? '새 팀원이 합류했어요' : '새 신청이 도착했어요',
      body: immediate
        ? `${applicantName}님이 '${connectName}'에 합류했어요.`
        : `${applicantName}님이 '${connectName}'에 신청했어요. 확인해 주세요.`,
      link: immediate ? `/connects/${connectId}` : `/connects/${connectId}/manage`,
    },
  ]);
}

/* ── D-02 승인·거절 결과 → 신청자 ─────────────────────── */

export async function notifyApplicationDecided(
  userId: string,
  connectId: string,
  connectName: string,
  approved: boolean,
  reason?: string,
): Promise<void> {
  await push([
    {
      userId,
      type: approved ? 'application_approved' : 'application_rejected',
      title: approved ? '신청이 승인됐어요' : '아쉽지만 함께하지 못했어요',
      body: approved
        ? `'${connectName}'에 참여가 확정됐어요.`
        : `'${connectName}' — ${reason ?? '이번에는 함께하기 어려울 것 같아요.'}`,
      link: approved ? `/connects/${connectId}` : '/connects',
    },
  ]);
}

/* ── D-08 찜 관련 ──────────────────────────────────────── */

/**
 * 같은 알림을 이미 보냈는지.
 *
 * 찜은 켰다 껐다 할 수 있어서 임계값을 여러 번 넘나든다.
 * 제목까지 같으면 이미 보낸 것으로 보고 건너뛴다.
 */
async function alreadySent(userId: string, type: NotifyType, title: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, type),
          eq(notifications.title, title),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    // 확인에 실패하면 보내지 않는다. 중복이 안 보내는 것보다 나쁘다.
    return true;
  }
}

/** 관심도가 눈에 띄게 쌓였을 때만 알린다. 매 건 보내면 잡음이 된다. */
const FAVORITE_MILESTONES = [1, 5, 10];

export async function notifyFavoriteMilestone(
  connectId: string,
  connectName: string,
  count: number,
): Promise<void> {
  if (!FAVORITE_MILESTONES.includes(count)) return;

  const leader = await leaderOf(connectId);
  if (!leader) return;

  const title =
    count === 1 ? '누군가 관심을 보였어요' : `${count}명이 찜했어요`;
  if (await alreadySent(leader, 'favorite_milestone', title)) return;

  await push([
    {
      userId: leader,
      type: 'favorite_milestone',
      title,
      body:
        count === 1
          ? `'${connectName}'을(를) 찜한 사람이 생겼어요. 초대 링크를 한 번 더 공유해 보세요.`
          : `'${connectName}'에 관심이 모이고 있어요.`,
      link: `/connects/${connectId}`,
    },
  ]);
}

/** 찜한 사람 중 아직 참여하지 않은 사람. 알림 대상이다. */
async function favoriteWatchers(connectId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ userId: favorites.userId })
      .from(favorites)
      .where(eq(favorites.connectId, connectId));

    const members = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.connectId, connectId), sql`${memberships.leftAt} IS NULL`));

    const joined = new Set(members.map((m) => m.userId));
    return rows.map((r) => r.userId).filter((id) => !joined.has(id));
  } catch {
    return [];
  }
}

/** 정원이 바뀌면 찜한 사람의 판단이 달라진다. */
export async function notifyCapacityChanged(
  connectId: string,
  connectName: string,
  from: number,
  to: number,
): Promise<void> {
  const watchers = await favoriteWatchers(connectId);
  if (watchers.length === 0) return;

  await push(
    watchers.map((userId) => ({
      userId,
      type: 'favorite_capacity' as const,
      title: to > from ? '찜한 커넥트에 자리가 늘었어요' : '찜한 커넥트의 정원이 바뀌었어요',
      body: `'${connectName}' 정원이 ${from}명에서 ${to}명으로 바뀌었어요.`,
      link: `/connects/${connectId}`,
    })),
  );
}

/**
 * 자리가 얼마 안 남았을 때.
 *
 * 한 자리 남은 시점과 다 찬 시점에만 보낸다. 들어올 때마다 보내면
 * 찜해 둔 사람의 알림함이 그 커넥트로만 찬다.
 */
export async function notifyClosingSoon(
  connectId: string,
  connectName: string,
  remaining: number,
): Promise<void> {
  if (remaining !== 1 && remaining !== 0) return;

  const watchers = await favoriteWatchers(connectId);
  if (watchers.length === 0) return;

  const title = remaining === 0 ? '찜한 커넥트의 자리가 찼어요' : '찜한 커넥트에 한 자리 남았어요';

  const rows: Payload[] = [];
  for (const userId of watchers) {
    if (await alreadySent(userId, 'favorite_closing', title)) continue;
    rows.push({
      userId,
      type: 'favorite_closing',
      title,
      body:
        remaining === 0
          ? `'${connectName}'이(가) 정원을 채웠어요.`
          : `'${connectName}'에 한 자리만 남았어요. 마음이 있다면 지금 신청해 주세요.`,
      link: `/connects/${connectId}`,
    });
  }
  await push(rows);
}

/* ── D-10 인원 미달 경고 ───────────────────────────────── */

/**
 * 마감 전 미달 경고.
 *
 * 팀장에게 지금 몇 명이고 몇 명이 더 필요한지 숫자로 알린다.
 * "인원이 부족합니다"만으로는 무엇을 해야 할지 알 수 없다.
 */
export async function notifyShortWarning(
  connectId: string,
  connectName: string,
  memberCount: number,
  minimum = 4,
): Promise<boolean> {
  const leader = await leaderOf(connectId);
  if (!leader) return false;

  const short = Math.max(0, minimum - memberCount);
  await push([
    {
      userId: leader,
      type: 'short_warning',
      title: '인원이 모자라요',
      body: `'${connectName}' 현재 ${memberCount}명 신청 중입니다. 최소 인원 ${minimum}명까지 ${short}명 남았어요. 마감일까지 인원이 채워지지 않으면 팀이 해산될 수 있으니, 발급받으신 초대 링크를 주변에 한 번 더 공유해 보세요.`,
      link: `/connects/${connectId}`,
    },
  ]);
  return true;
}
