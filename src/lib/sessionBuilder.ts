import type { Difficulty, MockExam, OetSubtest, PracticeModule } from '../types';
import type { SessionConfig, SessionTask } from '../types/session';
import type { CompletedSession } from '../types/session';
import {
  pickReadingPartATasks,
  pickTasks,
  pickTasksByPart,
  bankBySubtest,
  oetTaskPart,
} from '../data/sessionTaskBank';
import {
  buildTaskStats,
  dueReviewStats,
  PRODUCTIVE_CRITERIA,
  weightedPick,
  type ProductiveCriterion,
  type TaskStat,
} from './taskHistory';
import {
  OET_SUBTEST_TASK_COUNTS,
  OET_PARTS,
  OET_SUBTEST_PART_TASK_COUNTS,
  hasOetPartBlueprint,
  oetMockDurationMinutes,
  oetMockTaskCount,
  type OetPart,
} from './oetExamTiming';
import type { PracticeProvenance } from '../types';
import { GRADE_A_EVIDENCE_REQUIREMENTS } from './oetThresholds';
import { dailyOetProgression } from '../data/dailyOetProgression';

/** Minimum content tasks for catalog-derived receptive practice modules. */
export const MIN_CONTENT_TASKS = 10;

/**
 * Productive tasks are full performances, not MCQ-sized items. Adaptive sets
 * therefore cap Writing at one letter and Speaking at the live-test two-role-play
 * workload; a mixed set uses one role-play so all four skills remain practical.
 */
export const SMART_SESSION_TASK_CAPS: Record<OetSubtest, number> = {
  listening: 20,
  reading: 20,
  writing: 1,
  speaking: 2,
};

export const SMART_TASK_MINUTES: Record<OetSubtest, number> = {
  listening: 2,
  reading: 3,
  writing: 45,
  speaking: 10,
};

const subtestInstructions: Record<OetSubtest, string> = {
  listening:
    'Use the audio player when shown — each clip is matched to the current question and plays once under exam conditions. Spelling counts in Part A.',
  reading: 'Scan strategically — strict timing on Part A (15 min).',
  writing: 'Plan 5 min, write 180–200 words, formal letter format.',
  speaking: 'Prepare 3 min, respond aloud, interact with the patient role.',
};

function provenanceFor(subtest: OetSubtest): PracticeProvenance {
  return {
    sourceLabel: subtest === 'speaking' ? 'Official OET Speaking criteria and masterclass' : 'Official OET test specifications',
    sourceUrl:
      subtest === 'speaking'
        ? 'https://www.youtube.com/watch?v=Wo1lSFRrg-I'
        : 'https://oet.com/test/test-overview',
    classification: 'original-derived',
    authoringStatus: 'original-adaptation',
    reviewStatus: 'reviewed',
  };
}

function withProvenance(task: SessionTask, subtest: OetSubtest): SessionTask {
  return { ...task, provenance: task.provenance ?? provenanceFor(subtest) };
}

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

function resolveTaskCount(
  subtest: OetSubtest,
  taskCount: number,
  durationMinutes: number,
): number {
  const bankSize = bankBySubtest[subtest].length;
  if (subtest === 'writing' || subtest === 'speaking') {
    const fullPerformanceMinutes = SMART_TASK_MINUTES[subtest];
    const timeCalibratedCap = Math.max(1, Math.floor(durationMinutes / fullPerformanceMinutes));
    return Math.min(Math.max(1, taskCount), timeCalibratedCap, bankSize);
  }
  return Math.min(Math.max(taskCount, MIN_CONTENT_TASKS), bankSize);
}

export interface PracticeSessionWorkload {
  taskCount: number;
  durationMinutes: number;
}

/** The workload the learner will actually receive after exam-time calibration. */
export function practiceSessionWorkload(module: PracticeModule): PracticeSessionWorkload {
  return {
    taskCount: resolveTaskCount(module.subtest, module.tasksCount, module.durationMinutes),
    durationMinutes: module.durationMinutes,
  };
}

function tasksForSubtest(
  subtest: OetSubtest,
  prefix: string,
  taskCount: number,
  title: string,
  durationMinutes: number,
  topic?: string,
  difficultyFilter?: Difficulty,
): SessionTask[] {
  const targetCount = resolveTaskCount(subtest, taskCount, durationMinutes);
  const seed = sessionSeed(prefix, subtest, targetCount, title, topic);
  return pickTasks(subtest, targetCount, prefix, seed, difficultyFilter).map((task) =>
    withProvenance(task, subtest),
  );
}

