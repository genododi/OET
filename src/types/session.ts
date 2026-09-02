import type { Difficulty, OetSubtest, SubtestType } from './index';
import type { UsmleStep, UsmleDiscipline, UsmleQuestionFormat } from './usmle';
import type { PracticeProvenance } from './study';

export interface SessionOption {
  id: string;
  label: string;
  correct: boolean;
  /** Why this option is correct or a distractor */
  explanation?: string;
}

/** OET writing rubric checklist item */
export interface WritingRubricItem {
  dimension: string;
  criterion: string;
  modelPoint: string;
}

/** Task-specific evidence needed before a Writing draft can earn a high content score. */
export interface WritingCriteria {
  /** Each group represents one clinical concept; any synonym in the group earns that concept. */
  requiredConceptGroups: string[][];
  /** Case-note details that should be omitted because they do not serve the reader or purpose. */
  irrelevantTerms?: string[];
}

/** Criteria for client-side speaking evaluation (keyword / checklist matching). */
export interface SpeakingCriteria {
  expectedKeywords: string[];
  checklist: string[];
  samplePhrases: string[];
  /** OET dimension weights — default: communication 35%, clinical 40%, language 25% */
  dimensionWeights?: {
    communication: number;
    clinicalCommunication: number;
    language: number;
  };
}

export interface SessionTask {
  id: string;
  subtest: SubtestType;
  title: string;
  difficulty?: Difficulty;
  instructions: string;
  prompt?: string;
  /** OET Reading Part B/C passage shown above the question */
  readingPassage?: string;
  readingPassageTitle?: string;
  options?: SessionOption[];
  /** Overall MCQ explanation shown after submit */
  explanation?: string;
  sampleAnswer?: string;
  /** Full model answer for writing review */
  modelAnswer?: string;
  checklist?: string[];
  rubricChecklist?: WritingRubricItem[];
  writingCriteria?: WritingCriteria;
  perfectAnswerTips?: string[];
  /** Authorship and source classification for learner-facing OET content. */
  provenance?: PracticeProvenance;
  speakingCriteria?: SpeakingCriteria;
  /** Official or imported listening recording (path under public/ or CDN) */
  audioSrc?: string;
  audioLabel?: string;
  audioExternalUrl?: string;
  audioNote?: string;
  /** Exact spoken script used to generate this task's audio. */
  audioTranscript?: string;
  /** Terms that must be audible and relevant to the answer. */
  audioEvidenceTerms?: string[];
  /** Content-derived cache revision for the question/audio pair. */
  audioRevision?: string;
  /** USMLE step (step1, step2, step3) */
  usmleStep?: UsmleStep;
  /** USMLE discipline tag */
  usmleDiscipline?: UsmleDiscipline;
  /** USMLE question format */
  usmleQuestionFormat?: UsmleQuestionFormat;
  /** Whether this question has an associated image */
  hasImage?: boolean;
  /** Path to vignette image (under public/usmle/images/) */
  imageSrc?: string;
  /** Caption for the vignette image */
  imageCaption?: string;
}

export interface SessionListeningAudio {
  src?: string;
  externalUrl?: string;
  label: string;
  note?: string;
  examMode?: boolean;
}

export type OetSessionStageMode =
  | 'objective'
  | 'reading-only'
  | 'writing'
  | 'speaking-warmup'
  | 'speaking-preparation'
  | 'speaking-roleplay';

/**
 * A locked phase in an authentic OET mock. Task ids may repeat across phases:
 * Writing shows the same case notes during reading and writing time, while each
 * Speaking card is shown first for preparation and then for the role-play.
 */
export interface OetSessionStage {
  id: string;
  label: string;
  subtest: OetSubtest;
  part?: 'A' | 'B' | 'C';
  durationSeconds: number;
  taskIds: string[];
  mode: OetSessionStageMode;
  instructions: string;
}

export interface SessionConfig {
  id: string;
  kind: 'mock' | 'practice' | 'usmle-block' | 'usmle-custom';
  title: string;
  subtitle: string;
  durationMinutes: number;
  subtests: SubtestType[];
  tasks: SessionTask[];
  /** Enforce one-use Listening audio even when this compact practice set is below readiness size. */
  enforceSinglePlayListening?: boolean;
  /** Full-length official audio for listening mocks/practice (shown on intro + listening steps) */
  listeningAudio?: SessionListeningAudio;
  /** Locked, official-format phase sequence. Present on every mock simulation. */
  stages?: OetSessionStage[];
}

export interface SubtestReviewScore {
  subtest: OetSubtest;
  percentScore: number;
  correct?: number;
  total?: number;
  practicePass: boolean;
  examReady: boolean;
  weakAreas: string[];
}

export interface CriterionScoreSnapshot {
  criterion: string;
  scorePercent: number;
}

export interface TaskReviewSnapshot {
  taskId: string;
  subtest: SubtestType;
  passed: boolean | null;
  scorePercent: number | null;
  summary: string;
  /** Persisted productive-skill evidence used for criterion-level adaptive practice. */
  criteriaScores?: CriterionScoreSnapshot[];
  /** Productive-skill evidence qualifies only after a complete letter or sufficient recording. */
  evidenceQualified?: boolean;
}

export interface SessionReviewData {
  subtestScores: SubtestReviewScore[];
  overallPercent: number;
  overallPracticePass: boolean;
  overallExamReady: boolean;
  weakAreas: string[];
  taskReviews: TaskReviewSnapshot[];
}

export interface CompletedSession {
  id: string;
  kind: 'mock' | 'practice' | 'usmle-block' | 'usmle-custom';
  title: string;
  completedAt: string;
  durationMinutes: number;
  score?: { correct: number; total: number };
  review?: SessionReviewData;
}
