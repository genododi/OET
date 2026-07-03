import type { MockExam, OetSubtest } from '../../types';
import {
  DIFFICULTIES,
  GENERATED_NON_MEDICINE_PROFESSIONS,
  MEDICINE_MOCK_TAG_POOL,
  MEDICINE_SOURCE_HINTS,
  ADVANCED_MOCK_PACK_LABELS,
  MOCK_PACK_LABELS,
  MOCK_TAG_POOL,
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
  type MockContentPool,
} from './uniqueness';

type MockProfile = {
  label: string;
  subtests: OetSubtest[];
  durationMinutes: number;
  questionsCount: number;
  tag: string;
};

const MOCK_PROFILES: MockProfile[] = [
  {
    label: 'Full Mock',
    subtests: ['listening', 'reading', 'writing', 'speaking'],
    durationMinutes: 180,
    questionsCount: 42,
    tag: 'full-mock',
  },
  {
    label: 'LRW Combo',
    subtests: ['listening', 'reading', 'writing'],
    durationMinutes: 150,
    questionsCount: 36,
    tag: 'lrw',
  },
  {
    label: 'Listening Mini-Mock',
    subtests: ['listening'],
    durationMinutes: 45,
    questionsCount: 24,
    tag: 'mini-mock',
  },
  {
    label: 'Reading Mini-Mock',
    subtests: ['reading'],
    durationMinutes: 60,
    questionsCount: 20,
    tag: 'mini-mock',
  },
  {
    label: 'Writing Mock Pack',
    subtests: ['writing'],
    durationMinutes: 45,
    questionsCount: 3,
    tag: 'mini-mock',
  },
  {
    label: 'Speaking Role-Play Pack',
    subtests: ['speaking'],
    durationMinutes: 30,
    questionsCount: 6,
    tag: 'mini-mock',
  },
  {
    label: 'Listening + Reading Block',
    subtests: ['listening', 'reading'],
    durationMinutes: 105,
    questionsCount: 32,
    tag: 'lrw',
  },
  {
    label: 'Writing Marathon',
    subtests: ['writing'],
    durationMinutes: 270,
    questionsCount: 6,
    tag: 'marathon',
  },
  {
    label: 'Speaking Marathon',
    subtests: ['speaking'],
    durationMinutes: 60,
    questionsCount: 10,
    tag: 'marathon',
  },
  {
    label: 'CBT @Home Simulation',
    subtests: ['listening', 'reading', 'writing'],
    durationMinutes: 150,
    questionsCount: 36,
    tag: 'cbt',
  },
  {
    label: 'Paper-Day Simulation',
    subtests: ['listening', 'reading', 'writing', 'speaking'],
    durationMinutes: 180,
    questionsCount: 42,
    tag: 'paper-based',
  },
  {
    label: '14-Day Sprint Mock',
    subtests: ['listening', 'reading', 'writing', 'speaking'],
    durationMinutes: 180,
    questionsCount: 42,
    tag: '14-day-sprint',
  },
  {
    label: 'Retake Single Sub-test',
    subtests: ['listening'],
    durationMinutes: 50,
    questionsCount: 12,
    tag: 'retake',
  },
];

const RETAKE_SUBTEST_ROTATION: OetSubtest[] = SUBTESTS;

const RECALL_THEMES = [
  'ward handover & discharge letter',
  'antibiotic stewardship & policy reading',
  'diabetes MDT & referral writing',
  'mental health consent & CBT policy',
  'stroke pathway & community transfer',
  'palliative symptom control & family speaking',
  'paediatric growth review & parent counselling',
  'telehealth rural outreach lecture',
  'medication counselling & OTC queries',
  'falls prevention & aged-care transfer',
  'sepsis bundle & acute referral',
  'occupational health clearance',
];

const MEDICINE_RECALL_THEMES = [
  'GP referral & cardiology handover',
  'antibiotic stewardship & hospital policy reading',
  'diabetes MDT & physician referral writing',
  'mental health capacity & colleague role-play',
  'stroke pathway & community physician transfer',
  'palliative symptom control & family speaking',
  'acute take clerking & discharge summary',
  'telehealth rural physician lecture',
  'anticoagulant counselling & patient role-play',
  'geriatric frailty & aged-care transfer letter',
  'sepsis bundle & urgent specialist referral',
  'occupational health physician clearance',
];

