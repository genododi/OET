import type { OetSubtest, PracticeModule } from '../../types';
import {
  DIFFICULTIES,
  GENERATED_NON_MEDICINE_PROFESSIONS,
  MEDICINE_CLINICAL_THEMES,
  MEDICINE_PRACTICE_TAG_POOL,
  MEDICINE_SOURCE_HINTS,
  ADVANCED_PRACTICE_PACK_LABELS,
  PRACTICE_PACK_LABELS,
  PRACTICE_TAG_POOL,
  SOURCE_HINTS,
  SUBTESTS,
  pick,
  pickMany,
  subtestLabel,
} from './contentVariety';
import {
  catalogRef,
  diversifiedIndex,
  stampDescription,
  type ContentPool,
} from './uniqueness';

const LISTENING_TOPICS = [
  'Part A — Consultation note completion',
  'Part B — Ward handover extracts',
  'Part C — Health lecture comprehension',
  'Part A — ED triage dialogue',
  'Part B — Pharmacy counter clips',
  'Part C — Antibiotic stewardship talk',
  'Part A — Paediatric review notes',
  'Part B — MDT corridor conversations',
  'Part C — Telehealth rural care theme',
  'Part A — Mental health assessment',
];

const READING_TOPICS = [
  'Part A — Expeditious matching (4 texts)',
  'Part B — Hospital policy comprehension',
  'Part C — Research abstract MCQs',
  'Part A — Infection control pathways',
  'Part B — Consent & information sheets',
  'Part C — Mental health guideline inference',
  'Part A — Stroke pathway speed drill',
  'Part B — Medication safety email',
  'Part C — Public health bulletin',
  'Part A — Sepsis bundle matching',
];

const WRITING_TOPICS = [
  'Referral letter — specialist handover',
  'Discharge summary — post-operative care',
  'Transfer letter — community services',
  'Urgent 2WW referral — suspicious findings',
  'GP update letter — chronic disease review',
  'Occupational health fitness certificate',
  'Aged care transfer — nursing home',
  'Wound clinic referral — MDT plan',
  'Hypoglycaemia event — safety netting',
  'Palliative care coordination letter',
];

const SPEAKING_TOPICS = [
  'Role-play — Breaking bad news',
  'Role-play — Medication counselling',
  'Role-play — Lifestyle modification',
  'Role-play — DNACPR discussion',
  'Role-play — Discharge planning',
  'Role-play — Informed consent',
  'Role-play — Pain management plan',
  'Role-play — Vaccination advice',
  'Role-play — Mental health check-in',
  'Role-play — Falls prevention education',
];

const MEDICINE_LISTENING_TOPICS = [
  'Part A — GP consultation note completion',
  'Part B — Physician ward handover clips',
  'Part C — Hospital medicine lecture extract',
  'Part A — Specialist clinic dialogue',
  'Part B — Radiology request corridor talk',
  'Part C — Antimicrobial stewardship grand round',
  'Part A — Acute take clerking notes',
  'Part B — MDT briefing extracts',
  'Part C — Telemedicine rural physician talk',
  'Part A — Mental health review with GP',
];

const MEDICINE_READING_TOPICS = [
  'Part A — Acute pathway expeditious matching',
  'Part B — Hospital policy & consent forms',
  'Part C — Clinical trial abstract MCQs',
  'Part A — Sepsis bundle four-text drill',
  'Part B — Medication safety bulletin',
  'Part C — NICE-style guideline inference',
  'Part A — Stroke pathway speed matching',
  'Part B — Discharge checklist comprehension',
  'Part C — Public health physician bulletin',
  'Part A — DVT/VTE protocol matching',
];

