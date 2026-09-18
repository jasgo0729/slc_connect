/**
 * 모집 마감 판정.
 *
 * 마감일은 season_config 의 recruit_deadline 에 있다. 코드에 박지
 * 않는 이유는 대학 행사 일정이 잘 바뀌기 때문이다.
 *
 * 값이 없으면 마감하지 않은 것으로 본다. 설정을 깜빡한 것 때문에
 * 신청이 전부 막히는 쪽이, 하루 더 열려 있는 쪽보다 나쁘다.
 */
const KST_OFFSET_MIN = 9 * 60;

/** 그 날 자정까지는 받는다. '9월 18일 마감'이면 18일 23:59:59 까지. */
export function isRecruitClosed(deadline: string | undefined, now = new Date()): boolean {
  if (!deadline) return false;

  // 'YYYY-MM-DD' 를 한국 시간 기준 그 날의 끝으로 읽는다.
  // 서버가 UTC로 돌아도 판정이 같아야 한다.
  const end = Date.parse(`${deadline}T23:59:59+09:00`);
  if (Number.isNaN(end)) return false;

  return now.getTime() > end;
}

/** 마감까지 남은 일수. 음수면 이미 지났다. */
export function daysUntil(deadline: string | undefined, now = new Date()): number | null {
  if (!deadline) return null;
  const end = Date.parse(`${deadline}T23:59:59+09:00`);
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now.getTime()) / 86_400_000);
}

/** 화면에 쓰는 표기. '9월 18일' */
export function formatDeadline(deadline: string | undefined): string | null {
  if (!deadline) return null;
  const [, m, d] = deadline.split('-');
  if (!m || !d) return null;
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 서버가 어느 시간대에서 돌든 한국 날짜로 오늘을 본다. */
export function todayKST(now = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MIN * 60_000);
  return kst.toISOString().slice(0, 10);
}
