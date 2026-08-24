import { describe, expect, it } from 'vitest';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import { buildReviewSession } from './sessionBuilder';
import { buildTaskStats, countDueReviewTasks, dueReviewStats } from './taskHistory';

function completedAttempt(
  completedAt: string,
  passed: boolean,
  taskId = 'practice-lis-118',
  subtest: OetSubtest = 'listening',
): CompletedSession {
  return {
    id: `attempt-${completedAt}`,
    kind: 'practice',
    title: 'Listening practice',
    completedAt,
    durationMinutes: 20,
    review: {
      subtestScores: [],
      overallPercent: passed ? 100 : 0,
      overallPracticePass: passed,
      overallExamReady: passed,
      weakAreas: passed ? [] : ['Listening: evidence discrimination'],
      taskReviews: [
        {
          taskId,
          subtest,
          passed,
          scorePercent: passed ? 100 : 0,
          summary: passed ? 'Corrected' : 'Missed evidence',
        },
      ],
    },
  };
}

describe('mistake review spacing', () => {
  it('makes a failed item due immediately, then spaces a successful correction by one day', () => {
    const failed = completedAttempt('2026-08-23T08:00:00.000Z', false);
    const sameDay = Date.parse('2026-08-23T12:00:00.000Z');
    expect(countDueReviewTasks([failed], sameDay)).toBe(1);

    const corrected = completedAttempt('2026-08-23T09:00:00.000Z', true);
    const correctedStats = buildTaskStats([corrected, failed], sameDay).get('lis-118')!;
    expect(correctedStats.mistakeCount).toBe(1);
    expect(correctedStats.consecutivePasses).toBe(1);
    expect(correctedStats.dueForReview).toBe(false);
    expect(countDueReviewTasks([corrected, failed], Date.parse('2026-08-24T09:00:00.000Z'))).toBe(1);
  });

  it('expands a repeatedly corrected item to a three-day interval', () => {
    const attempts = [
      completedAttempt('2026-08-20T09:00:00.000Z', false),
      completedAttempt('2026-08-21T09:00:00.000Z', true),
      completedAttempt('2026-08-22T09:00:00.000Z', true),
    ];
    const beforeDue = buildTaskStats(attempts, Date.parse('2026-08-24T09:00:00.000Z'));
    expect(dueReviewStats(beforeDue)).toHaveLength(0);
    expect(countDueReviewTasks(attempts, Date.parse('2026-08-25T09:00:00.000Z'))).toBe(1);
  });

  it('builds a focused session containing only due bank items', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const review = buildReviewSession({
      completed: [completedAttempt('2026-08-23T08:00:00.000Z', false)],
      now,
    });

    expect(review?.title).toBe('Mistake Review');
    expect(review?.subtitle).toContain('corrections due now');
    expect(review?.tasks).toHaveLength(2);
    expect(review?.tasks[1]?.id).toMatch(/-lis-118$/);
    expect(review?.subtests).toEqual(['listening']);
  });

  it('caps a writing-heavy correction queue at one 45-minute letter', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const review = buildReviewSession({
      completed: [
        completedAttempt('2026-08-23T08:00:00.000Z', false, 'practice-write-43', 'writing'),
        completedAttempt('2026-08-23T09:00:00.000Z', false, 'practice-write-44', 'writing'),
      ],
      now,
      maxMinutes: 45,
    });

    expect(review?.durationMinutes).toBe(45);
    expect(review?.tasks).toHaveLength(2);
    expect(review?.subtests).toEqual(['writing']);
  });
});