/** Split a target total across subtests — each gets at least one when possible. */
function distributeTaskCounts(subtests: OetSubtest[], totalTarget: number): number[] {
  if (subtests.length === 0) return [];
  const safeTotal = Math.max(MIN_CONTENT_TASKS, totalTarget);
  const base = Math.floor(safeTotal / subtests.length);
  const extra = safeTotal % subtests.length;
  return subtests.map((_, index) => Math.max(1, base + (index < extra ? 1 : 0)));
}

function resolveMockTaskCounts(exam: MockExam): number[] {
  // A mock is a simulation, so its section blueprint follows the live OET rather
  // than evenly spreading an arbitrary metadata total across the four components.
  return exam.subtests.map((subtest) => OET_SUBTEST_TASK_COUNTS[subtest]);
}

export function buildPracticeSession(module: PracticeModule): SessionConfig {
  const workload = practiceSessionWorkload(module);
  const tasks: SessionTask[] = [
    {
      id: `${module.id}-intro`,
      subtest: 'intro',
      title: 'Before you begin',
      instructions: subtestInstructions[module.subtest],
      checklist: [
        `Topic: ${module.topic}`,
        `Duration: ${workload.durationMinutes} min`,
        `${workload.taskCount} task(s)`,
      ],
    },
    ...tasksForSubtest(
      module.subtest,
      module.id,
      module.tasksCount,
      module.title,
      module.durationMinutes,
      module.topic,
      module.difficulty,
    ),
  ];

  return {
    id: module.id,
    kind: 'practice',
    title: module.title,
    subtitle: module.topic,
    durationMinutes: workload.durationMinutes,
    subtests: [module.subtest],
    tasks,
  };
}

