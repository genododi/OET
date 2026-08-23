import type { OetSubtest } from '../types';

export interface DailyOetProgressionEntry {
  date: string;
  stage: number;
  level: 'advanced';
  focus: string;
  taskIds: Record<OetSubtest, string>;
}

/**
 * Append one entry for every daily content increment. The verifier uses this
 * ledger to prove that progression is chronological, balanced across all four
 * OET sub-tests, and backed by live advanced tasks rather than catalog labels.
 */
export const dailyOetProgression: readonly DailyOetProgressionEntry[] = [
  {
    date: '2026-08-23',
    stage: 1,
    level: 'advanced',
    focus:
      'Evidence under uncertainty: distinguish recalibration from external validation, interpret hidden subgroup drift, prioritise an urgent referral, and negotiate risk without false reassurance.',
    taskIds: {
      listening: 'lis-107',
      reading: 'read-43',
      writing: 'write-33',
      speaking: 'speak-33',
    },
  },
];
