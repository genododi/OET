import { practiceModules } from '../src/data/practice';
import { mockExams } from '../src/data/mockExams';
import {
  countMedicineAdvancedMockBySubtest,
  countMedicineAdvancedPracticeBySubtest,
  TARGET_MEDICINE_ADVANCED_PER_SUBTEST,
} from '../src/lib/preferredProfession';
import type { OetSubtest } from '../src/types';

const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const TARGET = TARGET_MEDICINE_ADVANCED_PER_SUBTEST;

function sampleId(prefix: string, subtest: OetSubtest): string {
  const first = `${prefix}-med-adv-${subtest}-0001`;
  const mid = `${prefix}-med-adv-${subtest}-0500`;
  const last = `${prefix}-med-adv-${subtest}-${String(TARGET).padStart(4, '0')}`;
  return `${first}, ${mid}, ${last}`;
}

const practiceCounts = countMedicineAdvancedPracticeBySubtest(practiceModules);
const mockCounts = countMedicineAdvancedMockBySubtest(mockExams);

let failed = false;

console.log('\nMedicine + Advanced catalog verification\n');
console.log(`Target per subtest: >= ${TARGET}\n`);

console.log('| Catalog  | Subtest   | Count | Status |');
console.log('|----------|-----------|-------|--------|');

for (const subtest of SUBTESTS) {
  for (const [label, counts] of [
    ['Practice', practiceCounts],
    ['Mocks', mockCounts],
  ] as const) {
    const count = counts[subtest];
    const ok = count >= TARGET;
    if (!ok) failed = true;
    console.log(
      `| ${label.padEnd(8)} | ${subtest.padEnd(9)} | ${String(count).padStart(5)} | ${ok ? 'OK' : 'FAIL'} |`,
    );
  }
}

console.log('\nSample IDs (practice):');
for (const subtest of SUBTESTS) {
  console.log(`  ${subtest}: ${sampleId('prac', subtest)}`);
}

console.log('\nSample IDs (mocks):');
for (const subtest of SUBTESTS) {
  console.log(`  ${subtest}: ${sampleId('mock', subtest)}`);
}

console.log('\nTotals — practice all:', practiceCounts.all, '| mocks all:', mockCounts.all);

if (failed) {
  console.error('\nVerification FAILED — one or more subtests below target.');
  process.exit(1);
}

console.log('\nVerification PASSED.\n');
