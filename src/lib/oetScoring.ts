import type { OetSubtest, SubtestType } from '../types';
import type { SessionTask } from '../types/session';
import {
  evaluateSpeakingResponse,
  type SpeakingEvaluationResult,
  type OetSpeakingEvaluation,
} from './speakingEvaluation';
import { OET_THRESHOLDS, getReadinessLevel, readinessLabel } from './oetThresholds';

export { OET_THRESHOLDS, getReadinessLevel, readinessLabel };
export type { ReadinessLevel } from './oetThresholds';

export interface McqEvaluation {
  correct: boolean;
  selectedLabel: string | null;
  correctLabel: string;
  explanation: string;
  optionFeedback: { id: string; label: string; correct: boolean; explanation: string }[];
  perfectAnswerTips: string[];
}

export interface WritingRubricScore {
  dimension: string;
  score: number;
  maxScore: number;
  feedback: string;
  gap?: string;
}

export interface WritingEvaluation {
  overallScore: number;
  wordCount: number;
  rubricScores: WritingRubricScore[];
  gaps: string[];
  modelPoints: string[];
  perfectAnswerTips: string[];
  practicePass: boolean;
  examReady: boolean;
}

export interface SubtestScoreSummary {
  subtest: OetSubtest;
  percentScore: number;
  correct?: number;
  total?: number;
  practicePass: boolean;
  examReady: boolean;
  weakAreas: string[];
}

export interface TaskReviewSnapshot {
  taskId: string;
  subtest: OetSubtest | 'intro' | 'break';
  passed: boolean | null;
  scorePercent: number | null;
  summary: string;
}

export interface SessionReviewSummary {
  subtestScores: SubtestScoreSummary[];
  overallPercent: number;
  overallPracticePass: boolean;
  overallExamReady: boolean;
  weakAreas: string[];
  taskReviews: TaskReviewSnapshot[];
}

const WRITING_DIMENSIONS = [
  'Purpose',
  'Content',
  'Conciseness & Clarity',
  'Genre',
  'Organisation',
  'Language',
] as const;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  const n = normalize(text);
  if (!n) return 0;
  return n.split(' ').filter(Boolean).length;
}

function defaultOptionExplanation(
  optionLabel: string,
  correct: boolean,
  correctLabel: string,
  subtest: OetSubtest,
): string {
  if (correct) {
    return subtest === 'listening'
      ? `"${optionLabel}" matches what was stated in the recording — listen for exact wording, spelling, and tense.`
      : `"${optionLabel}" is fully supported by the passage — eliminate options that are only partially true or outside the text.`;
  }
  return `"${optionLabel}" is incorrect — OET distractors often use partial matches, wrong tense/spelling, or details not stated. The correct answer is "${correctLabel}".`;
}

export function evaluateMcqAnswer(task: SessionTask, userAnswerId: string | undefined): McqEvaluation | null {
  if (!task.options?.length) return null;

  const correctOpt = task.options.find((o) => o.correct);
  if (!correctOpt) return null;

  const selected = task.options.find((o) => o.id === userAnswerId);
  const correct = selected?.correct === true;

  const optionFeedback = task.options.map((opt) => ({
    id: opt.id,
    label: opt.label,
    correct: opt.correct,
    explanation:
      opt.explanation ??
      defaultOptionExplanation(
        opt.label,
        opt.correct,
        correctOpt.label,
        task.subtest as OetSubtest,
      ),
  }));

  const explanation =
    task.explanation ??
    (correct
      ? `Correct. ${correctOpt.explanation ?? `"${correctOpt.label}" is the best-supported answer.`}`
      : `Incorrect. ${selected ? `"${selected.label}" does not match the ${task.subtest === 'listening' ? 'recording' : 'text'}.` : 'No answer selected.'} ${correctOpt.explanation ?? `The correct answer is "${correctOpt.label}".`}`);

  const perfectAnswerTips =
    task.perfectAnswerTips ??
    (task.subtest === 'listening'
      ? [
          'Replay difficult sections — Part A penalises spelling and grammar.',
          'Part B/C: note attitude and purpose, not just keywords.',
          'Write answers exactly as heard for fill-in-the-blank items.',
        ]
      : [
          'Scan the passage for synonyms — OET rarely repeats question wording.',
          'Reject options that are true in general but not in this specific text.',
          'Part A: match headings to paragraph gist, not a single word.',
        ]);

  return {
    correct,
    selectedLabel: selected?.label ?? null,
    correctLabel: correctOpt.label,
    explanation,
    optionFeedback,
    perfectAnswerTips,
  };
}

