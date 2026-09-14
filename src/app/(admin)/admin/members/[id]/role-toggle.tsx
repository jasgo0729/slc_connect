'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { setUserRoleAction } from '../../actions';

/**
 * A-08 관리자 권한.
 *
 * 지금까지는 DB에 직접 UPDATE 를 날려야 했다. 운영진이 늘거나
 * 바뀔 때마다 SSH로 들어가는 것은 현실적이지 않다.
 *
 * 되돌릴 수 있는 조작이지만 확인을 한 번 받는다. 점수 입력과
 * 랭킹 조작이 가능한 권한이라 실수로 눌리면 안 된다.
 */
export function RoleToggle({
  userId,
  name,
  isAdmin,
  isSelf,
}: {
  userId: string;
  name: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 자기 권한은 내리지 못한다. 혼자 남은 관리자가 실수로 내리면
  // 아무도 되돌릴 수 없어 DB를 직접 고쳐야 한다.
  if (isSelf) {
    return <p className="field-hint">본인 계정이에요. 권한은 다른 관리자만 바꿀 수 있어요.</p>;
  }

  const apply = () =>
    start(async () => {
      setError(null);
      const r = await setUserRoleAction(userId, isAdmin ? 'member' : 'admin');
      setConfirming(false);
      if (r.error) setError(r.error);
    });

  return (
    <>
      {error && <Notice>{error}</Notice>}

      {confirming ? (
        <div className="warn-confirm">
          <p className="field-hint">
            {isAdmin ? (
              <>
                <b>{name}</b>님의 관리자 권한을 거둡니다.
              </>
            ) : (
              <>
                <b>{name}</b>님에게 관리자 권한을 줍니다. 점수와 랭킹을 다룰 수 있게 돼요.
              </>
            )}
          </p>
          <div className="actionbar-row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              취소
            </button>
            <button
              type="button"
              className={isAdmin ? 'btn btn--danger btn--sm' : 'btn btn--sm'}
              onClick={apply}
              disabled={pending}
            >
              {pending ? '처리 중…' : isAdmin ? '거두기' : '권한 주기'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--line btn--sm"
          onClick={() => setConfirming(true)}
        >
          {isAdmin ? '관리자 권한 거두기' : '관리자로 지정'}
        </button>
      )}
    </>
  );
}
