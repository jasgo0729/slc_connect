'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
  RATE_LIMIT,
  countRecentCalls,
  getCandidates,
  logRecommendation,
} from '@/lib/db/queries/recommend';
import { getMyConnectMbti } from '@/lib/db/queries/me';
import { recommend } from '@/lib/recommend/client';
import type { Seeker } from '@/lib/recommend/types';
import { trackLabel } from '@/lib/connects/options';

export interface RecommendedConnect {
  id: string;
  name: string;
  tagline: string;
  trackLabel: string;
  campus: string;
  memberCount: number;
  capacity: number;
  reason: string;
}

export interface RecommendState {
  results?: RecommendedConnect[];
  error?: string;
  /** 규칙으로 골랐다는 표시. 화면에서 굳이 알리지는 않는다. */
  isFallback?: boolean;
}

/**
 * E-01 추천 실행.
 *
 * 프로필과 Connect-MBTI를 모으고 후보와 함께 LLM에 넘긴다.
 * MBTI를 안 했어도 동작해야 한다 — 그 사람이야말로 추천이 필요한
 * 쪽이고, 검사부터 하라고 돌려보내면 거기서 이탈한다.
 */
export async function runRecommend(keyword: string): Promise<RecommendState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=%2Frecommend');

  // E-09 호출 제한. LLM 호출은 돈이 들고, 반복해도 결과가 크게 다르지 않다.
  const used = await countRecentCalls(user.id);
  if (used >= RATE_LIMIT.max) {
    return {
      error: `추천은 ${RATE_LIMIT.windowMinutes}분에 ${RATE_LIMIT.max}번까지 받을 수 있어요. 잠시 후 다시 시도해 주세요.`,
    };
  }

  const [candidates, mbtiCode] = await Promise.all([
    getCandidates(user.id),
    getMyConnectMbti(user.id),
  ]);

  if (candidates.length === 0) {
    return {
      error:
        '지금 신청할 수 있는 커넥트가 없어요. 이미 두 트랙에 모두 속해 있거나, 남은 자리가 없는 상태예요.',
    };
  }

  const seeker: Seeker = {
    mbtiCode,
    bio: user.bio,
    interests: user.interests,
    residence: user.residence,
    campus: user.campus,
    preferredDays: user.preferredDays ?? [],
    keyword: keyword.slice(0, 200),
  };

  const { picks, isFallback } = await recommend(seeker, candidates, 3);

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const results: RecommendedConnect[] = picks
    .map((p) => {
      const c = byId.get(p.connectId);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        trackLabel: trackLabel(c.track),
        campus: c.campus === '인문사회' ? '인사캠' : c.campus === '자연과학' ? '자과캠' : '공통',
        memberCount: c.memberCount,
        capacity: c.capacity,
        reason: p.reason,
      };
    })
    .filter((r): r is RecommendedConnect => r !== null);

  await logRecommendation(
    user.id,
    keyword.slice(0, 200),
    mbtiCode ? 'mbti' : 'profile',
    results.map((r) => r.id),
    isFallback,
  );

  return { results, isFallback };
}
