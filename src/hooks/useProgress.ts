import { useCallback, useSyncExternalStore } from 'react';
import type { CompletedSession } from '../types/session';

const STORAGE_KEY = 'oet-study-partner-progress';

interface ProgressState {
  completed: CompletedSession[];
}

function readProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: [] };
    const parsed = JSON.parse(raw) as ProgressState;
    return { completed: parsed.completed ?? [] };
  } catch {
    return { completed: [] };
  }
}

let cache = readProgress();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function writeProgress(state: ProgressState) {
  cache = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cache;
}

export function useProgress() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markComplete = useCallback((session: CompletedSession) => {
    const next = readProgress();
    const without = next.completed.filter((c) => c.id !== session.id);
    writeProgress({ completed: [session, ...without].slice(0, 50) });
  }, []);

  const isComplete = useCallback(
    (id: string) => state.completed.some((c) => c.id === id),
    [state.completed],
  );

  return {
    completed: state.completed,
    markComplete,
    isComplete,
    completedCount: state.completed.length,
  };
}
