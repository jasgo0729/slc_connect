import Link from 'next/link';

/**
 * 아직 만들지 않은 화면.
 *
 * 상단 바와 탭바가 이미 가리키고 있는 곳이라 비워 두면 404가 뜬다.
 * 없는 기능을 있는 척하지 않되, 언제 열리는지와 지금 할 수 있는 것을
 * 알려 준다 — 막다른 길로 두지 않는 것이 핵심이다.
 */
export function ComingSoon({
  title,
  body,
  when,
  action,
}: {
  title: string;
  body: string;
  when?: string;
  action?: { href: string; label: string };
}) {
  return (
    <main className="page shell soon">
      <div className="soon-inner">
        {when && <p className="soon-when">{when}</p>}
        <h1 className="soon-title">{title}</h1>
        <p className="soon-body">{body}</p>
        <Link href={action?.href ?? '/connects'} className="btn">
          {action?.label ?? '씨앗판 둘러보기'}
        </Link>
      </div>
    </main>
  );
}
