import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { Notice } from '@/components/ui/notice';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail } from '@/lib/db/queries/connect-detail';
import { trackLabel } from '@/lib/connects/options';
import { EditForm } from './edit-form';

export const dynamic = 'force-dynamic';

/**
 * C-09 커넥트 수정.
 *
 * 반려된 정성 커넥트를 고쳐 다시 확인 요청하는 것이 주 용도지만,
 * 모집 중인 커넥트의 설명이나 요일을 고치는 데도 쓴다.
 *
 * 트랙은 바꿀 수 없다. 참여 방식과 점수 계산이 통째로 달라서
 * 이미 신청한 사람이 다른 규칙의 팀에 들어가게 된다.
 */
interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditConnectPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}/edit`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();
  if (!c.viewer.isLeader) redirect(`/connects/${id}`);

  const locked = c.status === 'confirmed' || Boolean(c.confirmedAt);

  return (
    <>
      <AppBar current="/connects" user={{ id: user.id, name: user.name }} />

      <main className="page shell create">
        <Link href={`/connects/${id}`} className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> {c.name}
        </Link>

        <h1 className="create-title">커넥트 수정</h1>
        <p className="create-lede">
          {trackLabel(c.track)} 트랙은 바꿀 수 없어요. 나머지는 자유롭게 고칠 수 있습니다.
          {c.status === 'rejected' && ' 저장하면 다시 확인 요청이 들어갑니다.'}
        </p>

        {locked ? (
          <div style={{ marginTop: 20 }}>
            <Notice>팀 구성이 끝난 커넥트는 수정할 수 없어요.</Notice>
          </div>
        ) : (
          <EditForm
            connectId={id}
            track={c.track}
            memberCount={c.members.length}
            initial={{
              name: c.name,
              tagline: c.tagline,
              description: c.description ?? '',
              campus: c.campus,
              location: c.location ?? '',
              contact: c.contact ?? '',
              capacity: c.capacity,
              availableDays: c.availableDays,
              conditions: c.conditions,
              isPublic: c.isPublic,
              goalType: c.goalType ?? '',
              goalDetail: c.goalDetail ?? '',
              goalDate: c.goalDate ?? '',
              activityPeriod: c.activityPeriod ?? '',
            }}
          />
        )}
      </main>
    </>
  );
}
