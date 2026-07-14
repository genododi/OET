import type { SessionConfig, SessionTask } from '../types/session';
import type { UsmleStep, UsmleDiscipline } from '../types/usmle';
import { usmleBankByStep } from '../data/usmleTaskBank';

export const USMLE_BLOCK_QUESTIONS = 40;
export const USMLE_BLOCK_MINUTES = 60;

export interface UsmleBlockOptions {
  step: UsmleStep;
  discipline?: UsmleDiscipline;
  questionCount: number;
  timeMinutes: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function buildUsmleBlockSession(options: UsmleBlockOptions): SessionConfig {
  const { step, discipline, questionCount, timeMinutes } = options;
  const pool = usmleBankByStep[step] ?? [];
  const filtered = discipline
    ? pool.filter((t) => t.usmleDiscipline === discipline)
    : pool;

  const shuffled = shuffleArray(filtered);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  const stepLabel = step === 'step1' ? 'Step 1' : step === 'step2' ? 'Step 2 CK' : 'Step 3';

  const tasks: SessionTask[] = [
    {
      id: `usmle-${step}-intro`,
      subtest: 'intro',
      title: `${stepLabel} Block Session`,
      instructions: `Answer each multiple-choice question. You have ${timeMinutes} minutes for ${selected.length} questions. Questions can be flagged for later review.`,
      checklist: [
        `Step: ${stepLabel}`,
        `Discipline: ${discipline ?? 'All'}`,
        `Questions: ${selected.length}`,
        `Time: ${timeMinutes} minutes`,
      ],
    },
    ...selected,
  ];

  return {
    id: `usmle-${step}-${Date.now()}`,
    kind: 'usmle-block',
    title: `${stepLabel} Block`,
    subtitle: discipline ?? 'All disciplines',
    durationMinutes: timeMinutes,
    subtests: ['usmle'],
    tasks,
  };
}

export function buildUsmleCustomSession(options: UsmleBlockOptions): SessionConfig {
  const { step, discipline, questionCount, timeMinutes } = options;
  const pool = usmleBankByStep[step] ?? [];
  const filtered = discipline
    ? pool.filter((t) => t.usmleDiscipline === discipline)
    : pool;

  const shuffled = shuffleArray(filtered);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  const stepLabel = step === 'step1' ? 'Step 1' : step === 'step2' ? 'Step 2 CK' : 'Step 3';

  const tasks: SessionTask[] = [
    {
      id: `usmle-${step}-custom-intro`,
      subtest: 'intro',
      title: `Custom Quiz — ${stepLabel}`,
      instructions: `Custom quiz with ${selected.length} questions in ${timeMinutes} minutes.`,
      checklist: [
        `Step: ${stepLabel}`,
        `Discipline: ${discipline ?? 'All'}`,
        `Questions: ${selected.length}`,
        `Time: ${timeMinutes} minutes`,
      ],
    },
    ...selected,
  ];

  return {
    id: `usmle-${step}-custom-${Date.now()}`,
    kind: 'usmle-custom',
    title: `Custom Quiz — ${stepLabel}`,
    subtitle: discipline ?? 'All disciplines',
    durationMinutes: timeMinutes,
    subtests: ['usmle'],
    tasks,
  };
}

export function getUsmleTaskCount(step: string): number {
  return (usmleBankByStep[step] ?? []).length;
}
