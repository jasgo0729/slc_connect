'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import {
  confirmAllTeams,
  searchRecipients,
  sendNotice,
  setCapacity,
  type NotifyAudience,
  type Recipient,
} from '@/lib/db/queries/admin-ops';
import { setSeasonValue } from '@/lib/db/queries/season';
import { setUserRole } from '@/lib/db/queries/admin-users';
import {
  notifyAssigned,
  notifyCapacityChanged,
  notifyConnectDeleted,
  notifyLeaderChanged,
  notifyRemoved,
  notifyShortWarning,
} from '@/lib/notify/send';
import { getConnectBrief } from '@/lib/db/queries/applications';
import { deleteConnect, getShortConnects } from '@/lib/db/queries/admin-ops';
import {
  ASSIGN_MESSAGES,
  assignMember,
  removeMember,
  searchAssignable,
  setLeader,
  type AssignCandidate,
} from '@/lib/db/queries/assign';

/**
 * 운영 화면의 조작들.
 *
 * 화면에서 버튼을 감추더라도 여기서 권한을 다시 본다.
 * 서버 액션은 폼을 거치지 않고 직접 호출할 수 있다.
 */
async function admin() {
  try {
    return await requireAdmin();
  } catch {
    redirect('/connects');
  }
}

/** J-06 유연 증원. */
export async function setCapacityAction(
  connectId: string,
  capacity: number,
  /** 화면이 알고 있는 이전 값. 알림 문구에 쓴다. */
  from?: number,
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await setCapacity(a.id, connectId, capacity);
  if (!r.ok) return { error: r.reason };

  // 정원이 바뀌면 찜해 둔 사람의 판단이 달라진다.
  if (typeof from === 'number' && from !== capacity) {
    const brief = await getConnectBrief(connectId);
    if (brief) await notifyCapacityChanged(connectId, brief.name, from, capacity);
  }

  revalidatePath('/admin/connects/all');
  revalidatePath(`/connects/${connectId}`);
  revalidatePath('/connects');
  return {};
}

/** J-04 공지 발송. */
export async function sendNoticeAction(
  audience: NotifyAudience,
  title: string,
  body: string,
  link: string,
  /** 직접 고르기에서 선택한 사람. 다른 대상에서는 무시된다. */
  userIds: string[] = [],
): Promise<{ error?: string; sent?: number }> {
  const a = await admin();

  const t = title.trim();
  const b = body.trim();
  if (!t) return { error: '제목을 입력해주세요.' };
  if (!b) return { error: '내용을 입력해주세요.' };
  if (audience === 'custom' && userIds.length === 0) {
    return { error: '받을 사람을 골라주세요.' };
  }

  // 열린 리다이렉트 방지 — 같은 사이트 경로만 허용한다.
  const safe = link.trim();
  const href = safe.startsWith('/') && !safe.startsWith('//') ? safe : null;

  const sent = await sendNotice(a.id, audience, t, b, href, userIds);
  revalidatePath('/admin/notify');
  return { sent };
}

/** 공지 대상을 이름·학번으로 찾는다. */
export async function searchRecipientsAction(query: string): Promise<Recipient[]> {
  await admin();
  return searchRecipients(query);
}

/** J-07 랭킹 공개 모드 등 시즌 설정. */
export async function setSeasonAction(key: string, value: string): Promise<{ error?: string }> {
  const a = await admin();
  await setSeasonValue(a.id, key, value.trim());
  revalidatePath('/admin/season');
  revalidatePath('/ranking');
  return {};
}

/**
 * D-16 팀 확정 일괄 처리.
 *
 * 되돌릴 수 없다. 화면에서 미리보기를 보여주고 확인을 받은 뒤에만 부른다.
 */
export async function confirmAllAction(): Promise<{ error?: string; connects?: number; notified?: number }> {
  const a = await admin();
  const r = await confirmAllTeams(a.id);
  revalidatePath('/admin');
  revalidatePath('/admin/confirm');
  revalidatePath('/connects');
  return r;
}

/**
 * D-10 인원 미달 경고 일괄 발송.
 *
 * 마감 며칠 전에 한 번 누르는 버튼이다. 크론을 두지 않기로 했으므로
 * 사람이 시점을 정한다 — 자동 발송이 조용히 실패하면 팀장들은
 * 경고를 못 받은 채 마감을 맞는다.
 *
 * 커넥트마다 인원이 달라 문구가 개인화된다. 공지 발송(J-04)으로는
 * 이걸 할 수 없어 따로 둔다.
 */
