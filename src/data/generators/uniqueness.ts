import type { Difficulty, OetSubtest } from '../../types';

/** Catalog pool identifiers — each generated entry belongs to exactly one pool. */
export type ContentPool =
  | 'general'
  | 'medicine'
  | 'advanced'
  | `medicine-advanced-${OetSubtest}`;

export type MockContentPool =
  | 'general'
  | 'medicine'
  | 'advanced'
  | `medicine-advanced-${OetSubtest}`;

/** FNV-1a 32-bit hash — deterministic spread for offsets and task ordering. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Pool-specific salt so identical serials across pools pick different template rows. */
export function poolIndexSalt(pool: ContentPool | MockContentPool): number {
  return hashString(pool) % 9973;
}

/** Stable catalog reference embedded in titles/descriptions for zero-collision IDs. */
export function catalogRef(
  pool: ContentPool | MockContentPool,
  serial: number,
  subtest?: OetSubtest,
): string {
  const sub = subtest ? `/${subtest}` : '';
  return `${pool}${sub}#${serial}`;
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function contentFingerprint(text: string): string {
  const h1 = hashString(text);
  const h2 = hashString(`${text}\0flip`);
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Shift index per pool so pick() cycles diverge across medicine/general/advanced pools. */
export function diversifiedIndex(
  pool: ContentPool | MockContentPool,
  serial: number,
  extra = 0,
): number {
  const index = serial - 1;
  return index + poolIndexSalt(pool) + extra * 1009;
}

/** Append pool/subtest/profession/difficulty/serial stamp — guarantees unique descriptions. */
export function stampDescription(
  parts: string[],
  ctx: {
    pool: ContentPool | MockContentPool;
    serial: number;
    subtest: OetSubtest;
    profession: string;
    difficulty: Difficulty;
  },
): string {
  const ref = catalogRef(ctx.pool, ctx.serial, ctx.subtest);
  return [
    ...parts,
    `[${ref} · ${ctx.subtest} · ${ctx.profession} · ${ctx.difficulty}]`,
  ].join(' ');
}

export function sortedTagsFingerprint(tags: readonly string[]): string {
  return [...tags].sort().join('|');
}
