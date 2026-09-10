'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ConnectMbtiType } from '@/lib/connects/mbti';

/**
 * F-03 결과 화면.
 *
 * 공유되는 화면이라 유형마다 색이 다르다. 열여섯 개가 전부 같은
 * 파란색이면 스토리에 올렸을 때 무엇이 나왔는지 구분되지 않는다.
 *
 * 저장은 이미지 대신 링크 복사로 한다. 캔버스로 이미지를 만들면
 * 폰트·이모지가 기기마다 다르게 그려져 결과가 깨진 채로 공유된다.
 */
export function MbtiResult({
  type,
  loggedIn,
  onRetry,
}: {
  type: ConnectMbtiType;
  loggedIn: boolean;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/mbti/${type.code}`
        : `/mbti/${type.code}`;
    const text = `내 Connect-MBTI는 ${type.emoji} ${type.title}`;

    // 모바일에서는 시스템 공유창이 뜬다. 데스크탑은 링크 복사로 떨어진다.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Connect-MBTI', text, url });
        return;
      } catch {
        // 사용자가 취소한 경우. 복사로 넘어가지 않는다.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 주소를 복사해 주세요', url);
    }
  };

  return (
    <main className="mbti-result" style={{ ['--tint' as string]: type.tint, ['--accent' as string]: type.accent }}>
      <div className="mbti-result-inner">
        <p className="mbti-eyebrow-label">당신의 Connect-MBTI는</p>

        <div className="mbti-face" aria-hidden="true">
          {type.emoji}
        </div>

        <h1 className="mbti-title">{type.title}</h1>
        <p className="mbti-code">{type.code}</p>

        <p className="mbti-desc">{type.description}</p>
        <p className="mbti-desc">{type.suggestion}</p>

        <div className="mbti-tags">
          {type.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <section className="mbti-match">
          <p className="mbti-match-head">
            {type.emoji} {type.animal} &amp; {type.match.emoji} {type.match.animal}
          </p>
          <p className="mbti-match-body">
            [{type.match.label}] {type.match.text}
          </p>
        </section>

        {/* F-06 — 결과에서 곧바로 커넥트로 이어져야 검사가 의미를 갖는다. */}
        <Link href="/recommend" className="mbti-cta">
          커넥트 추천받으러 가기
        </Link>

        <div className="mbti-actions">
          {onRetry ? (
            <button type="button" className="btn btn--line" onClick={onRetry}>
              다시 하기
            </button>
          ) : (
            <Link href="/mbti" className="btn btn--line">
              나도 해보기
            </Link>
          )}
          <button type="button" className="btn btn--line" onClick={share}>
            {copied ? '복사했어요' : '공유하기'}
          </button>
        </div>

        {!loggedIn && (
          <p className="mbti-note">
            <Link href="/login?callbackUrl=%2Fmbti">로그인</Link>하면 결과가 프로필에 저장돼요.
          </p>
        )}
      </div>
    </main>
  );
}
