import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/app-bar';
import { MbtiResult } from '@/components/mbti-result';
import { getCurrentUser } from '@/lib/auth/session';
import { CONNECT_MBTI, findConnectMbti } from '@/lib/connects/mbti';

export const dynamic = 'force-dynamic';

/**
 * 공유용 결과 화면.
 *
 * 인스타그램 스토리에 올라가는 링크가 여기다. 코드만으로 열리므로
 * 검사를 하지 않은 사람도 남의 결과를 볼 수 있고, 거기서 '나도
 * 해보기'로 이어진다 — 그게 이 화면이 홍보 경로인 이유다.
 */
interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const t = findConnectMbti(code);
  if (!t) return { title: 'Connect-MBTI' };

  return {
    title: `${t.title} · Connect-MBTI`,
    description: t.description,
    openGraph: {
      title: `${t.emoji} ${t.title}`,
      description: t.description,
    },
  };
}

/** 열여섯 개뿐이라 전부 미리 만들어 둔다. */
export function generateStaticParams() {
  return Object.keys(CONNECT_MBTI).map((code) => ({ code }));
}

export default async function MbtiResultPage({ params }: Props) {
  const { code } = await params;
  const type = findConnectMbti(code);
  if (!type) notFound();

  const user = await getCurrentUser();

  return (
    <>
      <AppBar
        current="/mbti"
        user={user ? { id: user.id, name: user.name } : null}
        callbackUrl={`/mbti/${type.code}`}
      />
      <MbtiResult type={type} loggedIn={Boolean(user)} />
    </>
  );
}
