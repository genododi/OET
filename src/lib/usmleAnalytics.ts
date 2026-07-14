import type { UsmleStep } from '../types/usmle';

interface UsmleSessionRecord {
  id: string;
  step: string;
  completedAt: string;
  percentCorrect: number;
  total: number;
  disciplineScores: { discipline: string; percentCorrect: number }[];
}

interface UsmleDisciplineStat {
  discipline: string;
  totalQuestions: number;
  correct: number;
  percentCorrect: number;
  sessions: number;
}

const STORAGE_KEY = 'usmle-analytics';

function loadRecords(): UsmleSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: UsmleSessionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveUsmleSession(
  step: string,
  percentCorrect: number,
  total: number,
  disciplineScores: { discipline: string; percentCorrect: number }[],
): void {
  const records = loadRecords();
  records.push({
    id: `usmle-${step}-${Date.now()}`,
    step,
    completedAt: new Date().toISOString(),
    percentCorrect,
    total,
    disciplineScores,
  });
  saveRecords(records);
}

export function getUsmleSessionHistory(): UsmleSessionRecord[] {
  return loadRecords();
}

export function getUsmleDisciplineStats(step?: UsmleStep): UsmleDisciplineStat[] {
  const records = loadRecords();
  const filtered = step ? records.filter((r) => r.step === step) : records;

  const byDiscipline = new Map<string, { correctSum: number; totalSum: number; sessionCount: number }>();

  filtered.forEach((record) => {
    record.disciplineScores.forEach((ds) => {
      const entry = byDiscipline.get(ds.discipline) ?? { correctSum: 0, totalSum: 0, sessionCount: 0 };
      entry.totalSum += record.total;
      entry.correctSum += Math.round((ds.percentCorrect / 100) * record.total);
      entry.sessionCount += 1;
      byDiscipline.set(ds.discipline, entry);
    });
  });

  return [...byDiscipline.entries()]
    .map(([discipline, { correctSum, totalSum, sessionCount }]) => ({
      discipline,
      totalQuestions: totalSum,
      correct: correctSum,
      percentCorrect: totalSum > 0 ? Math.round((correctSum / totalSum) * 100) : 0,
      sessions: sessionCount,
    }))
    .sort((a, b) => a.percentCorrect - b.percentCorrect);
}

export function getUsmleOverallStats(step?: UsmleStep): {
  totalSessions: number;
  totalQuestions: number;
  averagePercent: number;
} {
  const records = loadRecords();
  const filtered = step ? records.filter((r) => r.step === step) : records;

  const totalSessions = filtered.length;
  const totalQuestions = filtered.reduce((sum, r) => sum + r.total, 0);
  const averagePercent =
    totalSessions > 0
      ? Math.round(filtered.reduce((sum, r) => sum + r.percentCorrect, 0) / totalSessions)
      : 0;

  return { totalSessions, totalQuestions, averagePercent };
}
