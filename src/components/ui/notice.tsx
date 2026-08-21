import { IconInfo } from './icon';

/** 오류·안내 박스. 무엇이 잘못됐고 어떻게 하면 되는지를 함께 적는다. */
export function Notice({
  children,
  tone = 'error',
}: {
  children: React.ReactNode;
  tone?: 'error' | 'info';
}) {
  return (
    <p className={tone === 'info' ? 'notice notice--info' : 'notice'} role={tone === 'error' ? 'alert' : undefined}>
      <IconInfo />
      <span>{children}</span>
    </p>
  );
}
