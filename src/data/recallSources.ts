/**
 * Public Telegram channels/groups referenced in recall-informed content (pattern awareness only).
 * Dr. Ashgan: no dedicated public handle found — see src/data/ashganGuide.ts for import status.
 */
export const recallSources = [
  { handle: '@officialoet', label: 'Official OET', note: 'Official preparation updates from oet.com' },
  { handle: '@oetexams_materias', label: 'OET Test Preparation', note: '~15k members — shared materials' },
  { handle: '@OETDoctorsHub', label: 'OET Doctors Hub', note: 'Medicine-focused debriefs & referrals' },
  { handle: '@OETNursesUK', label: 'OET Nurses UK', note: 'Nursing CBT/paper recalls' },
  { handle: '@OETPharmacyPrep', label: 'OET Pharmacy Prep', note: 'Pharmacy writing & speaking' },
  { handle: '@OETAlliedHealth', label: 'OET Allied Health', note: 'Physio, radiography, OT' },
] as const;

export const physicianRecallHint =
  'Prompts change every session — use Telegram debriefs for pattern recognition, not prediction.';
