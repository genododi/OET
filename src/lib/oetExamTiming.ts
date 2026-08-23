import type { OetSubtest } from '../types';

export type OetPart = 'A' | 'B' | 'C';
export type OetPartBlueprintSubtest = Extract<OetSubtest, 'listening' | 'reading'>;
export const OET_PARTS: readonly OetPart[] = ['A', 'B', 'C'];

/** Current official test time, excluding check-in and between-component waiting time. */
export const OET_SUBTEST_MINUTES: Record<OetSubtest, number> = {
  listening: 40,
  reading: 60,
  writing: 45,
  speaking: 20,
};

/** Current official task counts for a complete sub-test. */
export const OET_SUBTEST_TASK_COUNTS: Record<OetSubtest, number> = {
  listening: 42,
  reading: 42,
  writing: 1,
  speaking: 2,
};

/** Official question distribution inside the two 42-item objective sub-tests. */
export const OET_SUBTEST_PART_TASK_COUNTS: Record<
  OetPartBlueprintSubtest,
  Record<OetPart, number>
> = {
  listening: { A: 24, B: 6, C: 12 },
  reading: { A: 20, B: 6, C: 16 },
};

export function hasOetPartBlueprint(
  subtest: OetSubtest,
): subtest is OetPartBlueprintSubtest {
  return subtest === 'listening' || subtest === 'reading';
}

export const OET_WRITTEN_BLOCK_MINUTES =
  OET_SUBTEST_MINUTES.listening + OET_SUBTEST_MINUTES.reading + OET_SUBTEST_MINUTES.writing;

export const OET_FULL_TEST_MINUTES = OET_WRITTEN_BLOCK_MINUTES + OET_SUBTEST_MINUTES.speaking;

export function oetMockDurationMinutes(subtests: readonly OetSubtest[]): number {
  return subtests.reduce((total, subtest) => total + OET_SUBTEST_MINUTES[subtest], 0);
}

export function oetMockTaskCount(subtests: readonly OetSubtest[]): number {
  return subtests.reduce((total, subtest) => total + OET_SUBTEST_TASK_COUNTS[subtest], 0);
}
