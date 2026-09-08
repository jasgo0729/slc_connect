/**
 * Connect-MBTI 유형 목록 (F-02·F-03).
 *
 * 12문항 4축 16유형. 개인 MBTI(users.mbtiType)와는 다른 값이며
 * mbti_results.type_code 에 저장된다.
 *
 * 이모지·별명·설명은 콘텐츠 파이프라인이 공급하는 자산이다.
 * 여기에는 구조와 예시만 두고, 확정되면 이 파일만 교체하면 된다.
 * 목록에 없는 코드가 들어와도 화면이 깨지지 않게 조회 함수가 감싼다.
 */
export interface ConnectMbtiType {
  code: string;
  emoji: string;
  animal: string;
  title: string;
  description: string;
}

export const CONNECT_MBTI: Record<string, ConnectMbtiType> = {
  OGEP: {
    code: 'OGEP',
    emoji: '🦊',
    animal: '여우',
    title: '스마트한 핫플 지식인',
    description: '동선 낭비 없는 완벽한 코스로 트렌드를 똑똑하게 수집하는 스타일이에요.',
  },
  // TODO: 나머지 15유형 — 콘텐츠 파이프라인 확정 후 채운다.
};

export function findConnectMbti(code: string | null | undefined): ConnectMbtiType | null {
  if (!code) return null;
  return CONNECT_MBTI[code.toUpperCase()] ?? null;
}