function buildMockTags(profile: MockProfile, profession: string, index: number): string[] {
  const tags = new Set<string>([
    profile.tag,
    ...profile.subtests,
    ...pickMany(MOCK_TAG_POOL, index, 3),
  ]);
  if (profession === 'Medicine') tags.add('medicine');
  if (profession === 'Nursing') tags.add('nursing');
  if (
    profession !== 'All professions' &&
    profession !== 'Medicine' &&
    profession !== 'Nursing'
  ) {
    tags.add('allied-health');
  }
  if (index % 11 === 0) tags.add('telegram-recall');
  if (index % 13 === 0) tags.add('official-style');
  return [...tags];
}

function resolveProfile(index: number): MockProfile {
  const base = pick(MOCK_PROFILES, index);
  if (base.label !== 'Retake Single Sub-test') return base;
  const subtest = pick(RETAKE_SUBTEST_ROTATION, index);
  return {
    ...base,
    label: `Retake Single Sub-test — ${subtestLabel(subtest)}`,
    subtests: [subtest],
  };
}

function buildMedicineMockTags(profile: MockProfile, index: number): string[] {
  const tags = new Set<string>([
    'medicine',
    'physician',
    'doctors-hub',
    profile.tag,
    ...profile.subtests,
    ...pickMany(MEDICINE_MOCK_TAG_POOL, index, 4),
  ]);
  if (profile.subtests.includes('writing')) {
    tags.add('referral-letter');
    tags.add('case-notes');
  }
  if (index % 11 === 0) tags.add('telegram-recall');
  if (index % 13 === 0) tags.add('official-style');
  return [...tags];
}

export function generateMockExam(serial: number): MockExam {
  const pool: MockContentPool = 'general';
  const index = diversifiedIndex(pool, serial);
  const profile = resolveProfile(index);
  const profession = pick(GENERATED_NON_MEDICINE_PROFESSIONS, index + 3);
  const difficulty = pick(DIFFICULTIES, index + 1);
  const pack = pick(MOCK_PACK_LABELS, index + 7);
  const theme = pick(RECALL_THEMES, index);
  const sourceHint = pick(SOURCE_HINTS, index + 4);
  const tags = [...buildMockTags(profile, profession, index), catalogRef(pool, serial)];
  const setLetter = String.fromCharCode(65 + (index % 26));
  const displayNum = serial;
  const ref = catalogRef(pool, serial);

  const subtestSummary =
    profile.subtests.length === 4
      ? 'all four sub-tests'
      : profile.subtests.map(subtestLabel).join(', ');

  const title =
    profile.subtests.length === 4 && profile.label === 'Full Mock'
      ? `${profile.label} — ${profession} (Set ${setLetter} · #${displayNum}) [${ref}]`
      : `${profile.label} — ${profession} #${displayNum} [${ref}]`;

  const description = stampDescription(
    [
      `${pack} covering ${subtestSummary} for ${profession}.`,
      `Theme: ${theme}.`,
      `Timed ${profile.durationMinutes} min, ${profile.questionsCount} items, ${difficulty} level.`,
      `Style reference: ${sourceHint}.`,
    ],
    {
      pool,
      serial,
      subtest: profile.subtests[0]!,
      profession,
      difficulty,
    },
  );

  const questionsCount =
    profile.questionsCount + (index % 7 === 0 ? 2 : 0) + (profile.tag === 'marathon' ? 0 : 0);

  return {
    id: `mock-gen-${String(serial).padStart(4, '0')}`,
    title,
    profession,
    subtests: [...profile.subtests],
    durationMinutes: profile.durationMinutes + (index % 9 === 0 ? 15 : 0),
    difficulty,
    description,
    questionsCount: Math.max(10, questionsCount),
    tags,
    sourceHint,
  };
}

