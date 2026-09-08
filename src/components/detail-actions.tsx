'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApplySheet } from './apply-sheet';
import { FavoriteButton } from './favorite-button';
import { Notice } from './ui/notice';
import { applyAction, cancelAction } from '@/app/(public)/connects/[id]/actions';

/**
 * 상세 화면의 행동 영역.
 *
 * 모바일에서는 화면 하단 고정, 데스크탑에서는 오른쪽 기둥 카드가 된다.
 *
 * 버튼 문구가 보는 사람의 상태에 따라 갈린다. "참여하기"만 두면
 * 이미 신청한 사람이 또 누르고, 팀장이 자기 팀에 신청하려 든다.
 */
export function DetailActions({
  connectId,
  capacity,
  memberCount,
  status,
  track,
  viewer,
  favorited,
  loggedIn,
  favoriteCount,
}: {
  connectId: string;
  capacity: number;
  memberCount: number;
  status: string;
  track: string;
  viewer: {
    isLeader: boolean;
    isMember: boolean;
    application: string | null;
    applicationId: string | null;
  };
  favorited: boolean;
  loggedIn: boolean;
  /** U-06 — 정확한 찜 수는 팀장에게만 넘어온다. */
  favoriteCount?: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();
  const open = Math.max(0, capacity - memberCount);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) {
        setError(r.error);
        return;
      }
      // 결과 화면이 현재 상태에서 종류를 유도한다.
      router.push(`/connects/${connectId}/result`);
    });

  // 정성 트랙과 조기 마감 커넥트는 지원서를 먼저 받는다.
  const needsLetter = track === 'qualitative' || status === 'early_closed';

  const submit = (message: string) => {
    setSheet(false);
    run(() => applyAction(connectId, message));
  };

  // 팀장은 신청하지 않는다. 관리 화면으로 보낸다.
  if (viewer.isLeader) {
    return (
      <aside className="actionbar">
        <div className="aside-only">
          <div className="aside-stat">
            <span>남은 자리</span>
            <b>{open > 0 ? `${open}자리` : '없음'}</b>
          </div>
          {favoriteCount !== undefined && (
            <p className="field-hint">{favoriteCount}명이 찜했어요</p>
          )}
        </div>
        <div className="actionbar-row">
          {status === 'rejected' ? (
            <Link href={`/connects/${connectId}/edit`} className="btn" style={{ flex: 1 }}>
              수정하러 가기
            </Link>
          ) : (
            <Link href={`/connects/${connectId}/manage`} className="btn" style={{ flex: 1 }}>
              팀 관리하기
            </Link>
          )}
        </div>
      </aside>
    );
  }

  let node: React.ReactNode;

  if (viewer.isMember) {
    node = (
      <button type="button" className="btn" style={{ flex: 1 }} disabled>
        참여 중이에요
      </button>
    );
  } else if (viewer.application === 'pending') {
    // D-12 확정 전에는 자유롭게 취소할 수 있다.
    node = (
      <button
        type="button"
        className="btn btn--line"
        style={{ flex: 1 }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await cancelAction(connectId, viewer.applicationId!);
            if (r.error) setError(r.error);
            else router.refresh();
          })
        }
      >
        {pending ? '처리 중…' : '신청 취소하기'}
      </button>
    );
  } else {
    const blocked =
      status === 'confirmed' ||
      status === 'pending_review' ||
      (open === 0 && status !== 'early_closed');

    const label =
      status === 'confirmed'
        ? '모집이 끝났어요'
        : status === 'pending_review'
          ? '확인 대기 중이에요'
          : open === 0
            ? '자리가 찼어요'
            : status === 'early_closed'
              ? '승인받고 참여하기'
              : track === 'qualitative'
                ? '신청하기'
                : '참여하기';

    node = (
      <button
        type="button"
        className="btn"
        style={{ flex: 1 }}
        disabled={blocked || pending}
        onClick={() => (needsLetter ? setSheet(true) : run(() => applyAction(connectId)))}
      >
        {pending ? '처리 중…' : label}
      </button>
    );
  }

  const note =
    viewer.application === 'pending'
      ? '팀장이 확인하면 알림으로 알려드려요.'
      : viewer.application === 'rejected'
        ? '지난 신청은 받아들여지지 않았어요. 다시 신청할 수 있어요.'
        : status === 'pending_review'
          ? '운영진 확인이 끝나면 신청할 수 있어요.'
          : track === 'qualitative' || status === 'early_closed'
            ? '팀장이 확인한 뒤 참여가 정해져요.'
            : null;

  return (
    <aside className="actionbar">
      <div className="aside-only">
        <div className="aside-stat">
          <span>남은 자리</span>
          <b>{open > 0 ? `${open}자리` : '없음'}</b>
        </div>
        {note && <p className="field-hint">{note}</p>}
      </div>

      {error && (
        <div className="aside-only">
          <Notice>{error}</Notice>
        </div>
      )}

      <div className="actionbar-row">
        <FavoriteButton
          connectId={connectId}
          initial={favorited}
          loggedIn={loggedIn}
          size="lg"
        />
        {node}
      </div>

      <ApplySheet
        open={sheet}
        onClose={() => setSheet(false)}
        onSubmit={submit}
        pending={pending}
      />
    </aside>
  );
}
