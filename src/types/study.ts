import type { Difficulty, OetSubtest } from './index';

export type SourceContainer =
  | 'official-oet'
  | 'google-drive'
  | 'google-doc'
  | 'facebook'
  | 'telegram'
  | 'mega'
  | 'youtube'
  | 'original';

export type RedistributionStatus =
  | 'official-public'
  | 'permission-confirmed'
  | 'link-only'
  | 'rights-unclear'
  | 'quarantined';

export interface SourceAsset {
  id: string;
  sourceUrl: string;
  sourceContainer: SourceContainer;
  originalPath: string;
  filename: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  acquiredAt: string;
  extractionStatus: 'not-required' | 'pending' | 'extracted' | 'rejected' | 'failed';
  duplicateOf?: string;
  /** True when this row preserves an additional container path to the same downloaded bytes. */
  sourcePathRecord?: boolean;
  profession: 'Medicine' | 'All professions' | 'Unknown';
  subtest: OetSubtest | 'general' | 'unknown';
  redistributionStatus: RedistributionStatus;
  publicationEligible: boolean;
}

export interface SourceManifest {
  schemaVersion: 1;
  generatedAt: string;
  archiveRoot: string;
  assets: SourceAsset[];
}

export type StudyResourceFormat =
  | 'guide'
  | 'sample-test'
  | 'video'
  | 'worksheet'
  | 'audio'
  | 'reference';

export interface StudyResource {
  id: string;
  title: string;
  description: string;
  profession: 'Medicine';
  subtest: OetSubtest | 'general';
  format: StudyResourceFormat;
  difficulty: Difficulty | 'all';
  sourceLabel: string;
  sourceUrl: string;
  sourceContainer: SourceContainer;
  redistributionStatus: RedistributionStatus;
  publicationEligible: boolean;
  localPath?: string;
  tags: string[];
}

export interface PracticeProvenance {
  sourceLabel: string;
  sourceUrl: string;
  classification: 'official' | 'original-derived' | 'original';
  authoringStatus: 'verbatim-official' | 'original-adaptation' | 'original';
  reviewStatus: 'reviewed' | 'needs-review';
}

export interface DiagnosticProfile {
  schemaVersion: 1;
  targetScore: 450;
  examDate: string;
  studyDaysPerWeek: number;
  minutesPerDay: number;
  baseline: Record<OetSubtest, number>;
  weakAreas: OetSubtest[];
  completedAt: string;
}

export interface StudyPlanAssignment {
  id: string;
  dayOffset: number;
  subtest: OetSubtest;
  title: string;
  minutes: number;
  focus: string;
  kind: 'learn' | 'practice' | 'mock' | 'review';
}

export interface StudyPlan {
  schemaVersion: 1;
  generatedAt: string;
  targetScore: 450;
  examDate: string;
  weeklyMinutes: number;
  assignments: StudyPlanAssignment[];
}

export interface TutorRubricScore {
  dimension: string;
  score: number;
  evidence: string;
}

export interface TutorFeedback {
  provider: 'offline-rubric' | 'anthropic';
  estimatedGrade: string;
  rubricScores: TutorRubricScore[];
  strengths: string[];
  improvements: string[];
  nextDrill: string;
  disclaimer: string;
}
