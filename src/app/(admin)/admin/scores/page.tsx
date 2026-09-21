import Link from 'next/link';
import {
  listChallengeBoard,
  listConfirmedConnects,
  listManualAdjustments,
  listRecentScoreEvents,
  listScoreBoard,
} from '@/lib/db/queries/scoring';
import { CHALLENGE, CROSS, SCORING } from '@/lib/scoring/rules';
import { formatWeek } from '@/lib/scoring/week';
import { scoreEventLabel } from '@/lib/connects/score-events';
import { RecalcButton, RowRecalc } from './recalc-button';
import { ManualPanel } from './manual-panel';

export const dynamic = 'force-dynamic';

/**
 * 점수 관리.
 *
 * 점수는 인증을 승인할 때 자동으로 붙는다. 이 화면은 그것이
 * 의도대로 붙었는지 확인하는 자리다 — 규칙이 §6.2 주 2회,
 * §6.3 기준 인원, §6.5 주 1회, §6.6 전체 5회로 겹쳐 있어서
 * 검수 화면만 봐서는 결과를 알 수 없다.
 *
 * "인증은 있는데 점수가 0" 인 줄이 보이면 기준 인원 미달이거나
 * 한도에 걸린 것이다. 그것을 한눈에 찾으라고 인증 건수를 함께 둔다.
 */
export default async function AdminScoresPage() {
  const [board, challenge, events, manual, confirmed] = await Promise.all([
    listScoreBoard(),
    listChallengeBoard(),
    listRecentScoreEvents(60),
    listManualAdjustments(40),
    listConfirmedConnects(),
  ]);

  return (
    <main className="shell admin-page">
      <h1 className="me-title">점수 관리</h1>
      <p className="create-lede">
        점수는 인증을 승인할 때 자동으로 계산돼요. 규칙서 §6 기준입니다.
      </p>

      <section className="card-block" style={{ marginTop: 16 }}>
        <p className="field-hint" style={{ marginTop: 0 }}>
          만남 {SCORING.basePoints}점 · 주 {SCORING.weeklyBaseLimit}회까지 · 하루{' '}
          {SCORING.dailyBaseLimit}회 · 초과분 {SCORING.excessPoints}점 ·{' '}
          {SCORING.headcountThreshold}명 이상 {SCORING.headcountBonus}점(주{' '}
          {SCORING.headcountWeeklyLimit}회) · 산출물 최대 {SCORING.deliverableTotalLimit}회
        </p>
        {/* §7.7 은 별도 규칙이다. 한 줄로 붙여 두면 취미 트랙 한도가
            CCC 에도 걸리는 것처럼 읽힌다. */}
        <p className="field-hint" style={{ marginTop: 6 }}>
          CCC(§7.7) — 양 팀 합산 {CROSS.minTotalParticipants}명 이상 · 자기 팀 1명당{' '}
          {CROSS.pointsPerMember}점 · 주 {CROSS.weeklyLimit}점까지. 취미 트랙 한도와 별개예요.
        </p>
        <RecalcButton />
      </section>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        취미 커넥트 점수
      </h2>
      {board.length === 0 ? (
        <p className="mini-empty">확정된 커넥트가 없어요.</p>
      ) : (
        <ul className="score-board">
          {board.map((r, i) => (
            <li key={r.connectId}>
              <span className="score-board-rank">{i + 1}</span>
              <Link href={`/admin/connects/${r.connectId}`} className="score-board-name">
                {r.name}
              </Link>
              <span className="score-board-certs">인증 {r.approvedCerts}건</span>
              <span className="score-board-points">{r.total}점</span>
              <RowRecalc connectId={r.connectId} />
            </li>
          ))}
        </ul>
      )}

      {/* §9 도전 트랙은 점수제가 아니다. 순위도 매기지 않는다 —
          활동 횟수는 20% 항목 하나이고 "변별이 되지 않도록 널널한 기준"
          이라, 줄 세우면 이 항목의 무게를 잘못 읽게 된다. 만점까지
          남은 횟수가 많은 팀부터 보여준다(챙겨야 할 팀이 위). */}
      <h2 className="section-title" style={{ marginTop: 28 }}>
        도전 커넥트 활동 현황
      </h2>
      <p className="field-hint" style={{ marginTop: 0 }}>
        §9.3 정량 평가 · 활동 횟수(20%). 오프라인 {CHALLENGE.offlineTarget}회 포함 총{' '}
        {CHALLENGE.totalTarget}회면 만점, 모자란 1회당 {CHALLENGE.penaltyPerMissing}%.
      </p>
      {challenge.length === 0 ? (
        <p className="mini-empty">확정된 도전 커넥트가 없어요.</p>
      ) : (
        <ul className="score-board">
          {challenge.map((r) => (
            <li key={r.connectId}>
              <Link href={`/admin/connects/${r.connectId}`} className="score-board-name">
                {r.name}
              </Link>
              <span className="score-board-certs">
                {r.total}/{CHALLENGE.totalTarget}회 · 오프라인 {r.offline}/{CHALLENGE.offlineTarget}
              </span>
              <span className="score-board-points" data-full={r.missing === 0}>
                {r.percent}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <ManualPanel connects={confirmed} rows={manual} />

      <h2 className="section-title" style={{ marginTop: 28 }}>
        최근 점수 이벤트
      </h2>
      {events.length === 0 ? (
        <p className="mini-empty">아직 붙은 점수가 없어요.</p>
      ) : (
        <ul className="score-events">
          {events.map((e) => (
            <li key={e.id}>
              <span className="score-ev-week">{formatWeek(e.weekStart)}</span>
              <span className="score-ev-connect">{e.connectName}</span>
              <span className="score-ev-type">{scoreEventLabel(e.eventType)}</span>
              <span className="score-ev-reason">{e.reason ?? ''}</span>
              <span className="score-ev-points" data-minus={e.finalPoints < 0}>
                {e.finalPoints > 0 ? '+' : ''}
                {e.finalPoints}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
