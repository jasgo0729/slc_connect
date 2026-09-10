'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { IconArrowLeft, IconSpark } from '@/components/ui/icon';
import { runRecommend } from './actions';
import type { RecommendState } from './actions';

/**
 * E-01 추천.
 *
 * 키워드를 묻지 않는다. 대상이 '무엇을 할지 모르는 사람'이라
 * 빈칸을 먼저 보여주면 거기서 멈춘다. 프로필과 Connect-MBTI가
 * 이미 재료이므로 들어오자마자 바로 고르기 시작한다.
 *
 * 프로필이 비어 있으면 한 번 물어본다. 채우면 결과가 달라지지만
 * 강요하지는 않는다 — '나중에 할게요'로도 추천은 나온다.
 */
type Stage = 'ask' | 'loading' | 'done';

export function RecommendFlow({ needsProfile }: { needsProfile: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(needsProfile ? 'ask' : 'loading');
  const [state, setState] = useState<RecommendState>({});

  // 이번 방문에서 보여준 커넥트를 쌓아 둔다. '다시 추천받기'가
  // 같은 셋을 되풀이하면 버튼을 누를 이유가 없다.
  const [seen, setSeen] = useState<string[]>([]);

  const run = useCallback(
    async (carry: string[]) => {
      setStage('loading');
      setState({});
      const r = await runRecommend('', carry);
      setState(r);
      setSeen([...new Set([...carry, ...(r.results ?? []).map((x) => x.id)])]);
      setStage('done');
    },
    [],
  );

  useEffect(() => {
    if (stage === 'loading' && !state.results && !state.error) void run(seen);
    // seen 은 의도적으로 뺀다. 넣으면 결과가 쌓일 때마다 다시 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, state.results, state.error, run]);

  if (stage === 'ask') {
    return (
      <Modal
        open
        tone="ok"
        title={'조금 더 나은 추천을 받기 위해\n프로필을 채워볼까요?'}
        body="한줄소개·거주지·MBTI를 채우면 더 잘 맞는 커넥트를 추천해드려요."
        action="네, 채울래요"
        onAction={() => router.push('/me')}
        secondary={{ label: '나중에 할게요', onClick: () => setStage('loading') }}
      />
    );
  }

  if (stage === 'loading') {
    return (
      <main className="reco-loading">
        <div className="reco-loading-icon" aria-hidden="true">
          <IconSpark size={24} />
        </div>
        <p className="reco-loading-text">
          나에게 맞는 커넥트를
          <br />
          찾고 있어요
        </p>
        <div className="reco-dots" aria-label="불러오는 중">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  return (
    <main className="page shell reco">
      <Link href="/connects" className="detail-meta" style={{ marginTop: 0 }}>
        <IconArrowLeft size={18} /> 나에게 맞는 커넥트
      </Link>

      {state.error ? (
        <>
          <Notice>{state.error}</Notice>
          <div className="reco-empty-actions">
            <Link href="/connects" className="btn btn--line">
              씨앗판 둘러보기
            </Link>
            <Link href="/connects/new" className="btn">
              커넥트 만들기
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="reco-title">이런 커넥트는 어때요?</h1>
          <p className="reco-lede">회원님을 위해 골라봤어요</p>

          <div className="reco-cards">
            {(state.results ?? []).map((r) => (
              <Link key={r.id} href={`/connects/${r.id}`} className="reco-card">
                <p className="reco-reason">
                  <IconSpark size={12} />
                  {r.reason}
                </p>
                <h2 className="reco-name">{r.name}</h2>
                <p className="reco-tagline">{r.tagline}</p>
                <div className="reco-foot">
                  <span className={`badge badge--${r.statusTone}`}>{r.statusLabel}</span>
                  <span className="reco-count">
                    {r.memberCount}/{r.capacity}
                  </span>
                  <span className="badge badge--neutral">{r.campus}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 후보를 다 돌았으면 같은 것을 되풀이하게 된다. 그때는
              처음부터 다시 보겠냐고 묻는 편이 정직하다. */}
          {state.exhausted ? (
            <div className="reco-exhausted">
              <p>보여드릴 수 있는 커넥트를 다 돌았어요.</p>
              <div className="reco-empty-actions">
                <button
                  type="button"
                  className="btn btn--line"
                  onClick={() => {
                    setSeen([]);
                    void run([]);
                  }}
                >
                  처음부터 다시 보기
                </button>
                <Link href="/connects" className="btn">
                  씨앗판에서 직접 고르기
                </Link>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--line btn--block reco-again"
              onClick={() => void run(seen)}
            >
              다시 추천받기
            </button>
          )}
        </>
      )}
    </main>
  );
}
