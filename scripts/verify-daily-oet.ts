import { dailyOetProgression } from '../src/data/dailyOetProgression';
import { bankBySubtest } from '../src/data/sessionTaskBank';
import type { OetSubtest } from '../src/types';
import type { SessionTask } from '../src/types/session';

const SUBTESTS: readonly OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const seenTaskIds = new Set<string>();
let previousDate = '';
let previousComplexityIndex = 0;

function fail(message: string): never {
  throw new Error(`Daily OET progression failed: ${message}`);
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function requireSingleCorrectOption(task: SessionTask): void {
  if (!task.options || task.options.length < 3) fail(`${task.id} needs at least three options`);
  const correctCount = task.options.filter((option) => option.correct).length;
  if (correctCount !== 1) fail(`${task.id} must have exactly one correct option`);
  if (task.options.some((option) => !option.explanation?.trim())) {
    fail(`${task.id} needs an explanation for every option`);
  }
}

for (const [index, entry] of dailyOetProgression.entries()) {
  if (entry.stage !== index + 1) fail(`stage ${entry.stage} is out of sequence`);
  if (entry.complexityIndex !== entry.stage) {
    fail(`stage ${entry.stage} has complexity index ${entry.complexityIndex}`);
  }
  if (entry.complexityIndex <= previousComplexityIndex) {
    fail(`stage ${entry.stage} is not harder than the previous progression stage`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) fail(`${entry.date} is not an ISO date`);
  if (entry.date < previousDate) fail(`${entry.date} is earlier than ${previousDate}`);
  if (entry.level !== 'advanced') fail(`${entry.date} is not advanced`);
  if (entry.focus.trim().length < 80) fail(`${entry.date} needs a specific progression focus`);
  previousDate = entry.date;
  previousComplexityIndex = entry.complexityIndex;

  for (const subtest of SUBTESTS) {
    const taskId = entry.taskIds[subtest];
    if (!taskId) fail(`${entry.date} is missing ${subtest}`);
    if (seenTaskIds.has(taskId)) fail(`${taskId} is reused in the progression ledger`);
    seenTaskIds.add(taskId);

    const task = bankBySubtest[subtest].find((candidate) => candidate.id === taskId);
    if (!task) fail(`${taskId} is not in the live ${subtest} bank`);
    if (task.subtest !== subtest) fail(`${taskId} is filed under the wrong sub-test`);
    if (task.difficulty !== 'advanced') fail(`${taskId} is not advanced`);
    if (!task.instructions.includes('Advanced standard:')) {
      fail(`${taskId} is missing the Grade A challenge brief`);
    }

    if (subtest === 'listening') {
      requireSingleCorrectOption(task);
      if (!task.audioSrc || !task.audioTranscript || !task.audioRevision) {
        fail(`${taskId} is missing question-matched audio metadata`);
      }
      if (!task.audioEvidenceTerms || task.audioEvidenceTerms.length < 3) {
        fail(`${taskId} needs at least three audio evidence terms`);
      }
    }

    if (subtest === 'reading') {
      requireSingleCorrectOption(task);
      if (!task.readingPassage || wordCount(task.readingPassage) < 180) {
        fail(`${taskId} needs a substantial Part C passage`);
      }
    }

    if (subtest === 'writing') {
      if (!task.modelAnswer) fail(`${taskId} needs a complete model answer`);
      const words = wordCount(task.modelAnswer);
      if (words < 180 || words > 200) {
        fail(`${taskId} model answer must be 180–200 words; found ${words}`);
      }
      if (!task.rubricChecklist || task.rubricChecklist.length < 6) {
        fail(`${taskId} needs all six writing rubric dimensions`);
      }
    }

    if (subtest === 'speaking') {
      const criteria = task.speakingCriteria;
      if (!criteria) fail(`${taskId} needs speaking criteria`);
      if (criteria.expectedKeywords.length < 8 || criteria.samplePhrases.length < 3) {
        fail(`${taskId} needs richer language evidence and model phrases`);
      }
      const weights = criteria.dimensionWeights;
      if (!weights) fail(`${taskId} needs dimension weights`);
      const total = weights.communication + weights.clinicalCommunication + weights.language;
      if (Math.abs(total - 1) > Number.EPSILON) fail(`${taskId} weights must total 1`);
    }
  }
}

console.log(
  `Verified ${dailyOetProgression.length} increasingly difficult daily OET stage(s), ${seenTaskIds.size} advanced tasks, and balanced four-subtest coverage.`,
);
