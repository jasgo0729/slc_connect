import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { IconArrowLeft } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail } from '@/lib/db/queries/connect-detail';
import { getPendingApplications } from '@/lib/db/queries/applications';
import { countFavorites } from '@/lib/db/queries/favorites';
import { ManagePanel } from './manage-panel';

export const dynamic = 'force-dynamic';

/**
 * 팀장 관리 화면.
 *
 * D-02 승인·거절, D-06 조기 마감, 현재 인원 확인.
 *
 * 권한은 memberships.role = 'leader' 로 본다. created_by 를 보면
 * 팀장이 교체된 뒤에도 옛 팀장이 들어올 수 있다.
 */
interface Props {
  params: Promise<{ id: string }>;
}

export default async function ManagePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}/manage`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();

  // 팀장이 아니면 상세로 돌려보낸다. 화면 자체를 보여줄 이유가 없다.
  if (!c.viewer.isLeader) redirect(`/connects/${id}`);

  const [pending, favoriteCount] = await Promise.all([
    getPendingApplications(id),
    countFavorites(id),
  ]);

  const open = Math.max(0, c.capacity - c.members.length);

  return (
    <>
      <AppBar current="/connects" user={{ id: user.id, name: user.name }} />

      <main className="page shell manage">
        <Link href={`/connects/${id}`} className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> {c.name}
        </Link>

        <h1 className="me-title" style={{ marginTop: 12 }}>
          팀 관리
        </h1>

        <div className="chip-row">
          <StatusBadge status={c.status} />
          <Badge>
            {c.members.length}/{c.capacity}명
          </Badge>
          <Badge>{open > 0 ? `${open}자리 남음` : '자리 참'}</Badge>
          <Badge>찜 {favoriteCount}</Badge>
        </div>

        <ManagePanel
          connectId={id}
          status={c.status}
          capacity={c.capacity}
          memberCount={c.members.length}
          pending={pending.map((p) => ({
            id: p.id,
            name: p.name,
            cohort: p.cohort,
            campus: p.campus,
            slc: p.slc,
            major: p.major,
            bio: p.bio,
            residence: p.residence,
            mbtiType: p.mbtiType,
            message: p.message,
          }))}
          members={c.members.map((m) => m.label)}
          inviteToken={c.inviteToken}
        />
      </main>
    </>
  );
}
