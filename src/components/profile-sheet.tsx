'use client';

import { useState, useTransition } from 'react';
import { Sheet } from './ui/sheet';
import { IconClose } from './ui/icon';
import { DAYS } from '@/lib/connects/options';
import { REGIONS } from '@/lib/connects/regions';

/**
 * 프로필 입력·수정 (A-05·A-06).
 *
 * 온보딩과 마이페이지 수정이 같은 폼을 쓴다. 두 벌로 나누면
 * 항목이 추가될 때마다 두 곳을 고쳐야 하고 반드시 어긋난다.
 *
 * 모든 항목이 선택이다. 빈 프로필을 정상 상태로 취급한다 —
 * 아무것도 채우지 않는 사람이 곧 추천 기능의 주 대상이고,
 * 프로필에 의존하는 구조로 만들면 가장 필요한 사람에게 가장 안 듣는다.
 *
 * 입력값을 전부 state로 들고 있다. React 19는 폼 액션이 끝나면
 * 제어되지 않는 입력을 자동으로 비우기 때문에, 저장에 실패하면
 * 적어 둔 내용이 사라진다.
 */
const MBTI = [
  'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
  'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ',
];

export interface ProfileValues {
  bio?: string | null;
  residence?: string | null;
  mbtiType?: string | null;
  interests?: string | null;
  days?: string[];
}

export function ProfileSheet({
  open,
  onClose,
  initial,
  onSubmit,
  onDone,
  submitLabel = '저장하고 시작하기',
  title = (
    <>
      원활한 Connect 활동을 위해
      <br />몇 가지 정보가 더 필요해요
    </>
  ),
  showSkip = true,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ProfileValues;
  onSubmit: (fd: FormData) => Promise<void>;
  onDone?: () => void;
  submitLabel?: string;
  title?: React.ReactNode;
  showSkip?: boolean;
}) {
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [residence, setResidence] = useState(initial?.residence ?? '');
  const [mbti, setMbti] = useState(initial?.mbtiType ?? '');
  const [interests, setInterests] = useState(initial?.interests ?? '');
  const [days, setDays] = useState<string[]>(initial?.days ?? []);
  const [pending, start] = useTransition();

  const toggleDay = (v: string) =>
    setDays((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  return (
    <Sheet open={open} onClose={onClose} labelledBy="profile-title">
      <form
        className="sheet--form"
        action={(fd) =>
          start(async () => {
            await onSubmit(fd);
            onDone?.();
          })
        }
      >
        <button type="button" className="sheet-close" onClick={onClose} aria-label="닫기">
          <IconClose />
        </button>

        <h2 className="sheet-heading" id="profile-title">
          {title}
        </h2>
        <p className="sheet-sub">
          입력하신 정보는 나에게 맞는 커넥트를 추천하는 데 사용돼요. 나중에 마이페이지에서도
          수정할 수 있어요.
        </p>

        <div style={{ marginTop: 22 }}>
          <div className="field">
            <label className="field-label" htmlFor="p-bio">
              한 줄 소개 <em>선택</em>
            </label>
            <input
              id="p-bio"
              name="bio"
              className="input"
              placeholder="나를 짧게 소개해주세요"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-res">
              방학 중 거주지 <em>선택</em>
            </label>
            <select
              id="p-res"
              name="residence"
              className="input"
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="field-hint">커넥트 상세에는 시·도 단위로만 보여요.</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-mbti">
              MBTI <em>선택</em>
            </label>
            <select
              id="p-mbti"
              name="mbtiType"
              className="input"
              value={mbti}
              onChange={(e) => setMbti(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {MBTI.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 목록에서 고르게 하면 거기 없는 관심사는 적을 수가 없다.
              요리나 창업처럼 커넥트가 생기기 어려운 것일수록 그렇다. */}
          <div className="field">
            <label className="field-label" htmlFor="p-int">
              관심 있는 것 <em>선택</em>
            </label>
            <input
              id="p-int"
              name="interests"
              className="input"
              placeholder="예: 독서, 러닝, 사진, 창업"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              maxLength={100}
            />
            <p className="field-hint">쉼표로 구분해 자유롭게 적어주세요.</p>
          </div>

          <div className="field">
            <p className="field-label">
              활동 선호 요일 <em>복수 선택 가능</em>
            </p>
            <div className="tagset">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="tag tag--day"
                  aria-pressed={days.includes(d)}
                  onClick={() => toggleDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            {days.map((d) => (
              <input key={d} type="hidden" name="days" value={d} />
            ))}
          </div>

          <button type="submit" className="btn btn--block" style={{ marginTop: 24 }} disabled={pending}>
            {pending ? '저장하는 중…' : submitLabel}
          </button>
          {showSkip && (
            <button type="button" className="textbtn" style={{ width: '100%' }} onClick={onClose}>
              나중에 하기
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