const MEDICINE_WRITING_TOPICS = [
  'Referral letter — cardiology handover',
  'Discharge summary — post-operative medicine',
  'Transfer letter — community physician',
  'Urgent 2WW referral — suspicious lump',
  'GP update letter — multimorbidity review',
  'Specialist acceptance letter — renal clinic',
  'Aged-care transfer — geriatrician plan',
  'Wound clinic referral — physician MDT',
  'Hypoglycaemia event — safety netting to GP',
  'Palliative care coordination letter',
];

const MEDICINE_SPEAKING_TOPICS = [
  'Role-play — Patient: breaking bad news',
  'Role-play — Patient: anticoagulant counselling',
  'Role-play — Patient: lifestyle & CV risk',
  'Role-play — Colleague: DNACPR MDT discussion',
  'Role-play — Patient: discharge planning',
  'Role-play — Patient: procedure consent',
  'Role-play — Patient: chronic pain plan',
  'Role-play — Colleague: handover escalation',
  'Role-play — Patient: mental health check-in',
  'Role-play — Colleague: radiology request dispute',
];

const MEDICINE_TOPICS_BY_SUBTEST: Record<OetSubtest, readonly string[]> = {
  listening: MEDICINE_LISTENING_TOPICS,
  reading: MEDICINE_READING_TOPICS,
  writing: MEDICINE_WRITING_TOPICS,
  speaking: MEDICINE_SPEAKING_TOPICS,
};

const TOPICS_BY_SUBTEST: Record<OetSubtest, readonly string[]> = {
  listening: LISTENING_TOPICS,
  reading: READING_TOPICS,
  writing: WRITING_TOPICS,
  speaking: SPEAKING_TOPICS,
};

const CLINICAL_THEMES = [
  'diabetes',
  'heart failure',
  'COPD',
  'stroke',
  'sepsis',
  'palliative care',
  'mental health',
  'paediatrics',
  'maternity',
  'renal medicine',
  'dermatology',
  'orthopaedics',
  'infection control',
  'medication safety',
  'falls prevention',
  'wound care',
  'telehealth',
  'occupational health',
];

function tasksCountFor(subtest: OetSubtest, index: number): number {
  switch (subtest) {
    case 'listening':
      return pick([6, 8, 10, 12, 14, 20], index);
    case 'reading':
      return pick([6, 8, 12, 16, 20, 24], index);
    case 'writing':
      return pick([1, 1, 2, 3], index);
    case 'speaking':
      return pick([2, 2, 3, 4, 6], index);
  }
}

function durationFor(subtest: OetSubtest, index: number, tasksCount: number): number {
  const base =
    subtest === 'writing' ? 40 : subtest === 'speaking' ? 12 : subtest === 'reading' ? 18 : 14;
  const bump = Math.floor(tasksCount / 4) * 2;
  const marathon = index % 17 === 0 ? 25 : 0;
  return Math.min(90, base + bump + marathon + (index % 5));
}

function professionFor(index: number): string {
  return pick(GENERATED_NON_MEDICINE_PROFESSIONS, index);
}

function buildMedicineTags(subtest: OetSubtest, index: number): string[] {
  const tags = new Set<string>([
    'medicine',
    'physician',
    'doctors-hub',
    subtest,
    ...pickMany(MEDICINE_PRACTICE_TAG_POOL, index, 5),
  ]);
  if (subtest === 'writing') {
    tags.add('referral-letter');
    tags.add('case-notes');
  }
  if (subtest === 'speaking') {
    tags.add(index % 2 === 0 ? 'patient-role-play' : 'colleague-role-play');
  }
  if (index % 11 === 0) tags.add('telegram-recall');
  if (index % 13 === 0) tags.add('official-style');
  if (index % 19 === 0) tags.add('marathon');
  const partTag = pick(['part-a', 'part-b', 'part-c'], index + subtest.length);
  tags.add(partTag);
  return [...tags];
}

