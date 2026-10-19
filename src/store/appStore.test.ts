import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Persister, Snapshot } from '../data/persistence';
import { getLang } from '../i18n';
import { appStore, bootstrapStore } from './appStore';

// __DEV__ is a React Native global; tests run in node.
(globalThis as Record<string, unknown>).__DEV__ = false;

const device = vi.hoisted(() => ({ tags: ['en-US'] as string[], saved: {} as Record<string, string> }));

vi.mock('../i18n/device', () => ({ deviceLocaleTags: () => device.tags }));
// The real persister opens SQLite; a memory one seeded with what a previous launch saved stands in.
vi.mock('../data/persistence', () => {
  const memory = (): Persister => {
    const snap: Snapshot = { activities: [], logs: [], settings: { ...device.saved } };
    return {
      load: async () => snap,
      saveActivity: async () => {},
      deleteActivity: async () => {},
      setLog: async () => {},
      setSetting: async (key, value) => { snap.settings[key] = value; },
      clearAll: async () => { snap.settings = {}; },
    };
  };
  return { createMemoryPersister: memory, createPersister: async () => memory() };
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
