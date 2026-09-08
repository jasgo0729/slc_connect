import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { TabBar } from '@/components/tab-bar';
import { IconBell } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { listNotifications, markAllRead } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';

/**
 * 알림 목록 (H절).
 *
 * 아직 알림을 보내는 쪽이 없어 대부분 비어 있다. 그래도 화면을
 * 먼저 두는 이유는 여러 화면이 이미 "알림으로 알려드릴게요"라고
 * 약속하고 있어서다 — 목적지가 없으면 그 약속이 거짓말이 된다.
 *
 * 목록을 열면 전부 읽음으로 표시한다. 개별 읽음 표시는 두지 않는다.
 * 알림 수가 많지 않아 하나씩 관리할 이유가 없다.
 */
function timeAgo(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Fnotifications');

  const items = await listNotifications(user.id);
  const hadUnread = items.some((n) => !n.readAt);

  // 목록을 만든 뒤에 읽음 처리한다. 먼저 처리하면 이번에 새로 온
  // 알림이 읽은 것으로 보여 눈에 띄지 않는다.
  if (hadUnread) await markAllRead(user.id);

  return (
    <>
      <AppBar current="/notifications" user={{ id: user.id, name: user.name }} />

      <main className="page shell me">
        <h1 className="me-title">알림</h1>

        {items.length === 0 ? (
          <section className="card-block">
            <div className="noti-empty">
              <span className="noti-empty-icon">
                <IconBell size={26} />
              </span>
              <p className="empty-title">아직 알림이 없어요</p>
              <p className="empty-detail">
                신청 결과나 활동 소식이 생기면 여기로 알려드릴게요.
              </p>
            </div>
          </section>
        ) : (
          <ul className="noti-list">
            {items.map((n) => {
              const body = (
                <>
                  <span className="noti-title">
                    {!n.readAt && <span className="noti-new" aria-label="새 알림" />}
                    {n.title}
                  </span>
                  <span className="noti-body">{n.body}</span>
                  <span className="noti-time">{timeAgo(n.createdAt)}</span>
                </>
              );
              return (
                <li key={n.id} className="noti-item" data-unread={!n.readAt}>
                  {n.link ? (
                    <Link href={n.link} className="noti-row">
                      {body}
                    </Link>
                  ) : (
                    <div className="noti-row">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <TabBar current="/notifications" />
    </>
  );
}
