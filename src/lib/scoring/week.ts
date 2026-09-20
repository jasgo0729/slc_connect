/**
 * 점수 집계 단위 — 규칙서 §6.1.
 *
 * "단위의 시작은 토요일에서 일요일로 넘어가는 자정이며 기간은
 *  그로부터 7일이다."
 *
 * 즉 한 주는 일요일 00:00 에 시작해 토요일 24:00 에 끝난다.
 * 주차를 그 주의 일요일 날짜(YYYY-MM-DD)로 표기한다.
 *
 * §6.11 의 "토요일 활동까지는 해당 주차, 일요일 활동은 다음 주차"
 * 는 같은 말이다 — 토요일은 그 주의 마지막 날이고, 일요일은 새
 * 주의 첫날이다. 한 주가 끝나는 토요일 밤에서 보면 다음 일요일
 * 활동이 "다음 주차"로 넘어간다.
 *
 * 귀속 기준은 **활동일**이다. 검수한 날이 아니다. 검수가 하루만
 * 밀려도 지난주 활동이 이번 주로 잡히면 §6.12 의 주간 공유가
 * 사실과 어긋난다.
 */

/** 주의 첫날. 0=일요일. */
export const WEEK_START_DOW = 0;

const DAY_MS = 86_400_000;

function parseDate(date: string): number | null {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const t = Date.UTC(y, m - 1, d);
  return Number.isNaN(t) ? null : t;
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * 활동일이 속한 주차(그 주의 일요일).
 *
 * 'YYYY-MM-DD' 는 날짜만 있는 값이다. new Date(문자열) 로 읽으면
 * UTC 자정으로 해석되어 한국에서는 하루 전으로 보인다. 숫자를
 * 직접 쪼개 UTC 로 다루면 서버가 어느 시간대에서 돌든 결과가 같다.
 *
 * 형식이 잘못된 값은 그대로 돌려준다. 임의의 주차에 밀어 넣으면
 * 그 팀의 한 주가 통째로 틀어지고, 무엇이 잘못됐는지 남지 않는다.
 */
export function resolveScoringWeek(activityDate: string): string {
  const t = parseDate(activityDate);
  if (t === null) return activityDate;

  const dow = new Date(t).getUTCDay();
  const back = (dow - WEEK_START_DOW + 7) % 7;
  return toISO(t - back * DAY_MS);
}

/** 주차의 마지막 날(토요일). 화면 표기에 쓴다. */
export function weekEnd(weekStart: string): string {
  const t = parseDate(weekStart);
  if (t === null) return weekStart;
  return toISO(t + 6 * DAY_MS);
}

/** '9/14~9/20' */
export function formatWeek(weekStart: string): string {
  const s = weekStart.split('-');
  const e = weekEnd(weekStart).split('-');
  if (s.length !== 3 || e.length !== 3) return weekStart;
  return `${Number(s[1])}/${Number(s[2])}~${Number(e[1])}/${Number(e[2])}`;
}
