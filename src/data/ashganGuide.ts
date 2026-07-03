import type { AshganGuideEntry, AshganTelegramLink } from '../types';

/**
 * Dr. Ashgan (OET instructor) — Telegram guide import metadata.
 *
 * ## Investigation (2026-05-30)
 * **Confirmed group:** "OET Victory with Dr Ashgan"
 * - Invite URL: https://t.me/+VFLW7jSfihO61Mys (private group chat — no public @username)
 * - Corroborated via Dr. Ashgan course promo (PDFology, Apr 2024) and Facebook page
 *   https://www.facebook.com/OET-Victory-with-Dr-Ashgan-109800194770405/
 * - No t.me/s/ preview — content cannot be scraped without Telegram Desktop export.
 *
 * Candidate @handles checked (all contact pages or unused — not this group):
 * @OETVictory, @OETVictoryWithDrAshgan, @VictoryWithDrAshgan, @DrAshganVictory,
 * @OETVictoryDrAshgan, @OETStudyGroup, @VFLW7jSfihO61Mys
 *
 * ## Complete a private-group import
 * 1. Join via https://t.me/+VFLW7jSfihO61Mys in Telegram.
 * 2. Settings → Advanced → Export Telegram data → select "OET Victory with Dr Ashgan" → JSON.
 * 3. Run: `npm run import-ashgan -- --export-json /path/to/result.json --download --write-ts`
 *
 * Populate `ashganGuideEntries` only from posts attributed to Dr. Ashgan (export sender match).
 * Media files live in `public/ashgan/` and catalog `src/data/ashganLibrary.ts` (auto-generated).
 */
export const ashganGuideMeta = {
  instructorName: 'Dr. Ashgan',
  role: 'OET instructor (Telegram study groups)',
  groupName: 'OET Victory with Dr Ashgan',
  /** Private invite-only group — no public @username. */
  telegramInviteUrl: 'https://t.me/+VFLW7jSfihO61Mys',
  telegramHandle: undefined as string | undefined,
  facebookPageUrl: 'https://www.facebook.com/OET-Victory-with-Dr-Ashgan-109800194770405/',
  importStatus: 'private_group_found' as const,
  investigatedAt: '2026-05-30',
  scopeNote:
    'OET Victory with Dr Ashgan is a private Telegram group (invite-only). Join via the link below, then export the chat in Telegram Desktop to import her guide and files here.',
  importReadme: [
    'Join: https://t.me/+VFLW7jSfihO61Mys',
    'Private export: Telegram Desktop → Export chat "OET Victory with Dr Ashgan" → npm run import-ashgan -- --export-json ./result.json --download --write-ts',
    'Public scrape is not available — this group has no t.me/s/ preview.',
  ],
  blockers: [
    'Group is private (invite link only) — no t.me/s/ post preview to scrape.',
    'No public @username for "OET Victory with Dr Ashgan"; join requires https://t.me/+VFLW7jSfihO61Mys.',
    'Full import blocked until a member exports the chat via Telegram Desktop (JSON).',
    'Do not use adjacent public channels as Dr. Ashgan content without verified attribution.',
  ],
  checkedHandles: [
    'OETVictory',
    'OETVictoryWithDrAshgan',
    'VictoryWithDrAshgan',
    'DrAshganVictory',
    'OETVictoryDrAshgan',
    'OETStudyGroup',
    'VFLW7jSfihO61Mys',
    'DrAshgan',
    'drashgan',
    'AshganOET',
    'Dr_Ashgan',
    'OETDrAshgan',
    'DrAshganOET',
    'OETAshgan',
    'Ashgan_OET',
    'OETAshganMedicine',
    'oetashgan',
    'OETDoctorsHub',
    'OETDoctors',
    'OETimportantmaterials',
    'OET_ForDoctors',
    'officialoet',
  ],
} as const;

/** Primary and related Telegram links for medicine OET communities. */
export const ashganRelatedTelegram: AshganTelegramLink[] = [
  {
    handle: 'OET Victory with Dr Ashgan',
    label: 'OET Victory with Dr Ashgan',
    url: 'https://t.me/+VFLW7jSfihO61Mys',
    note: 'Dr. Ashgan\'s private study group — join via invite link, then export in Telegram Desktop to import.',
    visibility: 'private',
  },
  {
    handle: '@OETDoctorsHub',
    label: 'OET Doctors Hub',
    url: 'https://t.me/OETDoctorsHub',
    note: 'Medicine debriefs — separate private group; export chat in Telegram Desktop to import.',
    visibility: 'private',
  },
  {
    handle: '@OETDoctors',
    label: 'OET doctors (Amr Darwish)',
    url: 'https://t.me/OETDoctors',
    note: 'Public channel — adjacent OET medicine tips; preview at t.me/s/OETDoctors.',
    visibility: 'public',
  },
  {
    handle: '@OETimportantmaterials',
    label: 'OET Important materials',
    url: 'https://t.me/OETimportantmaterials',
    note: 'Public channel with shared PDFs and study links (not verified as Dr. Ashgan).',
    visibility: 'public',
  },
  {
    handle: '@officialoet',
    label: 'Official OET',
    url: 'https://t.me/officialoet',
    note: 'Official preparation updates from oet.com.',
    visibility: 'public',
  },
];

/**
 * Text guide entries attributed to Dr. Ashgan only (export or verified public posts).
 */
export const ashganGuideEntries: AshganGuideEntry[] = [];