export function buildMockSession(exam: MockExam): SessionConfig {
  const taskCounts = resolveMockTaskCounts(exam);
  const durationMinutes = oetMockDurationMinutes(exam.subtests);
  const questionCount = oetMockTaskCount(exam.subtests);

  const tasks: SessionTask[] = [
    {
      id: `${exam.id}-intro`,
      subtest: 'intro',
      title: 'Mock exam instructions',
      instructions:
        'Timed simulation — complete sections in order. Listening, Reading and Writing form the 145-minute written block; Speaking is a separate 20-minute component in live OET scheduling.',
      checklist: [
        `Focus: ${exam.profession}`,
        `Duration: ${durationMinutes} min`,
        `Blueprint: ${questionCount} scored task(s)`,
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
    // Full simulations retain the official component blueprint while enforcing
    // the catalog-wide advanced-only task policy.
    if (hasOetPartBlueprint(subtest)) {
      const partTasks = OET_PARTS.flatMap((part) =>
        subtest === 'reading' && part === 'A'
          ? pickReadingPartATasks(`${exam.id}-${subtest}`, seed, 'advanced')
          : pickTasksByPart(
              subtest,
              part,
              OET_SUBTEST_PART_TASK_COUNTS[subtest][part],
              `${exam.id}-${subtest}`,
              seed,
              'advanced',
            ),
      );
      tasks.push(...partTasks.map((task) => withProvenance(task, subtest)));
    } else {
      tasks.push(
        ...pickTasks(subtest, capped, `${exam.id}-${subtest}`, seed, 'advanced').map((task) =>
          withProvenance(task, subtest),
        ),
      );
    }
  });

  return {
    id: exam.id,
    kind: 'mock',
    title: exam.title,
    subtitle: exam.profession,
    durationMinutes,
    subtests: exam.subtests,
    tasks,
  };
}

export interface SmartSessionOptions {
  subtests: OetSubtest[];
  completed: CompletedSession[];
  /** Upper selection target before full-performance caps are applied. */
  totalTasks?: number;
}

export interface ReviewSessionOptions {
  completed: CompletedSession[];
  /** Maximum number of due mistakes to retrieve in one focused session. */
  totalTasks?: number;
  /** Keeps a mixed review session practical even when several letters are due. */
  maxMinutes?: number;
  now?: Date;
}

export interface PartFocusSessionOptions {
  subtest: Extract<OetSubtest, 'listening' | 'reading'>;
  part: OetPart;
  completed: CompletedSession[];
  totalTasks?: number;
  now?: Date;
}

export interface ProductiveFocusSessionOptions {
  subtest: Extract<OetSubtest, 'writing' | 'speaking'>;
  criterion: ProductiveCriterion;
  completed: CompletedSession[];
  now?: Date;
}

const reviewMinutesBySubtest: Record<OetSubtest, number> = {
  listening: 2,
  reading: 3,
  writing: 45,
  speaking: 10,
};

const partFocusInstructions: Record<
  Extract<OetSubtest, 'listening' | 'reading'>,
  Record<OetPart, string>
> = {
  listening: {
    A: 'Capture exact clinical words, numbers and spelling while following the consultation.',
    B: 'Identify the purpose, action or main point in each short workplace extract.',
    C: 'Track speaker attitude, inference and the evidence that qualifies a conclusion.',
  },
  reading: {
    A: 'Retrieve exact information rapidly across short texts without reading every line.',
    B: 'Identify the purpose and main message of each short workplace text.',
    C: 'Infer writer attitude and distinguish fully supported claims from partial matches.',
  },
};

const productiveFocusInstructions: Record<ProductiveCriterion, string> = {
  Purpose: 'Make the clinical reason and requested action unmistakable in the opening sentence.',
  Content: 'Select and synthesise only the facts the recipient needs for safe next care.',
  'Conciseness & Clarity': 'Use direct sentences, remove repetition and keep the letter within 180–200 words.',
  Genre: 'Maintain the correct professional letter format, reader relationship and formal register.',
  Organisation: 'Sequence purpose, essential history, current status and requested action into logical paragraphs.',
  Language: 'Use accurate grammar, clinical vocabulary, tense and cohesive professional phrasing.',
  'Relationship & structure': 'Acknowledge emotion, signpost the conversation and check understanding naturally.',
  'Clinical communication': 'Elicit the patient perspective, explain precisely in plain language and negotiate a safe plan.',
  'Language & pace': 'Use fluent, intelligible patient-centred language at a controlled conversational pace.',
};

/** Build a history-weighted micro-session for one Listening or Reading exam part. */
export function buildPartFocusSession({
  subtest,
  part,
  completed,
  totalTasks = 10,
  now = new Date(),
}: PartFocusSessionOptions): SessionConfig {
  const stats = buildTaskStats(completed, now.getTime());
  const pool = bankBySubtest[subtest].filter((task) => oetTaskPart(task) === part);
  const selected = weightedPick(pool, Math.min(Math.max(1, totalTasks), pool.length), stats);
  const runId = `part-${subtest}-${part.toLowerCase()}-${now.getTime().toString(36)}`;
  const label = `${subtest[0]!.toUpperCase()}${subtest.slice(1)} Part ${part}`;

  return {
    id: runId,
    kind: 'practice',
    title: `${label} Focus`,
    subtitle: 'Precision drill — selected from your item history',
    durationMinutes: Math.max(20, Math.ceil(selected.length * 2.5)),
    subtests: [subtest],
    tasks: [
      {
        id: `${runId}-intro`,
        subtest: 'intro',
        title: `${label} precision target`,
        instructions: partFocusInstructions[subtest][part],
        checklist: [
          `${selected.length} Part ${part} task${selected.length === 1 ? '' : 's'}`,
          'Previously weak and stale items receive priority',
          'Explain the evidence for every corrected answer',
        ],
      },
      ...selected.map((task) => ({
        ...withProvenance(task, subtest),
        id: `${runId}-${task.id}`,
      })),
    ],
  };
}

/** Build one full productive-skill attempt with an explicit weakest-criterion brief. */
export function buildProductiveFocusSession({
  subtest,
  criterion,
  completed,
  now = new Date(),
}: ProductiveFocusSessionOptions): SessionConfig {
  if (!PRODUCTIVE_CRITERIA[subtest].includes(criterion)) {
    throw new Error(`${criterion} is not a ${subtest} practice criterion`);
  }
  const stats = buildTaskStats(completed, now.getTime());
  const selected = weightedPick(bankBySubtest[subtest], 1, stats)[0]!;
  const criterionSlug = criterion.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const runId = `criterion-${subtest}-${criterionSlug}-${now.getTime().toString(36)}`;
  const label = `${subtest[0]!.toUpperCase()}${subtest.slice(1)} ${criterion}`;
  const task = withProvenance(selected, subtest);

  return {
    id: runId,
    kind: 'practice',
    title: `${label} Focus`,
    subtitle: 'Criterion precision — selected from your scored history',
    durationMinutes: subtest === 'writing' ? 45 : 15,
    subtests: [subtest],
    tasks: [
      {
        id: `${runId}-intro`,
        subtest: 'intro',
        title: `${label} precision target`,
        instructions: productiveFocusInstructions[criterion],
        checklist:
          subtest === 'writing'
            ? [
                'Plan against the reader and purpose before drafting',
                'Complete one timed 180–200-word Medicine letter',
                `Edit specifically for ${criterion}`,
              ]
            : [
                'Use the full 3-minute preparation time',
                'Record at least 90 seconds and 80 words',
                `Review the ${criterion} score after submitting`,
              ],
      },
      {
        ...task,
        id: `${runId}-${task.id}`,
        instructions: `${task.instructions}\n\nCriterion focus: ${productiveFocusInstructions[criterion]}`,
      },
    ],
  };
}

/**
 * Builds a focused retrieval session from mistakes that are due now. Returns
 * null when the learner's correction queue is clear.
 */
export function buildReviewSession({
  completed,
  totalTasks = 8,
  maxMinutes = 45,
  now = new Date(),
}: ReviewSessionOptions): SessionConfig | null {
  const stats = buildTaskStats(completed, now.getTime());
  const taskById = new Map(
    Object.values(bankBySubtest).flatMap((bank) => bank.map((task) => [task.id, task] as const)),
  );
  const candidates = dueReviewStats(stats)
    .map((stat) => taskById.get(stat.canonicalId))
    .filter((task): task is SessionTask => Boolean(task));
  const selected: SessionTask[] = [];
  let plannedMinutes = 0;
  for (const task of candidates) {
    const taskMinutes = reviewMinutesBySubtest[task.subtest as OetSubtest];
    if (selected.length > 0 && plannedMinutes + taskMinutes > maxMinutes) continue;
    selected.push(task);
    plannedMinutes += taskMinutes;
    if (selected.length >= Math.max(1, totalTasks)) break;
  }

  if (selected.length === 0) return null;

  const runId = `review-${now.getTime().toString(36)}`;
  const activeSubtests = [...new Set(selected.map((task) => task.subtest))] as OetSubtest[];
  const tasks: SessionTask[] = [
    {
      id: `${runId}-intro`,
      subtest: 'intro',
      title: 'Mistake Review',
      instructions:
        'Retrieve the answer before opening feedback. These items are due because you previously missed them or because a successful correction now needs spaced reinforcement.',
      checklist: [
        `${selected.length} due mistake${selected.length === 1 ? '' : 's'}`,
        'Explain why your previous answer failed',
        'State the evidence or rubric rule before submitting',
      ],
    },
    ...selected.map((task) => ({
      ...withProvenance(task, task.subtest as OetSubtest),
      id: `${runId}-${task.id}`,
    })),
  ];
  const durationMinutes = Math.max(10, plannedMinutes);

  return {
    id: runId,
    kind: 'practice',
    title: 'Mistake Review',
    subtitle: 'Spaced retrieval — corrections due now',
    durationMinutes,
    subtests: activeSubtests,
    tasks,
  };
}

/**
 * Builds a session drawn from the full content bank but weighted toward tasks the
 * user hasn't seen yet or has scored poorly/staled on — a lightweight spaced-repetition
 * pass over the whole bank rather than a fixed named exam.
 */
function buildAdaptiveSession(
  { subtests, completed, totalTasks = 16 }: SmartSessionOptions,
  gradeABaseline: boolean,
): SessionConfig {
  const stats: Map<string, TaskStat> = buildTaskStats(completed);
  const activeSubtests = subtests.length > 0 ? subtests : (['listening', 'reading', 'writing', 'speaking'] as OetSubtest[]);
  const distributed = distributeTaskCounts(activeSubtests, totalTasks);
  const counts = activeSubtests.map((subtest, index) => {
    const cap = subtest === 'speaking' && activeSubtests.length > 1
      ? gradeABaseline
        ? GRADE_A_EVIDENCE_REQUIREMENTS.minimumSpeakingRolePlays
        : 1
      : SMART_SESSION_TASK_CAPS[subtest];
    const minimum = gradeABaseline && (subtest === 'listening' || subtest === 'reading')
      ? GRADE_A_EVIDENCE_REQUIREMENTS.minimumReceptiveItems
      : distributed[index]!;
    return Math.min(Math.max(distributed[index]!, minimum), cap, bankBySubtest[subtest].length);
  });
  const plannedMinutes = activeSubtests.reduce(
    (sum, subtest, index) => sum + counts[index]! * SMART_TASK_MINUTES[subtest],
    0,
  );
  const selectedTaskCount = counts.reduce((sum, count) => sum + count, 0);
  const runId = `${gradeABaseline ? 'baseline' : 'smart'}-${Date.now().toString(36)}`;

  const tasks: SessionTask[] = [
    {
      id: `${runId}-intro`,
      subtest: 'intro',
      title: gradeABaseline ? 'Grade A Baseline' : 'Smart Session',
      instructions:
        gradeABaseline
          ? 'Complete all four sections under timing. Listening and Reading contain enough scored items to count as qualified readiness evidence; Speaking counts only with a sufficient recording.'
          : 'Built from your history: unseen and previously-weak items are prioritised, mastered items appear less often. Mixed across the sub-tests you selected.',
      checklist: [
        `Sub-tests: ${activeSubtests.join(', ')}`,
        `${selectedTaskCount} task(s), weighted to fit ${Math.max(20, plannedMinutes)} minutes`,
        ...(gradeABaseline
          ? [
              'Qualified baseline: 10 Listening + 10 Reading + one letter + two recorded role-plays',
              'Listening and Reading each cover Parts A, B and C',
            ]
          : []),
        gradeABaseline
          ? 'Speaking mirrors the live two-role-play workload'
          : 'One full Writing letter maximum; Speaking uses one role-play in mixed sets or two alone',
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
    const requested = counts[index]!;
    const shouldBalanceReceptive =
      (subtest === 'listening' || subtest === 'reading') &&
      (gradeABaseline || activeSubtests.length === 1);
    const picked = shouldBalanceReceptive
      ? OET_PARTS.flatMap((part, partIndex) => {
          const partTarget = Math.floor(requested / OET_PARTS.length) +
            (partIndex < requested % OET_PARTS.length ? 1 : 0);
          return weightedPick(
            bank.filter((task) => oetTaskPart(task) === part),
            partTarget,
            stats,
          );
        })
      : weightedPick(bank, requested, stats);
    picked.forEach((task) => {
      tasks.push({ ...withProvenance(task, subtest), id: `${runId}-${task.id}` });
    });
  });

  return {
    id: runId,
    kind: 'practice',
    title: gradeABaseline ? 'Grade A Baseline' : 'Smart Session',
    subtitle: gradeABaseline
      ? 'Qualified four-skill diagnostic'
      : 'Adaptive — built from your progress',
    durationMinutes: Math.max(20, plannedMinutes),
    subtests: activeSubtests,
    enforceSinglePlayListening:
      gradeABaseline && activeSubtests.includes('listening') ? true : undefined,
    tasks,
  };
}

export function buildSmartSession(options: SmartSessionOptions): SessionConfig {
  return buildAdaptiveSession(options, false);
}

export function buildGradeABaselineSession(completed: CompletedSession[]): SessionConfig {
  return buildAdaptiveSession(
    {
      subtests: ['listening', 'reading', 'writing', 'speaking'],
      completed,
      totalTasks: 16,
    },
    true,
  );
}

/** Launch the newest balanced progression stage directly instead of leaving it buried in the pool. */
export function buildLatestDailyChallengeSession(): SessionConfig {
  const stage = dailyOetProgression.at(-1);
  if (!stage) throw new Error('Daily OET progression is empty');

  const subtests: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
  const runId = `daily-stage-${stage.stage}`;
  const contentTasks = subtests.map((subtest) => {
    const task = bankBySubtest[subtest].find((candidate) => candidate.id === stage.taskIds[subtest]);
    if (!task) throw new Error(`Daily OET stage ${stage.stage} is missing ${subtest}`);
    return {
      ...withProvenance(task, subtest),
      id: `${runId}-${task.id}`,
    };
  });
  const durationMinutes = subtests.reduce(
    (total, subtest) => total + SMART_TASK_MINUTES[subtest],
    0,
  );

  return {
    id: runId,
    kind: 'practice',
    title: `Daily Grade A Challenge · Stage ${stage.stage}`,
    subtitle: stage.focus,
    durationMinutes,
    subtests,
    enforceSinglePlayListening: true,
    tasks: [
      {
        id: `${runId}-intro`,
        subtest: 'intro',
        title: `Stage ${stage.stage} challenge brief`,
        instructions: stage.focus,
        checklist: [
          'One new advanced Medicine task in every OET sub-test',
          `${durationMinutes} minutes under continuous timing`,
          `New reasoning layer: ${stage.reasoningLayers.at(-1)}`,
          'This compact challenge is a drill; use qualifying sets for Grade A readiness evidence',
        ],
      },
      ...contentTasks,
    ],
  };
}
