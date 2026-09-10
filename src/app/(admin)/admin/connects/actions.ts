'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { approveConnect, getConnectOwner, rejectConnect } from '@/lib/db/queries/admin';
import { isReviewReason, reviewRejectText } from '@/lib/connects/review-reasons';
import { notifyConnectApproved, notifyConnectRejected } from '@/lib/notify/send';

/**
 * J-05 승인·반려.
 *
 * 화면에서 버튼을 감추더라도 여기서 권한을 다시 본다.
 * 서버 액션은 폼을 거치지 않고 직접 호출할 수 있다.
 */
export async function approveConnectAction(connectId: string): Promise<{ error?: string }> {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }

  const r = await approveConnect(adminId, connectId);
  if (!r.ok) return { error: '이미 처리된 커넥트예요.' };

  // 커밋된 뒤에 알린다. 트랜잭션 안에서 보내면 롤백될 때
  // 알림만 남거나, 알림 실패로 승인이 되돌아간다.
  const owner = await getConnectOwner(connectId);
  if (owner) await notifyConnectApproved(owner.userId, connectId, owner.name);

  revalidatePath('/admin/connects');
  revalidatePath('/admin');
  revalidatePath('/connects');
  return {};
}

export async function rejectConnectAction(
  connectId: string,
  reason: string,
): Promise<{ error?: string }> {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }

  // 정형 문구 밖의 값이 들어오면 그대로 저장하지 않는다.
  const text = reviewRejectText(isReviewReason(reason) ? reason : '');
  const r = await rejectConnect(adminId, connectId, text);
  if (!r.ok) return { error: '이미 처리된 커넥트예요.' };

  const owner = await getConnectOwner(connectId);
  if (owner) await notifyConnectRejected(owner.userId, connectId, owner.name, text);

  revalidatePath('/admin/connects');
  revalidatePath('/admin');
  return {};
}
