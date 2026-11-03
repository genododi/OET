import type { SessionTask } from '../types/session';

export interface UsmleScoreEstimate {
  percentCorrect: number;
  correct: number;
  total: number;
  unanswered: number;
  disciplineBreakdown: UsmleDisciplineScore[];
}

export interface UsmleDisciplineScore {
  discipline: string;
  correct: number;
  total: number;
  percentCorrect: number;
}

export function computeUsmleScore(
  tasks: SessionTask[],
  answers: Record<string, string>,
): UsmleScoreEstimate {
  const scorable = tasks.filter((t) => t.options?.length && t.options.filter(option => option.correct).length === 1);
  const answered = scorable.filter((t) => t.options?.some(option => option.id === answers[t.id]));
  const correct = answered.filter((t) => {
    const selected = answers[t.id];
    const right = t.options?.find((o) => o.correct);
    return selected && right && selected === right.id;
  });
  const total = scorable.length;
  const percentCorrect = total > 0 ? Math.round((correct.length / total) * 100) : 0;

  const disciplineScores = computeDisciplineBreakdown(scorable, answers);

  return {
    percentCorrect,
    correct: correct.length,
    total,
    unanswered: total - answered.length,
    disciplineBreakdown: disciplineScores,
  };
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