function buildTags(subtest: OetSubtest, profession: string, index: number): string[] {
  const tags = new Set<string>([
    subtest,
    ...pickMany(PRACTICE_TAG_POOL, index, 4),
  ]);
  if (profession === 'Medicine') tags.add('medicine');
  if (profession === 'Nursing') tags.add('nursing');
  if (profession !== 'All professions' && profession !== 'Medicine' && profession !== 'Nursing') {
    tags.add('allied-health');
  }
  if (index % 11 === 0) tags.add('telegram-recall');
  if (index % 13 === 0) tags.add('official-style');
  if (index % 19 === 0) tags.add('marathon');
  const partTag = pick(['part-a', 'part-b', 'part-c'], index + subtest.length);
  tags.add(partTag);
  return [...tags];
}

export function generatePracticeModule(serial: number): PracticeModule {
  const pool: ContentPool = 'general';
  const index = diversifiedIndex(pool, serial);
  const subtest = pick(SUBTESTS, index + Math.floor(index / 4));
  const profession = professionFor(index);
  const difficulty = pick(DIFFICULTIES, index + 2);
  const pack = pick(PRACTICE_PACK_LABELS, index);
  const theme = pick(CLINICAL_THEMES, index + 5);
  const topicBase = pick(TOPICS_BY_SUBTEST[subtest], index);
  const tasksCount = tasksCountFor(subtest, index);
  const durationMinutes = durationFor(subtest, index, tasksCount);
  const profShort = profession === 'All professions' ? 'All Professions' : profession;
  const displayNum = serial;
  const ref = catalogRef(pool, serial, subtest);

  const title = `${profShort} ${subtestLabel(subtest)} ${pack} #${displayNum} [${ref}]`;
  const topic = `${topicBase} · ${theme}`;
  const sourceHint = pick(SOURCE_HINTS, index);
  const tags = [...buildTags(subtest, profession, index), ref];

  const description = stampDescription(
    [
      `${pack} for ${profShort.toLowerCase()} candidates — ${theme} focus.`,
      topicBase,
      `Difficulty: ${difficulty}. Inspired by ${sourceHint}.`,
      `Includes ${tasksCount} task${tasksCount === 1 ? '' : 's'} (~${durationMinutes} min).`,
    ],
    { pool, serial, subtest, profession, difficulty },
  );

  return {
    id: `prac-gen-${String(serial).padStart(4, '0')}`,
    subtest,
    title,
    topic,
    durationMinutes,
    difficulty,
    description,
    tasksCount,
    profession: profession === 'All professions' ? profession : profession,
    tags,
    sourceHint,
  };
}

/** Medicine-only practice modules for physician candidates (serials 1…count). */
export function generateMedicinePracticeModule(serial: number): PracticeModule {
  const pool: ContentPool = 'medicine';
  const index = diversifiedIndex(pool, serial);
  const subtest = pick(SUBTESTS, index + Math.floor(index / 4));
  const difficulty = pick(DIFFICULTIES, index + 2);
  const pack = pick(PRACTICE_PACK_LABELS, index);
  const theme = pick(MEDICINE_CLINICAL_THEMES, index + 5);
  const topicBase = pick(MEDICINE_TOPICS_BY_SUBTEST[subtest], index);
  const tasksCount = tasksCountFor(subtest, index);
  const durationMinutes = durationFor(subtest, index, tasksCount);
  const displayNum = serial;
  const subtestName = subtestLabel(subtest);
  const ref = catalogRef(pool, serial, subtest);

  const title = `Medicine ${subtestName} ${pack} #${displayNum} [${ref}]`;
  const topic = `${topicBase} · ${theme}`;
  const sourceHint = pick(MEDICINE_SOURCE_HINTS, index);
  const tags = [...buildMedicineTags(subtest, index), ref];

  const description = stampDescription(
    [
      `${pack} for physician (Medicine) candidates — ${theme} focus.`,
      topicBase,
      `Difficulty: ${difficulty}. Inspired by ${sourceHint}.`,
      `Includes ${tasksCount} task${tasksCount === 1 ? '' : 's'} (~${durationMinutes} min).`,
    ],
    { pool, serial, subtest, profession: 'Medicine', difficulty },
  );

  return {
    id: `prac-med-gen-${String(serial).padStart(4, '0')}`,
    subtest,
    title,
    topic,
    durationMinutes,
    difficulty,
    description,
    tasksCount,
    profession: 'Medicine',
    tags,
    sourceHint,
  };
}

