'use client';

import { useOptimistic, useTransition } from 'react';
import { IconHeart } from './ui/icon';

/**
 * D-08 찜 버튼.
 *
 * 낙관적으로 먼저 채우고 서버 응답을 기다린다. 목록에서 여러 개를
 * 빠르게 누르는 동작이라 왕복을 기다리면 반응이 없는 것처럼 느껴진다.
 *
 * 비로그인은 onBlocked로 넘긴다 — 화면을 로그인으로 밀어내지 않고
 * 시트로 물어봐야 보던 목록을 잃지 않는다.
 */
export function FavoriteButton({
  connectId,
  initial,
  loggedIn,
  onBlocked,
  size = 'sm',
  label,
}: {
  connectId: string;
  initial: boolean;
  loggedIn: boolean;
  onBlocked?: () => void;
  size?: 'sm' | 'lg';
  label?: string;
}) {
  const [on, setOn] = useOptimistic(initial);
  const [, start] = useTransition();

  const click = (e: React.MouseEvent) => {
    // 카드 전체가 링크인 곳에서도 쓰이므로 이동을 막는다.
    e.preventDefault();
    e.stopPropagation();

    if (!loggedIn) {
      onBlocked?.();
      return;
    }
    start(async () => {
      setOn(!on);
      const { favoriteAction } = await import('@/app/(public)/connects/[id]/actions');
      await favoriteAction(connectId);
    });
  };

  return (
    <button
      type="button"
      className={size === 'lg' ? 'fav-lg' : 'fav'}
      aria-pressed={on}
      aria-label={on ? '찜 해제' : '찜하기'}
      onClick={click}
      data-on={on}
    >
      <IconHeart filled={on} size={size === 'lg' ? 22 : 20} />
      {label && <span>{label}</span>}
    </button>
  );
}