export function generateMedicineMockExam(serial: number): MockExam {
  const pool: MockContentPool = 'medicine';
  const index = diversifiedIndex(pool, serial);
  const profile = resolveProfile(index);
  const profession = 'Medicine';
  const difficulty = pick(DIFFICULTIES, index + 1);
  const pack = pick(MOCK_PACK_LABELS, index + 7);
  const theme = pick(MEDICINE_RECALL_THEMES, index);
  const sourceHint = pick(MEDICINE_SOURCE_HINTS, index + 4);
  const ref = catalogRef(pool, serial);
  const tags = [...buildMedicineMockTags(profile, index), ref];
  const setLetter = String.fromCharCode(65 + (index % 26));
  const displayNum = serial;

  const subtestSummary =
    profile.subtests.length === 4
      ? 'all four sub-tests'
      : profile.subtests.map(subtestLabel).join(', ');

  const title =
    profile.subtests.length === 4 && profile.label === 'Full Mock'
      ? `Medicine ${profile.label} (Set ${setLetter} · #${displayNum}) [${ref}]`
      : `Medicine ${profile.label} #${displayNum} [${ref}]`;

  const description = stampDescription(
    [
      `${pack} covering ${subtestSummary} for physicians (Medicine).`,
      `Theme: ${theme}.`,
      `Timed ${profile.durationMinutes} min, ${profile.questionsCount} items, ${difficulty} level.`,
      `Style reference: ${sourceHint}.`,
    ],
    {
      pool,
      serial,
      subtest: profile.subtests[0]!,
      profession,
      difficulty,
    },
  );

  const questionsCount =
    profile.questionsCount + (index % 7 === 0 ? 2 : 0) + (profile.tag === 'marathon' ? 0 : 0);

  return {
    id: `mock-med-gen-${String(serial).padStart(4, '0')}`,
    title,
    profession,
    subtests: [...profile.subtests],
    durationMinutes: profile.durationMinutes + (index % 9 === 0 ? 15 : 0),
    difficulty,
    description,
    questionsCount: Math.max(10, questionsCount),
    tags,
    sourceHint,
  };
}

export function generateMedicineMockExams(count: number): MockExam[] {
  return Array.from({ length: count }, (_, i) => generateMedicineMockExam(i + 1));
}

export function generateMockExams(count: number): MockExam[] {
  return Array.from({ length: count }, (_, i) => generateMockExam(i + 1));
}

const ADVANCED_MOCK_PROFILES: MockProfile[] = [
  MOCK_PROFILES.find((p) => p.tag === 'marathon')!,
  MOCK_PROFILES.find((p) => p.tag === '14-day-sprint')!,
  MOCK_PROFILES.find((p) => p.tag === 'lrw')!,
  MOCK_PROFILES.find((p) => p.tag === 'full-mock')!,
  MOCK_PROFILES.find((p) => p.label === 'LRW Combo')!,
  MOCK_PROFILES.find((p) => p.tag === 'cbt')!,
  MOCK_PROFILES.find((p) => p.tag === 'paper-based')!,
  {
    label: 'Advanced L/R/W Combo',
    subtests: ['listening', 'reading', 'writing'],
    durationMinutes: 165,
    questionsCount: 44,
    tag: 'combo',
  },
  {
    label: 'Advanced Speaking Marathon',
    subtests: ['speaking'],
    durationMinutes: 75,
    questionsCount: 14,
    tag: 'marathon',
  },
  {
    label: 'Expert Multi-Subtest Block',
    subtests: ['listening', 'reading', 'writing', 'speaking'],
    durationMinutes: 195,
    questionsCount: 48,
    tag: 'marathon',
  },
];

function resolveAdvancedProfile(index: number): MockProfile {
  const profile = pick(ADVANCED_MOCK_PROFILES, index);
  if (profile.label !== 'Retake Single Sub-test') return profile;
  const subtest = pick(RETAKE_SUBTEST_ROTATION, index);
  return {
    ...profile,
    label: `Retake Single Sub-test — ${subtestLabel(subtest)}`,
    subtests: [subtest],
  };
}

/** Advanced-only mock exams — ids `mock-adv-gen-0001`… */
export function generateAdvancedMockExam(serial: number): MockExam {
  const pool: MockContentPool = 'advanced';
  const index = diversifiedIndex(pool, serial, 1);
  const profile = resolveAdvancedProfile(index);
  const profession = pick(GENERATED_NON_MEDICINE_PROFESSIONS, index + serial);
  const pack = pick(ADVANCED_MOCK_PACK_LABELS, index);
  const theme = pick(RECALL_THEMES, index + 3);
  const sourceHint = pick(SOURCE_HINTS, index + 8);
  const ref = catalogRef(pool, serial);
  const tags = new Set([
    ...buildMockTags(profile, profession, index),
    'advanced-only',
    'grade-b-challenge',
    ref,
  ]);
  if (profile.subtests.length >= 3) tags.add('combo');
  if (profile.tag === 'marathon' || index % 4 === 0) tags.add('marathon');

  const setLetter = String.fromCharCode(65 + (index % 26));
  const subtestSummary =
    profile.subtests.length === 4
      ? 'all four sub-tests'
      : profile.subtests.map(subtestLabel).join(', ');

  const title =
    profile.subtests.length === 4
      ? `${pack} — ${profession} (Set ${setLetter} · #${serial}) [${ref}]`
      : `${pack} — ${profession} #${serial} [${ref}]`;

  const questionsCount = Math.max(
    profile.questionsCount + 4 + (index % 5),
    profile.tag === 'marathon' ? profile.questionsCount + 6 : profile.questionsCount + 2,
  );

  const description = stampDescription(
    [
      `Advanced ${pack.toLowerCase()} covering ${subtestSummary} for ${profession}.`,
      `Theme: ${theme}. Timed ${profile.durationMinutes} min, ${questionsCount} items — expert level.`,
      `Style reference: ${sourceHint}.`,
    ],
    {
      pool,
      serial,
      subtest: profile.subtests[0]!,
      profession,
      difficulty: 'advanced',
    },
  );

  return {
    id: `mock-adv-gen-${String(serial).padStart(4, '0')}`,
    title,
    profession,
    subtests: [...profile.subtests],
    durationMinutes: profile.durationMinutes + (index % 6 === 0 ? 15 : 5),
    difficulty: 'advanced',
    description,
    questionsCount,
    tags: [...tags],
    sourceHint,
  };
}

