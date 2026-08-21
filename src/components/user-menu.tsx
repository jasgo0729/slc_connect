'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * 로그인한 사용자 메뉴.
 *
 * 로그아웃 경로가 여기밖에 없다. 이게 없으면 한 번 로그인한 뒤
 * 다른 계정으로 바꾸거나 비로그인 화면을 확인할 방법이 없다.
 *
 * 로그아웃은 POST로 보낸다. 링크로 두면 브라우저나 확장 프로그램이
 * 미리 열어 보는 것만으로 세션이 끊길 수 있다.
 */
export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="usermenu" ref={ref}>
      <button
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {name}님
      </button>

      {open && (
        <div className="usermenu-pop" role="menu">
          <Link href="/me" role="menuitem" onClick={() => setOpen(false)}>
            마이페이지
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" role="menuitem">
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
