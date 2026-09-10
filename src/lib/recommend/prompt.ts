import { AXES, findConnectMbti } from '@/lib/connects/mbti';
import { DAYS, trackLabel } from '@/lib/connects/options';
import type { Candidate, Seeker } from './types';

/**
 * E-02 프롬프트 구성.
 *
 * 커넥트 설명문이 유일한 매칭 재료다. 사람 쪽 정보는 대부분 비어
 * 있을 수 있고(A-05가 전부 선택), 모집 초반에는 참여자도 0명이라
 * 다른 신호가 없다.
 *
 * 커넥트를 번호로 매기고 그 번호로 답하게 한다. UUID를 그대로
 * 뱉게 하면 한 글자씩 틀리는 일이 잦다.
 */
const CAMPUS_LABEL: Record<string, string> = {
  인문사회: '인문사회과학캠퍼스',
  자연과학: '자연과학캠퍼스',
  공통: '양 캠퍼스 공통',
};

function describeSeeker(s: Seeker): string {
  const lines: string[] = [];

  const mbti = findConnectMbti(s.mbtiCode);
  if (mbti) {
    // 코드만 주면 모델이 개인 MBTI로 오해한다. 축을 풀어서 준다.
    const axes = AXES.map((a, i) => {
      const letter = mbti.code[i];
      const side = a.a.code === letter ? a.a : a.b;
      return `${a.label}: ${side.label}`;
    });
    lines.push(`- 성향 유형: ${mbti.title} (${mbti.code})`);
    lines.push(`  ${axes.join(' / ')}`);
    lines.push(`  ${mbti.description}`);
  }

  if (s.bio) lines.push(`- 한 줄 소개: ${s.bio}`);
  if (s.interests) lines.push(`- 관심 있는 것: ${s.interests}`);
  if (s.residence) lines.push(`- 방학 중 거주지: ${s.residence}`);
  if (s.preferredDays.length > 0) {
    lines.push(`- 선호 요일: ${s.preferredDays.map((d) => DAYS[d]).filter(Boolean).join(', ')}`);
  }
  lines.push(`- 소속 캠퍼스: ${CAMPUS_LABEL[s.campus] ?? s.campus}`);

  if (s.keyword.trim()) lines.push(`- 직접 적은 바람: ${s.keyword.trim()}`);

  return lines.join('\n');
}

function describeCandidate(c: Candidate, index: number): string {
  const parts = [
    `[${index}] ${c.name}`,
    `  트랙: ${trackLabel(c.track)}`,
    `  캠퍼스: ${CAMPUS_LABEL[c.campus] ?? c.campus}`,
    `  인원: ${c.memberCount}/${c.capacity}`,
    `  한 줄 소개: ${c.tagline}`,
  ];
  if (c.description) parts.push(`  활동 소개: ${c.description}`);
  if (c.goalDetail) parts.push(`  목표: ${c.goalDetail}`);
  if (c.availableDays.length > 0) {
    parts.push(`  활동 요일: ${c.availableDays.map((d) => DAYS[d]).filter(Boolean).join(', ')}`);
  }
  return parts.join('\n');
}

export const SYSTEM_PROMPT = `당신은 대학 교내 소모임 매칭을 돕습니다.
주어진 후보 중에서만 고르고, 목록에 없는 것을 지어내지 않습니다.

원칙
- 사람의 성향·관심사와 커넥트의 활동 소개가 실제로 맞닿는 지점을 봅니다.
- 캠퍼스가 다르면 만나기 어렵습니다. 같은 캠퍼스이거나 '양 캠퍼스 공통'인 쪽을 우선합니다.
- 정보가 부족하면 억지로 연결하지 말고, 활동 소개가 구체적인 쪽을 고릅니다.

reason 은 카드 위에 한 줄로 붙는 짧은 라벨입니다.
- 12자 이내. 문장이 아니라 딱지에 가깝게.
- 왜 골랐는지 한 가지만 짚습니다.
- 예: "관심사와 잘 맞아요" / "활동 요일이 비슷해요" / "같은 캠퍼스예요"
      "만들어보고 싶다면 여기" / "가볍게 시작하기 좋아요"
- 커넥트 이름을 넣지 않습니다. 바로 아래에 이미 보입니다.

반드시 아래 JSON만 출력합니다. 설명이나 코드블록 없이.
{"picks":[{"index":0,"reason":"..."},{"index":3,"reason":"..."},{"index":7,"reason":"..."}]}`;

export function buildUserPrompt(
  seeker: Seeker,
  candidates: Candidate[],
  count: number,
  /**
   * 앞선 추천에서 이미 보여준 커넥트의 번호.
   *
   * 후보에서 아예 빼는 것이 먼저지만, 남은 수가 모자라면 뺄 수 없다.
   * 그때는 목록에 두되 뒤로 미루게 한다 — 세 개를 채우지 못해
   * 빈손으로 돌려보내는 것보다 낫다.
   */
  seenIndexes: number[] = [],
): string {
  const seenNote =
    seenIndexes.length > 0
      ? `\n\n## 이미 보여준 커넥트
번호 ${seenIndexes.join(', ')} 는 앞서 추천했습니다.
다른 것을 우선하되, 남은 후보가 모자라면 골라도 됩니다.`
      : '';

  return `## 이 사람
${describeSeeker(seeker)}

## 후보 커넥트 (${candidates.length}개)
${candidates.map(describeCandidate).join('\n\n')}${seenNote}

위 후보 중 이 사람에게 가장 잘 맞을 ${count}개를 골라 주세요.`;
}
