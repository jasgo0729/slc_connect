import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { MemberList } from '@/components/member-list';
import { ResidenceDist } from '@/components/residence-dist';
import { InviteButton } from '@/components/invite-button';
import { DetailActions } from '@/components/detail-actions';
import { LeaveButton } from '@/components/leave-button';
import { IconArrowLeft, IconPin } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectDetail, summarizeResidence } from '@/lib/db/queries/connect-detail';
import { countFavorites, getFavoriteIds } from '@/lib/db/queries/favorites';
import { CONDITIONS, DAYS, GOAL_TYPES, trackLabel } from '@/lib/connects/options';

export const dynamic = 'force-dynamic';

/**
 * B-02 커넥트 상세.
 *
 * 여기부터 로그인이 필요하다. 참여자의 이름·기수가 보이므로
 * 목록과 달리 개인정보 경계다.
 *
 * 하단 탭바를 두지 않는다 — 참여 버튼이 화면 아래 고정이라
 * 탭바와 겹친다. 상단 뒤로가기로 목록에 돌아간다.
 */
interface Props {
  params: Promise<{ id: string }>;
}

const CAMPUS_LABEL: Record<string, string> = {
  인문사회: '인사캠',
  자연과학: '자과캠',
  공통: '공통',
};

export default async function ConnectDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${id}`)}`);

  const c = await getConnectDetail(id, user.id);
  if (!c) notFound();

  const favIds = await getFavoriteIds(user.id);
  // U-06 정확한 찜 수는 팀장에게만 보여준다.
  const favoriteCount = c.viewer.isLeader ? await countFavorites(c.id) : undefined;

  // C-11 비공개 커넥트는 목록에 없다. 링크를 아는 사람은 볼 수 있어야
  // 초대가 성립하므로, 여기서는 막지 않는다.

  const residence = summarizeResidence(c.members);
  const days = c.availableDays.map((d) => DAYS[d]).filter(Boolean);
  const conditionLabels = c.conditions
    .map((v) => CONDITIONS.find((x) => x.value === v)?.label)
    .filter(Boolean) as string[];
  const goalTypeLabel = GOAL_TYPES.find((g) => g.value === c.goalType)?.label;

  return (
    <>
      <AppBar current="/connects" user={{ id: user.id, name: user.name }} />

      <main className="shell detail detail-page">
        <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
          <IconArrowLeft size={18} /> 커넥트 상세
        </Link>


        <div className="detail-layout" style={{ marginTop: 16 }}>
          <div>
            <h1 className="detail-title">{c.name}</h1>
            <div className="chip-row">
              <Badge>{CAMPUS_LABEL[c.campus] ?? c.campus}</Badge>
              <Badge tone="track">{trackLabel(c.track)}</Badge>
              <StatusBadge status={c.status} />
              {!c.isPublic && <Badge tone="closed">비공개</Badge>}
            </div>

            <p className="detail-desc">{c.description || c.tagline}</p>

            {(c.location || days.length > 0) && (
              <p className="detail-meta">
                <IconPin />
                {[c.location, days.length > 0 ? `매주 ${days.join('·')}요일` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}

            {c.viewer.isLeader && <InviteButton token={c.inviteToken} />}

            {/* C-02 정성 목표. 신청 전에 무엇을 만드는 팀인지 알아야 한다. */}
            {c.track === 'qualitative' && c.goalDetail && (
              <section className="section">
                <h2 className="section-title">
                  목표 {goalTypeLabel && <span>· {goalTypeLabel}</span>}
                </h2>
                <p className="detail-desc" style={{ marginTop: 0 }}>
                  {c.goalDetail}
                </p>
                <p className="detail-meta">
                  {[
                    c.goalDate ? `${c.goalDate}까지` : null,
                    c.activityPeriod ? `활동 기간 ${c.activityPeriod}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </section>
            )}

            {/* C-05 참여 조건. 정성은 요구가 많을 수 있어 따로 뗀다. */}
            {conditionLabels.length > 0 && (
              <section className="section">
                <h2 className="section-title">참여 조건</h2>
                <div className="chip-row" style={{ marginTop: 0 }}>
                  {conditionLabels.map((l) => (
                    <Badge key={l}>{l}</Badge>
                  ))}
                </div>
              </section>
            )}

            <section className="section">
              <h2 className="section-title">
                현재 참여자{' '}
                <span>
                  ({c.members.length}/{c.capacity})
                </span>
              </h2>
              <MemberList members={c.members} capacity={c.capacity} />
            </section>

            {residence.length > 0 && (
              <section className="section">
                <h2 className="section-title">방학 중 거주지 분포</h2>
                <ResidenceDist data={residence} />
              </section>
            )}

            {/* G-15 이탈. 참여 중인 사람에게만 보인다. */}
            {c.viewer.isMember && (
              <section className="section leave-section">
                <LeaveButton
                  connectId={c.id}
                  isLeader={c.viewer.isLeader}
                  nextLeader={c.members.find((m) => m.id !== user.id)?.label}
                />
              </section>
            )}

            {c.contact && (
              <section className="section">
                <h2 className="section-title">연락 수단</h2>
                <p className="detail-desc" style={{ marginTop: 0 }}>
                  {c.contact}
                </p>
              </section>
            )}
          </div>

          <DetailActions
            connectId={c.id}
            capacity={c.capacity}
            memberCount={c.members.length}
            status={c.status}
            track={c.track}
            viewer={c.viewer}
            favorited={favIds.has(c.id)}
            loggedIn
            favoriteCount={favoriteCount}
          />
        </div>
      </main>
    </>
  );
}
