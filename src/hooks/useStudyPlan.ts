import { useCallback, useSyncExternalStore } from 'react';
import type { DiagnosticProfile, StudyPlan } from '../types';
import { generateStudyPlan } from '../lib/studyPlanner';

const STORAGE_KEY = 'oet-study-partner-study-plan';

interface StudyPlanState {
  schemaVersion: 1;
  profile: DiagnosticProfile | null;
  plan: StudyPlan | null;
}

const emptyState: StudyPlanState = { schemaVersion: 1, profile: null, plan: null };

function readState(): StudyPlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<StudyPlanState>;
    if (parsed.schemaVersion !== 1) return emptyState;
    return {
      schemaVersion: 1,
      profile: parsed.profile ?? null,
      plan: parsed.plan ?? null,
    };
  } catch {
    return emptyState;
  }
}

let cache = readState();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeState(state: StudyPlanState) {
  cache = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

export function useStudyPlan() {
  const state = useSyncExternalStore(subscribe, () => cache, () => emptyState);

  const saveProfile = useCallback((profile: DiagnosticProfile) => {
    writeState({ schemaVersion: 1, profile, plan: generateStudyPlan(profile) });
  }, []);

  const clearPlan = useCallback(() => writeState(emptyState), []);

  return { ...state, saveProfile, clearPlan };
}