function scoreWritingDimension(
  dimension: (typeof WRITING_DIMENSIONS)[number],
  text: string,
  task: SessionTask,
): WritingRubricScore {
  const n = normalize(text);
  const words = countWords(text);
  const hasDear = /\bdear\b/.test(n);
  const hasPurpose = /\b(i am writing to|i write to|this letter is to|refer|discharge|transfer|notify)\b/.test(n);
  const hasSignOff = /\b(yours sincerely|yours faithfully|kind regards)\b/.test(n);
  const hasPatientRef = /\b(mr|mrs|ms|patient|aged \d)\b/.test(n);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 8);
  const avgSentenceLen =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + countWords(s), 0) / sentences.length
      : 0;
  const informal = /\b(can't|won't|don't|gonna|okay|hi there)\b/.test(n);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;

  let score = 0;
  let feedback = '';
  let gap: string | undefined;

  switch (dimension) {
    case 'Purpose':
      score = hasPurpose ? 85 : hasDear ? 45 : 15;
      feedback = hasPurpose
        ? 'Opening states the letter purpose (referral, discharge, etc.).'
        : 'State purpose in the first paragraph — e.g. "I am writing to refer…".';
      if (!hasPurpose) gap = 'Missing explicit purpose in opening sentence.';
      break;
    case 'Content':
      score = (hasPatientRef ? 40 : 0) + (words >= 140 ? 35 : words >= 80 ? 20 : 5) + (words <= 230 ? 20 : 5);
      feedback =
        words >= 150 && words <= 210
          ? 'Word count and clinical content appear appropriate.'
          : `Aim for 180–200 words with relevant case-note details only (${words} words now).`;
      if (words < 140 || words > 230) gap = 'Adjust length to 180–200 words with only relevant notes.';
      break;
    case 'Conciseness & Clarity':
      score = avgSentenceLen <= 22 && avgSentenceLen >= 8 ? 80 : avgSentenceLen > 28 ? 40 : 55;
      feedback =
        avgSentenceLen <= 22
          ? 'Sentences are reasonably concise.'
          : 'Break long sentences — one idea per sentence for clarity.';
      if (avgSentenceLen > 28) gap = 'Sentences are too long; split for clarity.';
      break;
    case 'Genre':
      score = (hasDear ? 35 : 0) + (hasSignOff ? 35 : 0) + (informal ? 10 : 30);
      feedback =
        hasDear && hasSignOff
          ? 'Formal letter format with salutation and sign-off.'
          : 'Use formal letter genre: Dear [Title Name], … Yours sincerely/faithfully.';
      if (!hasDear || !hasSignOff) gap = 'Match formal OET letter structure and sign-off.';
      break;
    case 'Organisation':
      score = paragraphs >= 2 ? 80 : paragraphs === 1 && words > 100 ? 55 : 30;
      feedback =
        paragraphs >= 2
          ? 'Multiple paragraphs show logical organisation.'
          : 'Organise into opening (purpose), body (details), closing (action/request).';
      if (paragraphs < 2) gap = 'Use clear paragraph structure.';
      break;
    case 'Language':
      score = informal ? 35 : words >= 50 ? 78 : 25;
      feedback = informal
        ? 'Avoid contractions and informal phrasing in OET writing.'
        : 'Register appears formal and professional.';
      if (informal) gap = 'Use formal register — no contractions or casual phrases.';
      break;
    default:
      score = 50;
      feedback = 'Review this dimension against the model answer.';
  }

  if (task.rubricChecklist) {
    const item = task.rubricChecklist.find((r) => r.dimension === dimension);
    if (item && score < 70) {
      gap = gap ?? item.criterion;
    }
  }

  return { dimension, score, maxScore: 100, feedback, gap };
}

