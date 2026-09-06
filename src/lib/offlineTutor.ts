import type { TutorFeedback } from '../types';
import type { SessionTask } from '../types/session';
import { evaluateWritingDraft } from './oetScoring';
import { evaluateSpeakingResponse } from './speakingEvaluation';

const DISCLAIMER =
  'Coaching estimate only - this is not an official OET score and should be used with the published assessment criteria.';

function gradeFromPercent(score: number): string {
  if (score >= 90) return 'A-range practice signal';
  if (score >= 70) return 'B-range practice signal';
  if (score >= 60) return 'C+ practice signal';
  return 'Developing';
}

export function buildOfflineWritingFeedback(task: SessionTask, draft: string): TutorFeedback {
  const result = evaluateWritingDraft(task, draft);
  const strengths = result.rubricScores
    .filter((score) => score.score >= 75)
    .slice(0, 3)
    .map((score) => `${score.dimension}: ${score.feedback}`);
  const improvements = result.gaps.slice(0, 4);
  return {
    provider: 'offline-rubric',
    estimatedGrade: gradeFromPercent(result.overallScore),
    rubricScores: result.rubricScores.map((score) => ({
      dimension: score.dimension,
      score: score.score,
      evidence: score.feedback,
    })),
    strengths: strengths.length > 0 ? strengths : ['A complete draft is available for structured review.'],
    improvements: improvements.length > 0 ? improvements : ['Compare the final letter against the task-specific model points.'],
    nextDrill:
      result.wordCount < 180 || result.wordCount > 200
        ? `Your draft has ${result.wordCount} words. For a complete letter, aim for approximately 180–200 words using relevant supplied case notes. Do not add invented facts or padding to reach the target.`
        : 'Rewrite the weakest paragraph using one purpose-critical point per sentence.',
    disclaimer: DISCLAIMER,
  };
}

export function buildOfflineSpeakingFeedback(task: SessionTask, transcript: string): TutorFeedback {
  const criteria = task.speakingCriteria ?? {
    expectedKeywords: ['understand', 'explain', 'help'],
    checklist: ['Empathy', 'Plain language', 'Check understanding', 'Safety-net advice'],
    samplePhrases: [],
  };
  const estimatedSeconds = Math.max(30, Math.round(transcript.trim().split(/\s+/).length / 1.8));
  const result = evaluateSpeakingResponse(transcript, estimatedSeconds, criteria, true);
  const dimensions = [
    ['Relationship and structure', result.dimensions.communication],
    ['Clinical communication', result.dimensions.clinicalCommunication],
    ['Language and pace', result.dimensions.language],
  ] as const;
  return {
    provider: 'offline-rubric',
    estimatedGrade: gradeFromPercent(result.score),
    rubricScores: dimensions.map(([dimension, score]) => ({
      dimension,
      score,
      evidence: result.suggestion,
    })),
    strengths: result.matchedChecklist.length > 0
      ? result.matchedChecklist.slice(0, 3).map((item) => `Covered: ${item}`)
      : ['The response can now be compared against the role-play checklist.'],
    improvements: [
      ...result.missingChecklist.slice(0, 3),
      ...result.missingKeywords.slice(0, 2).map((keyword) => `Include or explain: ${keyword}`),
    ],
    nextDrill: result.suggestion,
    disclaimer: `${DISCLAIMER} Typed transcripts cannot qualify as recorded speaking evidence.`,
  };
}
