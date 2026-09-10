'use client';

import { useState } from 'react';
import Link from 'next/link';
import { drawMbtiCard } from '@/lib/connects/mbti-card';
import type { ConnectMbtiType } from '@/lib/connects/mbti';

/**
 * F-03 결과 화면.
 *
 * 공유되는 화면이라 유형마다 색이 다르다. 열여섯 개가 전부 같은
 * 파란색이면 스토리에 올렸을 때 무엇이 나왔는지 구분되지 않는다.
 *
 * 공유는 이미지로 한다. 링크만 보내면 받는 쪽이 눌러야 무엇이
 * 나왔는지 알 수 있어서, 스토리에 올리는 목적에 맞지 않는다.
 *
 * 이미지를 지원하지 않는 브라우저에서는 링크 복사로 떨어진다.
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
  const [busy, setBusy] = useState(false);

  const shareUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/mbti/${type.code}`
      : `/mbti/${type.code}`;

  const copyLink = async () => {
    const text = `내 Connect-MBTI는 ${type.emoji} ${type.title}`;
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl()}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 주소를 복사해 주세요', shareUrl());
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const url = shareUrl();
      const blob = await drawMbtiCard(type, url);

      if (blob) {
        const file = new File([blob], `connect-mbti-${type.code}.png`, { type: 'image/png' });

        // canShare 로 먼저 확인한다. 파일 공유를 못 하는 브라우저에서
        // 바로 share 를 부르면 예외가 나고, 사용자가 취소한 것과
        // 구분할 수 없다.
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Connect-MBTI',
            text: `내 Connect-MBTI는 ${type.emoji} ${type.title}`,
          });
          return;
        }

        // 공유창이 없으면 내려받는다. 갤러리에 저장한 뒤 직접 올릴 수 있다.
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `connect-mbti-${type.code}.png`;
        a.click();
        URL.revokeObjectURL(href);
        return;
      }

      await copyLink();
    } catch {
      // 사용자가 공유창을 닫은 경우도 여기로 온다. 조용히 넘어간다.
    } finally {
      setBusy(false);
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
          <button type="button" className="btn btn--line" onClick={share} disabled={busy}>
            {busy ? '만드는 중…' : '이미지 공유'}
          </button>
        </div>

        <button type="button" className="textbtn mbti-copy" onClick={copyLink}>
          {copied ? '링크를 복사했어요' : '링크만 복사하기'}
        </button>

        {!loggedIn && (
          <p className="mbti-note">
            <Link href="/login?callbackUrl=%2Fmbti">로그인</Link>하면 결과가 프로필에 저장돼요.
          </p>
        )}
      </div>
    </main>
  );
}
