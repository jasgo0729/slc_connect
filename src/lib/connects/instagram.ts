/**
 * 커넥트 인스타그램 계정.
 *
 * 저장은 '@' 없이 아이디만. 화면에서 붙인다.
 * '@'를 함께 저장하면 어떤 행은 붙고 어떤 행은 안 붙은 채로
 * 섞이고, 그 뒤로는 비교도 주소 만들기도 매번 어긋난다.
 *
 * 화면과 서버가 같은 판정을 써야 "화면은 통과했는데 서버가
 * 거절하는" 일이 없다. 그래서 쿼리 계층이 아니라 여기에 둔다.
 */

/** 인스타그램 규칙: 영문·숫자·밑줄·마침표, 30자까지. */
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

export type InstagramParse =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * 사람이 적은 것을 아이디로 바꾼다.
 *
 * 빈 값은 '삭제'로 본다 — 지우는 버튼을 따로 두지 않고,
 * 비우고 저장하면 지워지게 한다.
 *
 * 주소를 통째로 붙여넣는 사람이 많아 거기서 아이디만 뽑는다.
 * 이걸 막고 "아이디만 적으세요"라고 돌려보내면, 정작 본인은
 * 앱에서 복사한 것을 그대로 붙였을 뿐이라 무엇이 틀렸는지
 * 모른다.
 */
export function normalizeInstagram(raw: string): InstagramParse {
  let v = raw.trim();
  if (v === '') return { ok: true, value: null };

  const fromUrl = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (fromUrl) v = fromUrl[1]!;

  v = v.replace(/^@+/, '').replace(/\/+$/, '');

  if (!HANDLE.test(v)) {
    return {
      ok: false,
      error: '인스타그램 아이디만 적어주세요. 영문·숫자·밑줄·마침표 30자까지예요.',
    };
  }
  return { ok: true, value: v };
}

/** 화면 표기. */
export function instagramHandle(value: string): string {
  return `@${value}`;
}

export function instagramUrl(value: string): string {
  return `https://instagram.com/${value}`;
}
