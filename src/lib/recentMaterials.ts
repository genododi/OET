import type { OetSubtest } from '../types';

export type MaterialOrigin = 'telegram' | 'local' | 'drive' | 'collection';
export interface RecentMaterial {
  id: string; sha256: string; filename: string; format: string; bytes: number;
  collection: string; skills: OetSubtest[]; addedAt: string;
  sources: { kind: MaterialOrigin; label: string }[];
}
const origins = new Set(['telegram', 'local', 'drive', 'collection']);
const skills = new Set(['listening', 'reading', 'writing', 'speaking']);
export function readRecentMaterials(value: unknown): RecentMaterial[] {
  const data = value as { version?: number; files?: unknown[] } | null;
  if (data?.version !== 1 || !Array.isArray(data.files)) throw Error('The recently added list could not be read.');
  const seen = new Set<string>();
  for (const value of data.files) {
    const file = value as RecentMaterial | null;
    if (!file || !/^[a-f0-9]{64}$/.test(file.sha256) || seen.has(file.sha256) || typeof file.id !== 'string' || !/^[\w-]+$/.test(file.id) ||
      typeof file.filename !== 'string' || typeof file.format !== 'string' || typeof file.collection !== 'string' || !Number.isFinite(file.bytes) || file.bytes < 0 ||
      typeof file.addedAt !== 'string' || !Number.isFinite(Date.parse(file.addedAt)) || !Array.isArray(file.skills) || !file.skills.every(skill => skills.has(skill)) ||
      !Array.isArray(file.sources) || !file.sources.length || !file.sources.every(source => source && origins.has(source.kind) && typeof source.label === 'string')) throw Error('The recently added list could not be read.');
    seen.add(file.sha256);
  }
  return (data.files as RecentMaterial[]).slice().sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt) || a.filename.localeCompare(b.filename));
}
export function filterRecentMaterials(files: RecentMaterial[], query: string, origin: string, skill: string, format: string) {
  const q = query.toLocaleLowerCase().trim();
  return files.filter(file => (!q || `${file.filename} ${file.collection} ${file.sources.map(source => source.label).join(' ')}`.toLocaleLowerCase().includes(q)) &&
    (origin === 'all' || file.sources.some(source => source.kind === origin)) && (skill === 'all' || file.skills.includes(skill as OetSubtest)) && (format === 'all' || file.format === format));
}
