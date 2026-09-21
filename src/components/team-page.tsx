import Link from 'next/link';
import { Badge } from './ui/badge';
import { MemberList } from './member-list';
import { InstagramField } from './instagram-field';
import { CertifyEntry } from './certify-entry';
import { IconArrowLeft } from './ui/icon';
import type { RankingMode, ScoreEntry, TeamMember } from '@/lib/db/queries/ranking';
import type { OnlineCertAccess } from '@/lib/connects/certification';
import type { ChallengeProgress } from '@/lib/scoring/challenge';
import { CHALLENGE } from '@/lib/scoring/rules';
import { trackLabel } from '@/lib/connects/options';
import {
  RANKING_PERIOD_LABEL,
  formatActivityDate,
  formatPoints,
  isRankedTrack,
  scoreEventLabel,
} from '@/lib/connects/score-events';

/**
 * 활동 모드 커넥트 페이지(시안 31·32).
 *
 * 모집이 끝나고 팀이 확정되면(status='confirmed') 상세 화면의
 * 관심사가 통째로 바뀐다. 모집 중에는 "들어갈까"를 정하려고
 * 소개·조건·남은 자리를 보지만, 확정 뒤에는 "우리가 어디까지
 * 했나"를 본다. 그래서 같은 주소에서 화면을 갈랐다.
 *
 * 내 팀(isMine)과 남의 팀을 한 컴포넌트로 둔 이유는 참여자·
 * 인스타그램이 똑같기 때문이다. 둘로 나누면 참여자 표기를 고칠
 * 때마다 두 곳을 고쳐야 하고 반드시 한 곳이 어긋난다.
 */

const CAMPUS_LABEL: Record<string, string> = {
  인문사회: '인사캠',
  자연과학: '자과캠',
  공통: '공통',
};

export interface TeamPageProps {
  connectId: string;
  name: string;
  campus: string;
  track: string;
  capacity: number;
  members: TeamMember[];

  /** 내가 속한 팀인가. 점수 내역과 인증 버튼이 여기서 갈린다. */
  isMine: boolean;
  /** 팀장인가. 인스타그램 수정 노출. */
  isLeader: boolean;

  instagram: string | null;
  rank: number | null;
  points: number | null;
  rankingMode: RankingMode;
  scores: ScoreEntry[];

  /** G-09 — 방학 중에는 전부, 학기 중에는 도전 커넥트만. */
  online: OnlineCertAccess;

  /**
   * §9.3 도전 트랙 활동 횟수. 도전 팀이고 내 팀일 때만 들어온다.
   * 도전 트랙은 점수 대신 이것으로 정량 평가를 받는다.
   */
  challenge?: ChallengeProgress | null;
}

export function TeamPage(p: TeamPageProps) {
  return (
    <main className="shell detail-page team-page">
      <Link href={p.isMine ? '/me' : '/connects'} className="detail-meta" style={{ marginTop: 0 }}>
        <IconArrowLeft size={18} /> {p.isMine ? '내 커넥트' : '커넥트 상세'}
      </Link>

      <section className="team-hero" data-mine={p.isMine}>
        {p.isMine && <p className="team-eyebrow">내 커넥트</p>}
        <h1 className="team-name">{p.name}</h1>
        <div className="chip-row">
          <Badge>{CAMPUS_LABEL[p.campus] ?? p.campus}</Badge>
          <Badge tone="track">{trackLabel(p.track)}</Badge>
        </div>

        {/* 순위는 내 팀에게만 보여준다. 남의 팀 점수는 랭킹 화면에서
            나란히 보는 것이 맞고, 여기서 단독으로 띄우면 비교가 아니라
            평가처럼 읽힌다. */}
        {p.isMine && <p className="team-rank">{rankLine(p)}</p>}
      </section>

      <section className="section">
        <h2 className="section-title">
          참여자{' '}
          <span>
            ({p.members.length}/{p.capacity})
          </span>
        </h2>
        <MemberList members={p.members} capacity={p.capacity} />
      </section>

      {/* 아직 적지 않은 남의 팀에서는 InstagramField 가 아무것도 그리지
          않는다. 제목만 남으면 빈 칸처럼 보여 제목째로 감춘다. */}
      {(p.instagram || p.isLeader) && (
        <section className="section">
          <h2 className="section-title">인스타그램</h2>
          <InstagramField connectId={p.connectId} value={p.instagram} canEdit={p.isLeader} />
        </section>
      )}

      {/* 취미 팀은 점수 내역, 도전 팀은 활동 현황. 도전 트랙은 점수제가
          아니라(§9) 점수 내역을 보여주면 비어 있거나, 쓰이지 않는
          숫자로 오해를 산다. */}
      {p.isMine && isRankedTrack(p.track) && (
        <section className="section">
          <h2 className="section-title">최근 점수 획득 내역</h2>
          <ScoreLog scores={p.scores} />
        </section>
      )}

      {p.isMine && !isRankedTrack(p.track) && p.challenge && (
        <section className="section">
          <h2 className="section-title">활동 현황</h2>
          <ChallengeBox progress={p.challenge} />
        </section>
      )}

      <div className="team-foot">
        {/* 도전 팀에게 '랭킹으로'는 자기 팀이 없는 화면으로 보내는
            버튼이다. 대신 씨앗판으로 돌려보낸다. */}
        {isRankedTrack(p.track) ? (
          <Link href="/ranking" className="btn btn--line btn--block">
            랭킹으로
          </Link>
        ) : (
          <Link href="/connects" className="btn btn--line btn--block">
            씨앗판으로
          </Link>
        )}
        {p.isMine && (
          <CertifyEntry
            connectId={p.connectId}
            online={p.online}
            label="활동 인증으로"
            className="btn btn--line btn--block"
          />
        )}
      </div>
    </main>
  );
}

