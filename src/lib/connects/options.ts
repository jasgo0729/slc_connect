/**
 * 개설 폼의 선택지 정의.
 *
 * 화면과 서버 검증이 같은 배열을 읽는다. 한쪽에만 값을 추가하면
 * 폼에는 보이는데 저장이 거절되는 일이 생긴다.
 */

/**
 * 트랙.
 *
 * DB 값은 기획 문서의 quantitative·qualitative 를 그대로 쓰고,
 * 화면에는 취미·도전으로 보여준다. 학생에게는 "정량 트랙"보다
 * "취미"가 무엇을 하는 곳인지 바로 알려준다.
 */
export const TRACKS = [
  {
    value: 'quantitative',
    label: '취미',
    eyebrow: '바로 모집',
    summary: ['자주 만나는 것이 목표예요.', '신청하면 바로 자리가 생깁니다.'],
    facts: [
      ['목표', '가볍게 자주 만나기'],
      ['참여', '신청하면 바로 합류돼요'],
      ['점수', '만난 횟수만큼 쌓여요'],
    ],
    example: '보드게임 모임, 러닝 크루, 영화 감상 모임',
  },
  {
    value: 'qualitative',
    label: '도전',
    eyebrow: '팀장 승인',
    summary: ['학기 끝에 결과물이 남는 모임이에요.', '팀장이 신청을 확인합니다.'],
    facts: [
      ['목표', '학기 안에 팀 결과물 남기기'],
      ['참여', '팀장이 신청서를 보고 승인해요'],
      ['점수', '1월 결과물 제출 기준으로 정해져요'],
    ],
    example: '공모전 준비팀, 자격증 스터디, 창업 아이디어팀',
  },
] as const;

export const CAMPUSES = [
  { value: '인문사회', label: '인문사회과학캠퍼스' },
  { value: '자연과학', label: '자연과학캠퍼스' },
  { value: '공통', label: '공통 (양 캠퍼스)' },
] as const;

/**
 * C-05 참여 조건.
 *
 * '이 팀에 들어오려면 무엇이 가능해야 하는가'만 남긴다.
 * '초보자 환영'은 조건이 아니라 팀의 태도이고, '산출물 제작에 함께
 * 참여'는 도전 트랙이면 당연한 것이라 조건으로 고를 이유가 없다.
 * 둘 다 활동 소개에 적으면 된다.
 */
export const CONDITIONS = [
  { value: 'attendance', label: '정기 참석 가능' },
  { value: 'weekend', label: '주말 활동 가능' },
  { value: 'evening', label: '평일 저녁 활동 가능' },
  { value: 'online_ok', label: '방학 중 온라인 참여 가능' },
  { value: 'commute', label: '캠퍼스 근처 거주·통학' },
] as const;

/** C-02 정성 트랙 목표 유형. 선택형이라 간이 확인이 폼 안에서 끝난다. */
export const GOAL_TYPES = [
  { value: 'output', label: '산출물 제작', hint: '전시, 영상, 앱, 보고서 등' },
  { value: 'contest', label: '공모전·대회 참가' },
  { value: 'certificate', label: '자격증·시험 준비' },
  { value: 'study', label: '학습 과정 완주', hint: '커리큘럼을 끝까지' },
  { value: 'service', label: '봉사·사회 활동' },
  { value: 'etc', label: '그 외' },
] as const;

export const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const CAPACITY_MIN = 4;
export const CAPACITY_MAX = 7;
export const CAPACITY_DEFAULT = 6; // U-04

export const TAGLINE_MAX = 40;

/**
 * 도전 목표 시점의 상한.
 *
 * 산출물 마감이 1월 말이므로 그 뒤를 목표로 잡은 팀은 시즌 안에
 * 결과를 낼 수 없다(C-02 보충). 시즌 일정이 바뀔 수 있으므로
 * 최종적으로는 season_config에서 읽어야 하는 값이다.
 */
export const GOAL_DEADLINE = '2027-01-31';

/** 화면에 쓰는 트랙 이름. 한 곳에서만 바꾸면 되도록 여기 둔다. */
export function trackLabel(track: string): string {
  return track === 'qualitative' ? '도전' : '취미';
}

export const isTrack = (v: string): v is 'quantitative' | 'qualitative' =>
  TRACKS.some((t) => t.value === v);
export const isCampus = (v: string) => CAMPUSES.some((c) => c.value === v);
export const isCondition = (v: string) => CONDITIONS.some((c) => c.value === v);
export const isGoalType = (v: string) => GOAL_TYPES.some((g) => g.value === v);

/**
 * 예시 커넥트 판별.
 *
 * TF 사전 개설은 취미 트랙만 하기로 되어 있다(요소 문서 2.2.2).
 * 따라서 사전 개설이면서 도전 트랙인 것은 "도전이 어떤 모습인지"
 * 보여주려고 올려 둔 예시다. 신청을 받지 않는다.
 *
 * 이름의 [예시] 접두사로 가르지 않는다. 운영자가 접두사를 빠뜨리면
 * 신청이 열려 버리고, 그 사실을 아무도 모른 채 사람이 들어온다.
 */
export function isExampleConnect(c: { isPreCreated: boolean; track: string }): boolean {
  return c.isPreCreated && c.track === 'qualitative';
}
