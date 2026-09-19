'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { reviewCertification } from '@/lib/db/queries/certifications';
import { notifyCertificationReviewed } from '@/lib/notify/send';

/**
 * G-05 인증 검수.
 *
 * 주 60~90건이 이곳을 지난다. 한 건에 클릭 하나로 끝나야 한다.
 */
export const REJECT_REASONS = [
  '사진에 참여자가 보이지 않아요.',
  '활동 내용이 확인되지 않아요.',
  '이미 인증한 활동과 같아 보여요.',
  '커넥트 활동으로 보기 어려워요.',
] as const;

export async function reviewCertAction(
  certId: string,
  approve: boolean,
  reason?: string,
): Promise<{ error?: string }> {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }

  const text = approve ? undefined : (reason ?? REJECT_REASONS[0]);
  const r = await reviewCertification(adminId, certId, approve, text);
  if (!r.ok) return { error: r.reason };

  // 올린 사람에게 알린다. 반려는 사유까지 담아야 다시 올릴 수 있다.
  await notifyCertificationReviewed(
    r.submittedBy,
    r.connectId,
    r.connectName,
    approve,
    text,
  );

  revalidatePath('/admin/certifications');
  revalidatePath('/admin');
  revalidatePath(`/connects/${r.connectId}`);
  return {};
}