export function evaluateWritingDraft(task: SessionTask, text: string): WritingEvaluation {
  const trimmed = text.trim();
  const rubricScores = WRITING_DIMENSIONS.map((d) => scoreWritingDimension(d, trimmed, task));
  const overallScore = Math.round(
    rubricScores.reduce((sum, r) => sum + r.score, 0) / rubricScores.length,
  );
  const gaps = rubricScores.filter((r) => r.gap).map((r) => `${r.dimension}: ${r.gap}`);
  const modelPoints =
    task.rubricChecklist?.map((r) => `${r.dimension}: ${r.modelPoint}`) ??
    task.checklist?.map((c) => c) ??
    [];
  const perfectAnswerTips = task.perfectAnswerTips ?? [
    'Plan 5 minutes: identify letter type, recipient, and 3–4 key notes.',
    'Transform notes — never copy abbreviations verbatim.',
    'Close with a clear request or offer of further information.',
  ];

  const thresholds = OET_THRESHOLDS.writing;

  return {
    overallScore,
    wordCount: countWords(trimmed),
    rubricScores,
    gaps,
    modelPoints,
    perfectAnswerTips,
    practicePass: overallScore >= thresholds.practicePass,
    examReady: overallScore >= thresholds.examReady,
  };
}

export function evaluateSpeakingForOet(
  transcript: string,
  durationSeconds: number,
  criteria: Parameters<typeof evaluateSpeakingResponse>[2],
  usedFallback = false,
): OetSpeakingEvaluation {
  return evaluateSpeakingResponse(transcript, durationSeconds, criteria, usedFallback);
}

export type { SpeakingEvaluationResult, OetSpeakingEvaluation };

export function computeSubtestScore(
  subtest: OetSubtest,
  tasks: SessionTask[],
  answers: Record<string, string>,
  notes: Record<string, string>,
  speakingResults: Record<string, OetSpeakingEvaluation | SpeakingEvaluationResult>,
): SubtestScoreSummary {
  const subtestTasks = tasks.filter((t) => t.subtest === subtest);
  const mcqTasks = subtestTasks.filter((t) => t.options?.length);
  const writingTasks = subtestTasks.filter((t) => t.subtest === 'writing');
  const speakingTasks = subtestTasks.filter((t) => t.subtest === 'speaking');

  const weakAreas: string[] = [];
  let percentScore = 0;

  if (mcqTasks.length > 0) {
    let correct = 0;
    mcqTasks.forEach((t) => {
      const selected = answers[t.id];
      const right = t.options?.find((o) => o.correct);
      if (selected && right && selected === right.id) correct += 1;
    });
    percentScore = Math.round((correct / mcqTasks.length) * 100);
    if (percentScore < OET_THRESHOLDS[subtest].examReady) {
      weakAreas.push(`${subtest}: MCQ accuracy ${percentScore}%`);
    }
    const thresholds = OET_THRESHOLDS[subtest];
    return {
      subtest,
      percentScore,
      correct,
      total: mcqTasks.length,
      practicePass: percentScore >= thresholds.practicePass,
      examReady: percentScore >= thresholds.examReady,
      weakAreas,
    };
  }

  if (writingTasks.length > 0) {
    const scores = writingTasks.map((t) => evaluateWritingDraft(t, notes[t.id] ?? '').overallScore);
    percentScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    rubricWeakAreas(writingTasks, notes).forEach((w) => weakAreas.push(w));
  } else if (speakingTasks.length > 0) {
    const scores = speakingTasks
      .map((t) => speakingResults[t.id]?.score ?? 0)
      .filter((s) => s > 0);
    percentScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    speakingTasks.forEach((t) => {
      const r = speakingResults[t.id];
      if (r && r.score < OET_THRESHOLDS.speaking.examReady && r.missingChecklist.length > 0) {
        weakAreas.push(`Speaking: ${r.missingChecklist.slice(0, 2).join('; ')}`);
      }
    });
  }

  const thresholds = OET_THRESHOLDS[subtest];
  return {
    subtest,
    percentScore,
    practicePass: percentScore >= thresholds.practicePass,
    examReady: percentScore >= thresholds.examReady,
    weakAreas,
  };
}

