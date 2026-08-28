import { describe, expect, it } from 'vitest';
import type { SessionTask } from '../types/session';
import {
  computeSessionReview,
  evaluateSpeakingForOet,
  evaluateWritingDraft,
} from './oetScoring';

const writingTask: SessionTask = {
  id: 'criterion-write-1',
  subtest: 'writing',
  title: 'Urgent referral',
  instructions: 'Write 180–200 words.',
  writingCriteria: {
    requiredConceptGroups: [['sepsis'], ['urgent transfer'], ['antibiotics']],
  },
};

const speakingTask: SessionTask = {
  id: 'criterion-speak-1',
  subtest: 'speaking',
  title: 'Explain urgent treatment',
  instructions: 'Respond to the patient.',
  speakingCriteria: {
    expectedKeywords: ['treatment', 'risk', 'urgent'],
    checklist: ['Acknowledge concern', 'Explain the plan', 'Check understanding'],
    samplePhrases: [],
  },
};

describe('criterion evidence persistence', () => {
  it('keeps a short keyword-dense letter below qualified Grade A evidence', () => {
    const shortRelevantDraft = `Dear Dr Lee,

I am writing to request urgent transfer of this patient with sepsis. Antibiotics have commenced. The patient remains hypotensive and requires immediate specialist assessment, monitoring, and ongoing treatment.

Current observations show fever, tachycardia, and worsening clinical status. Please arrange urgent transfer today and continue antibiotics while the receiving team prepares definitive management.

Please contact me if further information is required.

Yours sincerely,

Dr Khan`;
    const evaluation = evaluateWritingDraft(writingTask, shortRelevantDraft);

    expect(evaluation.wordCount).toBeLessThan(180);
    expect(evaluation.evidenceQualified).toBe(false);
    expect(evaluation.overallScore).toBe(84);
    expect(evaluation.examReady).toBe(false);
    expect(evaluation.gaps).toContainEqual(expect.stringContaining('180–200-word'));
  });

  it('records all six writing rubric dimensions in the task review', () => {
    const draft = `Dear Dr Lee,

I am writing to request urgent transfer of this patient with sepsis. Antibiotics have commenced and specialist treatment is required. The patient remains unwell and needs ongoing monitoring and review.

Please contact me if further information is required.

Yours sincerely,

Dr Khan`;
    const review = computeSessionReview(
      { tasks: [writingTask], subtests: ['writing'] },
      {},
      { [writingTask.id]: draft },
      {},
    );
    const snapshot = review.taskReviews[0]!;
    expect(snapshot.criteriaScores?.map((score) => score.criterion)).toEqual([
      'Purpose',
      'Content',
      'Conciseness & Clarity',
      'Genre',
      'Organisation',
      'Language',
    ]);
  });

  it('marks typed speaking dimensions as non-qualifying evidence', () => {
    const speakingResult = evaluateSpeakingForOet(
      'I understand you are concerned. I will explain the urgent treatment and risk. Can you tell me whether the plan makes sense?',
      60,
      speakingTask.speakingCriteria!,
      true,
    );
    const review = computeSessionReview(
      { tasks: [speakingTask], subtests: ['speaking'] },
      {},
      {},
      { [speakingTask.id]: speakingResult },
    );
    expect(review.taskReviews[0]).toMatchObject({
      evidenceQualified: false,
      criteriaScores: [
        { criterion: 'Relationship & structure' },
        { criterion: 'Clinical communication' },
        { criterion: 'Language & pace' },
      ],
    });
  });

  it('does not mark a two-role-play set ready when only one recording qualifies', () => {
    const secondSpeakingTask: SessionTask = {
      ...speakingTask,
      id: 'criterion-speak-2',
      title: 'Explain follow-up care',
    };
    const strongTranscript = Array(6)
      .fill(
        'I understand your concern. I will explain the urgent treatment and risk, check your understanding, answer your questions, and help you follow the plan safely.',
      )
      .join(' ');
    const firstResult = evaluateSpeakingForOet(
      strongTranscript,
      120,
      speakingTask.speakingCriteria!,
      false,
    );
    const review = computeSessionReview(
      { tasks: [speakingTask, secondSpeakingTask], subtests: ['speaking'] },
      {},
      {},
      { [speakingTask.id]: firstResult },
    );

    expect(firstResult.evidenceQualified).toBe(true);
    expect(review.subtestScores[0]).toMatchObject({
      examReady: false,
      weakAreas: ['Speaking: complete both role-plays with sufficient recordings'],
    });
    expect(review.overallExamReady).toBe(false);
  });
});