export function generateAdvancedMockExams(count: number): MockExam[] {
  return Array.from({ length: count }, (_, i) => generateAdvancedMockExam(i + 1));
}

const SINGLE_SUBTEST_MOCK_PROFILES: Record<OetSubtest, MockProfile[]> = {
  listening: MOCK_PROFILES.filter((p) => p.subtests.length === 1 && p.subtests[0] === 'listening'),
  reading: MOCK_PROFILES.filter((p) => p.subtests.length === 1 && p.subtests[0] === 'reading'),
  writing: MOCK_PROFILES.filter((p) => p.subtests.length === 1 && p.subtests[0] === 'writing'),
  speaking: MOCK_PROFILES.filter((p) => p.subtests.length === 1 && p.subtests[0] === 'speaking'),
};

/** Medicine + advanced + single-subtest mock — ids `mock-med-adv-{subtest}-0001`… */
export function generateMedicineAdvancedMockExam(subtest: OetSubtest, serial: number): MockExam {
  const pool: MockContentPool = `medicine-advanced-${subtest}`;
  const index = diversifiedIndex(pool, serial, 2);
  const profile = pick(SINGLE_SUBTEST_MOCK_PROFILES[subtest], index);
  const pack = pick(ADVANCED_MOCK_PACK_LABELS, index);
  const theme = pick(MEDICINE_RECALL_THEMES, index + 3);
  const sourceHint = pick(MEDICINE_SOURCE_HINTS, index + 8);
  const ref = catalogRef(pool, serial, subtest);
  const tags = new Set([
    ...buildMedicineMockTags(profile, index),
    'advanced-only',
    'medicine-advanced',
    'grade-b-challenge',
    subtest,
    ref,
  ]);
  if (profile.tag === 'marathon' || index % 4 === 0) tags.add('marathon');

  const questionsCount = Math.max(
    10,
    profile.questionsCount + 4 + (index % 5),
    profile.tag === 'marathon' ? profile.questionsCount + 6 : profile.questionsCount + 2,
  );

  const subtestFocus =
    subtest === 'writing'
      ? 'Referral letters and discharge summaries from physician case notes.'
      : subtest === 'speaking'
        ? 'Patient and colleague role-plays — consent, bad news, handover.'
        : subtest === 'listening'
          ? 'Ward handover, consultation note completion, clinical lectures.'
          : 'Hospital policy, consent forms, and clinical trial abstracts.';

  const title = `Medicine ${profile.label} — Advanced #${serial} [${ref}]`;
  const description = stampDescription(
    [
      `Advanced ${pack.toLowerCase()} — ${subtestLabel(subtest)} only for physicians (Medicine).`,
      subtestFocus,
      `Theme: ${theme}. Timed ${profile.durationMinutes} min, ${questionsCount} items.`,
      `Style reference: ${sourceHint}.`,
    ],
    { pool, serial, subtest, profession: 'Medicine', difficulty: 'advanced' },
  );

  return {
    id: `mock-med-adv-${subtest}-${String(serial).padStart(4, '0')}`,
    title,
    profession: 'Medicine',
    subtests: [subtest],
    durationMinutes: profile.durationMinutes + (index % 6 === 0 ? 15 : 5),
    difficulty: 'advanced',
    description,
    questionsCount,
    tags: [...tags],
    sourceHint,
  };
}

export function generateMedicineAdvancedMockExams(countPerSubtest: number): MockExam[] {
  return SUBTESTS.flatMap((subtest) =>
    Array.from({ length: countPerSubtest }, (_, i) =>
      generateMedicineAdvancedMockExam(subtest, i + 1),
    ),
  );
}
