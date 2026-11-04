import { useSyncExternalStore } from 'react';

const key = 'oet-file-completion-v1';
const event = 'oet-file-completion-changed';
function snapshot() { try { return localStorage.getItem(key) ?? '{}'; } catch { return '{}'; } }
function subscribe(listener: () => void) {
  window.addEventListener(event, listener); window.addEventListener('storage', listener);
  return () => { window.removeEventListener(event, listener); window.removeEventListener('storage', listener); };
}
function read(raw: string): Record<string, true> {
  try { const value = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([, done]) => done === true).map(([id]) => [id, true as const])) : {}; } catch { return {}; }
}
export function useMaterialCompletion() {
  const done = read(useSyncExternalStore(subscribe, snapshot, () => '{}'));
  return {
    isDone: (id: string) => done[id] === true,
    setDone: (id: string, value: boolean) => {
      const next = read(snapshot());
      if (value) next[id] = true; else delete next[id];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    },
  };
}
