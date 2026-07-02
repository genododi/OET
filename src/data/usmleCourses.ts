/** Public metadata for Coursology Q-Bank offerings (no copyrighted question content). */

export const coursologyPortalUrl = 'https://coursology-qbank.com/';
export const coursologySignInUrl = 'https://coursology-qbank.com/auth/signin';
export const coursologyTelegramUrl = 'https://t.me/coursologyy';
export const coursologyUpdatesUrl = 'https://t.me/s/coursologyqbank';

export type UsmleStep = 'step1' | 'step2' | 'step3' | 'all';

export interface UsmleQBank {
  id: string;
  name: string;
  description: string;
  steps: UsmleStep[];
  /** Public page when available; otherwise the Coursology portal (login required). */
  url: string;
  category: 'primary' | 'self-assessment' | 'cms' | 'mehlman' | 'library';
}

export const usmleCatalogMeta = {
  title: 'USMLE (Coursology Q-Bank)',
  subtitle: 'Question banks for physicians preparing USMLE Step 1, Step 2 CK, and Step 3',
  portalNote:
    'Individual Q-banks are accessed after sign-in at coursology-qbank.com. This catalog lists publicly announced offerings only — no question content is hosted here.',
};

export const usmleQBanks: UsmleQBank[] = [
  // ── Primary question banks ──
  {
    id: 'uworld-step1',
    name: 'UWorld Step 1',
    description: 'Full UWorld Step 1 question bank with clinical vignettes and detailed explanations.',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'uworld-step2',
    name: 'UWorld Step 2 CK',
    description: 'UWorld Step 2 CK questions — widely used for clinical reasoning before the CK exam.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'uworld-step3',
    name: 'UWorld Step 3',
    description: 'UWorld Step 3 question bank including CCS-style cases.',
    steps: ['step3'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'amboss-step1',
    name: 'AMBOSS Step 1',
    description: 'AMBOSS Step 1 Q-bank with integrated library references (8,000+ questions across steps).',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'amboss-step2',
    name: 'AMBOSS Step 2 CK',
    description: 'AMBOSS Step 2 CK Q-bank — ethics, biostatistics, and library-linked explanations.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'amboss-step3',
    name: 'AMBOSS Step 3',
    description: 'AMBOSS Step 3 Q-bank for final licensing exam prep.',
    steps: ['step3'],
    url: coursologyPortalUrl,
    category: 'primary',
  },
  {
    id: 'usmle-step3-qbank',
    name: 'USMLE Step 3 Q-Bank',
    description: 'Dedicated Step 3 question bank (~2,000 questions) on the Coursology platform.',
    steps: ['step3'],
    url: coursologyPortalUrl,
    category: 'primary',
  },

  // ── NBME self-assessments (Step 1) ──
  {
    id: 'nbme-step1-collective',
    name: 'NBME Step 1 (Collective)',
    description: 'Legacy combined NBME Step 1 bank holding all forms together; progress preserved for existing users.',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  ...([25, 26, 27, 28, 29, 30, 31, 32] as const).map(
    (n): UsmleQBank => ({
      id: `nbme-step1-${n}`,
      name: `NBME ${n} (Step 1)`,
      description:
        n === 25
          ? 'Retired NBME Form 25 — exposure only; not recommended for score prediction.'
          : `NBME Self-Assessment Form ${n} for Step 1 with subject/system/topic organization and ordered test mode.`,
      steps: ['step1'],
      url: coursologyPortalUrl,
      category: 'self-assessment',
    }),
  ),
  ...([20, 21, 22, 23, 24] as const).map(
    (n): UsmleQBank => ({
      id: `nbme-step1-retired-${n}`,
      name: `NBME ${n} — Retired (Step 1)`,
      description: `Retired NBME Form ${n} for extra question exposure after completing current forms.`,
      steps: ['step1'],
      url: coursologyPortalUrl,
      category: 'self-assessment',
    }),
  ),
  {
    id: 'free120-step1-2024',
    name: 'NBME Free 120 — 2024 (Step 1)',
    description: 'Official NBME Free 120 practice set (2024 edition).',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'free120-step1-2022',
    name: 'NBME Free 120 — 2022 (Step 1)',
    description: 'Official NBME Free 120 practice set (2022 edition).',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'free120-step1-2021',
    name: 'NBME Free 120 — 2021 (Step 1)',
    description: 'Official NBME Free 120 practice set (2021 edition).',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },

  // ── NBME / Free 120 (Step 2) ──
  {
    id: 'nbme-step2-form8-retired',
    name: 'NBME Form 8 — Retired (Step 2)',
    description: 'Retired Step 2 form for learning exposure only — not for assessment.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'free120-step2-2023',
    name: 'NBME Free 120 — 2023 (Step 2)',
    description: 'Official NBME Free 120 practice set (2023 edition) for Step 2 CK.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'free120-step2-2021',
    name: 'NBME Free 120 — 2021 (Step 2)',
    description: 'Official NBME Free 120 practice set (2021 edition) for Step 2 CK.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'free120-step2-2019',
    name: 'NBME Free 120 — 2019 (Step 2)',
    description: 'Official NBME Free 120 practice set (2019 edition) for Step 2 CK.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },

  // ── UWorld Self-Assessments ──
  {
    id: 'uwsa1-step1',
    name: 'UWSA 1 (Step 1)',
    description: 'UWorld Self-Assessment 1 for Step 1 — updated 2025 version with block-based interface.',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa2-step1',
    name: 'UWSA 2 (Step 1)',
    description: 'UWorld Self-Assessment 2 for Step 1 — updated 2025 version.',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa3-step1',
    name: 'UWSA 3 (Step 1)',
    description: 'UWorld Self-Assessment 3 for Step 1.',
    steps: ['step1'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa1-step2',
    name: 'UWSA 1 (Step 2 CK)',
    description: 'UWorld Self-Assessment 1 for Step 2 CK — updated 2025 version.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa2-step2',
    name: 'UWSA 2 (Step 2 CK)',
    description: 'UWorld Self-Assessment 2 for Step 2 CK — updated 2025 version.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa3-step2',
    name: 'UWSA 3 (Step 2 CK)',
    description: 'UWorld Self-Assessment 3 for Step 2 CK.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa1-step3',
    name: 'UWSA 1 (Step 3)',
    description: 'UWorld Self-Assessment 1 for Step 3.',
    steps: ['step3'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },
  {
    id: 'uwsa2-step3',
    name: 'UWSA 2 (Step 3)',
    description: 'UWorld Self-Assessment 2 for Step 3.',
    steps: ['step3'],
    url: coursologyPortalUrl,
    category: 'self-assessment',
  },

  // ── CMS (Clinical Mastery Series) ──
  {
    id: 'cms-unified',
    name: 'CMS Unified Q-Bank',
    description:
      'All NBME Clinical Mastery Series forms in one bank — practice individual forms or randomize; per-form statistics in Reports.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-medicine',
    name: 'CMS Internal Medicine',
    description: 'CMS Medicine forms 1–4 plus retired forms.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-neurology',
    name: 'CMS Neurology',
    description: 'CMS Neurology forms 1–4.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-obgyn',
    name: 'CMS Obstetrics & Gynecology',
    description: 'CMS Obs-Gyn forms 1–4.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-pediatrics',
    name: 'CMS Pediatrics',
    description: 'CMS Pediatrics forms 1, 3, 4, and 9.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-psychiatry',
    name: 'CMS Psychiatry',
    description: 'CMS Psychiatry forms 1–4 and 8.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-surgery',
    name: 'CMS Surgery',
    description: 'CMS Surgery forms 1–4 and 9.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },
  {
    id: 'cms-family-medicine',
    name: 'CMS Family Medicine',
    description: 'CMS Family Medicine form 1.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'cms',
  },

  // ── Mehlman high-yield (Step 2) ──
  {
    id: 'mehlman-im',
    name: 'Mehlman HY Internal Medicine',
    description: 'Mehlman high-yield Internal Medicine Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-fm',
    name: 'Mehlman HY Family Medicine',
    description: 'Mehlman high-yield Family Medicine Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-neuro',
    name: 'Mehlman HY Neurology',
    description: 'Mehlman high-yield Neurology Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-obgyn',
    name: 'Mehlman HY Ob/Gyn',
    description: 'Mehlman high-yield Obstetrics & Gynecology Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-peds',
    name: 'Mehlman HY Pediatrics',
    description: 'Mehlman high-yield Pediatrics Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-em',
    name: 'Mehlman HY Emergency Medicine',
    description: 'Mehlman high-yield Emergency Medicine Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-psych',
    name: 'Mehlman HY Psychiatry',
    description: 'Mehlman high-yield Psychiatry Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },
  {
    id: 'mehlman-surgery',
    name: 'Mehlman HY Surgery',
    description: 'Mehlman high-yield Surgery Q-bank.',
    steps: ['step2'],
    url: coursologyPortalUrl,
    category: 'mehlman',
  },

  // ── Medical libraries ──
  {
    id: 'amboss-library',
    name: 'AMBOSS Medical Library',
    description: 'Full AMBOSS library with searchable articles integrated on the platform.',
    steps: ['all'],
    url: coursologyPortalUrl,
    category: 'library',
  },
  {
    id: 'uworld-library',
    name: 'UWorld Medical Library',
    description: 'UWorld Medical Library (1,700+ articles) with original-style interface on Coursology.',
    steps: ['all'],
    url: coursologyPortalUrl,
    category: 'library',
  },
];

export const usmleCategoryLabels: Record<UsmleQBank['category'], string> = {
  primary: 'Primary Q-Banks',
  'self-assessment': 'NBME & UWSA Self-Assessments',
  cms: 'CMS (Clinical Mastery Series)',
  mehlman: 'Mehlman High-Yield',
  library: 'Medical Libraries',
};

export function groupUsmleQBanks(): { category: UsmleQBank['category']; label: string; items: UsmleQBank[] }[] {
  const order: UsmleQBank['category'][] = ['primary', 'self-assessment', 'cms', 'mehlman', 'library'];
  return order.map((category) => ({
    category,
    label: usmleCategoryLabels[category],
    items: usmleQBanks.filter((q) => q.category === category),
  }));
}
