/**
 * What App Review sees on iOS v1 (owner decision, 2026-10-19: iOS sells nothing), checked on the real
 * screens rather than on the helpers alone: Settings and the editor are rendered to static markup in
 * Node, once as iOS and once as Android, with the native modules replaced by plain stand-ins
 * (src/test/nativeStubs.ts). Dropping a platform guard in a screen fails here even when the pure rules
 * in src/store/limits.ts still pass. Layout, keyboard and touch still need the real-iPhone QA (RELEASE-IOS.md §4).
 */
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LANGS, t, type Lang } from '../i18n';
import { appStore, bootstrapStore } from '../store/appStore';
import { PURCHASE_WORDS, visibleText } from '../test/copy';
import { alerts, platform, press, resetStubs } from '../test/nativeStubs';
import { newDraft } from '../ui/editor/editorModel';

(globalThis as Record<string, unknown>).__DEV__ = false;

/** The editor's route params (`useLocalSearchParams`). */
const route = vi.hoisted(() => ({ params: {} as Record<string, string> }));

vi.mock('react-native', async () => (await import('../test/nativeStubs')).reactNativeStub);
vi.mock('react-native-svg', async () => (await import('../test/nativeStubs')).svgStub);
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('../test/nativeStubs')).reactNativeStub.View }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' }, platform: { ios: {} } } }));
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => route.params,
  useRouter: () => ({ canGoBack: () => true, back: () => {}, replace: () => {}, push: () => {} }),
  Link: ({ children }: { children?: unknown }) => children,
}));
vi.mock('../ui/icons', () => ({
  ActivityIcon: () => null,
  UIIcon: () => null,
  ICON_KEYS: ['paint', 'barbell', 'book', 'meditate', 'water', 'pill', 'plant', 'guitar', 'run', 'write'],
}));
vi.mock('../ui/Logo', () => ({ Logo: () => null }));
vi.mock('../ui/TimeField', () => ({ TimeField: () => null }));
vi.mock('../data/files', () => ({ shareText: async () => {}, pickTextFile: async () => null }));
vi.mock('../reminders/service', () => ({
  getPermissionState: async () => 'undetermined',
  requestPermission: async () => 'granted',
  openSystemSettings: async () => {},
  rescheduleReminders: async () => 0,
}));
vi.mock('../data/persistence', async () => {
  const memory = () => ({
    load: async () => ({ activities: [], logs: [], settings: { onboarded: '1' } }),
    saveActivity: async () => {},
    deleteActivity: async () => {},
    setLog: async () => {},
    setSetting: async () => {},
    clearAll: async () => {},
  });
  return { createMemoryPersister: memory, createPersister: async () => memory() };
});

let Settings: ComponentType;
let Editor: ComponentType;

/** What the screen shows on `os`, in `lang`. */
function render(screen: ComponentType, os: 'ios' | 'android', lang: Lang): { html: string; text: string } {
  resetStubs();
  platform.OS = os;
  appStore.setLang(lang);
  const html = renderToStaticMarkup(createElement(screen));
  return { html, text: visibleText(html) };
}

beforeAll(async () => {
  await bootstrapStore(false);
  Settings = (await import('../../app/(tabs)/settings')).default;
  Editor = (await import('../../app/editor')).default;
});
afterEach(() => { platform.OS = 'ios'; route.params = {}; });

describe('Settings on iOS', () => {
  for (const lang of LANGS) {
    it(`shows no Pro card and no purchase copy (${lang})`, () => {
      const { text } = render(Settings, 'ios', lang);
      expect(text).toContain(t('settings.language', undefined, lang)); // the screen did render
      expect(text).not.toContain(`${t('app.name', undefined, lang)} Pro`);
      expect(text).not.toContain(t('settings.notifyMe', undefined, lang));
      expect(text).not.toMatch(PURCHASE_WORDS);
    });
    it(`shows no analytics switch, since the build sends nothing (${lang})`, () => {
      expect(render(Settings, 'ios', lang).text).not.toContain(t('settings.analytics', undefined, lang));
    });
    it(`links the privacy policy and the support inbox (${lang})`, () => {
      const { text } = render(Settings, 'ios', lang);
      expect(text).toContain(t('settings.privacy', undefined, lang));
      expect(text).toContain(t('settings.feedback', undefined, lang));
    });
  }
});

describe('Settings on Android, as live on Google Play', () => {
  it('keeps the Pro card, the interest button and the analytics switch', () => {
    const { text } = render(Settings, 'android', 'en');
    expect(text).toContain('TraceRoutine Pro');
    expect(text).toContain(t('settings.notifyMe', undefined, 'en'));
    expect(text).toContain(t('settings.privacy', undefined, 'en'));
    expect(text).toContain(t('settings.analytics', undefined, 'en'));
  });
});

describe('Editor on iOS', () => {
  for (const lang of LANGS) {
    it(`says nothing about paid features under Frequency (${lang})`, () => {
      const { text } = render(Editor, 'ios', lang);
      expect(text).toContain(t('editor.frequency', undefined, lang)); // the screen did render
      expect(text).not.toContain(t('freq.neverPaid', undefined, lang));
      expect(text).not.toMatch(PURCHASE_WORDS);
    });
  }
  it('keeps "never a paid feature" on Android', () => {
    expect(render(Editor, 'android', 'en').text).toContain(t('freq.neverPaid', undefined, 'en'));
  });
});

describe('Creating a sixth activity', () => {
  const ids = ['a1', 'a2', 'a3', 'a4', 'a5'];
  beforeAll(() => {
    for (const id of ids) appStore.upsertActivity({ ...newDraft(id, appStore.getState().today), name: id });
  });
  afterAll(() => { for (const id of ids) appStore.deleteActivity(id); });

  /** Fill in a name, tap Create, and return the alert that stops the save. */
  const createSixth = (os: 'ios' | 'android', lang: Lang) => {
    route.params = { name: 'Read' };
    render(Editor, os, lang);
    press(t('editor.create', undefined, lang));
    expect(alerts).toHaveLength(1);
    expect(appStore.getState().activities.map((a) => a.id)).toEqual(ids); // nothing was saved
    return alerts[0];
  };

  for (const lang of LANGS) {
    it(`on iOS states the limit and leads to the activities, with no Pro way out (${lang})`, () => {
      const alert = createSixth('ios', lang);
      expect(alert.title).toBe(t('settings.activeLimitTitle', { limit: 5 }, lang));
      expect(alert.buttons).toEqual([t('editor.cancel', undefined, lang), t('settings.activeLimitSee', undefined, lang)]);
      expect([alert.title, alert.body, ...alert.buttons].join(' ')).not.toMatch(PURCHASE_WORDS);
    });
  }
  it('on Android keeps the free-plan alert with See archived and About Pro', () => {
    const alert = createSixth('android', 'en');
    expect(alert.title).toBe(t('settings.freeLimitTitle', { limit: 5 }, 'en'));
    expect(alert.buttons).toEqual(['Cancel', t('settings.freeLimitArchive', undefined, 'en'), t('settings.freeLimitPro', undefined, 'en')]);
  });
});