export function generateMedicinePracticeModules(count: number): PracticeModule[] {
  return Array.from({ length: count }, (_, i) => generateMedicinePracticeModule(i + 1));
}

/** Generate `count` unique practice modules (serials 1…count). */
export function generatePracticeModules(count: number): PracticeModule[] {
  return Array.from({ length: count }, (_, i) => generatePracticeModule(i + 1));
}

const ADVANCED_PRACTICE_PROFILES = [
  { suffix: 'Marathon', taskBump: 8, durationBump: 20, tag: 'marathon' },
  { suffix: 'Combo Expert', taskBump: 6, durationBump: 15, tag: 'combo' },
  { suffix: 'High-Stakes Sprint', taskBump: 4, durationBump: 10, tag: 'sprint' },
  { suffix: 'CBT Pressure Drill', taskBump: 5, durationBump: 12, tag: 'cbt' },
  { suffix: 'Recall Mega-Pack', taskBump: 7, durationBump: 18, tag: 'telegram-recall' },
] as const;

function advancedTasksCountFor(subtest: OetSubtest, index: number): number {
  const base = tasksCountFor(subtest, index);
  const bump = pick([4, 6, 8, 10], index + 3);
  switch (subtest) {
    case 'listening':
      return Math.min(24, base + bump);
    case 'reading':
      return Math.min(28, base + bump);
    case 'writing':
      return Math.min(6, base + 2);
    case 'speaking':
      return Math.min(8, base + 2);
  }
}

function advancedDurationFor(
  subtest: OetSubtest,
  index: number,
  tasksCount: number,
  profileDurationBump: number,
): number {
  const base = durationFor(subtest, index, tasksCount);
  return Math.min(120, base + profileDurationBump + (index % 11 === 0 ? 15 : 0));
}

/** Advanced-only practice modules — ids `prac-adv-gen-0001`… */
export function generateAdvancedPracticeModule(serial: number): PracticeModule {
  const pool: ContentPool = 'advanced';
  const index = diversifiedIndex(pool, serial, 1);
  const subtest = pick(SUBTESTS, index + Math.floor(index / 3));
  const profession = professionFor(index + serial);
  const profile = pick(ADVANCED_PRACTICE_PROFILES, index);
  const pack = pick(ADVANCED_PRACTICE_PACK_LABELS, index);
  const theme = pick(CLINICAL_THEMES, index + 11);
  const topicBase = pick(TOPICS_BY_SUBTEST[subtest], index + 4);
  const tasksCount = advancedTasksCountFor(subtest, index);
  const durationMinutes = advancedDurationFor(subtest, index, tasksCount, profile.durationBump);
  const profShort = profession === 'All professions' ? 'All Professions' : profession;
  const subtestName = subtestLabel(subtest);
  const sourceHint = pick(SOURCE_HINTS, index + 6);
  const ref = catalogRef(pool, serial, subtest);

  const title = `${profShort} ${subtestName} ${pack} — ${profile.suffix} #${serial} [${ref}]`;
  const topic = `${topicBase} · ${theme} · advanced ${profile.suffix.toLowerCase()}`;
  const tags = new Set([
    ...buildTags(subtest, profession, index),
    'advanced-only',
    profile.tag,
    'grade-b-challenge',
    ref,
  ]);
  if (index % 5 === 0) tags.add('marathon');
  if (index % 7 === 0) tags.add('combo');

  const description = stampDescription(
    [
      `Advanced ${pack.toLowerCase()} for ${profShort.toLowerCase()} candidates — ${theme} under exam pressure.`,
      `${topicBase} with ${tasksCount} high-difficulty tasks (~${durationMinutes} min).`,
      `Profile: ${profile.suffix}. Inspired by ${sourceHint}.`,
    ],
    { pool, serial, subtest, profession, difficulty: 'advanced' },
  );

  return {
    id: `prac-adv-gen-${String(serial).padStart(4, '0')}`,
    subtest,
    title,
    topic,
    durationMinutes,
    difficulty: 'advanced',
    description,
    tasksCount,
    profession: profession === 'All professions' ? profession : profession,
    tags: [...tags],
    sourceHint,
  };
}

