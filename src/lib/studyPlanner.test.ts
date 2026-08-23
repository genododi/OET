import { describe, expect, it } from 'vitest';
import { assignmentDate, createDiagnosticProfile, generateStudyPlan, validateDiagnosticProfile } from './studyPlanner';

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
    expect(assignmentDate(plan, plan.assignments[0])).toBe('2026-08-23');
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
