import { describe, expect, it } from 'vitest';
import type { OetSubtest } from '../types';
import { evaluateWritingDraft } from '../lib/oetScoring';
import { GRADE_A_TRAINING_TARGETS } from '../lib/oetThresholds';
import { buildLatestDailyChallengeSession, countContentTasks } from '../lib/sessionBuilder';
import { dailyOetProgression } from './dailyOetProgression';
import { bankBySubtest } from './sessionTaskBank';

const subtests: readonly OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const latestStage = dailyOetProgression.at(-1)!;
const latestTasks = Object.fromEntries(
  subtests.map((subtest) => [
    subtest,
    bankBySubtest[subtest].find((task) => task.id === latestStage.taskIds[subtest])!,
  ]),
) as Record<OetSubtest, (typeof bankBySubtest)[OetSubtest][number]>;

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

describe('latest daily OET progression stage', () => {
  it('adds one distinct advanced physician task for every sub-test', () => {
    expect(latestStage).toMatchObject({
      date: '2026-08-28',
      stage: 15,
      complexityIndex: 15,
      level: 'advanced',
    });
    expect(new Set(Object.values(latestStage.taskIds)).size).toBe(4);

    subtests.forEach((subtest) => {
      expect(latestTasks[subtest]).toBeDefined();
      expect(latestTasks[subtest].difficulty).toBe('advanced');
      expect(latestTasks[subtest].instructions).toContain('Advanced standard:');
    });
  });

  it('makes the latest balanced stage directly launchable as a compact drill', () => {
    const session = buildLatestDailyChallengeSession();

    expect(session).toMatchObject({
      id: 'daily-stage-15',
      title: 'Daily Grade A Challenge · Stage 15',
      durationMinutes: 60,
      subtests,
    });
    expect(countContentTasks(session.tasks)).toBe(4);
    expect(session.tasks.slice(1).map((task) => task.id)).toEqual(
      subtests.map((subtest) => `daily-stage-15-${latestStage.taskIds[subtest]}`),
    );
    expect(session.tasks[0]?.checklist).toContain(
      'This compact challenge is a drill; use qualifying sets for Grade A readiness evidence',
    );
  });

  it('keeps the Listening answer key audible and the Reading distractors singular', () => {
    const listening = latestTasks.listening;
    const transcript = normalized(listening.audioTranscript ?? '');
    expect(listening.audioEvidenceTerms).toHaveLength(3);
    listening.audioEvidenceTerms?.forEach((term) => {
      expect(transcript).toContain(normalized(term));
    });
    expect(listening.options?.filter((option) => option.correct)).toHaveLength(1);

    const reading = latestTasks.reading;
    expect(reading.readingPassage?.trim().split(/\s+/).length).toBeGreaterThanOrEqual(350);
    expect(reading.options?.filter((option) => option.correct)).toHaveLength(1);
    expect(reading.options?.every((option) => Boolean(option.explanation?.trim()))).toBe(true);
  });

  it('provides a complete clinically selective Writing model above the internal target', () => {
    const writing = latestTasks.writing;
    const evaluation = evaluateWritingDraft(writing, writing.modelAnswer ?? '');
    const content = evaluation.rubricScores.find((score) => score.dimension === 'Content');

    expect(evaluation.evidenceQualified).toBe(true);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(GRADE_A_TRAINING_TARGETS.writing);
    expect(content?.score).toBeGreaterThanOrEqual(90);
    expect(evaluation.gaps.join(' ')).not.toContain('irrelevant case-note detail');
  });

  it('requires substantial patient-centred evidence in the Speaking role-play', () => {
    const criteria = latestTasks.speaking.speakingCriteria!;
    expect(criteria.expectedKeywords.length).toBeGreaterThanOrEqual(15);
    expect(criteria.checklist).toHaveLength(5);
    expect(criteria.samplePhrases).toHaveLength(5);
    expect(
      criteria.dimensionWeights!.communication +
        criteria.dimensionWeights!.clinicalCommunication +
        criteria.dimensionWeights!.language,
    ).toBeCloseTo(1);
  });
});
