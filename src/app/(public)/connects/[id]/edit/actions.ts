'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { updateConnect } from '@/lib/db/queries/update-connect';
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  GOAL_DEADLINE,
  TAGLINE_MAX,
  isCampus,
  isCondition,
  isGoalType,
} from '@/lib/connects/options';

export interface EditState {
  errors?: Record<string, string>;
}

/**
 * C-09 수정 저장.
 *
 * 개설 폼과 같은 규칙으로 검증한다. 트랙은 폼에 없고 여기서도 받지
 * 않는다 — 바꿀 수 없는 값이라 넘어와도 무시해야 한다.
 */
export async function submitEdit(
  connectId: string,
  track: string,
  _prev: EditState,
  form: FormData,
): Promise<EditState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/connects/${connectId}/edit`)}`);

  const s = (k: string) => String(form.get(k) ?? '').trim();
  const errors: Record<string, string> = {};

  const name = s('name');
  const tagline = s('tagline');
  const description = s('description');
  const campus = s('campus');
  const capacity = Number(form.get('capacity') ?? 0);
  const isPublic = form.get('isPublic') !== 'private';

  const availableDays = form
    .getAll('availableDays')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const conditions = form.getAll('conditions').map(String).filter(isCondition);

  if (!name) errors.name = '커넥트 이름을 입력해주세요.';
  else if (name.length > 30) errors.name = '이름은 30자 이내로 입력해주세요.';
  if (!isCampus(campus)) errors.campus = '활동 캠퍼스를 선택해주세요.';
  if (!tagline) errors.tagline = '한 줄 소개를 입력해주세요.';
  else if (tagline.length > TAGLINE_MAX)
    errors.tagline = `한 줄 소개는 ${TAGLINE_MAX}자 이내로 입력해주세요.`;
  if (!description) errors.description = '활동 소개를 입력해주세요.';
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX)
    errors.capacity = `정원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 사이로 정해주세요.`;
  if (availableDays.length === 0) errors.availableDays = '활동 가능한 요일을 하나 이상 골라주세요.';

  let goalType: string | null = null;
  let goalDetail: string | null = null;
  let goalDate: string | null = null;
  let activityPeriod: string | null = null;

  if (track === 'qualitative') {
    goalType = s('goalType');
    goalDetail = s('goalDetail');
    goalDate = s('goalDate') || null;
    activityPeriod = s('activityPeriod') || null;

    if (!isGoalType(goalType)) errors.goalType = '목표 유형을 골라주세요.';
    if (!goalDetail) errors.goalDetail = '무엇을 만들지 구체적으로 적어주세요.';
    if (!goalDate) errors.goalDate = '목표 시점을 정해주세요.';
    else if (goalDate > GOAL_DEADLINE) errors.goalDate = '정성 산출물 마감일 이전으로 정해주세요.';
  }

  if (Object.keys(errors).length > 0) return { errors };

  const r = await updateConnect(user.id, connectId, {
    name,
    tagline,
    description,
    campus,
    location: s('location') || null,
    capacity,
    availableDays,
    conditions,
    contact: s('contact') || null,
    isPublic,
    goalType,
    goalDetail,
    goalDate,
    activityPeriod,
  });

  if (!r.ok) {
    return {
      errors: {
        _: r.reason === 'NOT_LEADER' ? '팀장만 수정할 수 있어요.' : '지금은 수정할 수 없어요.',
      },
    };
  }

  redirect(`/connects/${connectId}/created`);
}
