/**
 * What App Review sees on iOS v1 (owner decision, 2026-10-19: iOS sells nothing), checked on the real
 * screens rather than on the helpers alone: Settings and the editor are rendered to static markup in
 * Node, once as iOS and once as Android, with the native modules replaced by plain stand-ins
 * (src/test/nativeStubs.ts). Dropping a platform guard in a screen fails here even when the pure rules
 * in src/store/limits.ts still pass. Layout, keyboard and touch still need the real-iPhone QA (RELEASE-IOS.md §4).
 */
import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LANGS, t, type Lang } from '../i18n';
import { appStore, bootstrapStore } from '../store/appStore';
import { PURCHASE_WORDS, visibleText } from '../test/copy';
import { alerts, platform, press, resetStubs, tapAlert } from '../test/nativeStubs';
import { newDraft } from '../ui/editor/editorModel';
import { ThemeProvider, type ThemeMode } from '../ui/theme';
import { dark, light, mix } from '../ui/tokens';

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
  useNavigation: () => ({ setOptions: () => {}, addListener: () => () => {} }),
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
// The real reminder service runs; only the native notifications module is replaced. The system has not
// been asked yet, and saying yes to its alert grants the permission.
const notifications = vi.hoisted(() => ({ granted: false, asked: 0 }));
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ granted: notifications.granted, canAskAgain: true }),
  requestPermissionsAsync: async () => { notifications.asked += 1; notifications.granted = true; return { granted: true, canAskAgain: true }; },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelAllScheduledNotificationsAsync: async () => {},
  scheduleNotificationAsync: async () => 'id',
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
let Today: ComponentType;

/** ThemeProvider with its children optional, so they can go as createElement's third argument. */
const Themed = ThemeProvider as ComponentType<{ mode: ThemeMode; children?: ReactNode }>;

/** What the screen shows on `os`, in `lang` (and in the theme `mode`, dark by default as in the app). */
function render(screen: ComponentType, os: 'ios' | 'android', lang: Lang, mode: ThemeMode = 'dark'): { html: string; text: string } {
  resetStubs();
  platform.OS = os;
  appStore.setLang(lang);
  const html = renderToStaticMarkup(createElement(Themed, { mode }, createElement(screen)));
  return { html, text: visibleText(html) };
}

beforeAll(async () => {
  await bootstrapStore(false);
  Settings = (await import('../../app/(tabs)/settings')).default;
  Editor = (await import('../../app/editor')).default;
  Today = (await import('../../app/(tabs)/index')).default;
});
afterEach(() => {
  platform.OS = 'ios';
  route.params = {};
  notifications.granted = false;
  notifications.asked = 0;
});
/** Let the screen's async handlers (permission checks, the store's write-through) run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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

describe('Reminders permission', () => {
  it('on iOS, Settings explains reminders with a single Continue that leads to the system alert', async () => {
    render(Settings, 'ios', 'en');
    press(t('reminders.enable', undefined, 'en'));
    expect(alerts.at(-1)).toMatchObject({ title: t('reminders.prePromptTitle', undefined, 'en'), buttons: ['Continue'] });
    tapAlert('Continue');
    await settle();
    expect(notifications.asked).toBe(1);
  });
  it('on Android, Settings keeps "Not now" and "Turn on reminders", as live on Google Play', () => {
    render(Settings, 'android', 'es');
    press(t('reminders.enable', undefined, 'es'));
    expect(alerts.at(-1)?.buttons).toEqual(['Ahora no', 'Activar avisos']);
  });
  for (const os of ['ios', 'android'] as const) {
    it(`asks when an activity with a reminder is saved and the system was never asked (${os})`, async () => {
      route.params = { name: 'Read' };
      render(Editor, os, 'en');
      press(t('editor.create', undefined, 'en'));
      await settle();
      expect(appStore.getState().activities.some((a) => a.name === 'Read' && a.reminder)).toBe(true);
      expect(alerts.at(-1)?.title).toBe(t('reminders.prePromptTitle', undefined, 'en'));
      tapAlert(t(os === 'ios' ? 'reminders.prePromptContinue' : 'reminders.prePromptOk', undefined, 'en'));
      await settle();
      expect(notifications.asked).toBe(1);
      for (const a of appStore.getState().activities) appStore.deleteActivity(a.id);
    });
  }
  it('does not ask again once the system has answered', async () => {
    notifications.granted = true;
    route.params = { name: 'Walk' };
    render(Editor, 'ios', 'en');
    press(t('editor.create', undefined, 'en'));
    await settle();
    expect(alerts).toEqual([]);
    for (const a of appStore.getState().activities) appStore.deleteActivity(a.id);
  });
});

describe("Today's value sheet with the decimal pad up", () => {
  // The "How much?" sheet is mounted inside each row of the Today list. With the list's default
  // keyboardShouldPersistTaps ("never"), the first tap on "Done" only closed the keyboard and nothing was
  // logged. The list has to hand the first tap to the sheet's buttons, on both platforms (Android before
  // 11 always treats a focused field as an open keyboard).
  beforeAll(() => {
    const today = appStore.getState().today;
    appStore.upsertActivity({ ...newDraft('run', today), name: 'Run', record: 'amount', unit: 'km', freq: { type: 'daily' } });
  });
  afterAll(() => appStore.deleteActivity('run'));

  for (const os of ['ios', 'android'] as const) {
    it(`lets the first tap reach the sheet's buttons (${os})`, () => {
      const { html, text } = render(Today, os, 'en');
      expect(text).toContain('Run'); // the row is in the list
      // SafeAreaView, then the list.
      expect(html).toMatch(/^<div[^>]*><div data-keyboard-should-persist-taps="handled"/);
    });
  }
});

describe('Settings in the light theme', () => {
  /** The background of the option labelled `label` and the colour of its label. */
  const pill = (html: string, label: string) => {
    const m = html.match(new RegExp(`<button[^>]*data-bg="([^"]+)"[^>]*><span[^>]*data-color="([^"]+)"[^>]*>${label}</span></button>`));
    if (!m) throw new Error(`No selected option "${label}"`);
    return { bg: m[1], color: m[2] };
  };
  for (const lang of LANGS) {
    it(`shows the selected language and theme on a light tint with a readable label (${lang})`, () => {
      const { html } = render(Settings, 'ios', lang, 'light');
      for (const label of [lang.toUpperCase(), t('settings.dark', undefined, lang)]) {
        // The store's theme is still dark here; the screen is drawn in the light theme around it.
        const { bg, color } = pill(html, label);
        expect(bg).toBe(light.accentTint);
        expect(color).toBe(light.onAccentTint);
        expect(color).not.toBe(bg);
      }
    });
  }
  it('draws the kicker in the light theme kicker colour', () => {
    const { html } = render(Settings, 'ios', 'en', 'light');
    expect(html).toContain(`data-color="${light.kicker}">SETTINGS</span>`);
  });
});