function rubricWeakAreas(tasks: SessionTask[], notes: Record<string, string>): string[] {
  const areas: string[] = [];
  tasks.forEach((t) => {
    const evalResult = evaluateWritingDraft(t, notes[t.id] ?? '');
    evalResult.rubricScores
      .filter((r) => r.score < 65)
      .forEach((r) => areas.push(`Writing ${r.dimension}: ${r.gap ?? r.feedback}`));
  });
  return areas.slice(0, 4);
}

export function computeSessionReview(
  config: { tasks: SessionTask[]; subtests: SubtestType[] },
  answers: Record<string, string>,
  notes: Record<string, string>,
  speakingResults: Record<string, OetSpeakingEvaluation | SpeakingEvaluationResult>,
): SessionReviewSummary {
  const oetSubtests = config.subtests.filter((s): s is OetSubtest =>
    s !== 'intro' && s !== 'break' && s !== 'usmle',
  );
  const subtestScores = oetSubtests.map((s) =>
    computeSubtestScore(s, config.tasks, answers, notes, speakingResults),
  );

  const scored = subtestScores.filter((s) => s.percentScore > 0 || s.total);
  const overallPercent =
    scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.percentScore, 0) / scored.length)
      : 0;

  const overallPracticePass = subtestScores.every((s) => s.practicePass || s.percentScore === 0);
  const overallExamReady =
    subtestScores.filter((s) => s.percentScore > 0).every((s) => s.examReady) &&
    subtestScores.some((s) => s.examReady);

  const weakAreas = [...new Set(subtestScores.flatMap((s) => s.weakAreas))].slice(0, 8);

  const taskReviews: TaskReviewSnapshot[] = config.tasks
    .filter((t) => t.subtest !== 'intro' && t.subtest !== 'break')
    .map((t): TaskReviewSnapshot => {
      if (t.options?.length) {
        if (t.subtest === 'listening') {
          const userText = (answers[t.id] ?? '').trim();
          const correctOpt = t.options.find((o) => o.correct);
          const correctLabel = correctOpt?.label ?? '';
          const passed = userText.toLowerCase() === correctLabel.toLowerCase();
          return {
            taskId: t.id,
            subtest: t.subtest as SubtestType,
            passed: userText ? passed : null,
            scorePercent: userText ? (passed ? 100 : 0) : null,
            summary: passed
              ? `Correct — "${userText}"`
              : userText
                ? `Incorrect — you wrote "${userText}", correct is "${correctLabel}"`
                : 'Not attempted',
          } as TaskReviewSnapshot;
        }
        const ev = evaluateMcqAnswer(t, answers[t.id]);
        return {
          taskId: t.id,
          subtest: t.subtest as SubtestType,
          passed: ev?.correct ?? null,
          scorePercent: ev ? (ev.correct ? 100 : 0) : null,
          summary: ev?.explanation ?? 'Not attempted',
        } as TaskReviewSnapshot;
      }
      if (t.subtest === 'writing') {
        const ev = evaluateWritingDraft(t, notes[t.id] ?? '');
        const hasText = (notes[t.id] ?? '').trim().length > 0;
        return {
          taskId: t.id,
          subtest: t.subtest,
          passed: hasText ? ev.practicePass : null,
          scorePercent: hasText ? ev.overallScore : null,
          summary: hasText
            ? `Writing rubric ${ev.overallScore}% — ${ev.gaps[0] ?? 'Review model answer.'}`
            : 'No draft submitted',
        };
      }
      if (t.subtest === 'speaking') {
        const r = speakingResults[t.id];
        return {
          taskId: t.id,
          subtest: t.subtest,
          passed: r ? r.practicePass : null,
          scorePercent: r?.score ?? null,
          summary: r?.suggestion ?? 'Record or type a response to evaluate',
        };
      }
      return {
        taskId: t.id,
        subtest: t.subtest as SubtestType,
        passed: null,
        scorePercent: null,
        summary: '—',
      } as TaskReviewSnapshot;
    });

  return {
    subtestScores,
    overallPercent,
    overallPracticePass,
    overallExamReady,
    weakAreas,
    taskReviews,
  };
}
