import { describe, expect, it } from 'vitest';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import {
  buildPartFocusSession,
  buildProductiveFocusSession,
  buildReviewSession,
} from './sessionBuilder';
import {
  buildTaskStats,
  countDueReviewTasks,
  dueReviewStats,
  summarizePartHistory,
  summarizeProductiveCriterionHistory,
  summarizeSubtestHistory,
} from './taskHistory';

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

describe('Listening and Reading part precision', () => {
  const completed = [
    completedAttempt('2026-08-21T08:00:00.000Z', false, 'practice-lis-3'),
    completedAttempt('2026-08-22T08:00:00.000Z', false, 'practice-lis-118'),
    completedAttempt('2026-08-23T08:00:00.000Z', true, 'practice-lis-1'),
  ];

  it('identifies the weakest exam part from canonical task history', () => {
    const summaries = summarizePartHistory(completed);
    expect(summaries.find((item) => item.subtest === 'listening' && item.part === 'C')).toMatchObject({
      attemptCount: 2,
      accuracyPercent: 0,
    });
    expect(summaries.find((item) => item.subtest === 'listening' && item.part === 'B')).toMatchObject({
      attemptCount: 1,
      accuracyPercent: 100,
    });
  });

  it('builds an adaptive drill containing only the requested part', () => {
    const session = buildPartFocusSession({
      subtest: 'listening',
      part: 'C',
      completed,
      totalTasks: 5,
      now: new Date('2026-08-24T08:00:00.000Z'),
    });

    expect(session.title).toBe('Listening Part C Focus');
    expect(session.tasks).toHaveLength(6);
    expect(session.tasks.slice(1).every((task) => /Part C/i.test(task.title))).toBe(true);
  });
});

describe('Writing and Speaking criterion precision', () => {
  const completed: CompletedSession[] = [
    {
      id: 'productive-older',
      kind: 'practice',
      title: 'Productive practice',
      completedAt: '2026-08-24T08:00:00.000Z',
      durationMinutes: 45,
      review: {
        subtestScores: [
          {
            subtest: 'writing',
            percentScore: 60,
            practicePass: false,
            examReady: false,
            weakAreas: [],
          },
          {
            subtest: 'speaking',
            percentScore: 74,
            practicePass: true,
            examReady: false,
            weakAreas: [],
          },
        ],
        overallPercent: 67,
        overallPracticePass: false,
        overallExamReady: false,
        weakAreas: [],
        taskReviews: [
          {
            taskId: 'productive-write-44',
            subtest: 'writing',
            passed: false,
            scorePercent: 60,
            summary: 'Writing rubric review',
            criteriaScores: [
              { criterion: 'Purpose', scorePercent: 80 },
              { criterion: 'Content', scorePercent: 40 },
            ],
          },
          {
            taskId: 'productive-speak-44',
            subtest: 'speaking',
            passed: true,
            scorePercent: 74,
            summary: 'Typed transcript review',
            evidenceQualified: false,
            criteriaScores: [{ criterion: 'Clinical communication', scorePercent: 30 }],
          },
        ],
      },
    },
    {
      id: 'productive-newer',
      kind: 'practice',
      title: 'Writing practice',
      completedAt: '2026-08-25T08:00:00.000Z',
      durationMinutes: 45,
      review: {
        subtestScores: [],
        overallPercent: 0,
        overallPracticePass: false,
        overallExamReady: false,
        weakAreas: [],
        taskReviews: [
          {
            taskId: 'productive-write-45',
            subtest: 'writing',
            passed: false,
            scorePercent: 65,
            summary: 'Writing rubric review',
            criteriaScores: [{ criterion: 'Content', scorePercent: 60 }],
          },
        ],
      },
    },
  ];

  it('weights recent writing criteria and excludes typed speaking evidence', () => {
    const summaries = summarizeProductiveCriterionHistory(completed);
    expect(summaries.find((item) => item.subtest === 'writing' && item.criterion === 'Content')).toMatchObject({
      attemptCount: 2,
      rollingPercent: 53,
    });
    expect(
      summaries.find(
        (item) => item.subtest === 'speaking' && item.criterion === 'Clinical communication',
      ),
    ).toMatchObject({ attemptCount: 0, rollingPercent: null });
    expect(summarizeSubtestHistory(completed, ['speaking'])[0]).toMatchObject({
      attemptCount: 0,
      rollingPercent: null,
    });
  });

  it('builds a full task around the selected productive criterion', () => {
    const session = buildProductiveFocusSession({
      subtest: 'writing',
      criterion: 'Content',
      completed,
      now: new Date('2026-08-26T08:00:00.000Z'),
    });
    expect(session.title).toBe('Writing Content Focus');
    expect(session.durationMinutes).toBe(45);
    expect(session.tasks).toHaveLength(2);
    expect(session.tasks[1]?.subtest).toBe('writing');
    expect(session.tasks[1]?.instructions).toContain('Criterion focus:');
  });
});
