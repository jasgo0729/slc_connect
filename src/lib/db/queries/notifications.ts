import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { notifications } from '../schema';

/**
 * 알림 목록 (H절).
 *
 * 아직 알림을 보내는 쪽이 없어 대부분 비어 있다. 그래도 화면과
 * 조회를 먼저 두는 이유는, 승인·거절 결과를 알리는 자리가
 * 이미 여러 화면에서 "알림으로 알려드릴게요"라고 약속하고 있어서다.
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

/** 안 읽은 개수. 상단 바와 탭바의 배지에 쓴다. */
export async function countUnread(userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
  return rows[0]?.n ?? 0;
}

/** 목록을 열면 전부 읽음으로 표시한다. 개별 읽음 표시는 두지 않는다. */
export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
}
