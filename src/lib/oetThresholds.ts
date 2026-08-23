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

export const GRADE_A_EVIDENCE_REQUIREMENTS = {
  minimumAttempts: 4,
  consecutiveAtTarget: 3,
  recentWindow: 8,
} as const;

export type GradeATrainingStatus =
  | 'baseline-needed'
  | 'building-consistency'
  | 'target-met';

export interface GradeATrainingReadiness {
  status: GradeATrainingStatus;
  target: number;
  attemptCount: number;
  rollingPercent: number | null;
  consecutiveAtTarget: number;
  attemptsStillNeeded: number;
}

/**
 * A single excellent set is not enough to claim Grade A training mastery.
 * Require a minimum sample, a recency-weighted average at target, and a current
 * three-attempt streak. This remains an internal coaching gate, not an official
 * OET score conversion or pass prediction.
 */
export function assessGradeATrainingReadiness(
  subtest: keyof typeof GRADE_A_TRAINING_TARGETS,
  chronologicalScores: readonly number[],
): GradeATrainingReadiness {
  const scores = chronologicalScores.filter(
    (score) => Number.isFinite(score) && score >= 0 && score <= 100,
  );
  const recent = scores.slice(-GRADE_A_EVIDENCE_REQUIREMENTS.recentWindow);
  const weights = recent.map((_, index) => index + 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const rollingPercent = recent.length > 0
    ? Math.round(
        recent.reduce((sum, score, index) => sum + score * weights[index]!, 0) /
          totalWeight,
      )
    : null;
  const target = GRADE_A_TRAINING_TARGETS[subtest];
  let consecutiveAtTarget = 0;
  for (let index = scores.length - 1; index >= 0; index -= 1) {
    if (scores[index]! < target) break;
    consecutiveAtTarget += 1;
  }
  const attemptsStillNeeded = Math.max(
    0,
    GRADE_A_EVIDENCE_REQUIREMENTS.minimumAttempts - scores.length,
  );
  const status: GradeATrainingStatus =
    attemptsStillNeeded > 0
      ? 'baseline-needed'
      : rollingPercent !== null &&
          rollingPercent >= target &&
          consecutiveAtTarget >= GRADE_A_EVIDENCE_REQUIREMENTS.consecutiveAtTarget
        ? 'target-met'
        : 'building-consistency';

  return {
    status,
    target,
    attemptCount: scores.length,
    rollingPercent,
    consecutiveAtTarget,
    attemptsStillNeeded,
  };
}

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
