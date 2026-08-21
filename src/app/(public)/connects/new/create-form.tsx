'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  CAMPUSES,
  CAPACITY_DEFAULT,
  CAPACITY_MAX,
  CAPACITY_MIN,
  CONDITIONS,
  DAYS,
  GOAL_TYPES,
  TAGLINE_MAX,
  TRACKS,
} from '@/lib/connects/options';
import { submitCreate } from './actions';
import type { CreateState } from './actions';

const initial: CreateState = {};

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="field-err" role="alert">
      {msg}
    </p>
  );
}

function Submit({ track }: { track: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--block" disabled={pending}>
      {pending
        ? '만드는 중…'
        : track === 'qualitative'
          ? '확인 요청하고 개설하기'
          : '커넥트 개설하기'}
    </button>
  );
}

export function CreateForm() {
  const [state, action] = useActionState(submitCreate, initial);
  const [track, setTrack] = useState<string>('');
  const [capacity, setCapacity] = useState(CAPACITY_DEFAULT);
  const [days, setDays] = useState<number[]>([]);
  const [conds, setConds] = useState<string[]>([]);
  const [tagline, setTagline] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const e = state.errors ?? {};
  const toggleDay = (d: number) =>
    setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));
  const toggleCond = (c: string) =>
    setConds((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));

  return (
    <form action={action} className="createform">
      {/* ── 트랙. 나머지 폼의 모양을 바꾸므로 맨 앞에 둔다 ── */}
      <section className="fgroup">
        <h2 className="fgroup-title">어떤 커넥트인가요</h2>
        <p className="fgroup-hint">
          고른 트랙에 따라 참여 방식과 점수 계산이 달라져요. 나중에 바꿀 수 없어요.
        </p>

        <div className="trackpick">
          {TRACKS.map((t) => (
            <label key={t.value} className="trackopt" data-on={track === t.value}>
              <input
                type="radio"
                name="track"
                value={t.value}
                checked={track === t.value}
                onChange={() => setTrack(t.value)}
                className="sr-only"
              />
              <span className="trackopt-label">{t.label}</span>
              <span className="trackopt-summary">{t.summary}</span>
              <span className="trackopt-detail">{t.detail}</span>
            </label>
          ))}
        </div>
        <Err msg={e.track} />
      </section>

      {/* ── 기본 정보 ── */}
      <section className="fgroup">
        <h2 className="fgroup-title">기본 정보</h2>

        <div className="field">
          <label className="field-label" htmlFor="c-name">
            커넥트 이름
          </label>
          <input
            id="c-name"
            name="name"
            className="input"
            placeholder="예: 환경 독서 모임"
            maxLength={30}
            required
          />
          <Err msg={e.name} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="c-tagline">
            한 줄 소개
            <span className="counter">
              {tagline.length}/{TAGLINE_MAX}
            </span>
          </label>
          <input
            id="c-tagline"
            name="tagline"
            className="input"
            placeholder="목록에서 가장 먼저 보이는 문장이에요"
            maxLength={TAGLINE_MAX}
            value={tagline}
            onChange={(ev) => setTagline(ev.target.value)}
            required
          />
          <Err msg={e.tagline} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="c-desc">
            활동 소개
            <span className="counter">{desc.length}자</span>
          </label>
          <textarea
            id="c-desc"
            name="description"
            className="input textarea"
            rows={6}
            placeholder={
              '무엇을 하는지, 어떤 사람과 하고 싶은지, 어떤 분위기인지 적어주세요.\n예: 매주 한 권씩 환경 관련 책을 읽고 토요일 오후에 만나 이야기합니다. 완독하지 않아도 괜찮고, 읽다 만 이야기도 환영해요.'
            }
            value={desc}
            onChange={(ev) => setDesc(ev.target.value)}
            required
          />
          {/* 이 안내가 폼에서 가장 중요한 문장이다.
              모집 초반에는 참여자가 전부 0명이라 이 글이 추천의 유일한 재료다. */}
          <p className="field-hint">
            추천 기능이 이 글을 그대로 읽어요. 구체적으로 쓸수록 맞는 사람이 찾아옵니다.
          </p>
          <Err msg={e.description} />
        </div>
      </section>

      {/* ── 정성 트랙 전용 ── */}
      {track === 'qualitative' && (
        <section className="fgroup fgroup--accent">
          <h2 className="fgroup-title">무엇을 남길 건가요</h2>
          <p className="fgroup-hint">
            정성 트랙은 1월에 결과물을 제출해요. 목표가 분명해야 확인이 빨리 끝나요.
          </p>

          <div className="field">
            <p className="field-label">목표 유형</p>
            <div className="tagset">
              {GOAL_TYPES.map((g) => (
                <label key={g.value} className="tag" data-radio>
                  <input type="radio" name="goalType" value={g.value} className="sr-only" />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
            <Err msg={e.goalType} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="c-goal">
              구체적인 목표
            </label>
            <input
              id="c-goal"
              name="goalDetail"
              className="input"
              placeholder="예: 교내 갤러리에서 4인 단체 사진전 열기"
            />
            <Err msg={e.goalDetail} />
          </div>

          <div className="frow">
            <div className="field">
              <label className="field-label" htmlFor="c-goaldate">
                목표 시점
              </label>
              <input id="c-goaldate" name="goalDate" type="date" className="input" />
              <Err msg={e.goalDate} />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="c-period">
                활동 기간 <em>선택</em>
              </label>
              <input
                id="c-period"
                name="activityPeriod"
                className="input"
                placeholder="예: 9월~1월"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 언제 어디서 ── */}
      <section className="fgroup">
        <h2 className="fgroup-title">언제, 어디서</h2>

        <div className="field">
          <p className="field-label">활동 캠퍼스</p>
          <div className="tagset">
            {CAMPUSES.map((c) => (
              <label key={c.value} className="tag" data-radio>
                <input type="radio" name="campus" value={c.value} className="sr-only" />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <Err msg={e.campus} />
        </div>

        <div className="field">
          <p className="field-label">
            활동 가능 요일 <em>복수 선택</em>
          </p>
          <div className="tagset">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                className="tag tag--day"
                aria-pressed={days.includes(i)}
                onClick={() => toggleDay(i)}
              >
                {d}
              </button>
            ))}
          </div>
          {days.map((d) => (
            <input key={d} type="hidden" name="availableDays" value={d} />
          ))}
          <p className="field-hint">필터와 추천이 이 요일을 보고 사람을 골라요.</p>
          <Err msg={e.availableDays} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="c-loc">
            자주 만나는 장소 <em>선택</em>
          </label>
          <input
            id="c-loc"
            name="location"
            className="input"
            placeholder="예: 인문사회과학캠퍼스 중앙학술정보관"
          />
        </div>
      </section>

      {/* ── 함께할 사람 ── */}
      <section className="fgroup">
        <h2 className="fgroup-title">함께할 사람</h2>

        <div className="field">
          <label className="field-label" htmlFor="c-cap">
            정원 <em>팀장 포함</em>
          </label>
          <div className="stepper">
            <button
              type="button"
              onClick={() => setCapacity((v) => Math.max(CAPACITY_MIN, v - 1))}
              disabled={capacity <= CAPACITY_MIN}
              aria-label="정원 줄이기"
            >
              −
            </button>
            <output id="c-cap">{capacity}명</output>
            <button
              type="button"
              onClick={() => setCapacity((v) => Math.min(CAPACITY_MAX, v + 1))}
              disabled={capacity >= CAPACITY_MAX}
              aria-label="정원 늘리기"
            >
              +
            </button>
          </div>
          <input type="hidden" name="capacity" value={capacity} />
          <p className="field-hint">
            지금은 팀장 한 명이라 {capacity - 1}자리가 비어 있어요. 활동 인정에는 최소 4명이
            필요해요.
          </p>
          <Err msg={e.capacity} />
        </div>

        <div className="field">
          <p className="field-label">
            참여 조건 <em>선택</em>
          </p>
          <div className="tagset">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="tag"
                aria-pressed={conds.includes(c.value)}
                onClick={() => toggleCond(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {conds.map((c) => (
            <input key={c} type="hidden" name="conditions" value={c} />
          ))}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="c-contact">
            연락 수단 <em>선택</em>
          </label>
          <input
            id="c-contact"
            name="contact"
            className="input"
            placeholder="오픈채팅 링크, 인스타 아이디 등"
          />
        </div>
      </section>

      {/* ── 공개 여부 ── */}
      <section className="fgroup">
        <h2 className="fgroup-title">공개 범위</h2>
        <div className="pickrow">
          <label className="pickopt" data-on={isPublic}>
            <input
              type="radio"
              name="isPublic"
              value="public"
              checked={isPublic}
              onChange={() => setIsPublic(true)}
              className="sr-only"
            />
            <b>공개</b>
            <span>씨앗판에 올라가고 누구나 신청할 수 있어요.</span>
          </label>
          <label className="pickopt" data-on={!isPublic}>
            <input
              type="radio"
              name="isPublic"
              value="private"
              checked={!isPublic}
              onChange={() => setIsPublic(false)}
              className="sr-only"
            />
            <b>비공개</b>
            <span>초대 링크를 아는 사람만 들어와요. 매칭이 끝나면 자동으로 공개됩니다.</span>
          </label>
        </div>
      </section>

      <div className="createform-foot">
        {track === 'qualitative' && (
          <p className="field-hint" style={{ marginBottom: 10 }}>
            정성 트랙은 운영진 확인을 거친 뒤 씨앗판에 올라가요.
          </p>
        )}
        <Submit track={track} />
      </div>
    </form>
  );
}
