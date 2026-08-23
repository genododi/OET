import type { SessionTask } from '../types/session';
import { isReadingPartAShortAnswer, oetTaskPart } from '../data/sessionTaskBank';

export type OetResponseMode = 'short-text' | 'single-choice';

/**
 * OET Listening Part A is note completion. Reading Part A mixes text matching
 * with short answers; authored short-answer items state that mode in the title.
 */
export function oetResponseMode(task: SessionTask): OetResponseMode {
  if (task.subtest === 'listening' && oetTaskPart(task) === 'A') return 'short-text';
  if (isReadingPartAShortAnswer(task)) return 'short-text';
  return 'single-choice';
}

export function correctAnswerLabel(task: SessionTask): string {
  return task.options?.find((option) => option.correct)?.label ?? '';
}

/** Case and harmless punctuation variants are ignored; spelling and wording remain strict. */
export function normalizeProducedAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‐‑‒–—-]+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isTaskAnswerCorrect(
  task: SessionTask,
  userAnswer: string | undefined,
): boolean {
  if (!userAnswer) return false;
  if (oetResponseMode(task) === 'short-text') {
    const correct = correctAnswerLabel(task);
    return Boolean(correct) && normalizeProducedAnswer(userAnswer) === normalizeProducedAnswer(correct);
  }
  return task.options?.some((option) => option.correct && option.id === userAnswer) ?? false;
}
