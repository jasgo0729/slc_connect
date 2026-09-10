'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
  APPLY_MESSAGES,
  applyToConnect,
  approveApplication,
  cancelApplication,
  rejectApplication,
  setEarlyClosed,
} from '@/lib/db/queries/applications';
import { toggleFavorite } from '@/lib/db/queries/favorites';
import { LEAVE_MESSAGES, leaveConnect } from '@/lib/db/queries/leave';
import { isRejectReason, rejectLabel } from '@/lib/connects/reject-reasons';
import {
  notifyApplicationDecided,
  notifyApplicationReceived,
} from '@/lib/notify/send';
import { getApplicationTarget, getConnectBrief } from '@/lib/db/queries/applications';

/**
 * 상세·관리 화면의 행동들.
 *
 * 화면에서 버튼을 감추더라도 여기서 다시 확인한다. 서버 액션은
 * 폼을 거치지 않고 직접 호출할 수 있으므로 화면 쪽은 편의일 뿐이다.
 * 팀장 권한과 정원 확인은 전부 쿼리 계층의 트랜잭션 안에 있다.
 */

export async function favoriteAction(connectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${connectId}`)}`);

  const on = await toggleFavorite(user.id, connectId);
  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/connects');
  return on;
}

export async function applyAction(
  connectId: string,
  message?: string,
  track?: string,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${connectId}`)}`);

  const result = await applyToConnect(user.id, connectId, message?.slice(0, 200));
  if (!result.ok) {
    if (result.reason === 'ALREADY_IN_TRACK') {
      // 트랙 이름이 들어가야 무엇을 정리해야 하는지 알 수 있다.
      const label = track === 'qualitative' ? '도전' : '취미';
      return {
        error: `이미 참여 중인 ${label} 커넥트가 있어요. ${label} 트랙은 하나에만 참여할 수 있어요.`,
      };
    }
    return { error: APPLY_MESSAGES[result.reason] };
  }

  // 팀장에게 알린다. 취미는 바로 합류라 문구가 다르다.
  const brief = await getConnectBrief(connectId);
  if (brief) {
    await notifyApplicationReceived(connectId, brief.name, user.name, result.joined);
  }

  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/me');
  return {};
}

export async function cancelAction(
  connectId: string,
  applicationId: string,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const r = await cancelApplication(user.id, applicationId);
  if (!r.ok) return { error: '취소할 수 없는 신청이에요.' };

  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/me');
  return {};
}

export async function approveAction(
  connectId: string,
  applicationId: string,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const r = await approveApplication(user.id, applicationId);
  if (!r.ok) {
    return {
      error:
        r.reason === 'FULL'
          ? '자리가 모두 찼어요. 정원을 늘리려면 운영진에게 문의해 주세요.'
          : r.reason === 'NOT_LEADER'
            ? '팀장만 승인할 수 있어요.'
            : r.reason === 'ALREADY_IN_TRACK'
              ? '이 사람은 같은 트랙의 다른 커넥트에 이미 참여 중이에요.'
              : '이미 처리된 신청이에요.',
    };
  }

  const t = await getApplicationTarget(applicationId);
  if (t) await notifyApplicationDecided(t.userId, connectId, t.connectName, true);

  revalidatePath(`/connects/${connectId}/manage`);
  revalidatePath(`/connects/${connectId}`);
  return {};
}

export async function rejectAction(
  connectId: string,
  applicationId: string,
  reason: string,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // 정형 문구 밖의 값이 들어오면 그대로 저장하지 않는다.
  const safe = isRejectReason(reason) ? reason : 'etc';
  const r = await rejectApplication(user.id, applicationId, safe);
  if (!r.ok) {
    return { error: r.reason === 'NOT_LEADER' ? '팀장만 거절할 수 있어요.' : '이미 처리된 신청이에요.' };
  }

  const t = await getApplicationTarget(applicationId);
  if (t) {
    await notifyApplicationDecided(t.userId, connectId, t.connectName, false, rejectLabel(safe));
  }

  revalidatePath(`/connects/${connectId}/manage`);
  return {};
}

export async function earlyCloseAction(
  connectId: string,
  closed: boolean,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const r = await setEarlyClosed(user.id, connectId, closed);
  if (!r.ok) {
    return { error: r.reason === 'NOT_LEADER' ? '팀장만 바꿀 수 있어요.' : '지금은 바꿀 수 없어요.' };
  }

  revalidatePath(`/connects/${connectId}/manage`);
  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/connects');
  return {};
}


/**
 * G-15 이탈 · 커넥트 삭제.
 *
 * 팀장은 후임을 지정해야 나갈 수 있고, 혼자뿐이면 커넥트가 지워진다.
 * 확정 후에는 4명 미만이 되는 이탈을 막는다.
 */
export async function leaveAction(
  connectId: string,
  successorId?: string,
): Promise<{ error?: string; deleted?: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const r = await leaveConnect(user.id, connectId, successorId);
  if (!r.ok) return { error: LEAVE_MESSAGES[r.reason] };

  revalidatePath('/me');
  revalidatePath('/connects');
  if (r.deleted) redirect('/connects');
  revalidatePath(`/connects/${connectId}`);
  return { deleted: false };
}
