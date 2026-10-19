import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAnalyticsOptedOut } from '../analytics';
import type { Persister } from '../data/persistence';
import { getLang } from '../i18n';
import { appStore, bootstrapStore } from './appStore';

// __DEV__ is a React Native global; tests run in node.
(globalThis as Record<string, unknown>).__DEV__ = false;

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

describe('settings that outlive Delete all data and a replace import', () => {
  beforeEach(() => { device.saved = {}; device.tags = ['en-US']; });

  it('keeps the analytics opt-out after Delete all data', async () => {
    await bootstrapStore(false);
    appStore.setAnalyticsOptOut(true);
    await appStore.clearAll();
    await bootstrapStore(false); // next launch
    expect(appStore.getState().analyticsOptOut).toBe(true);
    expect(isAnalyticsOptedOut()).toBe(true);
  });
  it('keeps the analytics opt-out and the morning summary after a backup restored with Replace', async () => {
    await bootstrapStore(false);
    appStore.setAnalyticsOptOut(true);
    appStore.setMorningSummary(false);
    await appStore.importSnapshot({ activities: [], logs: [], settings: {} }, 'replace');
    await bootstrapStore(false);
    expect(appStore.getState().analyticsOptOut).toBe(true);
    expect(appStore.getState().morningSummary).toBe(false);
  });
});
