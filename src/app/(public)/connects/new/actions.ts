'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createConnect } from '@/lib/db/queries/create-connect';
import {
  CAPACITY_MAX,
  CAPACITY_MIN,
  GOAL_DEADLINE,
  TAGLINE_MAX,
  isCampus,
  isCondition,
  isGoalType,
  isTrack,
} from '@/lib/connects/options';

export interface CreateState {
  errors?: Record<string, string>;
}

/**
 * 개설 폼 제출.
 *
 * 화면에서도 막지만 여기서 다시 검증한다. 서버 액션은 폼을 거치지 않고
 * 직접 호출할 수 있으므로, 화면 검증은 편의이고 이쪽이 실제 방어선이다.
 */
export async function submitCreate(
  _prev: CreateState,
  form: FormData,
): Promise<CreateState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/connects/new');

  const s = (k: string) => String(form.get(k) ?? '').trim();
  const errors: Record<string, string> = {};

  const name = s('name');
  const track = s('track');
  const tagline = s('tagline');
  const description = s('description');
  const campus = s('campus');
  const location = s('location');
  const contact = s('contact');
  const capacity = Number(form.get('capacity') ?? 0);
  const isPublic = form.get('isPublic') !== 'private';

  const availableDays = form
    .getAll('availableDays')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  const conditions = form.getAll('conditions').map(String).filter(isCondition);

  if (!name) errors.name = '커넥트 이름을 입력해주세요.';
  else if (name.length > 30) errors.name = '이름은 30자 이내로 입력해주세요.';

  if (!isTrack(track)) errors.track = '트랙을 선택해주세요.';
  if (!isCampus(campus)) errors.campus = '활동 캠퍼스를 선택해주세요.';

  if (!tagline) errors.tagline = '한 줄 소개를 입력해주세요.';
  else if (tagline.length > TAGLINE_MAX)
    errors.tagline = `한 줄 소개는 ${TAGLINE_MAX}자 이내로 입력해주세요.`;

  // 설명문은 추천(E-02)이 읽는 유일한 재료지만 길이를 강제하지는 않는다.
  // 짧게 쓰는 사람을 막기보다 잘 쓰도록 안내하는 쪽을 택했다(폼의 hint).
  if (!description) errors.description = '활동 소개를 입력해주세요.';

  // C-03 정원. 4명 미만은 활동 인정 최소 인원에 걸리고,
  // 7명은 D-07 유연 증원의 상한이다.
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX)
    errors.capacity = `정원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 사이로 정해주세요.`;

  // C-04 요일. D-05 자동 마감과 B-05 필터, E-02 추천이 이 값을 쓴다.
  if (availableDays.length === 0) errors.availableDays = '활동 가능한 요일을 하나 이상 골라주세요.';

  // C-02 정성 트랙 목표
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

    if (!goalDate) {
      errors.goalDate = '목표 시점을 정해주세요.';
    } else if (goalDate > GOAL_DEADLINE) {
      // 정성 최종 산출물 마감이 1월 중순이다. 그 뒤를 목표로 잡은 팀은
      // 시즌 안에 결과를 낼 수 없으므로 개설 시점에 걸러야 한다.
      errors.goalDate = '정성 산출물 마감일 이전으로 정해주세요.';
    }
  }

  if (Object.keys(errors).length > 0) return { errors };

  const created = await createConnect(user.id, {
    name,
    track: track as 'quantitative' | 'qualitative',
    tagline,
    description,
    campus,
    location: location || null,
    capacity,
    availableDays,
    conditions,
    contact: contact || null,
    isPublic,
    goalType,
    goalDetail,
    goalDate,
    activityPeriod,
  });

  redirect(`/connects/${created.id}?created=1`);
}