/**
 * 순위 한 줄.
 *
 * 점수 집계가 아직 붙지 않아 모든 팀이 0점인 기간이 있다. 그때
 * "전체 1위 · 0점"으로 쓰면 1위라는 말만 남아 사실과 다르게 읽힌다.
 * 점수가 없으면 순위 대신 무엇을 하면 쌓이는지를 쓴다.
 */
function rankLine(p: TeamPageProps): string {
  // 도전 팀은 순위가 없다. "점수가 쌓여요"라고 쓰면 언젠가 순위에
  // 오를 것처럼 읽힌다.
  // 도전 팀은 순위가 없다(§9). 대신 지금 몇 번 했는지를 쓴다.
  if (!isRankedTrack(p.track)) {
    return p.challenge
      ? `활동 ${p.challenge.total}회 · 오프라인 ${p.challenge.offline}회`
      : '도전 커넥트는 랭킹에 포함되지 않아요';
  }
  if (p.rankingMode === 'hidden') return '순위는 잠시 가려 두었어요';
  if (p.rankingMode === 'partial') return '막바지라 순위를 잠시 가려 두었어요';
  if (p.points === null || p.points <= 0) return '활동을 인증하면 점수가 쌓여요';
  return `${RANKING_PERIOD_LABEL} ${p.rank}위 · ${p.points}점`;
}

/**
 * §9.3 정량 평가 · 활동 횟수.
 *
 * 목표를 숫자로 보여준다. "오프라인 4회 포함 총 8회"는 문장으로만
 * 두면 지금 몇 번 남았는지 매번 셈해야 한다.
 */
function ChallengeBox({ progress: g }: { progress: ChallengeProgress }) {
  const full = g.missing === 0;
  return (
    <div className="chal-box">
      <div className="chal-row">
        <span className="chal-label">전체 활동</span>
        <Meter value={g.total} target={CHALLENGE.totalTarget} />
      </div>
      <div className="chal-row">
        <span className="chal-label">그중 오프라인</span>
        <Meter value={g.offline} target={CHALLENGE.offlineTarget} />
      </div>
      <p className="chal-note" data-full={full}>
        {full
          ? `활동 횟수 항목 만점(${CHALLENGE.maxPercent}%)을 채웠어요.`
          : `${g.missing}회 더 하면 활동 횟수 항목 만점이에요. 지금은 ${g.percent}% / ${CHALLENGE.maxPercent}%.`}
      </p>
      <p className="field-hint" style={{ marginTop: 6 }}>
        오프라인 {CHALLENGE.offlineTarget}회를 포함해 총 {CHALLENGE.totalTarget}회면 만점이고, 모자란
        1회마다 {CHALLENGE.penaltyPerMissing}%씩 빠져요. 같은 날 여러 번은 한 번으로 세요.
      </p>
    </div>
  );
}

function Meter({ value, target }: { value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <span className="chal-meter">
      <span className="chal-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="chal-num">
        {value}
        <em> / {target}</em>
      </span>
    </span>
  );
}

function ScoreLog({ scores }: { scores: ScoreEntry[] }) {
  if (scores.length === 0) {
    return (
      <p className="field-hint">
        아직 쌓인 점수가 없어요. 모인 날마다 활동을 인증하면 확인 뒤에 여기에 남아요.
      </p>
    );
  }

  return (
    <ul className="score-log">
      {scores.map((s) => (
        <li key={s.id} className="score-row">
          <span className="score-body">
            <span className="score-label">{scoreEventLabel(s.eventType)}</span>
            <span className="score-date">{formatActivityDate(s.date)}</span>
            {/* 조정 건은 근거가 없으면 왜 깎였는지 알 수 없다. */}
            {s.reason && <span className="score-reason">{s.reason}</span>}
          </span>
          <span className="score-points" data-minus={s.points < 0}>
            {formatPoints(s.points)}
          </span>
        </li>
      ))}
    </ul>
  );
}
