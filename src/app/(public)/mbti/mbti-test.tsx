'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MbtiResult } from '@/components/mbti-result';
import { CONNECT_MBTI, QUESTIONS, computeType } from '@/lib/connects/mbti';
import { saveMbtiResult } from './actions';

type Stage = 'intro' | 'quiz' | 'done';

/**
 * F-02 Connect-MBTI 검사.
 *
 * 한 화면에서 인트로 → 문항 → 결과로 넘어간다. 라우트를 나누면
 * 뒤로가기로 답이 날아가고, 12문항짜리 가벼운 테스트에 그 정도
 * 복잡도를 들일 이유가 없다.
 *
 * 결과는 /mbti/[코드]로도 볼 수 있다. 공유 링크가 그쪽이다.
 */
export function MbtiTest({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [code, setCode] = useState<string | null>(null);

  const q = QUESTIONS[step]!;
  const total = QUESTIONS.length;

  const pick = (choice: string) => {
    const next = { ...answers, [q.id]: choice };
    setAnswers(next);

    if (step + 1 < total) {
      setStep(step + 1);
      return;
    }

    const { code: result, scores } = computeType(next);
    setCode(result);
    setStage('done');
    // 저장 실패가 결과 화면을 막지 않게 한다.
    void saveMbtiResult(result, scores);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setCode(null);
    setStage('quiz');
  };

  if (stage === 'done' && code) {
    const type = CONNECT_MBTI[code]!;
    return <MbtiResult type={type} loggedIn={loggedIn} onRetry={restart} />;
  }

  if (stage === 'intro') {
    return (
      <main className="mbti-intro">
        <div className="mbti-intro-inner">
          <p className="mbti-eyebrow-label">Connect-MBTI</p>
          <h1 className="mbti-intro-title">
            나는 어떤
            <br />
            유형일까?
          </h1>
          <p className="mbti-intro-body">
            12문항이면 끝나요. 결과에 맞는 커넥트를 골라 드릴게요.
          </p>

          <div className="mbti-intro-faces" aria-hidden="true">
            {['🦫', '🦉', '🦊', '🐬', '🐰', '🐼'].map((e) => (
              <span key={e}>{e}</span>
            ))}
          </div>

          <button type="button" className="btn btn--block" onClick={() => setStage('quiz')}>
            테스트 하기
          </button>
          <Link href="/connects" className="textbtn" style={{ display: 'block', textAlign: 'center' }}>
            먼저 커넥트 둘러보기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mbti-quiz">
      <div className="mbti-quiz-inner">
        <div className="mbti-progress">
          <span className="mbti-progress-n">
            {step + 1}/{total}
          </span>
          <span className="mbti-progress-bar">
            <span style={{ width: `${((step + 1) / total) * 100}%` }} />
          </span>
        </div>

        <p className="mbti-q-label">Q{step + 1}.</p>
        <h1 className="mbti-q">{q.prompt}</h1>

        <div className="mbti-choices">
          {q.choices.map((c) => (
            <button
              key={c.code}
              type="button"
              className="mbti-choice"
              onClick={() => pick(c.code)}
            >
              {c.text}
            </button>
          ))}
        </div>

        {step > 0 && (
          <button
            type="button"
            className="textbtn mbti-back"
            onClick={() => setStep(step - 1)}
          >
            이전으로
          </button>
        )}
      </div>
    </main>
  );
}
