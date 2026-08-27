/**
 * App state for Wave 1: an external store with `useSyncExternalStore`, no dependencies.
 * Persistence moves to SQLite in Wave 2 (repositories are already in `src/data`).
 */
import { useSyncExternalStore } from 'react';
import { todayKey, type Activity, type DateKey, type LogLookup, type LogState } from '../engine';
import { detectLang, setLang as setI18nLang, type Lang } from '../i18n';
import type { ThemeMode } from '../ui/theme';
import { sampleActivities, sampleLogs } from './sample';

export interface AppState {
  lang: Lang;
  themeMode: ThemeMode;
  onboarded: boolean;
  today: DateKey;
  activities: Activity[];
  /** `${activityId}|${date}` → state */
  logs: Record<string, LogState>;
}

const initialLang = detectLang(undefined);
const today = todayKey();
const activities = sampleActivities(today, initialLang);

let state: AppState = {
  lang: initialLang,
  themeMode: 'dark',
  onboarded: false,
  today,
  activities,
  logs: sampleLogs(activities, today),
};
setI18nLang(initialLang);

const listeners = new Set<() => void>();
function emit(next: Partial<AppState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const appStore = {
  getState: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setLang(lang: Lang) {
    setI18nLang(lang);
    emit({ lang, activities: sampleActivities(state.today, lang) });
  },
  setThemeMode: (themeMode: ThemeMode) => emit({ themeMode }),
  completeOnboarding: () => emit({ onboarded: true }),
  setLog(activityId: string, date: DateKey, next: LogState | null) {
    const logs = { ...state.logs };
    const key = `${activityId}|${date}`;
    if (next) logs[key] = next;
    else delete logs[key];
    emit({ logs });
  },
  addActivity: (a: Activity) => emit({ activities: [...state.activities, a] }),
};

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(appStore.subscribe, () => selector(state), () => selector(state));
}

export function useLogLookup(): LogLookup {
  const logs = useAppStore((s) => s.logs);
  return (id, date) => logs[`${id}|${date}`] ?? null;
}
