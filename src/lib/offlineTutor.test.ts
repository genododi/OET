import { describe, expect, it } from 'vitest';
import type { SessionTask } from '../types/session';
import { buildOfflineSpeakingFeedback, buildOfflineWritingFeedback } from './offlineTutor';

const writingTask: SessionTask = {
  id: 'writing-test',
  subtest: 'writing',
  title: 'Referral letter',
  instructions: 'Write a referral letter.',
  writingCriteria: { requiredConceptGroups: [['diabetes'], ['urgent review']] },
};

const speakingTask: SessionTask = {
  id: 'speaking-test',
  subtest: 'speaking',
  title: 'Explain treatment',
  instructions: 'Speak with the patient.',
  speakingCriteria: {
    expectedKeywords: ['treatment', 'side effects'],
    checklist: ['Empathy', 'Check understanding', 'Safety-net advice'],
    samplePhrases: ['I understand this may be worrying.'],
  },
};

describe('offline hybrid tutor', () => {
  it('returns deterministic writing corrections without a provider key', () => {
    const result = buildOfflineWritingFeedback(writingTask, 'Dear Dr Lee,\n\nI am writing to refer this patient with diabetes for urgent review.\n\nYours sincerely');
    expect(result.provider).toBe('offline-rubric');
    expect(result.rubricScores).toHaveLength(6);
    expect(result.disclaimer).toContain('not an official OET score');
  });

  it('labels typed speaking evidence as non-qualifying and assigns a next drill', () => {
    const result = buildOfflineSpeakingFeedback(speakingTask, 'I understand you are worried. I will explain the treatment and side effects. Can you tell me if that makes sense?');
    expect(result.provider).toBe('offline-rubric');
    expect(result.nextDrill.length).toBeGreaterThan(10);
    expect(result.disclaimer).toContain('Typed transcripts');
  });

  it('recognises referring as an explicit purpose and explains limited short-draft evidence', () => {
    const result = buildOfflineWritingFeedback(writingTask, 'Dear Dr Lee, I am referring Mr Adams with diabetes for urgent review. Yours sincerely, Doctor.');
    expect(result.rubricScores.find((score) => score.dimension === 'Purpose')?.score).toBeGreaterThanOrEqual(75);
    expect(result.improvements.join(' ')).not.toContain('Missing explicit purpose');
    expect(result.improvements.join(' ')).toContain('limited evidence');
    expect(result.nextDrill).toContain('Do not add invented facts');
  });
});
