import { and, eq, gte, or, sql } from 'drizzle-orm';
import { db } from './client';
import { bindingAttempts, roster, users } from './schema';
import type { User } from './schema';

/**
 * 학번 결속 — 최초 1회만 수행된다.
 *
 * 도메인 제한을 두지 않으므로 본인 확인은 전적으로 명단의
 * 이름+학번 대조에 걸린다. 그래서 이 함수가 지켜야 하는 것이 넷이다.
 *
 *   1. roster에 없는 이름·학번 조합은 통과시키지 않는다
 *   2. 이미 결속된 학번은 다른 계정이 가져갈 수 없다 (DB UNIQUE가 최종 방어선)
 *   3. 실패 응답으로 명단 내용을 추론할 수 없게 한다
 *   4. 시도 횟수를 계정과 IP 양쪽으로 제한한다
 *      — 구글 계정은 새로 만들면 그만이라 계정 기준만으로는 뚫린다
 */

/** 15분 안에 이만큼 실패하면 잠근다. */
const WINDOW_MINUTES = 15;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 12; // 같은 공유기 아래 여러 명이 동시에 가입할 수 있다

export type BindErrorCode =
  | 'TOO_MANY_ATTEMPTS'
  | 'NOT_VERIFIABLE'      // 명단에 없음 · 학번 오타 · 이름 불일치 (구분하지 않는다)
  | 'ALREADY_BOUND'       // 해당 학번이 이미 다른 계정에 결속됨
  | 'SUB_ALREADY_BOUND';  // 이 구글 계정이 이미 다른 학번에 결속됨

export class BindingError extends Error {
  constructor(public code: BindErrorCode) {
    super(code);
    this.name = 'BindingError';
  }
}

interface BindInput {
  googleSub: string;
  googleEmail: string;
  googleHd?: string | null;
  studentNo: string;
  name: string;
  ip?: string;
}

/**
 * 이름 비교용 정규화.
 *
 * 공백만 없앤다. 명단에 "홍 길동"으로 들어 있고 사용자가
 * "홍길동"으로 치는 경우가 실제로 생긴다. 그 이상(초성 비교 등)은
 * 과하고, 도용 방어력만 떨어뜨린다.
 *
 * 동명이인은 문제가 되지 않는다. 조회는 학번(PK)으로 하고
 * 이름은 그 행의 값과 맞는지 확인만 한다.
 */
function normalizeName(s: string): string {
  return s.replace(/\s+/g, '').normalize('NFC');
}

export async function bindStudentNumber(input: BindInput): Promise<User> {
  const { googleSub, googleEmail, googleHd, ip } = input;
  const studentNo = input.studentNo.trim();
  const name = input.name.trim();

  // ── 시도 제한 ───────────────────────────────────────────
  // 계정 기준과 IP 기준을 함께 본다. 없으면 이 화면이 명단 조회 도구가 된다.
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const rows = await db
    .select({
      byAccount: sql<number>`count(*) FILTER (WHERE ${bindingAttempts.googleSub} = ${googleSub})::int`,
      byIp: sql<number>`count(*) FILTER (WHERE ${bindingAttempts.ip} IS NOT DISTINCT FROM ${ip ?? null})::int`,
    })
    .from(bindingAttempts)
    .where(
      and(
        eq(bindingAttempts.succeeded, false),
        gte(bindingAttempts.createdAt, since),
        or(
          eq(bindingAttempts.googleSub, googleSub),
          ip ? eq(bindingAttempts.ip, ip) : undefined,
        ),
      ),
    );

  const counts = rows[0] ?? { byAccount: 0, byIp: 0 };
  if (counts.byAccount >= MAX_PER_ACCOUNT || (ip && counts.byIp >= MAX_PER_IP)) {
    throw new BindingError('TOO_MANY_ATTEMPTS');
  }

  const logAttempt = (succeeded: boolean) =>
    db.insert(bindingAttempts).values({
      googleSub,
      googleEmail,
      attemptedNo: studentNo,
      succeeded,
      ip,
    });

  // ── 결속 ────────────────────────────────────────────────
  try {
    const user = await db.transaction(async (tx) => {
      // 이 구글 계정이 이미 결속되어 있으면 그대로 반환한다.
      // 정상 경로에서는 여기 오지 않지만 중복 제출을 흡수한다.
      const existingRows = await tx
        .select()
        .from(users)
        .where(eq(users.googleSub, googleSub))
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        if (existing.studentNo !== studentNo) {
          throw new BindingError('SUB_ALREADY_BOUND');
        }
        return existing;
      }

      // 명단 대조 — 학번으로 찾고 이름이 맞는지 확인한다.
      //
      // 학번 오류와 이름 불일치를 구분해 알려주면, 학번만 알아도
      // 명단의 이름을 알아낼 수 있게 된다. 두 경우를 합친다.
      const entryRows = await tx
        .select()
        .from(roster)
        .where(eq(roster.studentNo, studentNo))
        .limit(1);

      const entry = entryRows[0];
      if (!entry || normalizeName(entry.name) !== normalizeName(name)) {
        throw new BindingError('NOT_VERIFIABLE');
      }

      // UNIQUE 위반은 여기서 발생한다. 두 사람이 같은 학번을
      // 동시에 등록하면 한쪽이 튕긴다. 아래 catch에서 잡는다.
      const created = await tx
        .insert(users)
        .values({ googleSub, googleEmail, googleHd: googleHd ?? null, studentNo, boundIp: ip })
        .returning();

      return created[0]!;
    });

    await logAttempt(true);
    return user;
  } catch (err: unknown) {
    await logAttempt(false);

    if (err instanceof BindingError) throw err;

    // 23505 = unique_violation
    const pg = pgError(err);
    if (pg?.code === '23505') {
      const constraint = String(pg.constraint ?? '');
      throw new BindingError(
        constraint.includes('google_sub') ? 'SUB_ALREADY_BOUND' : 'ALREADY_BOUND',
      );
    }

    throw err;
  }
}

interface PgError {
  code?: string;
  constraint?: string;
}

/**
 * Drizzle은 pg 에러를 DrizzleQueryError로 감싸고 원본을 cause에 넣는다.
 * 겉만 보면 code가 없어서 UNIQUE 위반을 놓치고, 사용자에게는
 * "이미 등록된 학번이에요" 대신 raw SQL 문자열이 보이게 된다.
 */
function pgError(err: unknown): PgError | null {
  for (let e: unknown = err, depth = 0; e && depth < 4; depth++) {
    if (typeof e === 'object' && 'code' in e && typeof (e as PgError).code === 'string') {
      return e as PgError;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * 화면에 띄울 문구.
 *
 * ALREADY_BOUND 만 구분한다. 해당 학번이 명단에 있다는 사실이
 * 드러나지만, 이 안내가 없으면 학번을 먼저 등록당한 사람이 아무 설명
 * 없이 막힌다. 도메인 제한이 없어진 지금 이 경로가 더 중요해졌다.
 */
export const BIND_MESSAGES: Record<BindErrorCode, string> = {
  TOO_MANY_ATTEMPTS: '시도 횟수를 초과했어요. 잠시 후 다시 시도해 주세요.',
  NOT_VERIFIABLE: '입력하신 정보로 등록된 SLC 장학생을 찾을 수 없어요.',
  ALREADY_BOUND: '이미 등록된 학번이에요. 본인 학번이 맞다면 문의해 주세요.',
  SUB_ALREADY_BOUND: '이 계정에는 이미 다른 학번이 등록되어 있어요.',
};
