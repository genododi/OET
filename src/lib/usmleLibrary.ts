import type { PrivateUsmleQuestion } from '../types/usmleLibrary';
import type { SessionTask } from '../types/session';
import type { UsmleStep } from '../types/usmle';

export interface PrivateQuestionProgress { answer?: string; revealed?: boolean; reviewed?: boolean; flagged?: boolean; note?: string; step?: UsmleStep }
export type PrivateStudyProgress = Record<string, PrivateQuestionProgress>;
const key = 'usmle-private-study-v1';
export function loadPrivateStudy(): PrivateStudyProgress {
  try { const value = JSON.parse(localStorage.getItem(key) ?? '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function savePrivateStudy(value: PrivateStudyProgress) { localStorage.setItem(key, JSON.stringify(value)); }
export function privateQuestionTask(question: PrivateUsmleQuestion, progress: PrivateQuestionProgress = {}): SessionTask | null {
  const step = progress.step ?? question.step;
  if (!step || question.reviewOnly || !question.key || question.options.filter(option => option.correct).length !== 1) return null;
  return {
    id: question.id, subtest: 'usmle', title: `Block ${question.block ?? '—'} · Question ${question.number ?? '—'}`,
    prompt: question.prompt, instructions: 'Choose the single best answer. Inspect the question source for any clinical images or tables.',
    options: question.options, explanation: question.explanation,
    usmleYear: question.productionYear ?? undefined,
    usmleStep: step, usmleDiscipline: question.discipline, usmleQuestionFormat: 'single-best-answer',
    usmleQuestionImages: question.questionImages, usmleAnswerImages: question.answerImages,
    usmleSource: `${question.sourceName} · ${question.subject ?? 'Subject unassigned'} · ${progress.step ? 'Step assigned by you' : question.classification}${question.sourceNote ? `\n${question.sourceNote}` : ''}`,
  };
}

export const newestUsmleFirst = <T extends { productionYear?: number | null }>(items: T[]) => [...items].sort((a,b) => (b.productionYear ?? 0) - (a.productionYear ?? 0));

export const privateUsmleUrl = (asset: string) => `${import.meta.env.BASE_URL}desktop/usmle/${asset}`;
