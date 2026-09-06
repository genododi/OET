import type { CompletedSession } from '../types/session';
import type { MentorMessage } from './mentor';
import { canonicalIdOf, summarizeSubtestHistory } from './taskHistory';
import { readMistakeReflections } from './mistakeNotebook';
import { MENTOR_SUBTESTS } from './mentor';

const STORAGE_KEY = 'oet-study-partner-mentor-v1';
export interface MentorLessonMemory { messages: MentorMessage[]; response: string; updatedAt: string }

export function readMentorLessons(): Record<string, MentorLessonMemory> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, raw]) => {
      const lesson = raw as Partial<MentorLessonMemory> | null;
      return key.length < 150 && lesson && typeof lesson.response === 'string' && lesson.response.length <= 12000 &&
        typeof lesson.updatedAt === 'string' && Array.isArray(lesson.messages) && lesson.messages.length <= 40 &&
        lesson.messages.every((message) => message && typeof message.id === 'string' && (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string' && message.text.length <= 16000 && (message.source === undefined || message.source === 'guide' || message.source === 'ai'));
    })) as Record<string, MentorLessonMemory>;
  } catch { return {}; }
}

export function saveMentorLesson(key: string, lesson: MentorLessonMemory) {
  const lessons = { ...readMentorLessons(), [key]: { ...lesson, messages: lesson.messages.slice(-40), response: lesson.response.slice(0, 12000) } };
  const recent = Object.entries(lessons).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt)).slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(recent)));
}

export function clearMentorLesson(key: string) {
  const lessons = readMentorLessons();
  delete lessons[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
}

export function buildLearnerMemory(completed: CompletedSession[], taskId: string): string {
  const summaries = summarizeSubtestHistory(completed, MENTOR_SUBTESTS);
  const reflection = readMistakeReflections()[canonicalIdOf(taskId) ?? taskId];
  const recent = completed.filter((session) => session.kind === 'practice' || session.kind === 'mock').slice(0, 4);
  return JSON.stringify({
    target: '450+ is the learner’s aspiration, not a predicted result',
    skills: summaries.map((summary) => ({ skill: summary.subtest, qualifiedSets: summary.attemptCount, recentTrainingPercent: summary.rollingPercent })),
    recentGaps: recent.flatMap((session) => session.review?.weakAreas ?? []).slice(0, 8),
    reflection,
  });
}
