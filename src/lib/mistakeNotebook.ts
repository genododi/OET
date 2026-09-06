import { bankBySubtest } from '../data/sessionTaskBank';
import type { CompletedSession, TaskReviewSnapshot } from '../types/session';
import { buildTaskStats, canonicalIdOf } from './taskHistory';

const taskById = new Map(Object.values(bankBySubtest).flatMap((bank) => bank.map((task) => [task.id, task] as const)));
export const MISTAKE_REASONS = ['Missed evidence', 'Distractor trap', 'Vocabulary or spelling', 'Time pressure', 'Case-note selection', 'Communication or structure', 'Other'] as const;
export type MistakeReason = typeof MISTAKE_REASONS[number];
export interface MistakeReflection { reason: MistakeReason | ''; rule: string; updatedAt: string }
export const NOTEBOOK_STORAGE_KEY = 'oet-study-partner-mistake-notebook';

export function readMistakeReflections(): Record<string, MistakeReflection> {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTEBOOK_STORAGE_KEY) ?? 'null');
    if (parsed?.schemaVersion !== 1 || !parsed.notes || typeof parsed.notes !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed.notes).filter(([id, value]) => {
      const note = value as Partial<MistakeReflection> | null;
      return taskById.has(id) && note && typeof note.rule === 'string' && note.rule.length <= 2000 &&
        typeof note.updatedAt === 'string' && (note.reason === '' || MISTAKE_REASONS.includes(note.reason as MistakeReason));
    })) as Record<string, MistakeReflection>;
  } catch { return {}; }
}

export function saveMistakeReflection(id: string, note: MistakeReflection) {
  const notes = readMistakeReflections();
  notes[id] = note;
  localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, notes }));
}

export function buildMistakeNotebook(completed: CompletedSession[], now = Date.now()) {
  const latest = new Map<string, TaskReviewSnapshot>();
  [...completed].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt)).forEach((session) => {
    session.review?.taskReviews.forEach((review) => {
      const id = canonicalIdOf(review.taskId);
      if (id && (review.passed !== null || review.scorePercent !== null)) latest.set(id, review);
    });
  });
  return [...buildTaskStats(completed, now).values()]
    .filter((stat) => stat.mistakeCount > 0 && taskById.has(stat.canonicalId))
    .sort((a, b) => Number(b.dueForReview) - Number(a.dueForReview) || b.priority - a.priority)
    .map((stat) => ({ ...stat, task: taskById.get(stat.canonicalId)!, latestReview: latest.get(stat.canonicalId) }));
}

export type MistakeNotebookEntry = ReturnType<typeof buildMistakeNotebook>[number];
