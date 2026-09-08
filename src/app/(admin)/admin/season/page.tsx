import { SEASON_KEYS, getSeasonConfig } from '@/lib/db/queries/season';
import { SeasonForm } from './season-form';

export const dynamic = 'force-dynamic';

/**
 * 시즌 설정 · J-07 랭킹 공개 모드.
 *
 * 날짜를 코드에 박으면 일정이 바뀔 때마다 배포해야 한다.
 * 대학 행사는 일정이 잘 바뀌므로 여기서 고친다.
 */
export default async function AdminSeasonPage() {
  const values = await getSeasonConfig();

  return (
    <main className="shell admin-page">
      <h1 className="me-title">시즌 설정</h1>
      <p className="create-lede">여기서 바꾼 값은 바로 반영됩니다.</p>
      <SeasonForm fields={Object.values(SEASON_KEYS)} values={values} />
    </main>
  );
}
