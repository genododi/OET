/**
 * One-off audit — duplicate IDs, titles, descriptions, session content.
 * Run: npx tsx scripts/audit-duplicates.ts
 */
import { createHash } from 'node:crypto';
import { practiceModules } from '../src/data/practice';
import { mockExams } from '../src/data/mockExams';
import { bankBySubtest, pickTasks } from '../src/data/sessionTaskBank';
import { readingPassages } from '../src/data/readingPassages';
import { buildPracticeSession } from '../src/lib/sessionBuilder';
import type { OetSubtest } from '../src/types';

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fingerprint(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function taskContentFingerprint(task: {
  title?: string;
  prompt?: string;
  instructions?: string;
}): string {
  return fingerprint(`${task.title ?? ''}|${task.prompt ?? ''}|${task.instructions ?? ''}`);
}

function findDupes<T>(
  items: T[],
  keyFn: (item: T, index: number) => string,
  label: string,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  items.forEach((item, i) => {
    const key = keyFn(item, i);
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  });
  const dupes = new Map<string, number[]>();
  for (const [key, indices] of map) {
    if (indices.length > 1) dupes.set(key, indices);
  }
  if (dupes.size > 0) {
    console.log(`\n${label}: ${dupes.size} duplicate key(s), ${[...dupes.values()].reduce((a, b) => a + b.length, 0)} total entries involved`);
    let shown = 0;
    for (const [key, indices] of dupes) {
      if (shown++ >= 5) {
        console.log(`  ... and ${dupes.size - 5} more`);
        break;
      }
      console.log(`  "${key.slice(0, 80)}${key.length > 80 ? '…' : ''}" × ${indices.length}`);
    }
  } else {
    console.log(`\n${label}: none`);
  }
  return dupes;
}

console.log('=== DUPLICATE AUDIT (before fix) ===\n');
console.log(`Practice modules: ${practiceModules.length}`);
console.log(`Mock exams: ${mockExams.length}`);

// Practice
findDupes(practiceModules, (m) => m.id, 'Practice duplicate IDs');
findDupes(practiceModules, (m) => m.title, 'Practice duplicate titles (exact)');
findDupes(practiceModules, (m) => normalizeTitle(m.title), 'Practice duplicate titles (normalized)');
findDupes(practiceModules, (m) => fingerprint(m.description), 'Practice duplicate descriptions');

// Mock
findDupes(mockExams, (m) => m.id, 'Mock duplicate IDs');
findDupes(mockExams, (m) => m.title, 'Mock duplicate titles (exact)');
findDupes(mockExams, (m) => normalizeTitle(m.title), 'Mock duplicate titles (normalized)');
findDupes(mockExams, (m) => fingerprint(m.description), 'Mock duplicate descriptions');

// Cross-pool title overlap (general vs medicine at same serial)
const generalGen = practiceModules.filter((m) => m.id.startsWith('prac-gen-'));
const medGen = practiceModules.filter((m) => m.id.startsWith('prac-med-gen-'));
let crossTitleOverlap = 0;
for (let i = 0; i < Math.min(100, generalGen.length, medGen.length); i++) {
  if (normalizeTitle(generalGen[i]!.title) === normalizeTitle(medGen[i]!.title)) crossTitleOverlap++;
}
console.log(`\nGeneral vs Medicine practice title overlap (first 100 serials): ${crossTitleOverlap}`);

// Session task bank
const allBankTasks = Object.values(bankBySubtest).flat();
findDupes(allBankTasks, (t) => t.id, 'Session task bank duplicate IDs');
findDupes(allBankTasks, (t) => taskContentFingerprint(t), 'Session task bank duplicate content fingerprints');

for (const subtest of ['listening', 'reading', 'writing', 'speaking'] as OetSubtest[]) {
  findDupes(bankBySubtest[subtest], (t) => t.id, `  ${subtest} task IDs`);
}

// Reading passages
const passages = Object.values(readingPassages);
findDupes(passages, (p) => p.id, 'Reading passage duplicate IDs');
findDupes(passages, (p) => fingerprint(p.text), 'Reading passage duplicate text');

// Session content: same 10-task sequence across modules
const sampleModules = practiceModules.slice(0, 50);
const seqMap = new Map<string, string[]>();
for (const mod of sampleModules) {
  const session = buildPracticeSession(mod);
  const contentTasks = session.tasks.filter((t) => t.subtest !== 'intro' && t.subtest !== 'break');
  const seq = contentTasks.map((t) => taskContentFingerprint(t)).join('|');
  const existing = seqMap.get(seq) ?? [];
  existing.push(mod.id);
  seqMap.set(seq, existing);
}
let identicalSessions = 0;
for (const [, ids] of seqMap) {
  if (ids.length > 1) identicalSessions++;
}
console.log(`\nIdentical session sequences (first 50 practice modules): ${identicalSessions} collision groups`);

// Within-session duplicate content
let withinSessionDupes = 0;
for (const mod of sampleModules) {
  const session = buildPracticeSession(mod);
  const fps = session.tasks
    .filter((t) => t.subtest !== 'intro' && t.subtest !== 'break')
    .map((t) => taskContentFingerprint(t));
  if (new Set(fps).size !== fps.length) withinSessionDupes++;
}
console.log(`Sessions with duplicate task content (first 50): ${withinSessionDupes}`);

// pickTasks with same seed
const sameSeedPick = pickTasks('listening', 12, 'test-a', 'prac-listening-a');
const sameSeedPick2 = pickTasks('listening', 12, 'test-b', 'prac-listening-a');
const sameContent =
  sameSeedPick.map((t) => taskContentFingerprint(t)).join('|') ===
  sameSeedPick2.map((t) => taskContentFingerprint(t)).join('|');
console.log(`\nDifferent prefixes, same seed → identical content: ${sameContent}`);

console.log('\n=== AUDIT COMPLETE ===');
