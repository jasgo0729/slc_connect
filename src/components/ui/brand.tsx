import Link from 'next/link';
import { IconSpark } from './icon';

/** 워드마크. PRISM 로고의 스파클을 표식으로 쓴다. */
export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="brand">
      <IconSpark size={16} className="brand-mark" />
      <span>
        <span className="brand-a">CROSS-SLC</span> <span className="brand-b">CONNECT</span>
      </span>
    </Link>
  );
}
