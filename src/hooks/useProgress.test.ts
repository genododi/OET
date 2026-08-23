import { describe, expect, it } from 'vitest';
import { migrateProgress } from './useProgress';

describe('progress migration', () => {
  it('migrates the previous unversioned shape and discards invalid rows', () => {
    const migrated = migrateProgress({
      completed: [
        { id: 'mock-1', title: 'Mock 1', kind: 'mock', durationMinutes: 180, completedAt: '2026-08-23T00:00:00Z' },
        { id: 7 },
      ],
    });
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.completed.map((session) => session.id)).toEqual(['mock-1']);
  });
});
