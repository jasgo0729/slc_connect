'use client';

import { useState } from 'react';
import { Sheet } from './ui/sheet';
import { IconClose } from './ui/icon';

/**
 * 온보딩 프로필 입력 (A-05·A-06).
 *
 * 모든 항목이 선택이다. 빈 프로필을 정상 상태로 취급한다 —
 * 아무것도 채우지 않는 사람이 곧 추천 기능의 주 대상이고,
 * 프로필에 의존하는 구조로 만들면 가장 필요한 사람에게 가장 안 듣는다.
 *
 * 자동 완성 영역(이름·기수·캠퍼스·SLC)은 명단에서 온 값이라
 * 이 폼에 두지 않는다. 마이페이지에서 읽기 전용으로 보여준다.
 */
const INTERESTS = ['독서', '운동', '코딩', '영화', '음악', '여행', '요리', '스터디', '봉사', '창업'];
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const MBTI = [
  'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
  'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ',
];

export function ProfileSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Sheet open={open} onClose={onClose} labelledBy="profile-title">
      <div className="sheet--form">
        <button type="button" className="sheet-close" onClick={onClose} aria-label="닫기">
          <IconClose />
        </button>

        <h2 className="sheet-heading" id="profile-title">
          원활한 Connect 활동을 위해
          <br />몇 가지 정보가 더 필요해요
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
            <input id="p-bio" name="bio" className="input" placeholder="나를 짧게 소개해주세요" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-res">
              방학 중 거주지 <em>선택</em>
            </label>
            <input id="p-res" name="residence" className="input" placeholder="예: 서울특별시 강남구" />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-mbti">
              MBTI <em>선택</em>
            </label>
            <select id="p-mbti" name="mbti" className="input" defaultValue="">
              <option value="">선택 안 함</option>
              {MBTI.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <p className="field-label">
              관심 태그 <em>복수 선택 가능</em>
            </p>
            <div className="tagset">
              {INTERESTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag"
                  aria-pressed={tags.includes(t)}
                  onClick={() => toggle(tags, setTags, t)}
                >
                  {t}
                </button>
              ))}
            </div>
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
                  onClick={() => toggle(days, setDays, d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn--block"
            style={{ marginTop: 24 }}
            onClick={() => onSave({ tags, days })}
          >
            저장하고 시작하기
          </button>
          <button type="button" className="textbtn" style={{ width: '100%' }} onClick={onClose}>
            나중에 하기
          </button>
        </div>
      </div>
    </Sheet>
  );
}
