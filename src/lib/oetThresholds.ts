/** Grade B equivalent — typical OET pass target (~350/500 ≈ 70%). */
export const OET_THRESHOLDS = {
  listening: { practicePass: 70, examReady: 80 },
  reading: { practicePass: 70, examReady: 80 },
  writing: { practicePass: 65, examReady: 75 },
  speaking: { practicePass: 65, examReady: 75 },
} as const;

export type ReadinessLevel = 'below' | 'practice-pass' | 'exam-ready';

export function getReadinessLevel(
  subtest: keyof typeof OET_THRESHOLDS,
  percent: number,
): ReadinessLevel {
  const t = OET_THRESHOLDS[subtest];
  if (percent >= t.examReady) return 'exam-ready';
  if (percent >= t.practicePass) return 'practice-pass';
  return 'below';
}

export function readinessLabel(level: ReadinessLevel): string {
  if (level === 'exam-ready') return 'Exam-ready (Grade B+)';
  if (level === 'practice-pass') return 'Practice pass';
  return 'Needs more practice';
}
