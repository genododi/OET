import type { NavSection, OetSubtest } from '../types';

export interface AppRoute {
  section: NavSection;
  itemId?: string;
  returnTo?: 'recent';
}

const validSections = new Set<string>([
  'app',
  'benchmark',
  'jahshan',
  'drills',
  'walkthrough',
  'dashboard',
  'notebook',
  'listening',
  'materials',
  'recent',
  'home',
  'mentor',
  'mistakes',
  'planner',
  'resources',
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

  const [path, query] = hash.split('?');
  const [sectionPart, itemId] = path.split('/');
  if (!validSections.has(sectionPart)) return { section: 'home' };

  return {
    section: sectionPart as NavSection,
    itemId: itemId || undefined,
    ...(sectionPart === 'materials' && itemId && new URLSearchParams(query).get('from') === 'recent' ? { returnTo: 'recent' as const } : {}),
  };
}

export function buildHash(section: NavSection, itemId?: string, returnTo?: 'recent'): string {
  if (section === 'home') return '';
  if (itemId) return `#${section}/${itemId}${section === 'materials' && returnTo === 'recent' ? '?from=recent' : ''}`;
  return `#${section}`;
}

export function isPracticeFilter(itemId?: string): itemId is OetSubtest {
  return !!itemId && subtests.has(itemId);
}
