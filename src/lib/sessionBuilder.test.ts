import { describe, expect, it } from 'vitest';
import { practiceModules } from '../data/practice';
import type { PracticeModule } from '../types';
import {
  buildPracticeSession,
  countContentTasks,
  MIN_CONTENT_TASKS,
  practiceSessionWorkload,
} from './sessionBuilder';

function moduleById(id: string): PracticeModule {
  const module = practiceModules.find((candidate) => candidate.id === id);
  if (!module) throw new Error(`Missing practice fixture ${id}`);
  return module;
}

describe('catalog practice workload calibration', () => {
  it('keeps the receptive minimum without applying it to a Writing letter', () => {
    const listening = moduleById('prac-listening-b');
    const writing = moduleById('prac-writing-a');

    expect(practiceSessionWorkload(listening).taskCount).toBe(MIN_CONTENT_TASKS);
    expect(practiceSessionWorkload(writing)).toEqual({
      taskCount: 1,
      durationMinutes: writing.durationMinutes,
    });
    expect(countContentTasks(buildPracticeSession(writing).tasks)).toBe(1);
  });

  it('fits full Speaking performances into the module time budget', () => {
    const shortModule = moduleById('prac-speaking-a');
    const officialWorkloadModule = moduleById('prac-timed-speaking-2');

    expect(practiceSessionWorkload(shortModule)).toEqual({
      taskCount: 1,
      durationMinutes: 15,
    });
    expect(practiceSessionWorkload(officialWorkloadModule)).toEqual({
      taskCount: 2,
      durationMinutes: 20,
    });
    expect(countContentTasks(buildPracticeSession(officialWorkloadModule).tasks)).toBe(2);
  });

  it('keeps every productive catalog session within a full-performance time cap', () => {
    for (const module of practiceModules) {
      if (module.subtest !== 'writing' && module.subtest !== 'speaking') continue;
      const workload = practiceSessionWorkload(module);
      const minutesPerTask = module.subtest === 'writing' ? 45 : 10;
      const maximum = Math.max(1, Math.floor(module.durationMinutes / minutesPerTask));

      expect(workload.taskCount, module.id).toBeLessThanOrEqual(maximum);
      expect(countContentTasks(buildPracticeSession(module).tasks), module.id).toBe(
        workload.taskCount,
      );
    }
  });
});