export function generateAdvancedPracticeModules(count: number): PracticeModule[] {
  return Array.from({ length: count }, (_, i) => generateAdvancedPracticeModule(i + 1));
}

/** Medicine + advanced + single-subtest practice — ids `prac-med-adv-{subtest}-0001`… */
export function generateMedicineAdvancedPracticeModule(
  subtest: OetSubtest,
  serial: number,
): PracticeModule {
  const pool: ContentPool = `medicine-advanced-${subtest}`;
  const index = diversifiedIndex(pool, serial, 2);
  const profile = pick(ADVANCED_PRACTICE_PROFILES, index);
  const pack = pick(ADVANCED_PRACTICE_PACK_LABELS, index);
  const theme = pick(MEDICINE_CLINICAL_THEMES, index + 11);
  const topicBase = pick(MEDICINE_TOPICS_BY_SUBTEST[subtest], index + 4);
  const tasksCount = advancedTasksCountFor(subtest, index);
  const durationMinutes = advancedDurationFor(subtest, index, tasksCount, profile.durationBump);
  const subtestName = subtestLabel(subtest);
  const sourceHint = pick(MEDICINE_SOURCE_HINTS, index + 6);
  const ref = catalogRef(pool, serial, subtest);

  const title = `Medicine ${subtestName} ${pack} — ${profile.suffix} #${serial} [${ref}]`;
  const topic = `${topicBase} · ${theme} · @OETDoctorsHub advanced`;
  const tags = new Set([
    ...buildMedicineTags(subtest, index),
    'advanced-only',
    'medicine-advanced',
    profile.tag,
    'grade-b-challenge',
    ref,
  ]);
  if (index % 5 === 0) tags.add('marathon');
  if (index % 7 === 0) tags.add('combo');

  const subtestFocus =
    subtest === 'writing'
      ? 'Referral letter / case notes transformation.'
      : subtest === 'speaking'
        ? 'Patient or colleague role-play under timed conditions.'
        : subtest === 'listening'
          ? 'Clinical listening — consultation notes, handover, lecture extracts.'
          : 'Clinical reading — policy, case notes, trial abstracts.';

  const description = stampDescription(
    [
      `Advanced ${pack.toLowerCase()} for physician (Medicine) candidates — ${theme} under exam pressure.`,
      subtestFocus,
      `${topicBase} with ${tasksCount} high-difficulty tasks (~${durationMinutes} min).`,
      `Profile: ${profile.suffix}. Inspired by ${sourceHint}.`,
    ],
    { pool, serial, subtest, profession: 'Medicine', difficulty: 'advanced' },
  );

  return {
    id: `prac-med-adv-${subtest}-${String(serial).padStart(4, '0')}`,
    subtest,
    title,
    topic,
    durationMinutes,
    difficulty: 'advanced',
    description,
    tasksCount,
    profession: 'Medicine',
    tags: [...tags],
    sourceHint,
  };
}

export function generateMedicineAdvancedPracticeModules(countPerSubtest: number): PracticeModule[] {
  return SUBTESTS.flatMap((subtest) =>
    Array.from({ length: countPerSubtest }, (_, i) =>
      generateMedicineAdvancedPracticeModule(subtest, i + 1),
    ),
  );
}
