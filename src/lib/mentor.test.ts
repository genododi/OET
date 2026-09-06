import { describe, expect, it } from 'vitest';
import { bankBySubtest } from '../data/sessionTaskBank';
import { mentorCurriculum } from '../data/mentorCurriculum';
import { buildMentorSystemPrompt, guidedMentorReply, type MentorContext } from './mentor';
import { readMentorLessons, saveMentorLesson } from './mentorMemory';
import { buildTaskStats, summarizeSubtestHistory } from './taskHistory';
import type { CompletedSession } from '../types/session';

const task = { ...bankBySubtest.listening[0], audioTranscript: 'SECRET_AUDIO_EVIDENCE', explanation: 'SECRET_EXPLANATION' };
const context: MentorContext = { task, response: '', action: 'hint', hintLevel: 1, learnerMemory: '', messages: [{ id: 'q', role: 'user', text: 'Help me' }] };

describe('task-grounded mentoring', () => {
  it('withholds keys, transcripts and worked examples before an attempt', () => {
    const prompt = buildMentorSystemPrompt(context);
    expect(prompt).not.toContain('SECRET_AUDIO_EVIDENCE');
    expect(prompt).not.toContain('SECRET_EXPLANATION');
    expect(prompt).not.toContain('"correct":true');
    expect(prompt).toContain('Teach in English only');
    expect(prompt).toContain('Do not reveal the answer');
  });
  it('includes exact evidence when the learner requests a review after attempting', () => {
    const prompt = buildMentorSystemPrompt({ ...context, action: 'feedback', response: task.options![0].id });
    expect(prompt).toContain('SECRET_AUDIO_EVIDENCE');
    expect(prompt).toContain('SECRET_EXPLANATION');
    expect(prompt).toContain('"correct":true');
  });
  it('does not let a patient turn or generic hint unlock answer evidence', () => {
    expect(buildMentorSystemPrompt({ ...context, response: 'My attempt', action: 'patient' })).not.toContain('SECRET_AUDIO_EVIDENCE');
    expect(buildMentorSystemPrompt({ ...context, action: 'explain' })).not.toContain('SECRET_EXPLANATION');
  });
  it('has a real source task for each of the fourteen lesson paths', () => {
    expect(mentorCurriculum).toHaveLength(14);
    for (const topic of mentorCurriculum) {
      expect(bankBySubtest[topic.subtest].length).toBeGreaterThan(0);
      expect(topic.steps).toHaveLength(3);
      expect(topic.checkpoint.endsWith('?')).toBe(true);
    }
  });
  it('gives progressive hints and refuses to fabricate a review without an answer', () => {
    expect(guidedMentorReply(context)).not.toEqual(guidedMentorReply({ ...context, hintLevel: 2 }));
    expect(guidedMentorReply({ ...context, action: 'feedback' })).toContain('first attempt');
    expect(guidedMentorReply({ ...context, action: 'feedback', response: task.options!.find((option) => option.correct)!.id })).toContain('Your answer is correct');
  });
});

describe('mentor memory and independent readiness', () => {
  it('bounds stored lesson history and preserves the current draft', () => {
    for (let index = 0; index < 15; index++) saveMentorLesson(`lesson-${index}`, { response: `draft ${index}`, updatedAt: new Date(2026, 0, index + 1).toISOString(), messages: [] });
    const saved = readMentorLessons();
    expect(Object.keys(saved)).toHaveLength(12);
    expect(saved['lesson-14'].response).toBe('draft 14');
    expect(saved['lesson-0']).toBeUndefined();
  });
  it('does not treat assisted correct answers as independent evidence or extend the recall schedule', () => {
    const failed: CompletedSession = { id: 'first', kind: 'practice', title: 'Attempt', completedAt: '2026-09-01T00:00:00Z', durationMinutes: 20,
      review: { overallPercent: 0, overallPracticePass: false, overallExamReady: false, weakAreas: [], subtestScores: [{ subtest: 'reading', percentScore: 0, total: 10, correct: 0, practicePass: false, examReady: false, weakAreas: [] }], taskReviews: [{ taskId: 'read-7', subtest: 'reading', passed: false, scorePercent: 0, summary: 'Wrong' }] } };
    const assisted: CompletedSession = { ...failed, id: 'helped', coached: true, completedAt: '2026-09-02T00:00:00Z', review: { ...failed.review!, subtestScores: [{ ...failed.review!.subtestScores[0], percentScore: 100 }], taskReviews: [{ ...failed.review!.taskReviews[0], passed: true, scorePercent: 100 }] } };
    expect(buildTaskStats([failed, assisted]).get('read-7')).toMatchObject({ lastPassed: false, dueForReview: true, consecutivePasses: 0 });
    expect(summarizeSubtestHistory([assisted], ['reading'])[0]).toMatchObject({ attemptCount: 0, unqualifiedAttemptCount: 1, rollingPercent: null });
  });
});
