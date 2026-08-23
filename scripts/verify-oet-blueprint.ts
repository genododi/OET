import assert from 'node:assert/strict';
import { mockExams } from '../src/data/mockExams';
import { bankBySubtest } from '../src/data/sessionTaskBank';
import {
  OET_FULL_TEST_MINUTES,
  OET_SUBTEST_MINUTES,
  OET_SUBTEST_TASK_COUNTS,
  OET_WRITTEN_BLOCK_MINUTES,
  oetMockDurationMinutes,
  oetMockTaskCount,
} from '../src/lib/oetExamTiming';
import { buildMockSession } from '../src/lib/sessionBuilder';
import type { OetSubtest } from '../src/types';

const subtests: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const officialMinutes: Record<OetSubtest, number> = {
  listening: 40,
  reading: 60,
  writing: 45,
  speaking: 20,
};
const officialTaskCounts: Record<OetSubtest, number> = {
  listening: 42,
  reading: 42,
  writing: 1,
  speaking: 2,
};
const minimumReserveTasks = 3;

assert.deepEqual(OET_SUBTEST_MINUTES, officialMinutes, 'OET component timing has drifted');
assert.deepEqual(OET_SUBTEST_TASK_COUNTS, officialTaskCounts, 'OET task blueprint has drifted');
assert.equal(OET_WRITTEN_BLOCK_MINUTES, 145, 'Written block must remain 145 minutes');
assert.equal(OET_FULL_TEST_MINUTES, 165, 'Full test content time must remain 165 minutes');

for (const subtest of subtests) {
  const minimumBankSize = officialTaskCounts[subtest] + minimumReserveTasks;
  assert.ok(
    bankBySubtest[subtest].length >= minimumBankSize,
    `${subtest} bank has ${bankBySubtest[subtest].length} task(s); a full blueprint plus ${minimumReserveTasks} reserve tasks requires ${minimumBankSize}`,
  );
}

let fullMocks = 0;
for (const exam of mockExams) {
  const session = buildMockSession(exam);
  const contentTasks = session.tasks.filter(
    (task) => task.subtest !== 'intro' && task.subtest !== 'break',
  );

  assert.equal(
    session.durationMinutes,
    oetMockDurationMinutes(exam.subtests),
    `${exam.id} has an incorrect session duration`,
  );
  assert.equal(
    contentTasks.length,
    oetMockTaskCount(exam.subtests),
    `${exam.id} silently caps its scored task count`,
  );

  for (const subtest of exam.subtests) {
    assert.equal(
      contentTasks.filter((task) => task.subtest === subtest).length,
      officialTaskCounts[subtest],
      `${exam.id} does not contain the full ${subtest} blueprint`,
    );
  }

  assert.ok(
    contentTasks.every((task) => task.difficulty === 'advanced'),
    `${exam.id} includes a task below advanced difficulty`,
  );
  assert.equal(
    new Set(contentTasks.map((task) => task.id)).size,
    contentTasks.length,
    `${exam.id} repeats a task identifier`,
  );

  const intro = session.tasks.find((task) => task.subtest === 'intro');
  assert.ok(
    intro?.checklist?.includes(`Blueprint: ${oetMockTaskCount(exam.subtests)} scored task(s)`),
    `${exam.id} does not show its true blueprint in the instructions`,
  );

  if (subtests.every((subtest) => exam.subtests.includes(subtest))) {
    fullMocks += 1;
    assert.equal(contentTasks.length, 87, `${exam.id} must contain 87 scored tasks`);
    assert.equal(session.durationMinutes, 165, `${exam.id} must contain 165 minutes of test time`);
  }
}

assert.ok(fullMocks > 0, 'The catalog must include at least one full four-component mock');

for (const task of bankBySubtest.listening) {
  assert.ok(task.audioSrc, `${task.id} is missing locally playable audio`);
  assert.ok(task.audioTranscript, `${task.id} is missing an audio transcript`);
  assert.ok(task.options?.length, `${task.id} is missing answer options`);
}
for (const task of bankBySubtest.reading) {
  assert.ok(task.readingPassage, `${task.id} is missing its reading passage`);
  assert.ok(task.options?.length, `${task.id} is missing answer options`);
}
for (const task of bankBySubtest.writing) {
  assert.ok(task.rubricChecklist?.length, `${task.id} is missing a writing rubric`);
  assert.ok(
    task.writingCriteria?.requiredConceptGroups.length,
    `${task.id} is missing task-specific clinical content criteria`,
  );
  assert.ok(
    task.writingCriteria?.requiredConceptGroups.every((group) => group.length > 0),
    `${task.id} has an empty clinical content group`,
  );
}
for (const task of bankBySubtest.speaking) {
  assert.ok(task.speakingCriteria, `${task.id} is missing speaking assessment criteria`);
}

console.log(
  `Official blueprint plus ${minimumReserveTasks}-task bank reserve verified across ${mockExams.length} mocks (${fullMocks} full): ${subtests
    .map((subtest) => `${subtest} ${officialTaskCounts[subtest]}/${officialMinutes[subtest]}m`)
    .join(', ')}.`,
);
