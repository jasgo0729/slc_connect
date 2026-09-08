/**
 * SLC → 캠퍼스 판별.
 *
 * 장학생 명단에 캠퍼스 열이 없어서 SLC 번호로 가른다.
 * SLC 자체가 캠퍼스 단위로 편성되어 있어 이게 가장 정확한 근거다.
 *
 * 전공으로 유도하는 방법도 있으나 자유전공계열처럼 두 캠퍼스에
 * 모두 있는 학과에서 어긋난다(실제 명단에서 2명 차이가 났다).
 * 소속을 정하는 것은 SLC 배정이므로 그쪽을 따른다.
 *
 * 캠퍼스는 씨앗판 필터(B-05)와 카드 표시에 쓰이는 값이라
 * 틀리면 만날 수 없는 사람끼리 매칭된다. 모르는 SLC가 들어오면
 * 추측하지 않고 적재를 멈춘다.
 */
export const CAMPUS_HUMANITIES = '인문사회';
export const CAMPUS_SCIENCE = '자연과학';

/** 인문사회과학캠퍼스에 편성된 SLC 번호. 나머지는 자연과학캠퍼스. */
const HUMANITIES_SLC = new Set([1, 8]);

/** 명단에 있는 SLC 번호. 여기 없는 번호는 사람이 확인해야 한다. */
const KNOWN_SLC = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

/**
 * "SLC 1", "SLC1", "1" 을 모두 받는다.
 * 명단 서식이 시트마다 다르고 해마다 바뀐다.
 */
export function parseSlcNumber(raw: string): number | null {
  const m = String(raw).match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) ? n : null;
}

/** 표기를 하나로 맞춘다. "SLC1"과 "SLC 1"이 갈리면 같은 SLC가 둘로 나뉜다. */
export function normalizeSlc(raw: string): string | null {
  const n = parseSlcNumber(raw);
  return n === null ? null : `SLC ${n}`;
}

/** 모르는 SLC면 null. 호출하는 쪽에서 멈춰야 한다. */
export function campusOfSlc(raw: string): string | null {
  const n = parseSlcNumber(raw);
  if (n === null || !KNOWN_SLC.has(n)) return null;
  return HUMANITIES_SLC.has(n) ? CAMPUS_HUMANITIES : CAMPUS_SCIENCE;
}
