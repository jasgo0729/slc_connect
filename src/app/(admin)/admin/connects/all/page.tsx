import { listAllConnects } from '@/lib/db/queries/admin-ops';
import { ConnectTable } from './connect-table';

export const dynamic = 'force-dynamic';

/**
 * J-01 커넥트 관리 · J-06 유연 증원.
 *
 * 전체 목록을 상태별로 본다. 여기서 하는 조작은 정원 조정 하나뿐이다 —
 * 상태를 직접 바꾸는 버튼은 두지 않았다. 팀장의 조기 마감이나 확인
 * 대기처럼 각자 이유가 있는 상태를 관리자가 임의로 뒤집으면
 * 무엇이 왜 그렇게 됐는지 추적할 수 없게 된다.
 */
interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminAllConnectsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const items = await listAllConnects(status);

  return (
    <main className="shell admin-page">
      <h1 className="me-title">커넥트</h1>
      <p className="create-lede">
        정원은 4~7명 사이에서 조정할 수 있어요. 늘리면 정원 도달로 닫힌 커넥트가 다시 열립니다.
      </p>
      <ConnectTable items={items} status={status ?? ''} />
    </main>
  );
}
