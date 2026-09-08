/**
 * Persistence behind the store. SQLite on iOS/Android, memory on web and in tests.
 * Every store mutation writes through; `load()` runs once at startup.
 */
import { Platform } from 'react-native';
import type { Activity, DateKey, Log, LogState } from '../engine';
import { migrate } from './driver';
import { ExpoSqliteDriver } from './sqliteDriver';
import { ActivityRepository, LogRepository, SettingsRepository } from './repositories';

export interface Snapshot {
  activities: Activity[];
  logs: Log[];
  settings: Record<string, string>;
}

export interface Persister {
  load(): Promise<Snapshot>;
  saveActivity(a: Activity): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  setLog(activityId: string, date: DateKey, state: LogState | null, extra?: Partial<Log>): Promise<void>;
  setSetting(key: string, value: string): Promise<void>;
  clearAll(): Promise<void>;
}

export function createMemoryPersister(): Persister {
  const snap: Snapshot = { activities: [], logs: [], settings: {} };
  return {
    async load() { return snap; },
    async saveActivity(a) { const i = snap.activities.findIndex((x) => x.id === a.id); if (i >= 0) snap.activities[i] = a; else snap.activities.push(a); },
    async deleteActivity(id) { snap.activities = snap.activities.filter((a) => a.id !== id); snap.logs = snap.logs.filter((l) => l.activityId !== id); },
    async setLog(activityId, date, state, extra = {}) {
      snap.logs = snap.logs.filter((l) => !(l.activityId === activityId && l.date === date));
      if (state) snap.logs.push({ activityId, date, state, ...extra });
    },
    async setSetting(key, value) { snap.settings[key] = value; },
    async clearAll() { snap.activities = []; snap.logs = []; snap.settings = {}; },
  };
}

export async function createSqlitePersister(): Promise<Persister> {
  const driver = await ExpoSqliteDriver.open();
  await migrate(driver);
  const activities = new ActivityRepository(driver);
  const logs = new LogRepository(driver);
  const settings = new SettingsRepository(driver);
  return {
    async load() {
      const rows = await driver.all<{ key: string; value: string }>('SELECT key, value FROM settings');
      return {
        activities: await activities.list({ includeArchived: true }),
        logs: await logs.range('0000-01-01', '9999-12-31'),
        settings: Object.fromEntries(rows.map((r) => [r.key, r.value])),
      };
    },
    saveActivity: (a) => activities.save(a),
    deleteActivity: (id) => activities.delete(id),
    setLog: (activityId, date, state, extra) => logs.set(activityId, date, state, extra),
    setSetting: (key, value) => settings.set(key, value),
    clearAll: () => settings.clearAll(),
  };
}

/** SQLite when available; falls back to memory (web, tests, or a failed open) without crashing. */
export async function createPersister(): Promise<Persister> {
  if (Platform.OS === 'web') return createMemoryPersister();
  try {
    return await createSqlitePersister();
  } catch (err) {
    console.warn('SQLite unavailable, using in-memory store', err);
    return createMemoryPersister();
  }
}
