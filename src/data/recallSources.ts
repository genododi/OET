/**
 * Public Telegram channels/groups referenced in recall-informed content (pattern awareness only).
 * Dr. Ashgan: no dedicated public handle found — see src/data/ashganGuide.ts for import status.
 */
export const recallSources = [
  { handle: '@officialoet', label: 'Official OET', note: 'Official preparation updates from oet.com' },
  { handle: '@OETDoctorsHub', label: 'OET Doctors Hub', note: 'Medicine-focused debriefs & referrals' },
] as const;

export const physicianRecallHint =
  'Prompts change every session — use Telegram debriefs for pattern recognition, not prediction.';
