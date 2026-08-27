import { useCallback, useSyncExternalStore } from 'react';
import type { CompletedSession } from '../types/session';

const STORAGE_KEY = 'oet-study-partner-progress';
export const MAX_COMPLETED_SESSIONS = 200;

interface ProgressState {
  schemaVersion: 1;
  completed: CompletedSession[];
}

const emptyProgress: ProgressState = { schemaVersion: 1, completed: [] };

export function migrateProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== 'object') return emptyProgress;
  const candidate = raw as { schemaVersion?: unknown; completed?: unknown };
  const completed = Array.isArray(candidate.completed)
    ? candidate.completed.filter((item): item is CompletedSession => {
        if (!item || typeof item !== 'object') return false;
        const session = item as Partial<CompletedSession>;
        return typeof session.id === 'string' && typeof session.completedAt === 'string';
      })
    : [];
  return { schemaVersion: 1, completed };
}

function readProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress;
    return migrateProgress(JSON.parse(raw));
  } catch {
    return emptyProgress;
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

/**
 * Preserve separate attempts of the same module so readiness trends and spaced
 * review can use every performance. Only an exact duplicate completion event is
 * replaced, which also keeps the write idempotent if a completion callback fires twice.
 */
export function mergeCompletedSession(
  completed: readonly CompletedSession[],
  session: CompletedSession,
): CompletedSession[] {
  const withoutExactDuplicate = completed.filter(
    (item) => item.id !== session.id || item.completedAt !== session.completedAt,
  );
  return [session, ...withoutExactDuplicate].slice(0, MAX_COMPLETED_SESSIONS);
}

export function useProgress() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markComplete = useCallback((session: CompletedSession) => {
    const next = readProgress();
    writeProgress({
      schemaVersion: 1,
      completed: mergeCompletedSession(next.completed, session),
    });
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
