/**
 * App state: an external store with `useSyncExternalStore`. Mutations write through
 * to the persister (SQLite on device). `bootstrapStore()` loads everything once.
 */
import { useSyncExternalStore } from 'react';
import { todayKey, type Activity, type DateKey, type Log, type LogLookup, type LogState } from '../engine';
import { detectLang, setLang as setI18nLang, type Lang } from '../i18n';
import type { ThemeMode } from '../ui/theme';
import { createMemoryPersister, createPersister, type Persister } from '../data/persistence';
import { sampleActivities, sampleLogs } from './sample';

export interface AppState {
  ready: boolean;
  lang: Lang;
  themeMode: ThemeMode;
  onboarded: boolean;
  hintDismissed: boolean;
  today: DateKey;
  activities: Activity[];
  /** `${activityId}|${date}` → log */
  logs: Record<string, Log>;
}

const logKey = (activityId: string, date: DateKey) => `${activityId}|${date}`;

let state: AppState = {
  ready: false,
  lang: detectLang(undefined),
  themeMode: 'dark',
  onboarded: false,
  hintDismissed: false,
  today: todayKey(),
  activities: [],
  logs: {},
};
let persister: Persister = createMemoryPersister();

const listeners = new Set<() => void>();
function emit(next: Partial<AppState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export async function bootstrapStore(seedSamples = __DEV__): Promise<void> {
  persister = await createPersister();
  const snap = await persister.load();
  const lang = (snap.settings.lang as Lang | undefined) ?? state.lang;
  setI18nLang(lang);
  let activities = snap.activities;
  let logs = snap.logs;
  if (seedSamples && !activities.length && !snap.settings.seeded) {
    activities = sampleActivities(state.today, lang);
    logs = sampleLogs(activities, state.today);
    for (const a of activities) await persister.saveActivity(a);
    for (const l of logs) await persister.setLog(l.activityId, l.date, l.state, l);
    await persister.setSetting('seeded', '1');
  }
  emit({
    ready: true,
    lang,
    themeMode: (snap.settings.themeMode as ThemeMode | undefined) ?? 'dark',
    onboarded: snap.settings.onboarded === '1',
    hintDismissed: snap.settings.hintDismissed === '1',
    activities,
    logs: Object.fromEntries(logs.map((l) => [logKey(l.activityId, l.date), l])),
  });
}

export const appStore = {
  getState: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  refreshToday() {
    const today = todayKey();
    if (today !== state.today) emit({ today });
  },
  setLang(lang: Lang) {
    setI18nLang(lang);
    emit({ lang });
    void persister.setSetting('lang', lang);
  },
  setThemeMode(themeMode: ThemeMode) {
    emit({ themeMode });
    void persister.setSetting('themeMode', themeMode);
  },
  completeOnboarding() {
    emit({ onboarded: true });
    void persister.setSetting('onboarded', '1');
  },
  dismissHint() {
    emit({ hintDismissed: true });
    void persister.setSetting('hintDismissed', '1');
  },
  setLog(activityId: string, date: DateKey, next: LogState | null, extra: Partial<Log> = {}) {
    const logs = { ...state.logs };
    const key = logKey(activityId, date);
    if (next) logs[key] = { activityId, date, state: next, ...extra };
    else delete logs[key];
    emit({ logs });
    void persister.setLog(activityId, date, next, extra);
  },
  upsertActivity(a: Activity) {
    const i = state.activities.findIndex((x) => x.id === a.id);
    const activities = i >= 0 ? state.activities.map((x) => (x.id === a.id ? a : x)) : [...state.activities, a];
    emit({ activities });
    void persister.saveActivity(a);
  },
  setArchived(id: string, archived: boolean) {
    const a = state.activities.find((x) => x.id === id);
    if (a) appStore.upsertActivity({ ...a, archived });
  },
  deleteActivity(id: string) {
    const logs = Object.fromEntries(Object.entries(state.logs).filter(([, l]) => l.activityId !== id));
    emit({ activities: state.activities.filter((a) => a.id !== id), logs });
    void persister.deleteActivity(id);
  },
};

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(appStore.subscribe, () => selector(state), () => selector(state));
}

export function useLogLookup(): LogLookup {
  const logs = useAppStore((s) => s.logs);
  return (id, date) => logs[logKey(id, date)]?.state ?? null;
}

export function useLog(activityId: string, date: DateKey): Log | null {
  return useAppStore((s) => s.logs[logKey(activityId, date)] ?? null);
}

export function useActivity(id: string | undefined): Activity | undefined {
  return useAppStore((s) => s.activities.find((a) => a.id === id));
}

export function newId(): string {
  return `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
