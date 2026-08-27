/**
 * App state: an external store with `useSyncExternalStore`. Mutations write through
 * to the persister (SQLite on device). `bootstrapStore()` loads everything once.
 */
import { useSyncExternalStore } from 'react';
import { todayKey, type Activity, type DateKey, type Log, type LogLookup, type LogState } from '../engine';
import { detectLang, setLang as setI18nLang, type Lang } from '../i18n';
import type { ThemeMode } from '../ui/theme';
import { createMemoryPersister, createPersister, type Persister, type Snapshot } from '../data/persistence';
import { setAnalyticsOptOut } from '../analytics';
import { sampleActivities, sampleLogs } from './sample';

export interface AppState {
  ready: boolean;
  lang: Lang;
  themeMode: ThemeMode;
  onboarded: boolean;
  hintDismissed: boolean;
  morningSummary: boolean;
  morningTime: string;
  analyticsOptOut: boolean;
  proInterest: boolean;
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
  morningSummary: true,
  morningTime: '08:00',
  analyticsOptOut: false,
  proInterest: false,
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
  setAnalyticsOptOut(snap.settings.analyticsOptOut === '1');
  emit({
    ready: true,
    lang,
    themeMode: (snap.settings.themeMode as ThemeMode | undefined) ?? 'dark',
    onboarded: snap.settings.onboarded === '1',
    hintDismissed: snap.settings.hintDismissed === '1',
    morningSummary: snap.settings.morningSummary !== '0',
    morningTime: snap.settings.morningTime ?? '08:00',
    analyticsOptOut: snap.settings.analyticsOptOut === '1',
    proInterest: snap.settings.proInterest === '1',
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
  setMorningSummary(morningSummary: boolean) {
    emit({ morningSummary });
    void persister.setSetting('morningSummary', morningSummary ? '1' : '0');
  },
  setMorningTime(morningTime: string) {
    emit({ morningTime });
    void persister.setSetting('morningTime', morningTime);
  },
  setAnalyticsOptOut(analyticsOptOut: boolean) {
    setAnalyticsOptOut(analyticsOptOut);
    emit({ analyticsOptOut });
    void persister.setSetting('analyticsOptOut', analyticsOptOut ? '1' : '0');
  },
  markProInterest() {
    emit({ proInterest: true });
    void persister.setSetting('proInterest', '1');
  },
  activeCount(): number {
    return state.activities.filter((a) => !a.archived && !(a.end && a.end < state.today)).length;
  },
  snapshot(): Snapshot {
    return {
      activities: state.activities,
      logs: Object.values(state.logs),
      settings: { lang: state.lang, themeMode: state.themeMode, morningSummary: state.morningSummary ? '1' : '0', morningTime: state.morningTime },
    };
  },
  /** Import a backup. `replace` wipes first; `merge` keeps the most recent log per activity and date (imported wins on ties). */
  async importSnapshot(snap: Snapshot, mode: 'replace' | 'merge'): Promise<void> {
    if (mode === 'replace') {
      await persister.clearAll();
      for (const key of ['lang', 'themeMode', 'onboarded', 'hintDismissed', 'morningSummary', 'morningTime', 'seeded'] as const) {
        const v = key === 'lang' ? state.lang : key === 'themeMode' ? state.themeMode : key === 'morningTime' ? state.morningTime : '1';
        await persister.setSetting(key, v);
      }
    }
    const byId = new Map(mode === 'merge' ? state.activities.map((a) => [a.id, a] as const) : []);
    for (const a of snap.activities) byId.set(a.id, a);
    const logs: Record<string, Log> = mode === 'merge' ? { ...state.logs } : {};
    for (const l of snap.logs) logs[logKey(l.activityId, l.date)] = l;
    for (const a of byId.values()) await persister.saveActivity(a);
    for (const l of snap.logs) await persister.setLog(l.activityId, l.date, l.state, l);
    emit({ activities: [...byId.values()], logs });
  },
  async clearAll(): Promise<void> {
    const lang = state.lang;
    await persister.clearAll();
    await persister.setSetting('lang', lang);
    await persister.setSetting('seeded', '1');
    emit({ activities: [], logs: {}, onboarded: false, hintDismissed: false, proInterest: false });
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
