import { findConnectMbti } from '@/lib/connects/mbti';
import type { Candidate, Pick, Seeker } from './types';

/**
 * E-08 폴백.
 *
 * LLM이 실패해도 빈손으로 돌려보내지 않는다. 모집 기간에 이 화면이
 * 죽으면 '무엇을 할지 모르는 사람'이 갈 곳이 없어진다.
 *
 * 규칙은 단순하다. 겹치는 신호를 세고 많은 순으로 고른다.
 * 정교하지 않지만 아무것도 안 주는 것보다 낫고, 무엇보다 예측 가능하다.
 */
function score(c: Candidate, s: Seeker): number {
  let n = 0;

  // 같은 캠퍼스이거나 공통이면 실제로 만날 수 있다. 가장 무겁게 본다.
  if (c.campus === s.campus) n += 4;
  else if (c.campus === '공통') n += 3;

  // 키워드와 관심사가 설명문에 나타나는지.
  const haystack = `${c.name} ${c.tagline} ${c.description ?? ''} ${c.goalDetail ?? ''}`;
  const words = [
    ...s.keyword.split(/[\s,]+/),
    ...(s.interests ?? '').split(/[,\s]+/),
  ]
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  for (const w of new Set(words)) {
    if (haystack.includes(w)) n += 3;
  }

  // 선호 요일이 겹치면.
  if (s.preferredDays.length > 0 && c.availableDays.length > 0) {
    const overlap = c.availableDays.filter((d) => s.preferredDays.includes(d)).length;
    n += Math.min(overlap, 2);
  }

  // 성향이 도전/취미 어느 쪽으로 기우는지.
  // 코드 셋째 자리가 M(생산형)이면 결과물을 남기는 도전과 결이 맞는다.
  const mbti = findConnectMbti(s.mbtiCode);
  if (mbti) {
    const making = mbti.code[2] === 'M';
    if (making && c.track === 'qualitative') n += 2;
    if (!making && c.track === 'quantitative') n += 2;
  }

  // 자리가 많이 남은 쪽을 살짝 밀어준다. 추천이 한 곳에 몰리면
  // 그 커넥트만 차고 나머지는 미달로 남는다.
  n += Math.min(c.capacity - c.memberCount, 3) * 0.3;

  return n;
}

/**
 * 왜 골랐는지 한 가지만 짚는 짧은 라벨.
 *
 * 규칙으로 고른 티가 나지 않도록 여러 문구를 두되, 실제로 겹친
 * 신호를 말한다. 아무 근거 없이 "잘 맞아요"라고 하면 다음부터
 * 이 라벨을 아무도 읽지 않는다.
 */
function labelFor(c: Candidate, s: Seeker): string {
  const haystack = `${c.name} ${c.tagline} ${c.description ?? ''} ${c.goalDetail ?? ''}`;
  const words = [...s.keyword.split(/[\s,]+/), ...(s.interests ?? '').split(/[,\s]+/)]
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  if (words.some((w) => haystack.includes(w))) return '관심사와 잘 맞아요';

  if (
    s.preferredDays.length > 0 &&
    c.availableDays.some((d) => s.preferredDays.includes(d))
  ) {
    return '활동 요일이 비슷해요';
  }

  if (c.campus === s.campus) return '같은 캠퍼스예요';
  if (c.campus === '공통') return '양 캠퍼스 모두 참여해요';
  if (c.memberCount <= 1) return '이제 막 시작한 팀이에요';
  return '자리가 넉넉해요';
}

export function fallbackPicks(
  candidates: Candidate[],
  seeker: Seeker,
  count: number,
  /** 앞서 보여준 커넥트. 점수를 낮춰 뒤로 민다. */
  seenIds: string[] = [],
): Pick[] {
  const seen = new Set(seenIds);
  return (
    candidates
      // 부르는 쪽에서 이미 걸렀지만 여기서도 확인한다. 자리가 없는
      // 커넥트를 추천하면 눌러 본 뒤에야 막히는 걸 알게 된다.
      .filter((c) => c.memberCount < c.capacity)
  )
    // 이미 본 것은 크게 감점한다. 빼지 않는 이유는 후보가 모자랄 때
    // 세 개를 채우지 못하기 때문이다. 남은 것이 있으면 그쪽이 먼저 온다.
    .map((c) => ({ c, s: score(c, seeker) - (seen.has(c.id) ? 100 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(({ c }) => ({ connectId: c.id, reason: labelFor(c, seeker) }));
}
