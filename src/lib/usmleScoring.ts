import type { SessionTask } from '../types/session';

export interface UsmleScoreEstimate {
  percentCorrect: number;
  correct: number;
  total: number;
  estimatedThreeDigitScore: number | null;
  passed: boolean;
  disciplineBreakdown: UsmleDisciplineScore[];
}

export interface UsmleDisciplineScore {
  discipline: string;
  correct: number;
  total: number;
  percentCorrect: number;
}

const PASS_THRESHOLDS: Record<string, number> = {
  step1: 60,
  step2: 62,
  step3: 60,
};

export function computeUsmleScore(
  tasks: SessionTask[],
  answers: Record<string, string>,
): UsmleScoreEstimate {
  const answered = tasks.filter((t) => t.options?.length && answers[t.id] != null);
  const correct = answered.filter((t) => {
    const selected = answers[t.id];
    const right = t.options?.find((o) => o.correct);
    return selected && right && selected === right.id;
  });
  const total = answered.length;
  const percentCorrect = total > 0 ? Math.round((correct.length / total) * 100) : 0;

  const step = tasks.find((t) => t.usmleStep)?.usmleStep;
  const threshold = step ? PASS_THRESHOLDS[step] ?? 60 : 60;
  const passed = percentCorrect >= threshold;

  const estimatedThreeDigitScore = estimateThreeDigitScore(percentCorrect, step ?? null);

  const disciplineScores = computeDisciplineBreakdown(tasks, answers);

  return {
    percentCorrect,
    correct: correct.length,
    total,
    estimatedThreeDigitScore,
    passed,
    disciplineBreakdown: disciplineScores,
  };
}

function estimateThreeDigitScore(percentCorrect: number, step: string | null): number | null {
  if (step === 'step1') {
    return Math.round(150 + percentCorrect * 0.8);
  }
  if (step === 'step2') {
    return Math.round(130 + percentCorrect * 1.2);
  }
  if (step === 'step3') {
    return Math.round(100 + percentCorrect * 1.5);
  }
  return null;
}

function computeDisciplineBreakdown(
  tasks: SessionTask[],
  answers: Record<string, string>,
): UsmleDisciplineScore[] {
  const byDiscipline = new Map<string, { correct: number; total: number }>();

  tasks.forEach((t) => {
    if (!t.options?.length || !t.usmleDiscipline) return;
    const entry = byDiscipline.get(t.usmleDiscipline) ?? { correct: 0, total: 0 };
    entry.total += 1;
    const selected = answers[t.id];
    const right = t.options.find((o) => o.correct);
    if (selected && right && selected === right.id) {
      entry.correct += 1;
    }
    byDiscipline.set(t.usmleDiscipline, entry);
  });

  return [...byDiscipline.entries()]
    .map(([discipline, { correct, total }]) => ({
      discipline,
      correct,
      total,
      percentCorrect: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.percentCorrect - b.percentCorrect);
}
