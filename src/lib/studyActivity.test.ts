import { describe, expect, it } from 'vitest';
import type { CompletedSession } from '../types/session';
import { examDaysRemaining, summarizeStudyActivity } from './studyActivity';

function attempt(date: Date, subtest = 'reading', score: number | null = 0): CompletedSession {
  return { id: date.toISOString(), title: 'Practice', kind: 'practice', completedAt: date.toISOString(), durationMinutes: 20,
    review: { overallPercent: 0, overallPracticePass: false, overallExamReady: false, subtestScores: [], weakAreas: [],
      taskReviews: [{ taskId: 'read-1', subtest: subtest as 'reading', scorePercent: score, passed: score === null ? null : false, summary: 'Evidence' }] } };
}

describe('daily study activity', () => {
  const now = new Date(2026, 8, 5, 14);
  it('counts scored OET work including wrong answers, but excludes empty, future and USMLE sessions', () => {
    const today = attempt(new Date(2026, 8, 5, 10));
    const result = summarizeStudyActivity([today, attempt(new Date(2026, 8, 5, 11), 'writing', null),
      { ...today, kind: 'usmle-block' }, attempt(new Date(2026, 8, 6, 10)),
      { ...today, completedAt: 'invalid' }], now);
    expect(result.todaySessions).toBe(1);
    expect(result.skills.filter((skill) => skill.trained).map((skill) => skill.subtest)).toEqual(['reading']);
  });
  it('uses local calendar days and preserves yesterday’s streak until today is over', () => {
    const history = [attempt(new Date(2026, 8, 4, 23, 58)), attempt(new Date(2026, 8, 3, 0, 1)), attempt(new Date(2026, 8, 1, 12))];
    const result = summarizeStudyActivity(history, now);
    expect(result.streak).toBe(2);
    expect(result.todaySessions).toBe(0);
    expect(result.week.at(-1)).toMatchObject({ date: '2026-09-05', active: false });
    expect(summarizeStudyActivity(history, new Date(2026, 8, 6, 1)).streak).toBe(0);
    expect(summarizeStudyActivity([...history, attempt(new Date(2026, 8, 5, 1))], now).streak).toBe(3);
  });
  it('limits skill coverage to the last seven local dates', () => {
    const result = summarizeStudyActivity([attempt(new Date(2026, 7, 29), 'writing'), attempt(new Date(2026, 8, 2), 'speaking')], now);
    expect(result.skills.filter((skill) => skill.trained).map((skill) => skill.subtest)).toEqual(['speaking']);
  });
  it('handles exam day, past dates, month boundaries and invalid dates without off-by-one errors', () => {
    expect(examDaysRemaining('2026-09-05', now)).toBe(0);
    expect(examDaysRemaining('2026-10-01', now)).toBe(26);
    expect(examDaysRemaining('2026-09-04', now)).toBe(-1);
    expect(examDaysRemaining('2026-02-30', now)).toBeNull();
    expect(examDaysRemaining(undefined, now)).toBeNull();
  });
});
