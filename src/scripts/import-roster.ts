/**
 * 장학생 명단 → roster 테이블
 *
 *   npm run roster:import -- ./262A_CCC_장학생명단.xlsx --dry-run
 *   npm run roster:import -- ./262A_CCC_장학생명단.xlsx
 *
 * 엑셀 구조
 *   · 시트 이름이 기수다 ("1기", "2기")
 *   · 열: 이름 | 학번 | SLC | 전공
 *   · 캠퍼스 열이 없어 SLC 번호로 판별한다(lib/roster/campus.ts)
 *
 * 같은 학번이 다시 들어오면 덮어쓴다. 명단이 갱신될 때 다시 돌려도 안전하다.
 * 다만 명단에서 빠진 사람을 지우지는 않는다 — 이미 가입한 사람의 계정이
 * users.student_no 외래키로 물려 있어 조용히 지우면 안 되기 때문이다.
 */

import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db, pool } from '../lib/db/client';
import { roster } from '../lib/db/schema';
import { campusOfSlc, normalizeSlc } from '../lib/roster/campus';

interface Row {
  studentNo: string;
  name: string;
  cohort: string;
  campus: string;
  slc: string;
  major: string;
}

/** 열 이름을 유연하게 찾는다. 명단 서식은 해마다 조금씩 바뀐다. */
const HEADERS: Record<keyof Omit<Row, 'cohort' | 'campus'>, string[]> = {
  name: ['이름', '성명', 'name'],
  studentNo: ['학번', 'student_no', 'studentno'],
  slc: ['slc', '소속', '소속slc'],
  major: ['전공', '학과', 'major'],
};

function findColumns(header: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((cell, i) => {
    const key = String(cell ?? '').trim().toLowerCase().replace(/\s+/g, '');
    for (const [field, aliases] of Object.entries(HEADERS)) {
      if (aliases.some((a) => a.replace(/\s+/g, '') === key)) map[field] = i;
    }
  });
  return map;
}

async function main() {
  const [, , filePath, ...flags] = process.argv;
  if (!filePath) {
    console.error('사용법: npm run roster:import -- <xlsx경로> [--dry-run]');
    process.exit(1);
  }
  const dryRun = flags.includes('--dry-run');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(readFileSync(filePath) as unknown as ArrayBuffer);

  const rows: Row[] = [];
  const problems: string[] = [];
  const unknownSlc = new Set<string>();
  const seen = new Map<string, string>(); // 학번 → 어느 시트에서 나왔는지

  for (const ws of wb.worksheets) {
    // 시트 이름이 곧 기수다.
    const cohort = ws.name.trim();
    const headerRow = ws.getRow(1).values as unknown[];
    const col = findColumns(headerRow.slice(1)); // exceljs는 1-based

    const missing = ['name', 'studentNo', 'slc', 'major'].filter((k) => !(k in col));
    if (missing.length > 0) {
      problems.push(`[${cohort}] 열을 찾지 못함: ${missing.join(', ')}`);
      continue;
    }

    ws.eachRow((row, n) => {
      if (n === 1) return;
      const v = (row.values as unknown[]).slice(1);
      const at = `${cohort} ${n}행`;

      const name = String(v[col.name!] ?? '').trim();
      const studentNo = String(v[col.studentNo!] ?? '').trim();
      const slcRaw = String(v[col.slc!] ?? '').trim();
      const major = String(v[col.major!] ?? '').trim();

      if (!name && !studentNo) return; // 빈 줄

      if (!/^\d{8,12}$/.test(studentNo)) {
        problems.push(`${at}: 학번 형식 이상 (${studentNo || '비어 있음'})`);
        return;
      }
      if (!name) {
        problems.push(`${at}: 이름 없음 (${studentNo})`);
        return;
      }
      if (seen.has(studentNo)) {
        problems.push(`${at}: 학번 중복 — ${seen.get(studentNo)}에도 있음 (${studentNo})`);
        return;
      }

      // 캠퍼스는 SLC 번호에서 유도한다. 모르는 SLC면 추측하지 않는다.
      const campus = campusOfSlc(slcRaw);
      const slc = normalizeSlc(slcRaw);
      if (!campus || !slc) {
        unknownSlc.add(slcRaw || '(비어 있음)');
        problems.push(`${at}: 캠퍼스를 알 수 없는 SLC (${slcRaw || '비어 있음'})`);
        return;
      }

      seen.set(studentNo, at);
      rows.push({ studentNo, name, cohort, campus, slc, major });
    });
  }

  // ── 결과 요약 ──
  const byCohort = new Map<string, number>();
  const byCampus = new Map<string, number>();
  const bySlc = new Map<string, number>();
  for (const r of rows) {
    byCohort.set(r.cohort, (byCohort.get(r.cohort) ?? 0) + 1);
    byCampus.set(r.campus, (byCampus.get(r.campus) ?? 0) + 1);
    bySlc.set(r.slc, (bySlc.get(r.slc) ?? 0) + 1);
  }

  console.log(`읽은 시트 ${wb.worksheets.length} · 적재 대상 ${rows.length}명 · 문제 ${problems.length}건`);
  console.log('  기수:', [...byCohort].map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('  캠퍼스:', [...byCampus].map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('  SLC:', [...bySlc].sort().map(([k, v]) => `${k}:${v}`).join(' '));

  if (problems.length > 0) {
    console.log('\n[건너뛴 행]');
    problems.slice(0, 30).forEach((p) => console.log('  ' + p));
    if (problems.length > 30) console.log(`  … 외 ${problems.length - 30}건`);
  }

  // 모르는 SLC는 사람이 판단해야 한다. 추측해서 넣으면 만날 수 없는
  // 캠퍼스끼리 매칭되고, 나중에 원인을 찾기 어렵다.
  if (unknownSlc.size > 0) {
    console.error('\n캠퍼스를 판별할 수 없는 SLC가 있습니다:');
    [...unknownSlc].forEach((m) => console.error(`  · ${m}`));
    console.error('\nlib/roster/campus.ts 의 KNOWN_SLC · HUMANITIES_SLC 를 확인해 주세요.');
    await pool.end();
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n--dry-run 이므로 DB에 쓰지 않았습니다.');
    console.log('샘플:', rows.slice(0, 3));
    await pool.end();
    return;
  }

  // 500행씩 나눠 넣는다. 한 번에 다 보내면 파라미터 상한에 걸린다.
  const CHUNK = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(roster)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: roster.studentNo,
        set: {
          name: sql`excluded.name`,
          cohort: sql`excluded.cohort`,
          campus: sql`excluded.campus`,
          slc: sql`excluded.slc`,
          major: sql`excluded.major`,
        },
      });
    done += Math.min(CHUNK, rows.length - i);
    process.stdout.write(`\r적재 ${done}/${rows.length}`);
  }

  const total = await db.select({ n: sql<number>`count(*)::int` }).from(roster);
  console.log(`\n완료. roster 총 ${total[0]?.n ?? 0}명.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
