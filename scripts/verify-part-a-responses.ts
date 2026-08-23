import assert from 'node:assert/strict';
import { mockExams } from '../src/data/mockExams';
import { bankBySubtest, oetTaskPart } from '../src/data/sessionTaskBank';
import { computeSessionReview, computeSubtestScore } from '../src/lib/oetScoring';
import {
  correctAnswerLabel,
  isTaskAnswerCorrect,
  oetResponseMode,
} from '../src/lib/oetResponseMode';
import { buildMockSession } from '../src/lib/sessionBuilder';
import type { OetSubtest } from '../src/types';
import type { SessionTask } from '../src/types/session';

const fullMock = mockExams.find((exam) =>
  (['listening', 'reading'] as OetSubtest[]).every((subtest) => exam.subtests.includes(subtest)),
);
assert.ok(fullMock, 'At least one mock must include Listening and Reading');

const session = buildMockSession(fullMock);
const scoredTasks = session.tasks.filter((task) => task.options?.length);
const listening = scoredTasks.filter((task) => task.subtest === 'listening');
const reading = scoredTasks.filter((task) => task.subtest === 'reading');
const listeningPartA = listening.filter((task) => oetTaskPart(task) === 'A');
const listeningPartsBC = listening.filter((task) => oetTaskPart(task) !== 'A');
const readingPartA = reading.filter((task) => oetTaskPart(task) === 'A');

assert.equal(listeningPartA.length, 24, 'Listening Part A must contain 24 note-completion items');
assert.ok(
  listeningPartA.every((task) => oetResponseMode(task) === 'short-text'),
  'Listening Part A must require produced short answers',
);
assert.equal(listeningPartsBC.length, 18, 'Listening Parts B and C must contain 18 items');
assert.ok(
  listeningPartsBC.every((task) => oetResponseMode(task) === 'single-choice'),
  'Listening Parts B and C must remain multiple choice',
);
assert.equal(readingPartA.length, 20, 'Reading Part A must contain 20 items');
assert.ok(
  readingPartA.slice(0, 7).every((task) => oetResponseMode(task) === 'single-choice'),
  'Reading Part A questions 1–7 must match texts',
);
assert.ok(
  readingPartA.slice(7).every((task) => oetResponseMode(task) === 'short-text'),
  'Reading Part A questions 8–20 must require produced short answers',
);

function correctResponse(task: SessionTask): string {
  if (oetResponseMode(task) === 'short-text') return correctAnswerLabel(task);
  return task.options?.find((option) => option.correct)?.id ?? '';
}

const answers = Object.fromEntries(scoredTasks.map((task) => [task.id, correctResponse(task)]));
for (const subtest of ['listening', 'reading'] as const) {
  const score = computeSubtestScore(subtest, session.tasks, answers, {}, {});
  assert.equal(score.correct, 42, `${subtest} must award all 42 exact correct responses`);
  assert.equal(score.total, 42, `${subtest} must score all 42 official items`);
  assert.equal(score.percentScore, 100, `${subtest} exact answers must earn 100%`);
}

const hyphenated = bankBySubtest.reading.find((task) => task.id === 'read-75');
assert.ok(hyphenated, 'Hyphen-normalisation fixture read-75 is missing');
assert.ok(
  isTaskAnswerCorrect(hyphenated, 'OVER THE COUNTER MEDICINES'),
  'Case and harmless hyphen variants should be accepted',
);
const spellingFixture = bankBySubtest.reading.find((task) => task.id === 'read-81');
assert.ok(spellingFixture, 'Strict-spelling fixture read-81 is missing');
assert.equal(
  isTaskAnswerCorrect(spellingFixture, 'anticholenergic'),
  false,
  'A clinically recognisable misspelling must not receive the mark',
);
const choiceFixture = listeningPartsBC[0];
assert.ok(choiceFixture, 'Listening multiple-choice fixture is missing');
const choiceCorrect = choiceFixture.options?.find((option) => option.correct);
assert.ok(choiceCorrect, 'Listening multiple-choice fixture has no correct option');
assert.ok(isTaskAnswerCorrect(choiceFixture, choiceCorrect.id));
assert.equal(
  isTaskAnswerCorrect(choiceFixture, choiceCorrect.label),
  false,
  'Multiple-choice scoring must require the selected option ID, not free text',
);

const review = computeSessionReview(
  { tasks: session.tasks, subtests: session.subtests },
  answers,
  {},
  {},
);
for (const task of [...listening, ...reading]) {
  assert.equal(
    review.taskReviews.find((item) => item.taskId === task.id)?.passed,
    true,
    `${task.id} should pass in the session review`,
  );
}

console.log(
  'Authentic response modes and strict scoring verified: Listening 24 short + 18 choice; Reading Part A 7 matching + 13 short.',
);
