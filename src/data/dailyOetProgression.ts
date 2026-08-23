import type { OetSubtest } from '../types';

export interface DailyOetProgressionEntry {
  date: string;
  stage: number;
  /** Strictly increasing proof that each release adds a harder reasoning layer. */
  complexityIndex: number;
  /** Cumulative reasoning demands retained from earlier stages plus one new layer. */
  reasoningLayers: readonly string[];
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
    reasoningLayers: ['exact-evidence discrimination'],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
    ],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
    ],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
    ],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
    ],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
    ],
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
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
    ],
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
  {
    date: '2026-08-23',
    stage: 8,
    complexityIndex: 8,
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
      'triangulation of selection, detection and competing safety duties',
    ],
    level: 'advanced',
    focus:
      'Triangulated safety reasoning under competing duties: infer a speaker’s audit standard rather than a memorable detail, reject a causal claim distorted by selection and differential detection, transfer a patient while balancing intracranial rebleeding against mechanical-valve thrombosis, and protect adolescent confidentiality while responding proportionately to possible coercion.',
    taskIds: {
      listening: 'lis-114',
      reading: 'read-86',
      writing: 'write-40',
      speaking: 'speak-40',
    },
  },
  {
    date: '2026-08-23',
    stage: 9,
    complexityIndex: 9,
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
      'triangulation of selection, detection and competing safety duties',
      'reconciliation of aggregate and subgroup evidence with mediated disclosure',
    ],
    level: 'advanced',
    focus:
      'Reversal between headline and subgroup evidence plus mediated disclosure: recognise when an improved aggregate outcome is created by a lower-risk case mix, resist an unsupported pathway-effect claim in dense prose, compress maternal cardiac failure and anticoagulation priorities into an urgent transfer, and negotiate a family request for collusion while honouring the competent patient’s stated information preference.',
    taskIds: {
      listening: 'lis-115',
      reading: 'read-87',
      writing: 'write-41',
      speaking: 'speak-41',
    },
  },
  {
    date: '2026-08-23',
    stage: 10,
    complexityIndex: 10,
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
      'triangulation of selection, detection and competing safety duties',
      'reconciliation of aggregate and subgroup evidence with mediated disclosure',
      'integration of competing-risk evidence with treatment-limitation language',
    ],
    level: 'advanced',
    focus:
      'Competing-risk interpretation and treatment-limitation language: infer why speed alone is an unsafe quality metric, recognise that death can prevent and distort a dialysis endpoint, transfer a multisystem immune-toxicity emergency with disciplined prioritisation, and explain that a resuscitation decision does not withdraw active care while eliciting the patient’s goals.',
    taskIds: {
      listening: 'lis-116',
      reading: 'read-88',
      writing: 'write-42',
      speaking: 'speak-42',
    },
  },
  {
    date: '2026-08-23',
    stage: 11,
    complexityIndex: 11,
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
      'triangulation of selection, detection and competing safety duties',
      'reconciliation of aggregate and subgroup evidence with mediated disclosure',
      'integration of competing-risk evidence with treatment-limitation language',
      'separation of regression to the mean from effect with probabilistic counselling',
    ],
    level: 'advanced',
    focus:
      'Regression-to-the-mean appraisal and probabilistic counselling: infer why selecting extreme baseline performers weakens a before-and-after claim, distinguish temporal improvement from intervention effect in dense analysis, prioritise immediate plasma exchange in a suspected TTP transfer, and explain a high-chance prenatal screen without presenting it as diagnosis or directing the patient’s reproductive choice.',
    taskIds: {
      listening: 'lis-117',
      reading: 'read-89',
      writing: 'write-43',
      speaking: 'speak-43',
    },
  },
  {
    date: '2026-08-23',
    stage: 12,
    complexityIndex: 12,
    reasoningLayers: [
      'exact-evidence discrimination',
      'causal attribution across bundled interventions',
      'conditional exception handling',
      'methodological claim calibration',
      'time-dependent bias detection',
      'rapid response-format switching',
      'produced-answer orthographic precision',
      'triangulation of selection, detection and competing safety duties',
      'reconciliation of aggregate and subgroup evidence with mediated disclosure',
      'integration of competing-risk evidence with treatment-limitation language',
      'separation of regression to the mean from effect with probabilistic counselling',
      'analysis of informative missingness with interpreter-mediated autonomous consent',
    ],
    level: 'advanced',
    focus:
      'Informative missingness and interpreter-mediated autonomy: infer why complete-case improvement may exclude people harmed or burdened by treatment, identify missing-not-at-random bias in a longitudinal report, prioritise transplant-centre transfer despite a low paracetamol level after staggered ingestion, and secure the patient’s own surgical decision through professional interpretation without excluding chosen family support.',
    taskIds: {
      listening: 'lis-118',
      reading: 'read-90',
      writing: 'write-44',
      speaking: 'speak-44',
    },
  },
];
