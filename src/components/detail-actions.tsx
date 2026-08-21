'use client';

import { IconHeart } from './ui/icon';

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
}: {
  connectId: string;
  capacity: number;
  memberCount: number;
  status: string;
  track: string;
  viewer: { isLeader: boolean; isMember: boolean; application: string | null };
}) {
  const open = Math.max(0, capacity - memberCount);

  let label = track === 'qualitative' ? '신청하기' : '참여하기';
  let disabled = false;
  let note: string | null = null;

  if (viewer.isLeader) {
    label = '팀 관리하기';
  } else if (viewer.isMember) {
    label = '참여 중';
    disabled = true;
  } else if (viewer.application === 'pending') {
    label = '승인 기다리는 중';
    disabled = true;
    note = '팀장이 확인하면 알림으로 알려드려요.';
  } else if (viewer.application === 'rejected') {
    label = '다시 신청하기';
  } else if (status === 'confirmed') {
    label = '모집이 끝났어요';
    disabled = true;
  } else if (status === 'pending_review') {
    label = '확인 대기 중이에요';
    disabled = true;
    note = '운영진 확인이 끝나면 신청할 수 있어요.';
  } else if (open === 0) {
    label = '자리가 찼어요';
    disabled = true;
  } else if (status === 'early_closed') {
    label = '승인받고 참여하기';
  }

  return (
    <aside className="actionbar">
      <div className="aside-only">
        <div className="aside-stat">
          <span>남은 자리</span>
          <b>{open > 0 ? `${open}자리` : '없음'}</b>
        </div>
        {note && <p className="field-hint">{note}</p>}
      </div>

      <div className="actionbar-row">
        <button type="button" className="fav-lg" aria-label="찜하기">
          <IconHeart />
        </button>
        <button
          type="button"
          className="btn"
          style={{ flex: 1 }}
          disabled={disabled}
          data-connect={connectId}
        >
          {label}
        </button>
      </div>
    </aside>
  );
}
