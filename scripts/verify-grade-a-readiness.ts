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
    'baseline-needed',
    `${subtest} must complete four scored attempts`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [target, target, target, target]).status,
    'target-met',
    `${subtest} should pass with four sustained target-level results`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [100, 100, 100, target - 1]).status,
    'building-consistency',
    `${subtest} must lose mastery after the current streak breaks`,
  );
  assert.equal(
    assessGradeATrainingReadiness(subtest, [target - 20, target, target, target]).status,
    'building-consistency',
    `${subtest} must also meet the rolling target`,
  );
}

assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.minimumAttempts, 4);
assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.consecutiveAtTarget, 3);
assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.recentWindow, 8);
assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.minimumReceptiveItems, 10);
assert.equal(GRADE_A_EVIDENCE_REQUIREMENTS.minimumReceptiveParts, 3);

console.log(
  'Verified conservative Grade A training gates for all four OET sub-tests: four-attempt minimum, eight-result rolling target, three-result streak, and 10-item/three-part receptive evidence floor.',
);
