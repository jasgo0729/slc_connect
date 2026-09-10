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

export function fallbackPicks(
  candidates: Candidate[],
  seeker: Seeker,
  count: number,
): Pick[] {
  return (
    candidates
      // 부르는 쪽에서 이미 걸렀지만 여기서도 확인한다. 자리가 없는
      // 커넥트를 추천하면 눌러 본 뒤에야 막히는 걸 알게 된다.
      .filter((c) => c.memberCount < c.capacity)
  )
    .map((c) => ({ c, s: score(c, seeker) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(({ c }) => ({
      connectId: c.id,
      reason:
        c.campus === seeker.campus || c.campus === '공통'
          ? '같은 캠퍼스에서 활동해서 만나기 편해요.'
          : '활동 소개가 구체적이라 무엇을 할지 그려볼 수 있어요.',
    }));
}
