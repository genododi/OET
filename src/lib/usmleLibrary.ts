import type { PrivateUsmleQuestion, PrivateUsmleLibrary } from '../types/usmleLibrary';
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
    usmleSource: `${question.sourceName} · ${question.subject ?? 'Subject unassigned'} · ${progress.step ? 'Step assigned by you' : question.classification}${question.sourceOrigin ? ` · ${question.sourceOrigin === 'generated' ? 'Generated source practice' : 'Source-authored practice'} · ${question.sourceAttribution ?? ''} · ${question.sourceLicense ?? ''}` : ''}${question.sourceNote ? `\n${question.sourceNote}` : ''}`,
  };
}

export const newestUsmleFirst = <T extends { productionYear?: number | null }>(items: T[]) => [...items].sort((a,b) => (b.productionYear ?? 0) - (a.productionYear ?? 0));

export function privateUsmleUrl(asset: string) {
  if (/^usmle-library\/pages\/[a-f0-9]{64}\.webp$/.test(asset)) return `${import.meta.env.BASE_URL}${asset}`;
  const original = /^https:\/\/github\.com\/genododi\/OET\/releases\/download\/usmle-[A-Za-z0-9._-]+\/([a-f0-9]{64}\.pdf)$/.exec(asset);
  if (original) return window.oetDesktop ? `${import.meta.env.BASE_URL}desktop/usmle/originals/${original[1]}` : asset;
  return `${import.meta.env.BASE_URL}desktop/usmle/${asset}`;
}

export function mergeUsmleLibraries(published: PrivateUsmleLibrary, local: PrivateUsmleLibrary): PrivateUsmleLibrary {
  // Local entries retain their original IDs, images and profile progress.
  const questions = new Map([...published.questions, ...local.questions].map(item => [item.id, item]));
  const resources = new Map([...published.resources, ...local.resources].map(item => [item.sha256, item]));
  return { version: 1, importedAt: local.importedAt ?? published.importedAt, questions: [...questions.values()], resources: [...resources.values()], warnings: [...new Set([...published.warnings, ...local.warnings])] };
}

export async function loadPublishedUsmleLibrary(signal?: AbortSignal): Promise<PrivateUsmleLibrary> {
  const response = await fetch(`${import.meta.env.BASE_URL}usmle-library/index.json`, { signal });
  if (!response.ok) throw Error('The shared USMLE collection could not load. Try again or open your downloaded source PDFs.');
  const value = await response.json();
  if (value.version !== 1 || !Array.isArray(value.questions) || !Array.isArray(value.resources) || !Array.isArray(value.warnings)) throw Error('The shared USMLE catalog is invalid.');
  return value;
}
