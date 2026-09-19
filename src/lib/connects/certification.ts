/**
 * G-04 활동 인증 — 유형별 규칙.
 *
 * 유형마다 요구하는 사진이 다르다. 화면과 서버가 같은 목록을
 * 읽어야 "올렸는데 거절당하는" 일이 없다.
 */
export type CertType = 'offline' | 'cross' | 'online';

export interface CertSpec {
  type: CertType;
  label: string;
  /** 이 유형이 요구하는 사진. 순서가 곧 의미다. */
  photos: { key: string; label: string }[];
  intro: string;
}

export const CERT_SPECS: Record<CertType, CertSpec> = {
  offline: {
    type: 'offline',
    label: '커넥트 활동 인증',
    intro:
      '주제와 관련된 활동 사진, 활동 시간을 입증할 수 있는 사진(스마트폰 시계, 영수증 내역 등)을 각각 업로드하세요.',
    photos: [
      { key: 'subject', label: '주제와 관련된 활동 사진' },
      { key: 'time', label: '활동 시간을 입증할 수 있는 사진' },
    ],
  },
  cross: {
    type: 'cross',
    label: 'CCC 활동 인증',
    intro:
      '주제와 관련된 활동 사진, 활동 시간을 입증할 수 있는 사진(스마트폰 시계, 영수증 내역 등), 참여 인원 전원의 씨앗판 프로필이 나온 사진을 함께 업로드하세요.',
    photos: [
      { key: 'subject', label: '주제와 관련된 활동 사진' },
      { key: 'time', label: '활동 시간을 입증할 수 있는 사진' },
      { key: 'profile', label: '모두의 씨앗판 프로필이 나온 사진' },
    ],
  },
  online: {
    type: 'online',
    label: '온라인 활동 인증',
    intro:
      '화면 캡쳐와 같이 참여 인원과 시간이 함께 보이는 사진을 업로드하며, 30분 이상 간격으로 2장 업로드하세요.',
    photos: [
      { key: 'shot1', label: '화면 캡쳐 사진 1' },
      { key: 'shot2', label: '화면 캡쳐 사진 2' },
    ],
  },
};

/**
 * 초상권 안내.
 *
 * 사진을 2차 가공·재배포한다는 사실을 올리기 전에 알려야 한다.
 * 동의를 따로 받는 대신, 원치 않으면 대체할 방법을 함께 준다.
 */
export const PORTRAIT_NOTICE =
  '활동 인증을 위해 업로드 된 사진은 2차 가공 및 재배포 될 수 있으며, 사진 제출 시 초상권 활용에 동의한 것으로 간주합니다. 이를 원치 않을 경우, 얼굴을 가리거나 참여 인원수 파악이 가능한 사진(예시: 전원이 v를 한 손 사진)으로 대체하여 인증할 수 있습니다.';

export const PORTRAIT_NOTICE_CROSS =
  '활동 인증을 위해 업로드 된 사진은 2차 가공 및 재배포 될 수 있으며, 사진 제출 시 초상권 활용에 동의한 것으로 간주합니다. 이를 원치 않을 경우, 얼굴을 가린 사진 혹은 참여 인원수 파악이 가능한 사진과 씨앗판 프로필이 모두 나온 사진으로 대체하여 인증할 수 있습니다.';

/**
 * G-18 인증 마감.
 *
 * 활동 일시를 기준으로 다음날 정오까지. 그 뒤는 미인증으로 본다.
 * 일요일 활동은 다음 주 활동으로 집계된다.
 */
export const DEADLINE_NOTICE =
  '활동 인증은 활동 일시를 기준으로 다음날 정오까지 팀장(CCC인 경우 대표 1명)이 완료해야 합니다. 이후에 처리된 인증은 미인증으로 간주됩니다. 일요일 활동의 경우, 다음 주 활동으로 집계됩니다.';

/** 활동일 기준 다음날 정오가 지났는지. */
export function isCertifyExpired(activityDate: string, now = new Date()): boolean {
  const limit = Date.parse(`${activityDate}T12:00:00+09:00`) + 86_400_000;
  if (Number.isNaN(limit)) return false;
  return now.getTime() > limit;
}

export function isCertType(v: string): v is CertType {
  return v === 'offline' || v === 'cross' || v === 'online';
}