export async function sendShortWarningsAction(): Promise<{ sent?: number; error?: string }> {
  await admin();

  const short = await getShortConnects();
  let sent = 0;
  for (const c of short) {
    if (await notifyShortWarning(c.id, c.name, c.memberCount)) sent += 1;
  }

  revalidatePath('/admin');
  revalidatePath('/admin/members');
  return { sent };
}

/**
 * A-08 관리자 권한 변경.
 *
 * 화면에서 버튼을 감추더라도 여기서 권한을 다시 본다.
 * 권한을 주는 조작 자체가 권한을 요구한다.
 */
export async function setUserRoleAction(
  userId: string,
  role: 'member' | 'admin',
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await setUserRole(a.id, userId, role);
  if (!r.ok) return { error: r.reason };

  revalidatePath(`/admin/members/${userId}`);
  revalidatePath('/admin/members/all');
  return {};
}

/**
 * J-01 커넥트 삭제.
 *
 * 되돌릴 수 없다. 화면에서 무엇이 지워지는지 보여주고 이름을
 * 입력받은 뒤에만 부른다.
 *
 * 참여자와 대기 중인 신청자에게 알린다. 말없이 지우면 마이페이지에서
 * 팀이 통째로 사라진 것으로 보인다.
 */
export async function deleteConnectAction(
  connectId: string,
  reason: string,
): Promise<{ error?: string }> {
  const a = await admin();

  const text = reason.trim() || '운영진이 정리했어요.';
  const r = await deleteConnect(a.id, connectId, text);
  if (!r.ok) return { error: '커넥트를 찾을 수 없어요.' };

  // 커밋된 뒤에 알린다. 알림 실패로 삭제가 되돌려지면 안 된다.
  if (r.affected.length > 0) {
    await notifyConnectDeleted(r.affected, r.name, text);
  }

  revalidatePath('/admin/connects/all');
  revalidatePath('/connects');
  redirect('/admin/connects/all');
}

/* ── D-14 배정 ─────────────────────────────────────────── */

export async function searchAssignableAction(
  connectId: string,
  query: string,
): Promise<AssignCandidate[]> {
  await admin();
  return searchAssignable(connectId, query);
}

/**
 * 커넥트에 사람을 넣는다.
 *
 * 같은 트랙의 다른 커넥트에 속해 있으면 한 번 막고, 화면이 확인을
 * 받은 뒤 move=true 로 다시 부른다. 옮기는 것은 상대 팀의 인원도
 * 줄이는 일이라 한 번은 물어야 한다.
 */
export async function assignMemberAction(
  connectId: string,
  userId: string,
  move = false,
): Promise<{ error?: string; conflictName?: string; moved?: string }> {
  const a = await admin();
  const r = await assignMember(a.id, connectId, userId, move);

  if (!r.ok) {
    if (r.reason === 'IN_OTHER_TRACK') {
      return {
        error: `이미 '${r.conflictName}'에 속해 있어요.`,
        conflictName: r.conflictName,
      };
    }
    return { error: ASSIGN_MESSAGES[r.reason] };
  }

  await notifyAssigned(userId, connectId, r.connectName, r.movedFrom);

  revalidatePath(`/admin/connects/${connectId}`);
  revalidatePath('/admin/members');
  revalidatePath(`/connects/${connectId}`);
  return { moved: r.movedFrom };
}

export async function removeMemberAction(
  connectId: string,
  userId: string,
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await removeMember(a.id, connectId, userId);
  if (!r.ok) return { error: r.reason };

  await notifyRemoved(userId, r.connectName);

  revalidatePath(`/admin/connects/${connectId}`);
  revalidatePath(`/connects/${connectId}`);
  return {};
}

/**
 * 팀장 지정.
 *
 * 사전 개설 커넥트는 팀장 없이 시작하고, 팀장이 이탈해 비는
 * 경우도 있다. 그때 연락을 받을 사람을 정해야 한다.
 */
export async function setLeaderAction(
  connectId: string,
  userId: string,
): Promise<{ error?: string }> {
  const a = await admin();
  const r = await setLeader(a.id, connectId, userId);
  if (!r.ok) return { error: r.reason };

  await notifyLeaderChanged(userId, r.previousUserId, connectId, r.name);

  revalidatePath(`/admin/connects/${connectId}`);
  revalidatePath(`/connects/${connectId}`);
  return {};
}
