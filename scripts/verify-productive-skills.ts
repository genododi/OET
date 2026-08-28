import assert from 'node:assert/strict';
import { dailyOetProgression } from '../src/data/dailyOetProgression';
import { bankBySubtest } from '../src/data/sessionTaskBank';
import { evaluateWritingDraft } from '../src/lib/oetScoring';
import { evaluateSpeakingResponse } from '../src/lib/speakingEvaluation';
import { GRADE_A_TRAINING_TARGETS } from '../src/lib/oetThresholds';

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

for (const task of bankBySubtest.writing) {
  assert.ok(task.writingCriteria?.requiredConceptGroups.length, `${task.id} lacks content criteria`);
}

for (const stage of dailyOetProgression) {
  const task = bankBySubtest.writing.find((candidate) => candidate.id === stage.taskIds.writing);
  assert.ok(task?.modelAnswer, `${stage.taskIds.writing} lacks a model answer`);
  const evaluation = evaluateWritingDraft(task, task.modelAnswer);
  const content = evaluation.rubricScores.find((score) => score.dimension === 'Content');
  assert.ok(
    evaluation.overallScore >= GRADE_A_TRAINING_TARGETS.writing,
    `${task.id} model answer does not clear the internal Grade A target`,
  );
  assert.ok(evaluation.evidenceQualified, `${task.id} model is outside 180–200 words`);
  assert.ok(content && content.score >= 90, `${task.id} model omits required clinical evidence`);
}

const latestWriting = bankBySubtest.writing.find((task) => task.id === 'write-37');
assert.ok(latestWriting, 'write-37 is missing');

const draftStart = 'Dear Dr Stone,\n\nI am writing to refer Mr Taylor for a routine review.\n\n';
const genericSentence =
  'The consultation reviewed general wellbeing, daily routines, social support, diet and exercise. ';
const draftEnd = '\n\nPlease contact me if further information is required.\n\nYours sincerely,\n\nDr Test';
let genericBody = genericSentence.repeat(12);
let irrelevantDraft = `${draftStart}${genericBody}${draftEnd}`;
const paddingWords = ['General', 'wellbeing', 'and', 'routine', 'follow-up', 'were', 'discussed', 'carefully'];
let paddingIndex = 0;
while (wordCount(irrelevantDraft) < 190) {
  genericBody += `${paddingWords[paddingIndex % paddingWords.length]} `;
  paddingIndex += 1;
  irrelevantDraft = `${draftStart}${genericBody}${draftEnd}`;
}

assert.equal(wordCount(irrelevantDraft), 190, 'Adversarial Writing fixture must be exam length');
const irrelevantEvaluation = evaluateWritingDraft(latestWriting, irrelevantDraft);
const irrelevantContent = irrelevantEvaluation.rubricScores.find(
  (score) => score.dimension === 'Content',
);
assert.ok(
  irrelevantEvaluation.overallScore < GRADE_A_TRAINING_TARGETS.writing,
  'A polished but clinically irrelevant letter must not clear the Grade A target',
);
assert.equal(irrelevantEvaluation.examReady, false, 'Irrelevant Writing must not be exam-ready');
assert.ok(irrelevantContent && irrelevantContent.score <= 20, 'Irrelevant Writing content scored too highly');

const contaminatedEvaluation = evaluateWritingDraft(
  latestWriting,
  `${latestWriting.modelAnswer}\nHay fever and weekly football were also noted.`,
);
assert.ok(
  contaminatedEvaluation.gaps.some((gap) => gap.includes('irrelevant case-note detail')),
  'Writing feedback must identify included irrelevant case notes',
);

const latestSpeaking = bankBySubtest.speaking.find((task) => task.id === 'speak-37');
assert.ok(latestSpeaking?.speakingCriteria, 'speak-37 criteria are missing');
const criteria = latestSpeaking.speakingCriteria;
const strongTranscript = [
  'I am sorry this situation conflicts with caring for your spouse, and I understand your concern.',
  ...criteria.checklist,
  ...criteria.expectedKeywords.map((keyword) => `We discussed ${keyword}`),
  'Please tell me what you understand, what questions you have, and which choice feels safest.',
].join('. ');

const recorded = evaluateSpeakingResponse(strongTranscript, 120, criteria, false);
assert.ok(recorded.evidenceQualified, 'A substantial recorded role-play should qualify as evidence');
assert.ok(recorded.examReady, 'A strong recorded role-play should be exam-ready');
assert.ok(
  recorded.score >= GRADE_A_TRAINING_TARGETS.speaking,
  'A strong recorded role-play should clear the internal Grade A target',
);

const typed = evaluateSpeakingResponse(strongTranscript, 120, criteria, true);
assert.equal(typed.evidenceQualified, false, 'Typed fallback must not qualify as Speaking evidence');
assert.equal(typed.examReady, false, 'Typed fallback must not be marked exam-ready');
assert.ok(
  typed.score < GRADE_A_TRAINING_TARGETS.speaking,
  'Typed fallback must not clear the internal Grade A target',
);

const shortRecording = evaluateSpeakingResponse(strongTranscript, 45, criteria, false);
assert.equal(shortRecording.evidenceQualified, false, 'A short recording must not qualify as evidence');
assert.equal(shortRecording.examReady, false, 'A short recording must not be marked exam-ready');
assert.ok(
  shortRecording.score < GRADE_A_TRAINING_TARGETS.speaking,
  'A short recording must not clear the internal Grade A target',
);

console.log(
  `Verified productive-skill safeguards: ${bankBySubtest.writing.length} Writing criteria, clinically relevant Grade A models, and recorded-only Speaking readiness.`,
);
