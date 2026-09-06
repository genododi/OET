import { describe, expect, it } from 'vitest';
import type { CompletedSession } from '../types/session';
import { buildMistakeNotebook, NOTEBOOK_STORAGE_KEY, readMistakeReflections, saveMistakeReflection } from './mistakeNotebook';
import { buildReviewSession } from './sessionBuilder';

function attempt(id: string, passed: boolean | null, date: string): CompletedSession {
  return { id: date, title: 'Practice', kind: 'practice', completedAt: date, durationMinutes: 20,
    review: { overallPercent: 0, overallPracticePass: false, overallExamReady: false, subtestScores: [], weakAreas: [],
      taskReviews: [{ taskId: `session-${id}`, subtest: id.startsWith('lis') ? 'listening' : 'reading', scorePercent: passed === null ? null : passed ? 100 : 0, passed, summary: passed ? 'Corrected' : 'Missed evidence', response: 'My response' }] } };
}

describe('mistake notebook and focused retrieval', () => {
  it('merges repeated task ids and ignores unattempted snapshots and unknown content', () => {
    const entries = buildMistakeNotebook([
      attempt('read-7', false, '2026-09-01T10:00:00Z'), attempt('read-7', true, '2026-09-02T10:00:00Z'),
      attempt('read-7', null, '2026-09-03T10:00:00Z'), attempt('read-999999', false, '2026-09-01T10:00:00Z'),
      attempt('read-8', true, '2026-09-01T10:00:00Z'),
    ], Date.parse('2026-09-02T11:00:00Z'));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ canonicalId: 'read-7', mistakeCount: 1, consecutivePasses: 1, dueForReview: false, latestReview: { summary: 'Corrected', response: 'My response' } });
    expect(entries[0].nextReviewAt).toBe(Date.parse('2026-09-03T10:00:00Z'));
  });
  it('retries only selected due tasks, keeps Listening single-play and preserves future dates', () => {
    const completed = [attempt('read-7', false, '2026-09-01T10:00:00Z'), attempt('lis-1', false, '2026-09-01T10:00:00Z'),
      attempt('read-8', false, '2026-09-01T10:00:00Z'), attempt('read-8', true, '2026-09-02T10:00:00Z')];
    const now = new Date('2026-09-02T11:00:00Z');
    const session = buildReviewSession({ completed, taskIds: ['lis-1', 'read-8'], now });
    expect(session?.tasks.filter((task) => task.subtest !== 'intro').map((task) => task.subtest)).toEqual(['listening']);
    expect(session?.enforceSinglePlayListening).toBe(true);
    expect(buildReviewSession({ completed, taskIds: ['read-8'], now })).toBeNull();
    expect(buildReviewSession({ completed, taskIds: [], now })).toBeNull();
  });
  it('persists a reflection without changing the review schedule and preserves other notes', () => {
    const note = { reason: 'Missed evidence' as const, rule: 'Check the qualifier.', updatedAt: '2026-09-05' };
    saveMistakeReflection('read-7', note);
    saveMistakeReflection('lis-1', { ...note, rule: 'Listen for negation.' });
    expect(readMistakeReflections()['read-7']).toEqual(note);
    expect(readMistakeReflections()['lis-1'].rule).toBe('Listen for negation.');
  });
  it('recovers from malformed storage and discards invalid reflection rows', () => {
    localStorage.setItem(NOTEBOOK_STORAGE_KEY, '{');
    expect(readMistakeReflections()).toEqual({});
    localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, notes: { 'read-7': null, 'read-8': { rule: 5 }, 'read-3': { rule: 'x', reason: 'invalid', updatedAt: 'today' } } }));
    expect(readMistakeReflections()).toEqual({});
  });
});
