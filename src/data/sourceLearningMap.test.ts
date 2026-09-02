import { describe, expect, it } from 'vitest';
import { mockExams } from './mockExams';
import { practiceModules } from './practice';
import localSourceFiles from './googleDriveFolderLibrary.generated.json';
import {
  practiceBlueprintSourceFiles,
  sourceLearningRouteCounts,
  type SourceLearningFile,
} from './sourceLearningMap';

const sourceLearningFiles = localSourceFiles as SourceLearningFile[];

describe('GENODODI source learning map', () => {
  it('maps every usable private source record into the generated practice catalog', () => {
    const mappedIds = new Set(practiceModules.map((module) => module.sourceFileId).filter(Boolean));
    const missing = practiceBlueprintSourceFiles.filter((file) => !mappedIds.has(file.id));

    expect(missing).toEqual([]);
    expect(mappedIds.size).toBeGreaterThanOrEqual(practiceBlueprintSourceFiles.length);
  });

  it('never maps blocked or restricted source records into generated sessions', () => {
    const protectedIds = new Set(
      sourceLearningFiles
        .filter((file) => ['blocked-unsafe', 'restricted-private'].includes(file.integrationStatus))
        .map((file) => file.id),
    );
    const referencedIds = [
      ...practiceModules.map((module) => module.sourceFileId),
      ...mockExams.map((exam) => exam.sourceFileId),
    ].filter((id): id is string => Boolean(id));

    expect(referencedIds.some((id) => protectedIds.has(id))).toBe(false);
  });

  it('keeps every learning route populated and under the 1,000-module rotation capacity', () => {
    for (const count of Object.values(sourceLearningRouteCounts)) {
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(1_000);
    }
  });
});
