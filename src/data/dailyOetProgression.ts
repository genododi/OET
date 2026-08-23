import type { OetSubtest } from '../types';

export interface DailyOetProgressionEntry {
  date: string;
  stage: number;
  /** Strictly increasing proof that each release adds a harder reasoning layer. */
  complexityIndex: number;
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
    complexityIndex: 1,
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
  {
    date: '2026-08-23',
    stage: 2,
    complexityIndex: 2,
    level: 'advanced',
    focus:
      'Causal restraint and trust repair: separate bundled interventions, interpret composite endpoints, prioritise a haematological emergency, and explain a positive functional diagnosis without invalidation.',
    taskIds: {
      listening: 'lis-108',
      reading: 'read-44',
      writing: 'write-34',
      speaking: 'speak-34',
    },
  },
  {
    date: '2026-08-23',
    stage: 3,
    complexityIndex: 3,
    level: 'advanced',
    focus:
      'Corrected evidence and conditional rules: act on a revised critical result, navigate policy exceptions under time pressure, prioritise euglycaemic ketoacidosis follow-up, and preserve autonomy through interpreted risk discussion.',
    taskIds: {
      listening: 'lis-109',
      reading: 'read-45',
      writing: 'write-35',
      speaking: 'speak-35',
    },
  },
  {
    date: '2026-08-23',
    stage: 4,
    complexityIndex: 4,
    level: 'advanced',
    focus:
      'Inference across competing explanations: reject false equivalence in a research discussion, appraise non-inferiority bias, compress a toxicology emergency into a selective transfer letter, and negotiate a bereaved patient’s demand for low-value imaging without damaging trust.',
    taskIds: {
      listening: 'lis-110',
      reading: 'read-60',
      writing: 'write-36',
      speaking: 'speak-36',
    },
  },
  {
    date: '2026-08-23',
    stage: 5,
    complexityIndex: 5,
    level: 'advanced',
    focus:
      'Validity under time-dependent exposure and autonomy under immediate risk: identify immortal-time bias from spoken and written evidence, select the decisive facts in a polypharmacy emergency transfer, and negotiate urgent assessment with a capacitated patient whose caregiving duties conflict with safety.',
    taskIds: {
      listening: 'lis-111',
      reading: 'read-63',
      writing: 'write-37',
      speaking: 'speak-37',
    },
  },
  {
    date: '2026-08-23',
    stage: 6,
    complexityIndex: 6,
    level: 'advanced',
    focus:
      'Exact blueprint performance under rapid switching: extract decisive details from consultation language and four linked Part A texts, distinguish delirium recovery from premature dementia labelling in a selective discharge letter, and reconcile patient autonomy with family anxiety during a high-stakes transition home.',
    taskIds: {
      listening: 'lis-112',
      reading: 'read-66',
      writing: 'write-38',
      speaking: 'speak-38',
    },
  },
  {
    date: '2026-08-23',
    stage: 7,
    complexityIndex: 7,
    level: 'advanced',
    focus:
      'Produced-answer precision and inherited-risk communication: switch accurately between note completion and single-choice listening, retrieve exact phrases under Reading Part A time pressure, prioritise exertional syncope and familial sudden death in an urgent referral, and preserve confidentiality while negotiating disclosure of actionable genetic risk.',
    taskIds: {
      listening: 'lis-113',
      reading: 'read-81',
      writing: 'write-39',
      speaking: 'speak-39',
    },
  },
];
