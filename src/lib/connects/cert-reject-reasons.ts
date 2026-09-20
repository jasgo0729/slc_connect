/**
 * G-05 인증 반려 사유.
 *
 * 'use server' 파일에서 내보내면 안 된다. 그 파일의 export 는 async
 * 함수만 허용되고, 그 밖의 값은 클라이언트에서 서버 참조 스텁이 되어
 * 배열이 아니게 된다 — 화면이 렌더될 때 .map is not a function 으로
 * 터진다. 시트가 닫혀 있어도 마찬가지다. JSX children 은 Sheet 에
 * 넘기기 전에 이미 평가되기 때문이다.
 *
 * reject-reasons.ts · review-reasons.ts 가 같은 이유로 여기 있다.
 *
 * 고른 사유가 올린 사람에게 그대로 전달된다. 무엇을 고쳐야 다시
 * 올릴 수 있는지 알 수 있게 쓴다.
 */
export const CERT_REJECT_REASONS = [
  '사진에 참여자가 보이지 않아요.',
  '활동 내용이 확인되지 않아요.',
  '이미 인증한 활동과 같아 보여요.',
  '커넥트 활동으로 보기 어려워요.',
] as const;
