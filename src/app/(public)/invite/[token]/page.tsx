import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell, AuthLogo } from '@/components/auth-shell';
import { Badge } from '@/components/ui/badge';
import { IconGoogle } from '@/components/ui/icon';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectByInviteToken } from '@/lib/db/queries/invite';
import { DAYS, trackLabel } from '@/lib/connects/options';

export const dynamic = 'force-dynamic';

/**
 * C-13 초대 링크 미리보기 · C-14 로그인 후 복귀.
 *
 * 비공개 커넥트(C-11)는 씨앗판에 없으므로 이 링크가 유일한 입구다.
 * 로그인부터 요구하면 초대받은 사람이 무엇을 초대받았는지 모른 채
 * 로그인해야 한다. 그래서 최소 정보를 먼저 보여주고 로그인시킨다.
 *
 * 보여주는 범위는 씨앗판 카드와 같다 — 이름, 한 줄 소개, 인원 수까지.
 * 참여자 이름과 프로필은 로그인 후 상세부터다(All-04).
 */
const CAMPUS_LABEL: Record<string, string> = {
  인문사회: '인사캠',
  자연과학: '자과캠',
  공통: '공통',
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const c = await getConnectByInviteToken(token);

  // 토큰이 틀렸거나 커넥트가 지워진 경우.
  if (!c) {
    return (
      <AuthShell>
        <AuthLogo />
        <p className="auth-lede">
          유효하지 않은 초대 링크예요.
          <br />
          링크를 다시 확인해 주세요.
        </p>
        <div className="auth-form">
          <Link href="/connects" className="btn btn--block">
            씨앗판 둘러보기
          </Link>
        </div>
      </AuthShell>
    );
  }

  const user = await getCurrentUser();
  const next = `/connects/${c.id}`;

  // 로그인했다면 미리보기를 거칠 이유가 없다. 바로 상세로.
  if (user) redirect(next);

  const open = Math.max(0, c.capacity - c.memberCount);
  const days = c.availableDays.map((d) => DAYS[d]).filter(Boolean);
  const href = `/api/auth/google?callbackUrl=${encodeURIComponent(next)}`;

  return (
    <AuthShell>
      <AuthLogo />

      <p className="auth-lede" style={{ marginTop: 32 }}>
        커넥트에 초대받았어요
      </p>

      <div className="invite-card">
        <div className="chip-row" style={{ marginTop: 0 }}>
          <Badge tone="track">{trackLabel(c.track)}</Badge>
          <Badge>{CAMPUS_LABEL[c.campus] ?? c.campus}</Badge>
          {!c.isPublic && <Badge tone="closed">비공개</Badge>}
        </div>

        <h2 className="invite-name">{c.name}</h2>
        <p className="invite-tagline">{c.tagline}</p>

        <p className="invite-meta">
          {c.memberCount}/{c.capacity}명
          {open > 0 ? ` · ${open}자리 남음` : ' · 자리 참'}
          {days.length > 0 && ` · 매주 ${days.join('·')}요일`}
        </p>
      </div>

      {/* 상태별 안내. 로그인시키기 전에 알려주는 게 맞다. */}
      {c.status === 'confirmed' ? (
        <p className="notice" style={{ marginTop: 16 }}>
          <span>이미 팀 구성이 끝난 커넥트예요. 둘러보기만 할 수 있어요.</span>
        </p>
      ) : c.status === 'pending_review' ? (
        <p className="notice notice--info" style={{ marginTop: 16 }}>
          <span>운영진 확인을 기다리는 중이에요. 확인이 끝나면 신청할 수 있어요.</span>
        </p>
      ) : open === 0 ? (
        <p className="notice" style={{ marginTop: 16 }}>
          <span>자리가 모두 찼어요. 팀장이 정원을 늘리면 참여할 수 있어요.</span>
        </p>
      ) : null}

      <div className="auth-form">
        <a href={href} className="google-btn">
          <IconGoogle />
          구글로 로그인하고 보기
        </a>
        <p className="auth-tagline" style={{ marginTop: 14 }}>
          로그인하면 이 커넥트로 바로 돌아와요
        </p>
      </div>
    </AuthShell>
  );
}