describe('Unarchive in Settings with 5 active activities', () => {
  const ids = ['b1', 'b2', 'b3', 'b4', 'b5'];
  beforeAll(() => {
    const today = appStore.getState().today;
    for (const id of ids) appStore.upsertActivity({ ...newDraft(id, today), name: id });
    appStore.upsertActivity({ ...newDraft('old', today), name: 'Old', archived: true });
  });
  afterAll(() => { for (const id of [...ids, 'old']) appStore.deleteActivity(id); });
  const stillArchived = () => appStore.getState().activities.find((a) => a.id === 'old')?.archived;

  for (const lang of LANGS) {
    it(`on iOS shows the neutral limit message and keeps it archived (${lang})`, () => {
      render(Settings, 'ios', lang);
      press(t('settings.unarchive', undefined, lang));
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe(t('settings.activeLimitTitle', { limit: 5 }, lang));
      expect(alerts[0].buttons).toEqual([t('editor.cancel', undefined, lang), t('settings.activeLimitSee', undefined, lang)]);
      expect(stillArchived()).toBe(true);
    });
  }
  it('on Android shows the free-plan alert and keeps it archived', () => {
    render(Settings, 'android', 'en');
    press(t('settings.unarchive', undefined, 'en'));
    expect(alerts[0].title).toBe(t('settings.freeLimitTitle', { limit: 5 }, 'en'));
    expect(stillArchived()).toBe(true);
  });
  it('brings it back with no alert once another one is archived', () => {
    appStore.setArchived('b5', true);
    render(Settings, 'ios', 'en');
    press(t('settings.unarchive', undefined, 'en')); // the last archived row is "Old" (rows keep the activities' order)
    expect(alerts).toEqual([]);
    expect(stillArchived()).toBe(false);
    appStore.setArchived('old', true);
    appStore.setArchived('b5', false);
  });
});

describe('Editor keyboard', () => {
  /** The opening tag of the date field with this placeholder. */
  const dateField = (html: string, placeholder: string) => html.match(new RegExp(`<input[^>]*data-placeholder="${placeholder}"[^>]*>`))?.[0] ?? '';

  it('on iOS lowers the keyboard when the form is dragged', () => {
    expect(render(Editor, 'ios', 'en').html).toContain('data-keyboard-dismiss-mode="interactive"');
  });
  it('on iOS types the start and end dates on the number keyboard, with no autocorrect', () => {
    const { html } = render(Editor, 'ios', 'en');
    for (const placeholder of ['2026-08-27', '—']) {
      expect(dateField(html, placeholder)).toContain('data-keyboard-type="numbers-and-punctuation"');
      expect(dateField(html, placeholder)).toContain('data-auto-correct="false"');
    }
  });
  it('on Android keeps the keyboard behaviour that is live on Google Play', () => {
    const { html } = render(Editor, 'android', 'en');
    expect(html).not.toContain('data-keyboard-dismiss-mode');
    for (const placeholder of ['2026-08-27', '—']) {
      expect(dateField(html, placeholder)).not.toBe('');
      expect(dateField(html, placeholder)).not.toContain('data-keyboard-type');
    }
  });
});

describe('A skipped row on Today', () => {
  // The "SKIP" swipe label sits behind each row. Fading the whole row let it show through.
  beforeAll(() => {
    const today = appStore.getState().today;
    appStore.upsertActivity({ ...newDraft('walk', today), name: 'Walk', freq: { type: 'daily' } });
    appStore.setLog('walk', today, 'skip');
  });
  afterAll(() => appStore.deleteActivity('walk'));

  it('keeps an opaque, faded ground and fades only what is on it', () => {
    const { html } = render(Today, 'ios', 'en');
    const label = html.indexOf('>SKIP</span>');
    expect(label).toBeGreaterThan(-1);
    // After the label: the swipe's Animated.View, then the row itself.
    const row = html.slice(label).match(/<div[^>]*><div([^>]*)>/)?.[1] ?? '';
    expect(row).toContain(`data-bg="${mix(dark.surface2, dark.bg, 0.55)}"`);
    expect(row).not.toContain('data-opacity');
    expect(html).toMatch(/<button aria-label="Walk: done, tap to undo"[^>]*data-opacity="0.55"/);
  });
});
