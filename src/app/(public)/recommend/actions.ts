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


export interface RecommendedConnect {
  id: string;
  name: string;
  tagline: string;
  campus: string;
  memberCount: number;
  capacity: number;
  /** 카드 위에 붙는 짧은 라벨. */
  reason: string;
  statusLabel: string;
  statusTone: string;
}

export interface RecommendState {
  results?: RecommendedConnect[];
  error?: string;
  /** 규칙으로 골랐다는 표시. 화면에서 굳이 알리지는 않는다. */
  isFallback?: boolean;
  /**
   * 아직 안 보여준 후보가 남았는지.
   *
   * 다 돌았으면 '다시 추천받기'가 같은 것을 되풀이하게 된다.
   * 그 전에 화면이 다른 말을 해야 한다.
   */
  exhausted?: boolean;
}

/** 후보는 모집 중이거나 조기 마감뿐이다(getCandidates 참고). */
const STATUS: Record<string, { label: string; tone: string }> = {
  recruiting: { label: '모집 중', tone: 'open' },
  early_closed: { label: '승인제 지원', tone: 'open' },
};

/**
 * E-01 추천 실행.
 *
 * 프로필과 Connect-MBTI를 모으고 후보와 함께 LLM에 넘긴다.
 * MBTI를 안 했어도 동작해야 한다 — 그 사람이야말로 추천이 필요한
 * 쪽이고, 검사부터 하라고 돌려보내면 거기서 이탈한다.
 */
export async function runRecommend(
  keyword: string,
  /** 앞선 추천에서 이미 보여준 커넥트. '다시 추천받기'가 쌓아 보낸다. */
  seenIds: string[] = [],
): Promise<RecommendState> {
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

  // 이미 보여준 것은 후보에서 뺀다. 다만 남은 수가 세 개보다 적으면
  // 빼지 않는다 — 두 개만 보여주는 것보다 일부 겹치는 편이 낫다.
  const seen = new Set(seenIds.filter((id) => typeof id === 'string'));
  const fresh = candidates.filter((c) => !seen.has(c.id));
  const pool = fresh.length >= 3 ? fresh : candidates;
  const exhausted = fresh.length === 0;

  const { picks, isFallback } = await recommend(seeker, pool, 3, seenIds);

  const byId = new Map(pool.map((c) => [c.id, c]));
  const results: RecommendedConnect[] = picks
    .map((p) => {
      const c = byId.get(p.connectId);
      if (!c) return null;
      const status = STATUS[c.status] ?? STATUS.recruiting!;
      return {
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        campus: c.campus === '인문사회' ? '인사캠' : c.campus === '자연과학' ? '자과캠' : '공통',
        memberCount: c.memberCount,
        capacity: c.capacity,
        reason: p.reason,
        statusLabel: status.label,
        statusTone: status.tone,
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

  return { results, isFallback, exhausted };
}
