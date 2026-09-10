import 'server-only';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { fallbackPicks } from './fallback';
import type { Candidate, Pick, RecommendResult, Seeker } from './types';

/**
 * E-01 LLM 추천.
 *
 * 모델 응답을 신뢰하지 않는다. 세 가지를 반드시 확인한다.
 *   1. JSON으로 파싱되는가
 *   2. 가리킨 번호가 실제 후보 범위 안인가
 *   3. 같은 것을 두 번 고르지 않았는가
 *
 * 하나라도 어긋나면 그 항목만 버리고, 개수가 모자라면 규칙으로 채운다.
 * 없는 커넥트를 추천해 404로 보내는 것이 가장 나쁜 실패다.
 */
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const TIMEOUT_MS = 20_000;

interface RawPick {
  index?: unknown;
  reason?: unknown;
}

function parsePicks(text: string, candidates: Candidate[], count: number): Pick[] {
  // 코드블록으로 감싸 오는 경우가 있다.
  const cleaned = text.replace(/```json|```/g, '').trim();

  let parsed: { picks?: RawPick[] };
  try {
    parsed = JSON.parse(cleaned) as { picks?: RawPick[] };
  } catch {
    return [];
  }

  const seen = new Set<number>();
  const picks: Pick[] = [];

  for (const p of parsed.picks ?? []) {
    const i = typeof p.index === 'number' ? p.index : Number(p.index);
    if (!Number.isInteger(i) || i < 0 || i >= candidates.length) continue;
    if (seen.has(i)) continue;
    seen.add(i);

    const reason = typeof p.reason === 'string' ? p.reason.trim() : '';
    picks.push({
      connectId: candidates[i]!.id,
      reason: reason.slice(0, 120) || '관심사와 활동 내용이 잘 맞아요.',
    });
    if (picks.length >= count) break;
  }

  return picks;
}

export async function recommend(
  seeker: Seeker,
  candidates: Candidate[],
  count = 3,
): Promise<RecommendResult> {
  if (candidates.length === 0) return { picks: [], isFallback: false };

  const key = process.env.OPENAI_API_KEY;
  // 키가 없으면 조용히 규칙으로 간다. 개발 환경에서 키 없이도
  // 화면 전체가 동작해야 만들면서 확인할 수 있다.
  if (!key) {
    return { picks: fallbackPicks(candidates, seeker, count), isFallback: true };
  }

  let picks: Pick[] = [];
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        // 형식이 어긋나면 파싱부터 실패한다. 모델에게 강제한다.
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(seeker, candidates, count) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      picks = parsePicks(text, candidates, count);
    }
  } catch {
    // 시간 초과, 네트워크 오류, 잘못된 응답. 어느 쪽이든 폴백으로 간다.
  }

  if (picks.length === 0) {
    return { picks: fallbackPicks(candidates, seeker, count), isFallback: true };
  }

  // 개수가 모자라면 규칙으로 채운다. 두 개만 보여주면 고를 여지가 좁다.
  if (picks.length < count) {
    const already = new Set(picks.map((p) => p.connectId));
    const extra = fallbackPicks(
      candidates.filter((c) => !already.has(c.id)),
      seeker,
      count - picks.length,
    );
    picks = [...picks, ...extra];
  }

  return { picks, isFallback: false };
}
