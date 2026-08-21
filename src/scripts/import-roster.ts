// /**
//  * 명단 CSV → roster 테이블
//  *
//  *   npx tsx scripts/import-roster.ts ./명단.csv
//  *   npx tsx scripts/import-roster.ts ./명단.csv --encoding euc-kr
//  *   npx tsx scripts/import-roster.ts ./명단.csv --dry-run
//  *
//  * 기대하는 헤더 (순서 무관, 한글/영문 모두 인식):
//  *   학번, 이름, 기수, 캠퍼스, SLC
//  *
//  * 엑셀에서 "CSV로 저장"하면 보통 EUC-KR(=CP949)로 나온다.
//  * 한글이 깨져 보이면 --encoding euc-kr 을 붙일 것.
//  *
//  * 같은 학번이 다시 들어오면 덮어쓴다(upsert). 명단이 갱신될 때
//  * 스크립트를 다시 돌려도 안전하다.
//  */

// import { readFileSync } from 'node:fs';
// import { parse } from 'csv-parse/sync';
// import iconv from 'iconv-lite';
// import { db, pool } from '../lib/db/client';
// import { roster } from '../lib/db/schema';

// const HEADER_MAP: Record<string, keyof RosterRow> = {
//   학번: 'studentNo',
//   student_no: 'studentNo',
//   studentno: 'studentNo',
//   이름: 'name',
//   성명: 'name',
//   name: 'name',
//   기수: 'cohort',
//   cohort: 'cohort',
//   캠퍼스: 'campus',
//   campus: 'campus',
//   slc: 'slc',
//   소속: 'slc',
//   '소속 slc': 'slc',
// };

// interface RosterRow {
//   studentNo: string;
//   name: string;
//   cohort: string;
//   campus: string;
//   slc: string;
// }

// function normalizeHeader(h: string): keyof RosterRow | null {
//   const key = h.trim().toLowerCase().replace(/\uFEFF/g, '');
//   return HEADER_MAP[key] ?? null;
// }

// async function main() {
//   const [, , filePath, ...flags] = process.argv;

//   if (!filePath) {
//     console.error('사용법: tsx scripts/import-roster.ts <csv경로> [--encoding euc-kr] [--dry-run]');
//     process.exit(1);
//   }

//   const dryRun = flags.includes('--dry-run');
//   const encIdx = flags.indexOf('--encoding');
//   const encoding = encIdx >= 0 ? flags[encIdx + 1] ?? 'utf-8' : 'utf-8';

//   const buf = readFileSync(filePath);
//   const text =
//     encoding.toLowerCase() === 'utf-8'
//       ? buf.toString('utf-8').replace(/^\uFEFF/, '')
//       : iconv.decode(buf, encoding);

//   const records = parse(text, {
//     columns: (header: string[]) =>
//       header.map((h) => normalizeHeader(h) ?? `__ignore_${h}`),
//     skip_empty_lines: true,
//     trim: true,
//   }) as Record<string, string>[];

//   if (records.length === 0) {
//     console.error('읽어들인 행이 없습니다. 인코딩이나 파일을 확인해 주세요.');
//     process.exit(1);
//   }

//   const required: (keyof RosterRow)[] = ['studentNo', 'name', 'cohort', 'campus', 'slc'];
//   const missing = required.filter((k) => !(k in records[0]!));
//   if (missing.length > 0) {
//     console.error('필수 열이 없습니다:', missing.join(', '));
//     console.error('인식된 열:', Object.keys(records[0]!).join(', '));
//     process.exit(1);
//   }

//   const rows: RosterRow[] = [];
//   const problems: string[] = [];
//   const seen = new Set<string>();

//   records.forEach((r, i) => {
//     const line = i + 2; // 헤더 다음 줄부터
//     const studentNo = (r.studentNo ?? '').trim();

//     if (!studentNo) {
//       problems.push(`${line}행: 학번이 비어 있음`);
//       return;
//     }
//     if (!/^\d{6,12}$/.test(studentNo)) {
//       problems.push(`${line}행: 학번 형식이 이상함 (${studentNo})`);
//       return;
//     }
//     if (seen.has(studentNo)) {
//       problems.push(`${line}행: 파일 안에서 학번 중복 (${studentNo})`);
//       return;
//     }
//     seen.add(studentNo);

//     rows.push({
//       studentNo,
//       name: (r.name ?? '').trim(),
//       cohort: (r.cohort ?? '').trim(),
//       campus: (r.campus ?? '').trim(),
//       slc: (r.slc ?? '').trim(),
//     });
//   });

//   console.log(`읽은 행 ${records.length} · 적재 대상 ${rows.length} · 문제 ${problems.length}`);
//   if (problems.length > 0) {
//     console.log('\n[건너뛴 행]');
//     problems.slice(0, 20).forEach((p) => console.log('  ' + p));
//     if (problems.length > 20) console.log(`  … 외 ${problems.length - 20}건`);
//   }

//   if (dryRun) {
//     console.log('\n--dry-run 이므로 DB에 쓰지 않았습니다.');
//     console.log('샘플:', rows.slice(0, 3));
//     await pool.end();
//     return;
//   }

//   // 500행씩 나눠 넣는다. 한 번에 다 보내면 파라미터 상한에 걸린다.
//   const CHUNK = 500;
//   let done = 0;
//   for (let i = 0; i < rows.length; i += CHUNK) {
//     const chunk = rows.slice(i, i + CHUNK);
//     await db
//       .insert(roster)
//       .values(chunk)
//       .onConflictDoUpdate({
//         target: roster.studentNo,
//         set: {
//           name: sqlExcluded('name'),
//           cohort: sqlExcluded('cohort'),
//           campus: sqlExcluded('campus'),
//           slc: sqlExcluded('slc'),
//         },
//       });
//     done += chunk.length;
//     process.stdout.write(`\r적재 ${done}/${rows.length}`);
//   }
//   console.log('\n완료.');

//   await pool.end();
// }

// // onConflictDoUpdate 에서 새 값을 참조하는 EXCLUDED 표현
// import { sql } from 'drizzle-orm';
// function sqlExcluded(column: string) {
//   return sql.raw(`excluded.${column === 'studentNo' ? 'student_no' : column}`);
// }

// main().catch(async (err) => {
//   console.error(err);
//   await pool.end();
//   process.exit(1);
// });
