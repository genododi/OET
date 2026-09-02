import assert from 'node:assert/strict';
import { mockExams } from '../src/data/mockExams';
import {
  bankBySubtest,
  isReadingPartAShortAnswer,
  oetTaskPart,
} from '../src/data/sessionTaskBank';
import {
  OET_FULL_TEST_MINUTES,
  OET_MOCK_STAGE_SECONDS,
  OET_PARTS,
  OET_SUBTEST_MINUTES,
  OET_SUBTEST_PART_TASK_COUNTS,
  OET_SUBTEST_TASK_COUNTS,
  OET_WRITTEN_BLOCK_MINUTES,
  oetMockDurationMinutes,
  oetMockTaskCount,
  hasOetPartBlueprint,
} from '../src/lib/oetExamTiming';
import { buildMockSession } from '../src/lib/sessionBuilder';
import { oetResponseMode } from '../src/lib/oetResponseMode';
import type { OetSubtest } from '../src/types';
import type { OetSessionStage } from '../src/types/session';

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
assert.deepEqual(
  OET_SUBTEST_PART_TASK_COUNTS,
  {
    listening: { A: 24, B: 6, C: 12 },
    reading: { A: 20, B: 6, C: 16 },
  },
  'Listening or Reading part blueprint has drifted',
);
assert.equal(OET_WRITTEN_BLOCK_MINUTES, 145, 'Written block must remain 145 minutes');
assert.equal(OET_FULL_TEST_MINUTES, 165, 'Full test content time must remain 165 minutes');

for (const subtest of subtests) {
  const minimumBankSize = officialTaskCounts[subtest] + minimumReserveTasks;
  assert.ok(
    bankBySubtest[subtest].length >= minimumBankSize,
    `${subtest} bank has ${bankBySubtest[subtest].length} task(s); a full blueprint plus ${minimumReserveTasks} reserve tasks requires ${minimumBankSize}`,
  );
}

