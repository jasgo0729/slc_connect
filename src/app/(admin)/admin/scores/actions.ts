'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import {
  addManualAdjustment,
  deleteManualAdjustment,
  recalculateAllConnects,
  recalculateOne,
} from '@/lib/db/queries/scoring';

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

/** 운영진 확인은 액션마다 다시 한다. 한 곳에 모아 둔다. */
async function adminOnly(): Promise<string> {
  try {
    return (await requireAdmin()).id;
  } catch {
    redirect('/connects');
  }
}

function refresh(connectId?: string) {
  revalidatePath('/admin/scores');
  revalidatePath('/ranking');
  if (connectId) revalidatePath(`/connects/${connectId}`);
}

/**
 * 수동 정정 (§6 바깥의 점수).
 *
 * 검수로는 낼 수 없는 점수가 있다 — 운영진이 인정한 특별 활동,
 * 잘못 준 점수의 회수, 장애로 인증하지 못한 건의 보전.
 *
 * 사유는 팀의 점수 내역에 그대로 보인다(시안 31). 그래서 화면에도
 * 그렇게 적어 두었다 — 내부 메모처럼 쓰면 학생이 그걸 읽는다.
 */
export async function adjustScoreAction(input: {
  connectId: string;
  points: number;
  reason: string;
  weekStart?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const adminId = await adminOnly();

  const r = await addManualAdjustment(adminId, input);
  if (!r.ok) return { error: r.reason };

  refresh(input.connectId);
  return { ok: true };
}

export async function deleteAdjustmentAction(
  eventId: string,
  connectId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const adminId = await adminOnly();

  const r = await deleteManualAdjustment(adminId, eventId);
  if (!r.ok) return { error: r.reason ?? '지우지 못했어요.' };

  refresh(connectId);
  return { ok: true };
}

/**
 * 한 팀만 다시 계산.
 *
 * 전체 재계산과 달리 자주 쓴다 — 인증을 고친 뒤 그 팀만 맞춰
 * 보거나, 점수가 이상해 보이는 팀을 확인할 때다.
 */
export async function recalculateOneAction(
  connectId: string,
): Promise<{ error?: string; total?: number }> {
  const adminId = await adminOnly();

  const total = await recalculateOne(adminId, connectId);
  refresh(connectId);
  return { total };
}
