import { describe, expect, it } from 'vitest';
import type { CompletedSession } from '../types/session';
import {
  assignmentDate,
  createDiagnosticProfile,
  generateAdaptiveStudyPlan,
  generateStudyPlan,
  validateDiagnosticProfile,
} from './studyPlanner';

function progressSession(
  completedAt: string,
  listening: number,
  writing: number,
  taskReviews: NonNullable<CompletedSession['review']>['taskReviews'] = [],
): CompletedSession {
  return {
    id: `progress-${completedAt}`,
    kind: 'practice',
    title: 'Adaptive evidence',
    completedAt,
    durationMinutes: 45,
    review: {
      subtestScores: [
        {
          subtest: 'listening',
          percentScore: listening,
          practicePass: listening >= 70,
          examReady: listening >= 90,
          weakAreas: [],
        },
        {
          subtest: 'writing',
          percentScore: writing,
          practicePass: writing >= 70,
          examReady: writing >= 85,
          weakAreas: [],
        },
      ],
      overallPercent: Math.round((listening + writing) / 2),
      overallPracticePass: listening >= 70 && writing >= 70,
      overallExamReady: listening >= 90 && writing >= 85,
      weakAreas: [],
      taskReviews,
    },
  };
}

describe('Grade A study planning', () => {
  it('prioritises the weakest sub-test and creates timed review cadence', () => {
    const profile = createDiagnosticProfile({
      examDate: '2026-10-31',
      studyDaysPerWeek: 5,
      minutesPerDay: 60,
      baseline: { listening: 430, reading: 390, writing: 310, speaking: 410 },
      completedAt: '2026-08-23T00:00:00.000Z',
    });
    const plan = generateStudyPlan(profile, new Date('2026-08-23T00:00:00.000Z'));

    expect(profile.targetScore).toBe(450);
    expect(profile.weakAreas[0]).toBe('writing');
    expect(plan.assignments[0].subtest).toBe('writing');
    expect(plan.assignments.some((assignment) => assignment.kind === 'mock')).toBe(true);
    expect(plan.assignments.some((assignment) => assignment.kind === 'review')).toBe(true);
    expect(new Set(plan.assignments.map((assignment) => assignment.subtest))).toEqual(
      new Set(['listening', 'reading', 'writing', 'speaking']),
    );
    expect(assignmentDate(plan, plan.assignments[0])).toBe('2026-08-23');
  });

  it('lets four measured attempts replace an outdated baseline priority', () => {
    const profile = createDiagnosticProfile({
      examDate: '2026-10-31',
      studyDaysPerWeek: 5,
      minutesPerDay: 60,
      baseline: { listening: 300, reading: 450, writing: 440, speaking: 450 },
      completedAt: '2026-08-20T00:00:00.000Z',
    });
    const completed = [20, 21, 22, 23].map((day) =>
      progressSession(`2026-08-${day}T12:00:00.000Z`, 95, 40),
    );
    const plan = generateAdaptiveStudyPlan(
      profile,
      completed,
      new Date('2026-08-24T08:00:00.000Z'),
    );

    expect(plan.adaptedFromProgress).toBe(true);
    expect(plan.prioritySubtests?.[0]).toBe('writing');
    expect(plan.assignments[0].subtest).toBe('writing');
  });

  it('puts a due correction before new calendar work', () => {
    const profile = createDiagnosticProfile({
      examDate: '2026-10-31',
      studyDaysPerWeek: 5,
      minutesPerDay: 60,
      baseline: { listening: 450, reading: 450, writing: 300, speaking: 450 },
      completedAt: '2026-08-23T00:00:00.000Z',
    });
    const failedListening = progressSession(
      '2026-08-24T07:00:00.000Z',
      0,
      90,
      [
        {
          taskId: 'practice-lis-118',
          subtest: 'listening',
          passed: false,
          scorePercent: 0,
          summary: 'Missed informative missingness evidence',
        },
      ],
    );
    const plan = generateAdaptiveStudyPlan(
      profile,
      [failedListening],
      new Date('2026-08-24T08:00:00.000Z'),
    );

    expect(plan.dueReviewCount).toBe(1);
    expect(plan.prioritySubtests?.[0]).toBe('listening');
    expect(plan.assignments[0]).toMatchObject({
      kind: 'review',
      title: 'Due mistake review',
      subtest: 'listening',
      dueNow: true,
    });
    expect(plan.assignments.filter((assignment) => assignment.dueNow)).toHaveLength(1);
  });

  it('rejects unsafe or impossible profile values', () => {
    const profile = createDiagnosticProfile({
      examDate: '2020-01-01',
      studyDaysPerWeek: 8,
      minutesPerDay: 5,
      baseline: { listening: -1, reading: 501, writing: 350, speaking: 350 },
    });
    expect(validateDiagnosticProfile(profile).length).toBeGreaterThanOrEqual(4);
  });
});