for (const subtest of subtests.filter(hasOetPartBlueprint)) {
  for (const part of OET_PARTS) {
    const partCount = bankBySubtest[subtest].filter((task) => oetTaskPart(task) === part).length;
    const minimumPartBankSize = OET_SUBTEST_PART_TASK_COUNTS[subtest][part] + minimumReserveTasks;
    assert.ok(
      partCount >= minimumPartBankSize,
      `${subtest} Part ${part} has ${partCount} task(s); its official quota plus reserve requires ${minimumPartBankSize}`,
    );
  }
}
const readingPartABank = bankBySubtest.reading.filter((task) => oetTaskPart(task) === 'A');
assert.ok(
  readingPartABank.filter((task) => !isReadingPartAShortAnswer(task)).length >= 10,
  'Reading Part A needs seven matching tasks plus three reserves',
);
assert.ok(
  readingPartABank.filter(isReadingPartAShortAnswer).length >= 16,
  'Reading Part A needs thirteen short-answer tasks plus three reserves',
);

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
  assert.ok(session.stages?.length, `${exam.id} is missing its locked OET phase sequence`);
  assert.equal(
    session.stages?.reduce((sum, stage) => sum + stage.durationSeconds, 0),
    session.durationMinutes * 60,
    `${exam.id} phase clocks do not add up to the published component time`,
  );
  assert.equal(
    session.tasks.some((task) => task.subtest === 'break'),
    false,
    `${exam.id} contains a fabricated scored-block break`,
  );

  for (const subtest of exam.subtests) {
    assert.equal(
      contentTasks.filter((task) => task.subtest === subtest).length,
      officialTaskCounts[subtest],
      `${exam.id} does not contain the full ${subtest} blueprint`,
    );
    if (hasOetPartBlueprint(subtest)) {
      const subtestTasks = contentTasks.filter((task) => task.subtest === subtest);
      for (const part of OET_PARTS) {
        assert.equal(
          subtestTasks.filter((task) => oetTaskPart(task) === part).length,
          OET_SUBTEST_PART_TASK_COUNTS[subtest][part],
          `${exam.id} has the wrong ${subtest} Part ${part} count`,
        );
      }
      const actualPartOrder = subtestTasks.map(oetTaskPart);
      const expectedPartOrder = OET_PARTS.flatMap((part) =>
        Array.from({ length: OET_SUBTEST_PART_TASK_COUNTS[subtest][part] }, () => part),
      );
      assert.deepEqual(
        actualPartOrder,
        expectedPartOrder,
        `${exam.id} does not present ${subtest} Parts A, B and C in exam order`,
      );
      if (subtest === 'reading') {
        const partA = subtestTasks.filter((task) => oetTaskPart(task) === 'A');
        assert.equal(
          partA.filter((task) => !isReadingPartAShortAnswer(task)).length,
          7,
          `${exam.id} Reading Part A needs seven text-matching questions`,
        );
        assert.equal(
          partA.filter(isReadingPartAShortAnswer).length,
          13,
          `${exam.id} Reading Part A needs thirteen produced short answers`,
        );
        assert.ok(
          partA.slice(0, 7).every((task) => !isReadingPartAShortAnswer(task)) &&
            partA.slice(7).every(isReadingPartAShortAnswer),
          `${exam.id} Reading Part A response modes are out of official order`,
        );
        assert.equal(
          new Set(partA.map((task) => task.readingPassageTitle)).size,
          1,
          `${exam.id} Reading Part A must use one shared four-text booklet`,
        );
        assert.ok(
          partA.slice(0, 7).every((task) => task.options?.length === 4),
          `${exam.id} Reading Part A matching questions must offer Texts A-D`,
        );

        const partB = subtestTasks.filter((task) => oetTaskPart(task) === 'B');
        assert.ok(
          partB.every((task) => task.options?.length === 3),
          `${exam.id} Reading Part B must use three-option questions`,
        );
        const partC = subtestTasks.filter((task) => oetTaskPart(task) === 'C');
        const partCTextCounts = new Map<string, number>();
        for (const task of partC) {
          const title = task.readingPassageTitle ?? '';
          partCTextCounts.set(title, (partCTextCounts.get(title) ?? 0) + 1);
        }
        assert.deepEqual(
          [...partCTextCounts.values()].sort((a, b) => a - b),
          [8, 8],
          `${exam.id} Reading Part C must use two texts with eight questions each`,
        );
        assert.ok(
          partC.every((task) => task.options?.length === 4),
          `${exam.id} Reading Part C must use four-option questions`,
        );
      } else {
        const partA = subtestTasks.filter((task) => oetTaskPart(task) === 'A');
        const partB = subtestTasks.filter((task) => oetTaskPart(task) === 'B');
        const partC = subtestTasks.filter((task) => oetTaskPart(task) === 'C');
        assert.ok(
          partA.every((task) => oetResponseMode(task) === 'short-text'),
          `${exam.id} Listening Part A must use note completion`,
        );
        assert.ok(
          [...partB, ...partC].every(
            (task) => oetResponseMode(task) === 'single-choice' && task.options?.length === 3,
          ),
          `${exam.id} Listening Parts B/C must use three-option questions`,
        );
        assert.ok(
          [...partB, ...partC].every(
            (task) => !/^\s*Complete:/i.test(task.prompt ?? ''),
          ),
          `${exam.id} Listening Parts B/C must test gist, purpose or inference rather than note completion`,
        );
      }
    }

    const allStages: OetSessionStage[] = session.stages ?? [];
    const subtestStages: OetSessionStage[] = allStages.filter(
      (stage: OetSessionStage) => stage.subtest === subtest,
    );
    if (subtest === 'listening') {
      assert.deepEqual(
        subtestStages.map((stage) => stage.durationSeconds),
        [OET_MOCK_STAGE_SECONDS.listening],
        `${exam.id} has incorrect Listening phase timing`,
      );
    } else if (subtest === 'reading') {
      assert.deepEqual(
        subtestStages.map((stage) => stage.durationSeconds),
        [OET_MOCK_STAGE_SECONDS.readingPartA, OET_MOCK_STAGE_SECONDS.readingPartsBC],
        `${exam.id} has incorrect Reading phase timing`,
      );
    } else if (subtest === 'writing') {
      assert.deepEqual(
        subtestStages.map((stage) => stage.durationSeconds),
        [OET_MOCK_STAGE_SECONDS.writingReading, OET_MOCK_STAGE_SECONDS.writingResponse],
        `${exam.id} has incorrect Writing phase timing`,
      );
      assert.deepEqual(
        subtestStages[0]?.taskIds,
        subtestStages[1]?.taskIds,
        `${exam.id} must show the same Writing paper before and after typing unlocks`,
      );
    } else {
      assert.deepEqual(
        subtestStages.map((stage) => stage.durationSeconds),
        [
          OET_MOCK_STAGE_SECONDS.speakingWarmup,
          OET_MOCK_STAGE_SECONDS.speakingPreparation,
          OET_MOCK_STAGE_SECONDS.speakingRoleplay,
          OET_MOCK_STAGE_SECONDS.speakingPreparation,
          OET_MOCK_STAGE_SECONDS.speakingRoleplay,
        ],
        `${exam.id} has incorrect Speaking preparation/role-play timing`,
      );
    }
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
