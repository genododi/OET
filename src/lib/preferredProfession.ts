import type { Difficulty, MockExam, OetSubtest, PracticeModule } from '../types';

export const PREFERRED_PROFESSION_KEY = 'preferredProfession';
export const DEFAULT_PROFESSION = 'Medicine';
export const TARGET_MEDICINE_ADVANCED_PER_SUBTEST = 1000;

/** Set Medicine on first visit; return stored or default value. */
export function initPreferredProfession(): string {
  try {
    const existing = localStorage.getItem(PREFERRED_PROFESSION_KEY);
    if (existing) return existing;
    localStorage.setItem(PREFERRED_PROFESSION_KEY, DEFAULT_PROFESSION);
    return DEFAULT_PROFESSION;
  } catch {
    return DEFAULT_PROFESSION;
  }
}

export function getPreferredProfession(): string {
  try {
    return localStorage.getItem(PREFERRED_PROFESSION_KEY) ?? DEFAULT_PROFESSION;
  } catch {
    return DEFAULT_PROFESSION;
  }
}

/** All professions + preferred first in filter chips. */
export function orderProfessions(professions: string[], preferred: string): string[] {
  const set = new Set(professions.filter((p) => p !== 'all'));
  const rest = [...set]
    .filter((p) => p !== preferred)
    .sort((a, b) => a.localeCompare(b));
  return ['all', preferred, ...rest];
}

export function moduleProfession(profession?: string): string {
  return profession ?? 'All professions';
}

/** Medicine filter includes Medicine-tagged and shared all-profession content. */
export function matchesProfessionFilter(itemProfession: string | undefined, filter: string): boolean {
  const prof = moduleProfession(itemProfession);
  if (filter === 'all') return true;
  if (filter === 'Medicine') {
    return prof === 'Medicine' || prof === 'All professions' || prof.includes('Medicine');
  }
  return prof === filter;
}

/** Count catalog items tagged or labelled for Medicine (matches Medicine filter). */
export function countMedicineCatalog<T extends { profession?: string; tags?: string[] }>(
  items: T[],
): number {
  return items.filter(
    (item) =>
      matchesProfessionFilter(item.profession, 'Medicine') ||
      item.tags?.includes('medicine') === true,
  ).length;
}

const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

export type MedicineAdvancedSubtestCounts = Record<OetSubtest | 'all', number>;

function emptySubtestCounts(): MedicineAdvancedSubtestCounts {
  return { all: 0, listening: 0, reading: 0, writing: 0, speaking: 0 };
}

/** Medicine + advanced practice modules per subtest (strict Medicine profession). */
export function countMedicineAdvancedPracticeBySubtest(
  modules: PracticeModule[],
): MedicineAdvancedSubtestCounts {
  const counts = emptySubtestCounts();
  for (const m of modules) {
    if (m.profession !== 'Medicine' || m.difficulty !== 'advanced') continue;
    counts.all += 1;
    counts[m.subtest] += 1;
  }
  return counts;
}

/** Medicine + advanced mocks — subtest tallies use includes() to match list filters. */
export function countMedicineAdvancedMockBySubtest(exams: MockExam[]): MedicineAdvancedSubtestCounts {
  const counts = emptySubtestCounts();
  for (const exam of exams) {
    if (exam.profession !== 'Medicine' || exam.difficulty !== 'advanced') continue;
    counts.all += 1;
    for (const subtest of SUBTESTS) {
      if (exam.subtests.includes(subtest)) counts[subtest] += 1;
    }
  }
  return counts;
}

export function isMedicineAdvancedCatalogItem(
  item: { profession?: string; difficulty: Difficulty },
): boolean {
  return item.profession === 'Medicine' && item.difficulty === 'advanced';
}

export function sortByPreferredProfession<T extends { profession?: string }>(
  items: T[],
  preferred: string,
): T[] {
  const rank = (p?: string) => {
    const prof = p ?? 'All professions';
    if (prof === preferred) return 0;
    if (prof === 'All professions') return 1;
    if (prof.includes(preferred)) return 2;
    return 3;
  };
  return [...items].sort((a, b) => rank(a.profession) - rank(b.profession));
}
