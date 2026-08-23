import assert from 'node:assert/strict';
import {
  assessGradeATrainingReadiness,
  GRADE_A_EVIDENCE_REQUIREMENTS,
  GRADE_A_TRAINING_TARGETS,
  OET_THRESHOLDS,
} from '../src/lib/oetThresholds';
import type { OetSubtest } from '../src/types';

const subtests: readonly OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

for (const subtest of subtests) {
  const target = GRADE_A_TRAINING_TARGETS[subtest];
  assert.ok(
    target > OET_THRESHOLDS[subtest].examReady,
    `${subtest} Grade A training target must exceed ordinary readiness`,
  );

  assert.equal(
    assessGradeATrainingReadiness(subtest, []).status,
    'baseline-needed',
    `${subtest} needs a baseline`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [100]).status,
    'baseline-needed',
    `${subtest} must not be mastered from one perfect attempt`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [target, target]).status,
    'baseline-needed',
    `${subtest} must meet the minimum sample size`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [target, target, target]).status,
    'target-met',
    `${subtest} should pass with sustained target-level evidence`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [100, 100, target - 1]).status,
    'building-consistency',
    `${subtest} must lose mastery after the current streak breaks`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [target - 20, target, target]).status,
    'building-consistency',
    `${subtest} must also meet the rolling target`,
  );
}

assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.minimumAttempts, 3);
assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.consecutiveAtTarget, 2);

console.log(
  'Verified conservative Grade A training gates for all four OET sub-tests: minimum evidence, rolling target, and current streak.',
);
