import type { Difficulty, MockExam, OetSubtest, PracticeModule } from '../types';
import type { SessionConfig, SessionTask } from '../types/session';
import type { CompletedSession } from '../types/session';
import { pickTasks, bankBySubtest } from '../data/sessionTaskBank';
import { buildTaskStats, weightedPick, type TaskStat } from './taskHistory';

/** Minimum content tasks (excluding intro/break) for every session. */
export const MIN_CONTENT_TASKS = 10;

const subtestInstructions: Record<OetSubtest, string> = {
  listening:
    'Use the audio player when shown — each clip is matched to the current question and plays once under exam conditions. Spelling counts in Part A.',
  reading: 'Scan strategically — strict timing on Part A (15 min).',
  writing: 'Plan 5 min, write 180–200 words, formal letter format.',
  speaking: 'Prepare 3 min, respond aloud, interact with the patient role.',
};

export function countContentTasks(tasks: SessionTask[]): number {
  return tasks.filter((t) => t.subtest !== 'intro' && t.subtest !== 'break').length;
}

function sessionSeed(
  moduleId: string,
  subtest: OetSubtest,
  taskCount: number,
  title: string,
  topic?: string,
): string {
  return `${moduleId}|${subtest}|${taskCount}|${title}|${topic ?? ''}`;
}

function resolveTaskCount(subtest: OetSubtest, taskCount: number): number {
  const bankSize = bankBySubtest[subtest].length;
  return Math.min(Math.max(taskCount, MIN_CONTENT_TASKS), bankSize);
}

function tasksForSubtest(
  subtest: OetSubtest,
  prefix: string,
  taskCount: number,
  title: string,
  topic?: string,
  difficultyFilter?: Difficulty,
): SessionTask[] {
  const targetCount = resolveTaskCount(subtest, taskCount);
  const seed = sessionSeed(prefix, subtest, targetCount, title, topic);
  return pickTasks(subtest, targetCount, prefix, seed, difficultyFilter);
}

/** Split a target total across subtests — each gets at least one when possible. */
function distributeTaskCounts(subtests: OetSubtest[], totalTarget: number): number[] {
  if (subtests.length === 0) return [];
  const safeTotal = Math.max(MIN_CONTENT_TASKS, totalTarget);
  const base = Math.floor(safeTotal / subtests.length);
  const extra = safeTotal % subtests.length;
  return subtests.map((_, index) => Math.max(1, base + (index < extra ? 1 : 0)));
}

function resolveMockTaskTotal(exam: MockExam): number {
  const fromMetadata = exam.questionsCount > 0 ? exam.questionsCount : MIN_CONTENT_TASKS;
  return Math.max(MIN_CONTENT_TASKS, Math.min(fromMetadata, 40));
}

export function buildPracticeSession(module: PracticeModule): SessionConfig {
  const tasks: SessionTask[] = [
    {
      id: `${module.id}-intro`,
      subtest: 'intro',
      title: 'Before you begin',
      instructions: subtestInstructions[module.subtest],
      checklist: [
        `Topic: ${module.topic}`,
        `Duration: ${module.durationMinutes} min`,
        `${module.tasksCount} task(s)`,
      ],
    },
    ...tasksForSubtest(
      module.subtest,
      module.id,
      module.tasksCount,
      module.title,
      module.topic,
      module.difficulty,
    ),
  ];

  return {
    id: module.id,
    kind: 'practice',
    title: module.title,
    subtitle: module.topic,
    durationMinutes: module.durationMinutes,
    subtests: [module.subtest],
    tasks,
  };
}

export function buildMockSession(exam: MockExam): SessionConfig {
  const taskCounts = distributeTaskCounts(exam.subtests, resolveMockTaskTotal(exam));

  const tasks: SessionTask[] = [
    {
      id: `${exam.id}-intro`,
      subtest: 'intro',
      title: 'Mock exam instructions',
      instructions:
        'Timed simulation — complete sections in order. Tasks rotate from a bank of 50+ recall-informed scenarios.',
      checklist: [
        `Focus: ${exam.profession}`,
        `Duration: ${exam.durationMinutes} min`,
        `Sub-tests: ${exam.subtests.join(', ')}`,
      ],
    },
  ];

  exam.subtests.forEach((subtest, index) => {
    if (index > 0) {
      tasks.push({
        id: `${exam.id}-break-${index}`,
        subtest: 'break',
        title: 'Short break',
        instructions: 'Take 2 minutes. Hydrate before the next sub-test.',
      });
    }
    const bankSize = bankBySubtest[subtest].length;
    const requested = taskCounts[index]!;
    const capped = Math.min(requested, bankSize);
    const seed = sessionSeed(exam.id, subtest, capped, exam.title, exam.profession);
    tasks.push(...pickTasks(subtest, capped, `${exam.id}-${subtest}`, seed, exam.difficulty));
  });

  return {
    id: exam.id,
    kind: 'mock',
    title: exam.title,
    subtitle: exam.profession,
    durationMinutes: exam.durationMinutes,
    subtests: exam.subtests,
    tasks,
  };
}

export interface SmartSessionOptions {
  subtests: OetSubtest[];
  completed: CompletedSession[];
  /** Total content tasks across all chosen subtests. Default 16 (≈4 per subtest). */
  totalTasks?: number;
}

/**
 * Builds a session drawn from the full content bank but weighted toward tasks the
 * user hasn't seen yet or has scored poorly/staled on — a lightweight spaced-repetition
 * pass over the whole bank rather than a fixed named exam.
 */
export function buildSmartSession({ subtests, completed, totalTasks = 16 }: SmartSessionOptions): SessionConfig {
  const stats: Map<string, TaskStat> = buildTaskStats(completed);
  const activeSubtests = subtests.length > 0 ? subtests : (['listening', 'reading', 'writing', 'speaking'] as OetSubtest[]);
  const counts = distributeTaskCounts(activeSubtests, totalTasks);
  const runId = `smart-${Date.now().toString(36)}`;

  const tasks: SessionTask[] = [
    {
      id: `${runId}-intro`,
      subtest: 'intro',
      title: 'Smart Session',
      instructions:
        'Built from your history: unseen and previously-weak items are prioritised, mastered items appear less often. Mixed across the sub-tests you selected.',
      checklist: [
        `Sub-tests: ${activeSubtests.join(', ')}`,
        `${totalTasks} task(s), adaptive selection`,
      ],
    },
  ];

  activeSubtests.forEach((subtest, index) => {
    if (index > 0) {
      tasks.push({
        id: `${runId}-break-${index}`,
        subtest: 'break',
        title: 'Short break',
        instructions: 'Take 2 minutes. Hydrate before the next sub-test.',
      });
    }
    const bank = bankBySubtest[subtest];
    const requested = Math.min(counts[index]!, bank.length);
    const picked = weightedPick(bank, requested, stats);
    picked.forEach((task) => {
      tasks.push({ ...task, id: `${runId}-${task.id}` });
    });
  });

  return {
    id: runId,
    kind: 'practice',
    title: 'Smart Session',
    subtitle: 'Adaptive — built from your progress',
    durationMinutes: Math.max(20, totalTasks * 3),
    subtests: activeSubtests,
    tasks,
  };
}
