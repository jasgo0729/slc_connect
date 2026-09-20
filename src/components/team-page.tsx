import Link from 'next/link';
import { Badge } from './ui/badge';
import { MemberList } from './member-list';
import { InstagramField } from './instagram-field';
import { CertifyEntry } from './certify-entry';
import { IconArrowLeft } from './ui/icon';
import type { RankingMode, ScoreEntry, TeamMember } from '@/lib/db/queries/ranking';
import { trackLabel } from '@/lib/connects/options';
import {
  RANKING_PERIOD_LABEL,
  formatActivityDate,
  formatPoints,
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

  /** 온라인 인증은 방학 기간에만 연다(G-09). */
  showOnline: boolean;
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

      {p.isMine && (
        <section className="section">
          <h2 className="section-title">최근 점수 획득 내역</h2>
          <ScoreLog scores={p.scores} />
        </section>
      )}

      <div className="team-foot">
        <Link href="/ranking" className="btn btn--line btn--block">
          랭킹으로
        </Link>
        {p.isMine && (
          <CertifyEntry
            connectId={p.connectId}
            showOnline={p.showOnline}
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
  if (p.rankingMode === 'hidden') return '순위는 잠시 가려 두었어요';
  if (p.rankingMode === 'partial') return '막바지라 순위를 잠시 가려 두었어요';
  if (p.points === null || p.points <= 0) return '활동을 인증하면 점수가 쌓여요';
  return `${RANKING_PERIOD_LABEL} ${p.rank}위 · ${p.points}점`;
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
