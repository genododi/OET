import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'oet-study-partner-anthropic-key';

let cache: string | null = readKey();
const listeners = new Set<() => void>();

function readKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cache;
}

export function setApiKey(key: string) {
  cache = key.trim() || null;
  try {
    if (cache) localStorage.setItem(STORAGE_KEY, cache);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage unavailable — key stays in memory for this session only */
  }
  emit();
}

export function clearApiKey() {
  setApiKey('');
}

export function getApiKey(): string | null {
  return cache;
}

/** Reactive read/write access to the user's own Anthropic API key, stored only in this browser. */
export function useApiKey() {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const save = useCallback((key: string) => setApiKey(key), []);
  const clear = useCallback(() => clearApiKey(), []);
  return { apiKey, save, clear, hasKey: !!apiKey };
}
