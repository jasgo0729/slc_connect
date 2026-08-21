/**
 * 개설 폼의 선택지 정의.
 *
 * 화면과 서버 검증이 같은 배열을 읽는다. 한쪽에만 값을 추가하면
 * 폼에는 보이는데 저장이 거절되는 일이 생긴다.
 */

export const TRACKS = [
  {
    value: 'quantitative',
    label: '정량',
    summary: '자주 만나는 것이 목표',
    detail: '주제는 가볍게, 대신 꾸준히 봅니다. 신청하면 바로 자리가 생기고 만난 만큼 점수가 쌓여요.',
  },
  {
    value: 'qualitative',
    label: '정성',
    summary: '학기 끝에 무언가 남기는 것이 목표',
    detail: '팀마다 목표가 있어요. 팀장이 신청을 보고 승인하며, 1월에 결과물을 제출합니다.',
  },
] as const;

export const CAMPUSES = [
  { value: '인문사회', label: '인문사회과학캠퍼스' },
  { value: '자연과학', label: '자연과학캠퍼스' },
  { value: '공통', label: '공통 (양 캠퍼스)' },
] as const;

/** C-05 참여 조건. 자유 입력이 아니라 정의된 항목에서 고른다. */
export const CONDITIONS = [
  { value: 'attendance', label: '정기 참석 가능' },
  { value: 'weekend', label: '주말 활동 가능' },
  { value: 'evening', label: '평일 저녁 활동 가능' },
  { value: 'online_ok', label: '방학 중 온라인 참여 가능' },
  { value: 'deliverable', label: '산출물 제작에 함께 참여' },
  { value: 'beginner_ok', label: '초보자 환영' },
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
 * 정성 목표 시점의 상한.
 *
 * 정성 최종 산출물 마감이 1월 중순이므로, 목표 시점이 그 뒤인 팀은
 * 개설 시점에 걸러야 한다(C-02 보충). 시즌 일정이 바뀔 수 있으므로
 * 최종적으로는 season_config에서 읽어야 하는 값이다.
 */
export const GOAL_DEADLINE = '2027-01-15';

export const isTrack = (v: string): v is 'quantitative' | 'qualitative' =>
  TRACKS.some((t) => t.value === v);
export const isCampus = (v: string) => CAMPUSES.some((c) => c.value === v);
export const isCondition = (v: string) => CONDITIONS.some((c) => c.value === v);
export const isGoalType = (v: string) => GOAL_TYPES.some((g) => g.value === v);
