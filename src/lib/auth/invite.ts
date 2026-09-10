import { IS_HTTPS } from './cookies';
import 'server-only';
import { cookies } from 'next/headers';

/**
 * 초대 링크를 거쳐 왔다는 표시.
 *
 * C-11은 비공개 커넥트를 목록에서 감추지만, 그것만으로는 id를 아는
 * 사람이 상세를 열 수 있다. 초대 링크가 실제 관문이 되려면
 * "링크를 거쳐 왔는가"를 기억해야 한다.
 *
 * 서버에 표를 만들지 않고 쿠키에 담는다. 이 기록이 유실돼도
 * 링크를 다시 누르면 복구되므로 영구 보관할 값이 아니다.
 *
 * 쿠키 크기 상한(4KB)이 있으므로 최근 것만 남긴다.
 */
const COOKIE = 'invited';
const MAX = 20;
const TTL_DAYS = 60;

export async function rememberInvite(connectId: string): Promise<void> {
  const jar = await cookies();
  const prev = (jar.get(COOKIE)?.value ?? '').split(',').filter(Boolean);
  const next = [connectId, ...prev.filter((id) => id !== connectId)].slice(0, MAX);

  jar.set(COOKIE, next.join(','), {
    httpOnly: true,
    secure: IS_HTTPS,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export async function wasInvited(connectId: string): Promise<boolean> {
  const jar = await cookies();
  return (jar.get(COOKIE)?.value ?? '').split(',').includes(connectId);
}
