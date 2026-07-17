/**
 * In-app practice thresholds, not a conversion to an official OET score.
 * OET uses scaled scores, so a raw percentage in this app cannot accurately
 * predict a 0–500 result.
 */
export const OET_THRESHOLDS = {
  listening: { practicePass: 70, examReady: 80 },
  reading: { practicePass: 70, examReady: 80 },
  writing: { practicePass: 65, examReady: 75 },
  speaking: { practicePass: 65, examReady: 75 },
} as const;

/**
 * Deliberately demanding internal targets for an A-grade training plan.
 * They leave a margin above the app's normal practice/pass signals. They are
 * coaching targets only — never an official OET score prediction.
 */
export const GRADE_A_TRAINING_TARGETS = {
  listening: 90,
  reading: 90,
  writing: 85,
  speaking: 85,
} as const;

export type ReadinessLevel = 'below' | 'practice-pass' | 'exam-ready';

export function getReadinessLevel(
  subtest: keyof typeof OET_THRESHOLDS,
  percent: number,
): ReadinessLevel {
  const t = OET_THRESHOLDS[subtest];
  if (percent >= t.examReady) return 'exam-ready';
  if (percent >= t.practicePass) return 'practice-pass';
  return 'below';
}

export function readinessLabel(level: ReadinessLevel): string {
  if (level === 'exam-ready') return 'Strong practice performance';
  if (level === 'practice-pass') return 'Practice pass';
  return 'Needs more practice';
}
