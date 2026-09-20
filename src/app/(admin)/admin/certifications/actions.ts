'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { reviewCertification, type ReviewOptions } from '@/lib/db/queries/certifications';
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

/**
 * 승인할 때 함께 정하는 것 (규칙서 §6.4·§6.6).
 *
 * 둘 다 선택 사항이다. 대부분의 건은 예전처럼 승인 한 번으로
 * 끝나고, 산출물 링크가 있거나 주제와 무관해 보이는 건에서만
 * 검수자가 추가로 고른다. 60~90건마다 무언가를 묻기 시작하면
 * 아무도 읽지 않고 누른다.
 */
export async function reviewCertAction(
  certId: string,
  approve: boolean,
  reason?: string,
  opts: ReviewOptions = {},
): Promise<{ error?: string; awarded?: number; total?: number }> {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }

  const text = approve ? undefined : (reason ?? REJECT_REASONS[0]);
  const r = await reviewCertification(adminId, certId, approve, text, opts);
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
  revalidatePath('/admin/scores');
  // 점수가 다시 계산됐으므로 랭킹과 팀 페이지도 새로 그린다.
  revalidatePath('/ranking');
  revalidatePath(`/connects/${r.connectId}`);

  // 몇 점이 붙었는지 돌려준다. 규칙이 복잡해서(§6.2 주 2회, §6.3
  // 기준 인원, §6.5 주 1회) 검수자가 결과를 바로 못 본다.
  return { awarded: r.awarded, total: r.total };
}
