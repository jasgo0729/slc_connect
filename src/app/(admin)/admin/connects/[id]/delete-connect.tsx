'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/notice';
import { deleteConnectAction } from '../../actions';

/**
 * J-01 커넥트 삭제.
 *
 * 되돌릴 수 없고, 신청·참여·찜 이력이 외래키로 함께 사라진다.
 * 그래서 무엇이 지워지는지 먼저 보여주고 이름을 손으로 입력받는다.
 *
 * 사유를 받는 이유는 두 가지다. 참여자에게 보내는 알림에 들어가고,
 * 감사 로그에 남아 나중에 왜 지웠는지 확인할 수 있다.
 */
const REASONS = [
  '중복으로 만들어진 커넥트예요.',
  '모집 기간 동안 인원이 모이지 않았어요.',
  '운영 기준에 맞지 않아 정리했어요.',
  '개설자 요청으로 삭제했어요.',
];

export function DeleteConnect({
  connectId,
  name,
  memberCount,
  pendingCount,
  favoriteCount,
}: {
  connectId: string;
  name: string;
  memberCount: number;
  pendingCount: number;
  favoriteCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState(REASONS[0]!);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const affected = memberCount + pendingCount;

  const run = () =>
    start(async () => {
      setError(null);
      const r = await deleteConnectAction(connectId, reason);
      if (r?.error) setError(r.error);
    });

  if (!open) {
    return (
      <div className="danger-zone">
        <div>
          <p className="danger-title">커넥트 삭제</p>
          <p className="danger-sub">
            신청·참여·찜 이력이 함께 사라져요. 되돌릴 수 없습니다.
          </p>
        </div>
        <button type="button" className="btn btn--line btn--sm" onClick={() => setOpen(true)}>
          삭제하기
        </button>
      </div>
    );
  }

  return (
    <section className="danger-zone danger-zone--open">
      <p className="danger-title">정말 지울까요?</p>

      <ul className="danger-list">
        <li>
          참여자 <b>{memberCount}명</b>의 소속이 사라져요.
        </li>
        <li>
          대기 중인 신청 <b>{pendingCount}건</b>이 사라져요.
        </li>
        <li>
          찜 <b>{favoriteCount}건</b>이 사라져요.
        </li>
        {affected > 0 && <li>{affected}명에게 알림이 나갑니다.</li>}
      </ul>

      <div className="field">
        <label className="field-label" htmlFor="del-reason">
          사유 <em>알림과 기록에 남아요</em>
        </label>
        <select
          id="del-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="del-name">
          확인을 위해 <b>{name}</b> 을(를) 그대로 입력해주세요
        </label>
        <input
          id="del-name"
          className="input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      </div>

      {error && <Notice>{error}</Notice>}

      <div className="actionbar-row" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={pending || typed.trim() !== name}
          onClick={run}
        >
          {pending ? '지우는 중…' : '영구 삭제'}
        </button>
      </div>

      <Link href={`/connects/${connectId}/edit`} className="textbtn danger-edit">
        지우는 대신 내용을 고칠래요
      </Link>
    </section>
  );
}
