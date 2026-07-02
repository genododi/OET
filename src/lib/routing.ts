import type { NavSection, OetSubtest } from '../types';

export interface AppRoute {
  section: NavSection;
  itemId?: string;
}

const validSections = new Set<string>([
  'home',
  'mock',
  'practice',
  'guide',
  'tips',
  'pearls',
  'experiences',
  'books',
  'experience-pdfs',
  'usmle',
]);

const subtests = new Set<string>(['listening', 'reading', 'writing', 'speaking']);

export function parseRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { section: 'home' };

  const [sectionPart, itemId] = hash.split('/');
  if (!validSections.has(sectionPart)) return { section: 'home' };

  return {
    section: sectionPart as NavSection,
    itemId: itemId || undefined,
  };
}

export function buildHash(section: NavSection, itemId?: string): string {
  if (section === 'home') return '';
  if (itemId) return `#${section}/${itemId}`;
  return `#${section}`;
}

export function isPracticeFilter(itemId?: string): itemId is OetSubtest {
  return !!itemId && subtests.has(itemId);
}
