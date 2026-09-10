import type { Candidate } from '@/lib/db/queries/recommend';

/** 추천에 넣는 사람 쪽 정보. 전부 없을 수도 있다. */
export interface Seeker {
  mbtiCode: string | null;
  bio: string | null;
  interests: string | null;
  residence: string | null;
  campus: string;
  preferredDays: number[];
  keyword: string;
}

export interface Pick {
  connectId: string;
  reason: string;
}

export interface RecommendResult {
  picks: Pick[];
  /** LLM이 아니라 규칙으로 고른 경우. E-08 */
  isFallback: boolean;
}

export type { Candidate };
