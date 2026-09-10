'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createConnect, hasConnectInTrack } from '@/lib/db/queries/create-connect';
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

/**
 * 제출한 값을 그대로 돌려준다.
 *
 * React 19는 폼 액션이 끝나면 폼을 초기화한다. 입력을 state로 들고
 * 있으면 대부분 유지되지만, 검증에 걸려 돌아왔을 때 무엇이 남고
 * 무엇이 사라졌는지가 브라우저와 렌더 시점에 따라 갈린다.
 * 서버가 받은 값을 되돌려주고 화면이 그걸로 복원하면 그 차이가 없어진다.
 */
export interface SubmittedValues {
  name: string;
  track: string;
  tagline: string;
  description: string;
  campus: string;
  location: string;
  contact: string;
  capacity: number;
  isPublic: boolean;
  availableDays: number[];
  conditions: string[];
  goalType: string;
  goalDetail: string;
  goalDate: string;
  activityPeriod: string;
}

export interface CreateState {
  errors?: Record<string, string>;
  values?: SubmittedValues;
  /**
   * 중복 개설처럼 폼을 고쳐서 해결할 수 없는 경우.
   * 입력칸 아래 작은 글씨로는 눈에 띄지 않아 화면 가운데에 알린다.
   */
  blocked?: 'DUPLICATE_TRACK';
  blockedTrack?: string;
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

    // 목표 시점은 폼에서 받지 않는다 — 바로 아래 '활동 기간'과
    // 구분이 안 돼 혼란만 준다. 값이 들어오면 범위만 확인한다.
    if (goalDate && goalDate > GOAL_DEADLINE) {
      errors.goalDate = '산출물 마감일(1월 31일) 이전으로 정해주세요.';
    }
  }

  const values: SubmittedValues = {
    name,
    track,
    tagline,
    description,
    campus,
    location,
    contact,
    capacity,
    isPublic,
    availableDays,
    conditions,
    goalType: goalType ?? '',
    goalDetail: goalDetail ?? '',
    goalDate: goalDate ?? '',
    activityPeriod: activityPeriod ?? '',
  };

  // 한 사람은 트랙당 하나에만 속한다. 개설이든 참여든 같은 제한이다.
  // 폼을 고쳐서 풀 수 있는 문제가 아니므로 알림창으로 알린다.
  if (!errors.track && (await hasConnectInTrack(user.id, track))) {
    return { blocked: 'DUPLICATE_TRACK', blockedTrack: track, values };
  }

  if (Object.keys(errors).length > 0) return { errors, values };

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

  redirect(`/connects/${created.id}/created`);
}
