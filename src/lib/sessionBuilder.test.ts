import { describe, expect, it } from 'vitest';
import { practiceModules } from '../data/practice';
import type { PracticeModule } from '../types';
import {
  buildMockSession,
  buildPracticeSession,
  countContentTasks,
  MIN_CONTENT_TASKS,
  practiceSessionWorkload,
} from './sessionBuilder';
import type { MockExam } from '../types';

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

describe('authentic OET mock phase calibration', () => {
  it('builds the official Medicine phase sequence and locks repeated productive tasks', () => {
    const exam: MockExam = {
      id: 'authentic-blueprint-test',
      title: 'Authentic Medicine Mock',
      profession: 'Medicine',
      subtests: ['listening', 'reading', 'writing', 'speaking'],
      durationMinutes: 165,
      difficulty: 'advanced',
      description: 'Test fixture',
      questionsCount: 87,
    };
    const session = buildMockSession(exam);

    expect(session.stages?.map((stage) => stage.mode)).toEqual([
      'objective',
      'objective',
      'objective',
      'reading-only',
      'writing',
      'speaking-warmup',
      'speaking-preparation',
      'speaking-roleplay',
      'speaking-preparation',
      'speaking-roleplay',
    ]);
    expect(session.stages?.reduce((sum, stage) => sum + stage.durationSeconds, 0)).toBe(
      165 * 60,
    );
    expect(session.stages?.[1]?.taskIds).toHaveLength(20);
    expect(session.stages?.[2]?.taskIds).toHaveLength(22);
    expect(session.stages?.[3]?.taskIds).toEqual(session.stages?.[4]?.taskIds);
    expect(session.stages?.[6]?.taskIds).toEqual(session.stages?.[7]?.taskIds);
  });
});
