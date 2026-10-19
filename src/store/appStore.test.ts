import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAnalyticsOptedOut } from '../analytics';
import type { Persister } from '../data/persistence';
import { getLang } from '../i18n';
import { newDraft } from '../ui/editor/editorModel';
import { appStore, bootstrapStore } from './appStore';

// __DEV__ is a React Native global; tests run in node.
(globalThis as Record<string, unknown>).__DEV__ = false;

/** Let the store's write-through (fire-and-forget) finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const device = vi.hoisted(() => ({ tags: ['en-US'] as string[], saved: {} as Record<string, string> }));

vi.mock('../i18n/device', () => ({ deviceLocaleTags: () => device.tags }));
// The real persister opens SQLite. This one keeps the settings in `device.saved`, which outlives a
// launch the way the database does, so calling bootstrapStore() again is the next launch.
vi.mock('../data/persistence', () => {
  const disk = (): Persister => ({
    load: async () => ({ activities: [], logs: [], settings: { ...device.saved } }),
    saveActivity: async () => {},
    deleteActivity: async () => {},
    setLog: async () => {},
    setSetting: async (key, value) => { device.saved[key] = value; },
    clearAll: async () => { device.saved = {}; },
  });
  return { createMemoryPersister: disk, createPersister: async () => disk() };
});

describe('starting language', () => {
  beforeEach(() => { device.saved = {}; });

  it('starts a first launch in Spanish on a Spanish device', async () => {
    device.tags = ['es-MX'];
    await bootstrapStore(false);
    expect(appStore.getState().lang).toBe('es');
    expect(getLang()).toBe('es');
  });
  it('starts a first launch in English on an English device', async () => {
    device.tags = ['en-GB'];
    await bootstrapStore(false);
    expect(appStore.getState().lang).toBe('en');
    expect(getLang()).toBe('en');
  });
  it('falls back to English on a device language the app does not speak', async () => {
    device.tags = ['pt-BR'];
    await bootstrapStore(false);
    expect(appStore.getState().lang).toBe('en');
  });
  it('keeps the language the user picked over the device language', async () => {
    device.tags = ['es-ES'];
    device.saved = { lang: 'en' };
    await bootstrapStore(false);
    expect(appStore.getState().lang).toBe('en');
    expect(getLang()).toBe('en');
  });
});

describe('language on iOS, where Settings → TraceRoutine → Language exists', () => {
  beforeEach(() => { device.saved = {}; });

  it('follows a language changed in iOS Settings after the in-app pick', async () => {
    device.tags = ['en-US'];
    await bootstrapStore(false, 'ios');
    appStore.setLang('en'); // the onboarding toggle
    await settle();
    expect(device.saved).toMatchObject({ lang: 'en', deviceLang: 'en' });
    device.tags = ['es-ES']; // iOS Settings → TraceRoutine → Language → Español relaunches the app
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('es');
    expect(getLang()).toBe('es');
    expect(device.saved).toMatchObject({ lang: 'es', deviceLang: 'es' });
  });
  it('keeps the in-app pick while the iOS language stays the same', async () => {
    device.tags = ['es-MX'];
    await bootstrapStore(false, 'ios');
    appStore.setLang('en');
    await settle();
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('en');
  });
  it('starts noticing iOS changes for a pick saved before the device language was recorded', async () => {
    device.saved = { lang: 'en' };
    device.tags = ['es-ES'];
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('en');
    expect(device.saved.deviceLang).toBe('es');
    device.tags = ['en-GB'];
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('en');
    device.tags = ['es-ES'];
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('es');
  });
  it('still follows iOS Settings after Delete all data saved the language', async () => {
    device.tags = ['en-US'];
    await bootstrapStore(false, 'ios');
    await appStore.clearAll();
    device.tags = ['es-ES'];
    await bootstrapStore(false, 'ios');
    expect(appStore.getState().lang).toBe('es');
  });
  it('on Android keeps the in-app pick when the device language changes, as before', async () => {
    device.tags = ['en-US'];
    await bootstrapStore(false, 'android');
    appStore.setLang('en');
    await settle();
    expect(device.saved.deviceLang).toBeUndefined();
    device.tags = ['es-ES'];
    await bootstrapStore(false, 'android');
    expect(appStore.getState().lang).toBe('en');
  });
});

describe('settings that outlive Delete all data and a replace import', () => {
  beforeEach(() => { device.saved = {}; device.tags = ['en-US']; });

  it('keeps the analytics opt-out after Delete all data', async () => {
    await bootstrapStore(false);
    appStore.setAnalyticsOptOut(true);
    await settle();
    await appStore.clearAll();
    await bootstrapStore(false); // next launch
    expect(appStore.getState().analyticsOptOut).toBe(true);
    expect(isAnalyticsOptedOut()).toBe(true);
  });
  it('keeps the analytics opt-out and the morning summary after a backup restored with Replace', async () => {
    await bootstrapStore(false);
    appStore.setAnalyticsOptOut(true);
    appStore.setMorningSummary(false);
    await settle();
    await appStore.importSnapshot({ activities: [], logs: [], settings: {} }, 'replace');
    await bootstrapStore(false);
    expect(appStore.getState().analyticsOptOut).toBe(true);
    expect(appStore.getState().morningSummary).toBe(false);
  });
});

describe('bringing an activity back from the archive', () => {
  beforeEach(async () => {
    device.saved = {};
    await bootstrapStore(false);
    for (const a of appStore.getState().activities) appStore.deleteActivity(a.id);
  });
  const add = (id: string, archived = false) => appStore.upsertActivity({ ...newDraft(id, appStore.getState().today), name: id, archived });
  const archivedIds = () => appStore.getState().activities.filter((a) => a.archived).map((a) => a.id);

  it('is refused while 5 are active, and nothing changes', () => {
    ['a1', 'a2', 'a3', 'a4', 'a5'].forEach((id) => add(id));
    add('old', true);
    expect(appStore.setArchived('old', false)).toBe(false);
    expect(archivedIds()).toEqual(['old']);
    expect(appStore.activeCount()).toBe(5);
  });
  it('works below the limit', () => {
    ['a1', 'a2', 'a3', 'a4'].forEach((id) => add(id));
    add('old', true);
    expect(appStore.setArchived('old', false)).toBe(true);
    expect(archivedIds()).toEqual([]);
    expect(appStore.activeCount()).toBe(5);
  });
  it('never stops archiving', () => {
    ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].forEach((id) => add(id));
    expect(appStore.setArchived('a6', true)).toBe(true);
    expect(appStore.activeCount()).toBe(5);
  });
});
