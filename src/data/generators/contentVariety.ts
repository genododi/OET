import type { Difficulty, OetSubtest } from '../../types';

export const GENERATED_PROFESSIONS = [
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Physiotherapy',
  'Dentistry',
  'Radiography',
  'Occupational Therapy',
  'Dietetics',
  'Podiatry',
  'Speech Pathology',
  'All professions',
] as const;

/** Professions used by the general (non–medicine-dedicated) generator pool. */
export const GENERATED_NON_MEDICINE_PROFESSIONS = GENERATED_PROFESSIONS.filter(
  (p) => p !== 'Medicine',
);

export const MEDICINE_PRACTICE_TAG_POOL = [
  'medicine',
  'physician',
  'doctors-hub',
  'referral-letter',
  'case-notes',
  'discharge',
  'ward-round',
  'gp-handover',
  'colleague-role-play',
  'patient-role-play',
  'telegram-recall',
  'official-style',
  'marathon',
  'sprint',
  'part-a',
  'part-b',
  'part-c',
  'timed',
  'acute',
  'chronic',
  'ethics',
  'mdt',
] as const;

export const MEDICINE_MOCK_TAG_POOL = [
  'medicine',
  'physician',
  'doctors-hub',
  'referral-letter',
  'case-notes',
  'full-mock',
  'mini-mock',
  'lrw',
  'telegram-recall',
  'official-style',
  'marathon',
  'cbt',
  'paper-based',
  'retake',
  '14-day-sprint',
  'listening',
  'reading',
  'writing',
  'speaking',
] as const;

export const MEDICINE_SOURCE_HINTS = [
  'Telegram @OETDoctorsHub recall theme',
  'Telegram @OETDoctorsHub debrief pattern',
  'OET official medicine sample pattern',
  'Physician recall log (pattern only)',
  'GP referral letter recall style',
  'Hospital medicine CBT debrief',
] as const;

export const MEDICINE_CLINICAL_THEMES = [
  'diabetes',
  'heart failure',
  'COPD',
  'stroke',
  'sepsis',
  'palliative care',
  'mental health',
  'renal medicine',
  'dermatology',
  'orthopaedics',
  'infection control',
  'medication safety',
  'hypertension',
  'chest pain',
  'DVT prophylaxis',
  'thyroid disorder',
  'hepatitis screening',
  'rheumatology flare',
  'oncology MDT',
  'geriatric frailty',
] as const;

export const ALLIED_PROFESSIONS = [
  'Physiotherapy',
  'Occupational Therapy',
  'Radiography',
  'Dietetics',
  'Podiatry',
  'Speech Pathology',
] as const;

export const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

/** The public catalog is deliberately an advanced-only Grade A training environment. */
export const DIFFICULTIES: Difficulty[] = ['advanced'];

export const PRACTICE_TAG_POOL = [
  'medicine',
  'nursing',
  'allied-health',
  'telegram-recall',
  'official-style',
  'marathon',
  'sprint',
  'part-a',
  'part-b',
  'part-c',
  'timed',
  'spelling',
  'role-play',
  'referral-letter',
  'discharge',
  'ward-round',
  'community',
  'acute',
  'chronic',
  'ethics',
] as const;

export const MOCK_TAG_POOL = [
  'medicine',
  'nursing',
  'allied-health',
  'telegram-recall',
  'official-style',
  'marathon',
  'mini-mock',
  'full-mock',
  'lrw',
  'cbt',
  'paper-based',
  'retake',
  '14-day-sprint',
  'listening',
  'reading',
  'writing',
  'speaking',
] as const;

export const SOURCE_HINTS = [
  'OET official sample pattern',
  'Telegram @OETDoctorsHub recall theme',
  'Telegram @OETNursesUK debrief',
  'Telegram @OETPharmacyPrep pattern',
  'Telegram @OETAlliedHealth shared set',
  'Community recall log (pattern only)',
  'Book PDF companion drill',
  'Ashgan library note style',
] as const;

export const PRACTICE_PACK_LABELS = [
  'Drill',
  'Sprint',
  'Recall Pack',
  'Skill Builder',
  'Timed Set',
  'Marathon Block',
  'Official-style Set',
  'Telegram Recall Pack',
] as const;

export const MOCK_PACK_LABELS = [
  'Full Mock',
  'Mini-Mock',
  'LRW Combo',
  'Sub-test Simulator',
  'Exam-Length Mock',
  'Recall Simulation',
  'CBT Block',
  'Paper-day Simulation',
] as const;

export const ADVANCED_PRACTICE_PACK_LABELS = [
  'Advanced Marathon Block',
  'Expert Combo Drill',
  'High-Stakes Timed Set',
  'Recall Mega-Pack',
  'CBT Pressure Drill',
  'Grade-B+ Challenge Set',
  'Multi-Part Expert Sprint',
  'Pre-Exam Advanced Block',
] as const;

export const ADVANCED_MOCK_PACK_LABELS = [
  'Advanced Full Mock',
  'Expert LRW Combo',
  'Exam-Length Simulation',
  '14-Day Sprint Mock',
  'High-Stakes CBT Block',
  'Recall Mega-Mock',
  'Grade-B+ Exam Simulation',
  'Paper-Day Advanced Mock',
] as const;

export function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!;
}

export function pickMany<T>(items: readonly T[], index: number, count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[(index + i * 7) % items.length]!;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export function subtestLabel(subtest: OetSubtest): string {
  return subtest.charAt(0).toUpperCase() + subtest.slice(1);
}
