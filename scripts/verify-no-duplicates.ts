/**
 * Fail if any duplicate ID, title, description fingerprint, or session content
 * appears anywhere in practice modules, mock exams, task bank, or reading passages.
 *
 * Run: npm run verify-no-duplicates
 */
import { practiceModules } from '../src/data/practice';
import { mockExams } from '../src/data/mockExams';
import { bankBySubtest } from '../src/data/sessionTaskBank';
import { readingPassages } from '../src/data/readingPassages';
import { buildPracticeSession, buildMockSession } from '../src/lib/sessionBuilder';
import {
  contentFingerprint,
  normalizeTitle,
  sortedTagsFingerprint,
} from '../src/data/generators/uniqueness';
import type { SessionTask } from '../src/types/session';

type DuplicateReport = {
  label: string;
  count: number;
  samples: string[];
};

const failures: DuplicateReport[] = [];

function findDuplicates<T>(
  items: T[],
  label: string,
  keyFn: (item: T) => string,
  sampleFn: (item: T) => string,
): void {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  const dupes = [...map.entries()].filter(([, group]) => group.length > 1);
  if (dupes.length === 0) return;
  failures.push({
    label,
    count: dupes.length,
    samples: dupes.slice(0, 5).map(([key, group]) => {
      const sample = sampleFn(group[0]!);
      return `${key.slice(0, 40)}${key.length > 40 ? '…' : ''} × ${group.length} (e.g. ${sample})`;
    }),
  });
}

function taskContentFingerprint(task: SessionTask): string {
  return contentFingerprint(
    `${task.title ?? ''}|${task.prompt ?? ''}|${task.instructions ?? ''}`,
  );
}

function taskBaseId(sessionTaskId: string): string {
  return sessionTaskId.replace(/-c\d+$/, '');
}

console.log('\n=== Zero-duplicates verification ===\n');
console.log(`Practice modules: ${practiceModules.length}`);
console.log(`Mock exams: ${mockExams.length}`);

findDuplicates(practiceModules, 'Practice duplicate IDs', (m) => m.id, (m) => m.id);
findDuplicates(practiceModules, 'Practice duplicate titles (exact)', (m) => m.title, (m) => m.id);
findDuplicates(
  practiceModules,
  'Practice duplicate titles (normalized)',
  (m) => normalizeTitle(m.title),
  (m) => m.id,
);
findDuplicates(
  practiceModules,
  'Practice duplicate descriptions',
  (m) => contentFingerprint(m.description),
  (m) => m.id,
);
findDuplicates(
  practiceModules.filter((m) => m.tags?.length),
  'Practice duplicate tag combinations',
  (m) => sortedTagsFingerprint(m.tags!),
  (m) => m.id,
);

findDuplicates(mockExams, 'Mock duplicate IDs', (m) => m.id, (m) => m.id);
findDuplicates(mockExams, 'Mock duplicate titles (exact)', (m) => m.title, (m) => m.id);
findDuplicates(
  mockExams,
  'Mock duplicate titles (normalized)',
  (m) => normalizeTitle(m.title),
  (m) => m.id,
);
findDuplicates(
  mockExams,
  'Mock duplicate descriptions',
  (m) => contentFingerprint(m.description),
  (m) => m.id,
);
findDuplicates(
  mockExams.filter((m) => m.tags?.length),
  'Mock duplicate tag combinations',
  (m) => sortedTagsFingerprint(m.tags!),
  (m) => m.id,
);

const allBankTasks = Object.values(bankBySubtest).flat();
findDuplicates(allBankTasks, 'Session task bank duplicate IDs', (t) => t.id, (t) => t.id);
findDuplicates(
  allBankTasks,
  'Session task bank duplicate prompts',
  (t) => contentFingerprint(`${t.title ?? ''}|${t.prompt ?? ''}`),
  (t) => t.id,
);

const passages = Object.values(readingPassages);
findDuplicates(passages, 'Reading passage duplicate IDs', (p) => p.id, (p) => p.id);
findDuplicates(
  passages,
  'Reading passage duplicate text',
  (p) => contentFingerprint(p.text),
  (p) => p.id,
);

let sessionSequenceCollisions = 0;
let withinSessionContentDupes = 0;
let withinSessionBaseIdDupes = 0;

const sessionFingerprints = new Map<string, string>();

for (const mod of practiceModules) {
  const session = buildPracticeSession(mod);
  const contentTasks = session.tasks.filter((t) => t.subtest !== 'intro' && t.subtest !== 'break');
  const seq = contentTasks.map((t) => taskContentFingerprint(t)).join('|');
  const existing = sessionFingerprints.get(seq);
  if (existing && existing !== mod.id) sessionSequenceCollisions += 1;
  else sessionFingerprints.set(seq, mod.id);

  const contentFps = contentTasks.map((t) => taskContentFingerprint(t));
  if (new Set(contentFps).size !== contentFps.length) withinSessionContentDupes += 1;

  const baseIds = contentTasks.map((t) => taskBaseId(t.id));
  if (new Set(baseIds).size !== baseIds.length) withinSessionBaseIdDupes += 1;
}

for (const exam of mockExams.slice(0, 200)) {
  const session = buildMockSession(exam);
  const contentTasks = session.tasks.filter((t) => t.subtest !== 'intro' && t.subtest !== 'break');
  const seq = contentTasks.map((t) => taskContentFingerprint(t)).join('|');
  const key = `mock:${seq}`;
  const existing = sessionFingerprints.get(key);
  if (existing && existing !== exam.id) sessionSequenceCollisions += 1;
  else sessionFingerprints.set(key, exam.id);

  const contentFps = contentTasks.map((t) => taskContentFingerprint(t));
  if (new Set(contentFps).size !== contentFps.length) withinSessionContentDupes += 1;
}

if (sessionSequenceCollisions > 0) {
  failures.push({
    label: 'Identical session task sequences across modules/exams',
    count: sessionSequenceCollisions,
    samples: [`${sessionSequenceCollisions} collision(s) detected`],
  });
}
if (withinSessionContentDupes > 0) {
  failures.push({
    label: 'Sessions with duplicate task content within one session',
    count: withinSessionContentDupes,
    samples: [`${withinSessionContentDupes} session(s) affected`],
  });
}
if (withinSessionBaseIdDupes > 0) {
  failures.push({
    label: 'Practice sessions reusing same bank task more than once',
    count: withinSessionBaseIdDupes,
    samples: [`${withinSessionBaseIdDupes} session(s) affected`],
  });
}

if (failures.length === 0) {
  console.log('All checks passed — zero duplicates detected.\n');
  process.exit(0);
}

console.error(`FAILED — ${failures.length} duplicate category(ies):\n`);
for (const f of failures) {
  console.error(`  ${f.label}: ${f.count} group(s)`);
  for (const s of f.samples) console.error(`    · ${s}`);
}
console.error('');
process.exit(1);
