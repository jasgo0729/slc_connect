'use client';

import { useEffect, useState } from 'react';
import { IconCamera } from './ui/icon';

/**
 * 인증 사진 한 칸.
 *
 * 무엇을 올려야 하는지 칸마다 적는다. "사진 2장"이라고만 하면
 * 시간 입증 사진 자리에 활동 사진을 또 올리는 일이 생기고,
 * 그건 검수에서 반려로 돌아온다.
 */
export function PhotoSlot({
  label,
  file,
  onPick,
  disabled,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label className="photo-slot" data-filled={Boolean(preview)}>
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} />
          <span className="photo-slot-change">바꾸기</span>
        </>
      ) : (
        <span className="photo-slot-empty">
          <IconCamera size={26} />
          <b>{label}</b>
          <em>탭하여 사진 업로드</em>
        </span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
