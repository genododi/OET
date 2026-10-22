import { isDesktop } from './desktop';

const REGISTRY = 'oet-webapp-profiles-v1';
const PREFIX = 'oet-webapp-profile-data:';
export const isStudyKey = (key: string) => /^(oet[-:]|jahshan[-:]|usmle[-:])/.test(key) && !key.startsWith('oet-webapp-') || key === 'preferredProfession';
export const canBackUpKey = (key: string) => isStudyKey(key) && !/api.?key|anthropic-key|token|secret|password/i.test(key);
export type WebProfile = { id: string; name: string; createdAt: string };
type Registry = { active: string; profiles: WebProfile[] };
let raw: Storage | undefined;
let currentId = 'default';

function readRegistry(storage: Storage): Registry {
  const initial: Registry = { active: 'default', profiles: [{ id: 'default', name: 'My study profile', createdAt: new Date().toISOString() }] };
  const value = storage.getItem(REGISTRY);
  if (!value) return initial;
  const data = JSON.parse(value) as Registry;
  if (!Array.isArray(data.profiles) || !data.profiles.length || !data.profiles.some(p => p.id === data.active) || !data.profiles.every(p => /^[\w-]+$/.test(p.id) && typeof p.name === 'string')) throw Error('The saved profile list could not be read. Existing study data has been kept.');
  return data;
}

// Default keeps every pre-existing study key in place. Other profiles receive
// separate keys; switching never copies, removes or overwrites another profile.
export function profileStorage(storage: Storage, id: string): Storage {
  const prefix = `${PREFIX}${id}:`;
  const physical = (key: string) => isStudyKey(key) && id !== 'default' ? prefix + key : key;
  const keys = () => Array.from({ length: storage.length }, (_, n) => storage.key(n)!).filter(Boolean).flatMap(key => {
    if (key.startsWith(prefix) && id !== 'default') return [key.slice(prefix.length)];
    if (key.startsWith(PREFIX)) return [];
    return isStudyKey(key) && id !== 'default' ? [] : [key];
  });
  const methods = {
    getItem: (key: string) => storage.getItem(physical(String(key))),
    setItem: (key: string, value: string) => storage.setItem(physical(String(key)), String(value)),
    removeItem: (key: string) => storage.removeItem(physical(String(key))),
    key: (index: number) => keys()[index] ?? null,
    clear: () => keys().filter(isStudyKey).forEach(key => storage.removeItem(physical(key))),
  };
  return new Proxy(Object.create(null), {
    get: (_, key) => key === 'length' ? keys().length : key in methods ? methods[key as keyof typeof methods] : typeof key === 'string' ? methods.getItem(key) : undefined,
    set: (_, key, value) => { if (typeof key === 'string') methods.setItem(key, String(value)); return true; },
    deleteProperty: (_, key) => { if (typeof key === 'string') methods.removeItem(key); return true; },
    ownKeys: keys,
    getOwnPropertyDescriptor: (_, key) => typeof key === 'string' && keys().includes(key) ? { configurable: true, enumerable: true, writable: true, value: methods.getItem(key) } : undefined,
  }) as Storage;
}

export function initializeWebProfiles() {
  if (isDesktop() || raw) return;
  try {
    const storage = window.localStorage;
    currentId = readRegistry(storage).active;
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => profileStorage(storage, currentId) });
    raw = storage;
  } catch { /* A browser that blocks storage can still open study material. */ }
}
export function webProfiles() {
  if (!raw) throw Error('Local profiles need browser storage. Open outside Private Browsing and allow website data.');
  const data = readRegistry(raw);
  return { ...data, active: currentId };
}
export function createWebProfile(name: string) {
  const data = webProfiles();
  if (!name.trim()) throw Error('Enter a profile name.');
  if (data.profiles.length >= 30) throw Error('This device already has 30 study profiles.');
  const profile = { id: crypto.randomUUID(), name: name.trim().slice(0, 60), createdAt: new Date().toISOString() };
  raw!.setItem(REGISTRY, JSON.stringify({ active: data.active, profiles: [...data.profiles, profile] }));
  return profile;
}
export function selectWebProfile(id: string) {
  const data = webProfiles();
  if (!data.profiles.some(profile => profile.id === id)) throw Error('Profile not found.');
  raw!.setItem(REGISTRY, JSON.stringify({ ...data, active: id }));
}
export function profileBackup() {
  const profiles = webProfiles();
  return { version: 1, profileName: profiles.profiles.find(p => p.id === profiles.active)!.name, data: Object.fromEntries(Object.keys(localStorage).filter(canBackUpKey).map(key => [key, localStorage.getItem(key)!])) };
}
export function importProfileBackup(value: unknown) {
  const source = value as { data?: Record<string, unknown> };
  if (!source || typeof source.data !== 'object' || !source.data || Array.isArray(source.data)) throw Error('Choose an OET profile backup.');
  const entries = Object.entries(source.data);
  if (!entries.length || entries.some(([key, value]) => !canBackUpKey(key) || typeof value !== 'string')) throw Error('This backup contains unsupported entries. Nothing was imported.');
  let imported = 0;
  for (const [key, value] of entries) if (localStorage.getItem(key) === null) { localStorage.setItem(key, value as string); imported++; }
  return imported;
}
