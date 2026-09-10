'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/notice';
import { runRecommend } from './actions';
import type { RecommendState } from './actions';

/**
 * E-01 추천 화면.
 *
 * 한 줄만 적어도 되고, 비워도 된다. 프로필과 Connect-MBTI가
 * 이미 재료이므로 입력이 없어도 결과가 나온다 — 무엇을 할지
 * 모르는 사람이 대상이라 빈칸에서 막히면 안 된다.
 */
const EXAMPLES = [
  '운동하면서 사람들 만나고 싶어요',
  '공모전 준비해보고 싶은데 혼자는 막막해요',
  '평일 저녁에 가볍게 만날 모임',
  '뭔가 만들어보고 싶어요',
];

export function RecommendForm({
  hasMbti,
  hasProfile,
}: {
  hasMbti: boolean;
  hasProfile: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState<RecommendState>({});
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setState({});
      setState(await runRecommend(keyword));
    });

  return (
    <>
      <div className="reco-form">
        <label className="field-label" htmlFor="reco-kw">
          어떤 커넥트를 찾고 있나요? <em>비워도 괜찮아요</em>
        </label>
        <textarea
          id="reco-kw"
          className="input textarea reco-input"
          rows={3}
          maxLength={200}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="한 줄만 적어주세요. 정하지 않았어도 괜찮아요."
        />

        <div className="reco-examples">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="chip" onClick={() => setKeyword(e)}>
              {e}
            </button>
          ))}
        </div>

        {/* 재료가 없으면 결과가 뻔해진다. 미리 알려 주되 막지는 않는다. */}
        {!hasMbti && !hasProfile && (
          <p className="field-hint" style={{ marginTop: 12 }}>
            <Link href="/mbti" style={{ color: 'var(--blue)', fontWeight: 600 }}>
              Connect-MBTI
            </Link>
            를 하거나 프로필을 채우면 더 잘 맞는 곳을 골라 드려요.
          </p>
        )}

        <button
          type="button"
          className="btn btn--block"
          style={{ marginTop: 16 }}
          disabled={pending}
          onClick={run}
        >
          {pending ? '고르는 중…' : '추천받기'}
        </button>
      </div>

      {state.error && <Notice>{state.error}</Notice>}

      {state.results && state.results.length > 0 && (
        <section className="reco-results">
          <h2 className="me-sectitle">이런 커넥트는 어때요</h2>
          <div className="cards" style={{ marginTop: 12 }}>
            {state.results.map((r) => (
              <Link key={r.id} href={`/connects/${r.id}`} className="ccard reco-card">
                <h3 className="ccard-name" style={{ paddingRight: 0 }}>
                  {r.name}
                </h3>
                <p className="ccard-desc">{r.tagline}</p>

                <p className="reco-reason">{r.reason}</p>

                <div className="ccard-foot">
                  <span className="badge badge--track">{r.trackLabel}</span>
                  <span className="ccard-count">
                    <b>{r.memberCount}</b>/{r.capacity}
                  </span>
                  <span className="badge badge--neutral">{r.campus}</span>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--line btn--block"
            style={{ marginTop: 14 }}
            disabled={pending}
            onClick={run}
          >
            다시 추천받기
          </button>
        </section>
      )}
    </>
  );
}
