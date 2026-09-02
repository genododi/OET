import sourcePracticeMap from './sourcePracticeMap.generated.json';
import type { OetSubtest } from '../types';

export type SourceIntegrationStatus =
  | 'practice-blueprint'
  | 'verified-real-test'
  | 'restricted-private'
  | 'blocked-unsafe';

export interface SourceLearningFile {
  id: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  subtest: OetSubtest | 'general';
  format: string;
  learningRole: string;
  learningRoute: OetSubtest;
  integrationStatus: SourceIntegrationStatus;
  githubBlobStatus: 'regular-git-size' | 'requires-lfs';
  archiveMatched: boolean;
  ingestionStatus: string;
}

interface SourcePracticeMapFile {
  id: string;
  format: string;
  learningRole: string;
  sourceCode: string;
}

export interface SourceLearningReference {
  id: string;
  label: string;
  tags: string[];
}

const filesByRoute = sourcePracticeMap as Record<OetSubtest, SourcePracticeMapFile[]>;
export const practiceBlueprintSourceFiles = Object.values(filesByRoute).flat();

/**
 * Deterministically maps generated practice and mock entries onto the complete
 * rights-aware source inventory without exposing private file bytes.
 */
export function sourceLearningReference(
  subtest: OetSubtest,
  serial: number,
): SourceLearningReference {
  const pool = filesByRoute[subtest];
  if (pool.length === 0) {
    return {
      id: `source-map-${subtest}`,
      label: `GENODODI ${subtest} source map`,
      tags: ['source-mapped', subtest],
    };
  }
  const file = pool[(Math.max(1, serial) - 1) % pool.length]!;
  return {
    id: file.id,
    label: `GENODODI ${file.format} ${file.learningRole} · ${file.sourceCode}`,
    tags: ['source-mapped', `source-${file.format}`, `source-${file.learningRole}`],
  };
}

export const sourceLearningRouteCounts = Object.fromEntries(
  Object.entries(filesByRoute).map(([route, files]) => [route, files.length]),
) as Record<OetSubtest, number>;
