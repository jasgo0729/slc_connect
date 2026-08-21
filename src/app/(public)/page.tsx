import { redirect } from 'next/navigation';

/**
 * 루트 진입.
 *
 * 별도 랜딩을 두지 않고 씨앗판으로 보낸다. 로그인 없이 목록을
 * 볼 수 있으므로 씨앗판이 곧 로비 역할을 한다. 홍보용 랜딩이
 * 필요해지면 이 자리에 두고 로그인 상태만 분기하면 된다.
 */
export default function RootPage() {
  redirect('/connects');
}
