'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { recalculateAllConnects } from '@/lib/db/queries/scoring';

/**
 * 전체 재계산.
 *
 * 점수는 승인할 때마다 그 커넥트 단위로 이미 다시 계산된다. 이
 * 버튼이 필요한 경우는 하나다 — 규칙서의 숫자가 바뀌었을 때
 * (lib/scoring/rules.ts). 그때 지난 인증까지 새 규칙으로 다시
 * 매기지 않으면 시기에 따라 다른 규칙이 섞인 점수가 남는다.
 *
 * 계산이 멱등이라 여러 번 눌러도 결과가 같다. 수동 정정은
 * 지우지 않는다.
 */
export async function recalculateAllAction(): Promise<{
  error?: string;
  connects?: number;
  total?: number;
}> {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }

  const r = await recalculateAllConnects(adminId);

  revalidatePath('/admin/scores');
  revalidatePath('/ranking');
  return { connects: r.connects, total: r.total };
}
