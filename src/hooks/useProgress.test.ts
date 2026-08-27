import { describe, expect, it } from 'vitest';
import type { CompletedSession } from '../types/session';
import { summarizeSubtestHistory } from '../lib/taskHistory';
import {
  MAX_COMPLETED_SESSIONS,
  mergeCompletedSession,
  migrateProgress,
} from './useProgress';

function scoredAttempt(completedAt: string, percentScore: number): CompletedSession {
  return {
    id: 'medicine-mock-repeat',
    kind: 'mock',
    title: 'Medicine Mock Repeat',
    completedAt,
    durationMinutes: 60,
    review: {
      subtestScores: [
        {
          subtest: 'reading',
          percentScore,
          practicePass: percentScore >= 70,
          examReady: percentScore >= 80,
          weakAreas: [],
        },
      ],
      overallPercent: percentScore,
      overallPracticePass: percentScore >= 70,
      overallExamReady: percentScore >= 80,
      weakAreas: [],
      taskReviews: [],
    },
  };
}

describe('progress migration', () => {
  it('migrates the previous unversioned shape and discards invalid rows', () => {
    const migrated = migrateProgress({
      completed: [
        { id: 'mock-1', title: 'Mock 1', kind: 'mock', durationMinutes: 180, completedAt: '2026-08-23T00:00:00Z' },
        { id: 7 },
      ],
    });
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.completed.map((session) => session.id)).toEqual(['mock-1']);
  });
});

describe('completed-attempt retention', () => {
  it('keeps distinct retries of the same module visible to readiness history', () => {
    const first = scoredAttempt('2026-08-26T08:00:00.000Z', 72);
    const retry = scoredAttempt('2026-08-27T08:00:00.000Z', 94);
    const completed = mergeCompletedSession(mergeCompletedSession([], first), retry);

    expect(completed).toHaveLength(2);
    expect(completed.map((attempt) => attempt.completedAt)).toEqual([
      retry.completedAt,
      first.completedAt,
    ]);
    expect(summarizeSubtestHistory(completed, ['reading'])[0]).toMatchObject({
      attemptCount: 2,
      trend: [
        { completedAt: first.completedAt, percentScore: 72 },
        { completedAt: retry.completedAt, percentScore: 94 },
      ],
    });
  });

  it('replaces only an exact duplicate completion event', () => {
    const attempt = scoredAttempt('2026-08-27T08:00:00.000Z', 94);
    const duplicateWithUpdatedReview = scoredAttempt(attempt.completedAt, 96);
    const completed = mergeCompletedSession(
      mergeCompletedSession([], attempt),
      duplicateWithUpdatedReview,
    );

    expect(completed).toHaveLength(1);
    expect(completed[0]?.review?.overallPercent).toBe(96);
  });

  it('bounds retained history without evicting the newest attempt', () => {
    const history = Array.from({ length: MAX_COMPLETED_SESSIONS }, (_, index) => ({
      ...scoredAttempt(new Date(Date.UTC(2026, 0, index + 1)).toISOString(), 80),
      id: `session-${index}`,
    })).reverse();
    const newest = scoredAttempt('2026-08-27T12:00:00.000Z', 92);
    const completed = mergeCompletedSession(history, newest);

    expect(completed).toHaveLength(MAX_COMPLETED_SESSIONS);
    expect(completed[0]).toBe(newest);
    expect(completed).not.toContain(history.at(-1));
  });
});
