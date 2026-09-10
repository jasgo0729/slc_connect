import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { memberships, notifications } from '@/lib/db/schema';

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
