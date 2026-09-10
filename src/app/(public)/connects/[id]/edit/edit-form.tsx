'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Notice } from '@/components/ui/notice';
import {
  CAMPUSES,
  CAPACITY_MAX,
  CAPACITY_MIN,
  CONDITIONS,
  DAYS,
  GOAL_TYPES,
  TAGLINE_MAX,
} from '@/lib/connects/options';
import { submitEdit } from './actions';
import type { EditState } from './actions';

interface Initial {
  name: string;
  tagline: string;
  description: string;
  campus: string;
  location: string;
  contact: string;
  capacity: number;
  availableDays: number[];
  conditions: string[];
  isPublic: boolean;
  goalType: string;
  goalDetail: string;
  goalDate: string;
  activityPeriod: string;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="field-err" role="alert">
      {msg}
    </p>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--block" disabled={pending}>
      {pending ? '저장하는 중…' : '저장하기'}
    </button>
  );
}

export function EditForm({
  connectId,
  track,
  memberCount,
  initial,
}: {
  connectId: string;
  track: string;
  memberCount: number;
  initial: Initial;
}) {
  const action = submitEdit.bind(null, connectId, track);
  const [state, formAction] = useActionState(action, {} as EditState);

  const [capacity, setCapacity] = useState(initial.capacity);
  const [days, setDays] = useState<number[]>(initial.availableDays);
  const [conds, setConds] = useState<string[]>(initial.conditions);
  const [tagline, setTagline] = useState(initial.tagline);
  const [desc, setDesc] = useState(initial.description);
  const [isPublic, setIsPublic] = useState(initial.isPublic);

  const e = state.errors ?? {};
  const toggleDay = (d: number) =>
    setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]));
  const toggleCond = (c: string) =>
    setConds((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));

  // 이미 들어온 사람보다 정원을 낮출 수 없다.
  const minCapacity = Math.max(CAPACITY_MIN, memberCount);

  return (
    <form action={formAction} className="createform">
      {e._ && <Notice>{e._}</Notice>}

      <section className="fgroup">
        <h2 className="fgroup-title">기본 정보</h2>

        <div className="field">
          <label className="field-label" htmlFor="e-name">
            커넥트 이름
          </label>
          <input
            id="e-name"
            name="name"
            className="input"
            defaultValue={initial.name}
            maxLength={30}
            required
          />
          <Err msg={e.name} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="e-tagline">
            한 줄 소개
            <span className="counter">
              {tagline.length}/{TAGLINE_MAX}
            </span>
          </label>
          <input
            id="e-tagline"
            name="tagline"
            className="input"
            maxLength={TAGLINE_MAX}
            value={tagline}
            onChange={(ev) => setTagline(ev.target.value)}
            required
          />
          <Err msg={e.tagline} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="e-desc">
            활동 소개
            <span className="counter">{desc.length}자</span>
          </label>
          <textarea
            id="e-desc"
            name="description"
            className="input textarea"
            rows={6}
            value={desc}
            onChange={(ev) => setDesc(ev.target.value)}
            required
          />
          <p className="field-hint">
            추천 기능이 이 글을 그대로 읽어요. 구체적으로 쓸수록 맞는 사람이 찾아옵니다.
          </p>
          <Err msg={e.description} />
        </div>
      </section>

      {track === 'qualitative' && (
        <section className="fgroup fgroup--accent">
          <h2 className="fgroup-title">무엇을 남길 건가요</h2>

          <div className="field">
            <p className="field-label">목표 유형</p>
            <div className="tagset">
              {GOAL_TYPES.map((g) => (
                <label key={g.value} className="tag" data-radio>
                  <input
                    type="radio"
                    name="goalType"
                    value={g.value}
                    defaultChecked={initial.goalType === g.value}
                    className="sr-only"
                  />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
            <Err msg={e.goalType} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="e-goal">
              구체적인 목표
            </label>
            <input
              id="e-goal"
              name="goalDetail"
              className="input"
              defaultValue={initial.goalDetail}
            />
            <Err msg={e.goalDetail} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="e-period">
              활동 기간 <em>선택</em>
            </label>
            <input
              id="e-period"
              name="activityPeriod"
              className="input"
              defaultValue={initial.activityPeriod}
              placeholder="예: 9월~1월"
            />
          </div>
        </section>
      )}

      <section className="fgroup">
        <h2 className="fgroup-title">언제, 어디서</h2>

        <div className="field">
          <p className="field-label">활동 캠퍼스</p>
          <div className="tagset">
            {CAMPUSES.map((c) => (
              <label key={c.value} className="tag" data-radio>
                <input
                  type="radio"
                  name="campus"
                  value={c.value}
                  defaultChecked={initial.campus === c.value}
                  className="sr-only"
                />
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
          <Err msg={e.availableDays} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="e-loc">
            자주 만나는 장소 <em>선택</em>
          </label>
          <input id="e-loc" name="location" className="input" defaultValue={initial.location} />
        </div>
      </section>

      <section className="fgroup">
        <h2 className="fgroup-title">함께할 사람</h2>

        <div className="field">
          <label className="field-label" htmlFor="e-cap">
            정원 <em>팀장 포함</em>
          </label>
          <div className="stepper">
            <button
              type="button"
              onClick={() => setCapacity((v) => Math.max(minCapacity, v - 1))}
              disabled={capacity <= minCapacity}
              aria-label="정원 줄이기"
            >
              −
            </button>
            <output id="e-cap">{capacity}명</output>
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
            지금 {memberCount}명이 참여 중이라 {minCapacity}명 아래로는 줄일 수 없어요.
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
          <label className="field-label" htmlFor="e-contact">
            연락 수단 <em>선택</em>
          </label>
          <input id="e-contact" name="contact" className="input" defaultValue={initial.contact} />
        </div>
      </section>

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
            <span>초대 링크를 아는 사람만 들어와요.</span>
          </label>
        </div>
      </section>

      <div className="createform-foot">
        <Submit />
      </div>
    </form>
  );
}
