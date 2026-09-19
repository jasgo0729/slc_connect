'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { PhotoSlot } from '@/components/photo-slot';
import {
  CERT_SPECS,
  PORTRAIT_NOTICE,
  PORTRAIT_NOTICE_CROSS,
  type CertType,
} from '@/lib/connects/certification';
import { todayKST } from '@/lib/connects/deadline';
import { submitCertifyAction } from './actions';

/**
 * G-04 활동 인증.
 *
 * 세 유형이 사진 요구사항만 다르고 나머지는 같다. 화면을 셋으로
 * 나누면 참여자 체크나 산출물 링크를 고칠 때마다 세 곳을 고쳐야
 * 하고, 반드시 한 곳이 어긋난다.
 *
 * 사진을 먼저 S3로 올리고 저장되면 나머지를 제출한다. 한 번에
 * 보내면 큰 파일이 서버를 거치고, 인증이 몰리는 시간대에 앱
 * 전체가 느려진다.
 */
interface Member {
  userId: string;
  name: string;
}

interface CrossConnect {
  id: string;
  name: string;
  members: Member[];
}

export function CertifyForm({
  connectId,
  type,
  members,
  me,
  crossConnects,
}: {
  connectId: string;
  type: CertType;
  members: Member[];
  me: string;
  /** CCC 에서 고를 수 있는 다른 커넥트. */
  crossConnects: CrossConnect[];
}) {
  const spec = CERT_SPECS[type];

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [date, setDate] = useState(todayKST());
  const [platform, setPlatform] = useState('');
  const [content, setContent] = useState('');
  const [outputLink, setOutputLink] = useState('');
  // 올린 사람은 기본으로 참여자에 들어간다. 자기가 간 활동을 올린다.
  const [picked, setPicked] = useState<string[]>([me]);
  const [crossId, setCrossId] = useState('');
  const [crossPicked, setCrossPicked] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(connectId);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [, start] = useTransition();

  const cross = crossConnects.find((c) => c.id === crossId);
  const toggle = (id: string) =>
    setPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleCross = (id: string) =>
    setCrossPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const submit = () =>
    start(async () => {
      setError(null);

      const missing = spec.photos.find((p) => !files[p.key]);
      if (missing) return setError(`${missing.label}을(를) 올려주세요.`);
      if (picked.length === 0) return setError('참여한 인원을 골라주세요.');
      if (type === 'cross' && !crossId) return setError('함께한 커넥트를 골라주세요.');
      if (type === 'cross' && crossPicked.length === 0) {
        return setError('상대 커넥트의 참여 인원도 골라주세요.');
      }

      setStep('uploading');
      const keys: string[] = [];
      try {
        // 순서대로 올린다. 배열 순서가 곧 사진의 의미다.
        for (const p of spec.photos) {
          const f = files[p.key]!;
          const res = await fetch('/api/uploads/certification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectId, contentType: f.type, bytes: f.size }),
          });
          const data = (await res.json()) as { url?: string; key?: string; error?: string };
          if (!res.ok || !data.url || !data.key) {
            setStep('idle');
            return setError(data.error ?? '사진을 올리지 못했어요.');
          }

          const put = await fetch(data.url, {
            method: 'PUT',
            headers: { 'Content-Type': f.type },
            body: f,
          });
          if (!put.ok) {
            setStep('idle');
            return setError('사진을 올리지 못했어요. 다시 시도해 주세요.');
          }
          keys.push(data.key);
        }
      } catch {
        setStep('idle');
        return setError('사진을 올리지 못했어요. 연결을 확인해 주세요.');
      }

      setStep('saving');
      const r = await submitCertifyAction(connectId, {
        type,
        photoKeys: keys,
        activityDate: date,
        onlinePlatform: platform,
        content,
        outputLink,
        participantIds: picked,
        crossConnectId: crossId || null,
        crossParticipantIds: crossPicked,
      });
      setStep('idle');
      if (r?.error) setError(r.error);
    });

  const busy = step !== 'idle';

  return (
    <div className="createform">
      {error && <Notice>{error}</Notice>}

      <p className="certify-intro">{spec.intro}</p>

      <div className="photo-slots">
        {spec.photos.map((p) => (
          <PhotoSlot
            key={p.key}
            label={p.label}
            file={files[p.key] ?? null}
            disabled={busy}
            onPick={(f) => setFiles((v) => ({ ...v, [p.key]: f }))}
          />
        ))}
      </div>

      {/* 올리기 전에 알린다. 올린 뒤에 알리면 이미 늦다. */}
      <p className="portrait-notice">
        {type === 'cross' ? PORTRAIT_NOTICE_CROSS : PORTRAIT_NOTICE}
      </p>

      {type === 'online' && (
        <div className="field">
          <label className="field-label" htmlFor="cert-platform">
            사용한 도구 <em>선택</em>
          </label>
          <input
            id="cert-platform"
            className="input"
            placeholder="예: 줌, 디스코드"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="cert-date">
          활동한 날
        </label>
        <input
          id="cert-date"
          type="date"
          className="input"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {type === 'cross' && (
        <div className="field">
          <label className="field-label" htmlFor="cert-cross">
            함께한 커넥트
          </label>
          <select
            id="cert-cross"
            className="input"
            value={crossId}
            onChange={(e) => {
              setCrossId(e.target.value);
              setCrossPicked([]);
              setOpenGroup(e.target.value);
            }}
          >
            <option value="">선택해주세요</option>
            {crossConnects.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* G-14 개인 참여율의 유일한 근거다. 대충 넘기면 되돌릴 수 없다. */}
      <h2 className="certify-section">이번 활동에 참여한 인원을 모두 체크해주세요</h2>

      {type === 'cross' ? (
        <div className="check-groups">
          <CheckGroup
            title="내 커넥트"
            open={openGroup === connectId}
            onToggle={() => setOpenGroup(openGroup === connectId ? null : connectId)}
            count={`${picked.length}/${members.length}`}
            members={members}
            picked={picked}
            me={me}
            onPick={toggle}
          />
          {cross && (
            <CheckGroup
              title={cross.name}
              open={openGroup === cross.id}
              onToggle={() => setOpenGroup(openGroup === cross.id ? null : cross.id)}
              count={`${crossPicked.length}/${cross.members.length}`}
              members={cross.members}
              picked={crossPicked}
              onPick={toggleCross}
            />
          )}
        </div>
      ) : (
        <ul className="check-list">
          {members.map((m) => (
            <li key={m.userId}>
              <label className="check-row" data-on={picked.includes(m.userId)}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={picked.includes(m.userId)}
                  onChange={() => toggle(m.userId)}
                />
                <span className="check-box" aria-hidden="true" />
                {m.name}
                {m.userId === me && ' (나)'}
              </label>
            </li>
          ))}
        </ul>
      )}

      <h2 className="certify-section">간단한 활동 소개</h2>
      <textarea
        className="input textarea"
        rows={4}
        maxLength={500}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="이번 활동에 대해 자유롭게 적어주세요"
        aria-label="활동 소개"
      />

      <h2 className="certify-section">
        산출물 링크 <em>선택</em>
      </h2>
      <p className="field-hint" style={{ marginBottom: 8 }}>
        여기에 인스타그램이나 네이버 카페의 게시물 링크를 업로드하세요
      </p>
      <input
        className="input"
        value={outputLink}
        onChange={(e) => setOutputLink(e.target.value)}
        placeholder="산출물이 있다면 링크를 입력해주세요 (예. 커넥트 인스타 게시물)"
        aria-label="산출물 링크"
      />

      <div className="createform-foot">
        <button type="button" className="btn btn--block" disabled={busy} onClick={submit}>
          {step === 'uploading' ? '사진 올리는 중…' : step === 'saving' ? '제출하는 중…' : '인증하기'}
        </button>
      </div>
    </div>
  );
}

/** CCC 는 커넥트별로 접어 둔다. 둘을 펼쳐 두면 누가 어느 팀인지 섞인다. */
function CheckGroup({
  title,
  open,
  onToggle,
  count,
  members,
  picked,
  me,
  onPick,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  count: string;
  members: Member[];
  picked: string[];
  me?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="check-group" data-open={open}>
      <button type="button" className="check-group-head" onClick={onToggle}>
        <span>
          {title} ({count})
        </span>
        <span className="check-group-caret" aria-hidden="true">
          {open ? '⌃' : '⌄'}
        </span>
      </button>

      {open && (
        <ul className="check-list check-list--inner">
          {members.map((m) => (
            <li key={m.userId}>
              <label className="check-row" data-on={picked.includes(m.userId)}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={picked.includes(m.userId)}
                  onChange={() => onPick(m.userId)}
                />
                <span className="check-box" aria-hidden="true" />
                {m.name}
                {m.userId === me && ' (나)'}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
