/**
 * TR-68 / TR-69 on the first iOS release (owner decision, 2026-10-19): iOS sells nothing yet, so it shows
 * no Pro card, no line that implies a paid tier and, at the limit of 5 active activities, a neutral message
 * with no upsell. Android keeps the Pro section and the "About Pro" way out that are live on Google Play.
 * src/release/iosScreens.test.ts renders Settings and the editor to check that the screens use these rules.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, t } from '../i18n';
import { PURCHASE_WORDS, stringKeys } from '../test/copy';
import { newDraft } from '../ui/editor/editorModel';
import { FREE_ACTIVE_LIMIT, freeLimitPrompt, frequencyHelp, isActive, passesActiveLimit, PRO_ONLY_KEYS, showsPro } from './limits';

/** Everyday words that the purchase pattern also catches, and what they mean where the app shows them. */
const NOT_AN_UPSELL: Record<string, string> = {
  'today.freeDay': '"Free day" / "Día libre": a day with nothing due',
  'today.confirm': '"Listo" is the Spanish "Done" button',
  'stats.tooEarly': '"Aún es pronto": too early to tell',
  'stats.tooEarlyPatterns': '"Aún es pronto": too early to tell',
};

const readsAsUpsell = (key: string) => LANGS.some((lang) => PURCHASE_WORDS.test(t(key, { limit: FREE_ACTIVE_LIMIT, left: 2 }, lang)));
const proOnly = (key: string) => (PRO_ONLY_KEYS as readonly string[]).includes(key);

describe('free limit', () => {
  it('stays at 5 active activities on every platform', () => {
    expect(FREE_ACTIVE_LIMIT).toBe(5);
  });
});

describe('what counts against the limit', () => {
  const today = '2026-10-19';
  const mk = (id: string, extra: Partial<ReturnType<typeof newDraft>> = {}) => ({ ...newDraft(id, '2026-10-01'), name: id, ...extra });
  const five = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => mk(id));

  it('counts activities that are neither archived nor past their end date', () => {
    expect(isActive(mk('x'), today)).toBe(true);
    expect(isActive(mk('x', { end: today }), today)).toBe(true); // its last day is still today
    expect(isActive(mk('x', { archived: true }), today)).toBe(false);
    expect(isActive(mk('x', { end: '2026-10-18' }), today)).toBe(false);
  });
  it('stops a sixth new activity, not a fifth', () => {
    expect(passesActiveLimit(five, mk('new'), today)).toBe(true);
    expect(passesActiveLimit(five.slice(1), mk('new'), today)).toBe(false);
  });
  it('stops an archived activity coming back while 5 are active (Unarchive used to skip the check)', () => {
    const archived = mk('old', { archived: true });
    expect(passesActiveLimit([...five, archived], { ...archived, archived: false }, today)).toBe(true);
    expect(passesActiveLimit([...five.slice(1), archived], { ...archived, archived: false }, today)).toBe(false);
  });
  it('stops an ended activity coming back with a later end date while 5 are active', () => {
    const ended = mk('old', { end: '2026-10-10' });
    expect(passesActiveLimit([...five, ended], { ...ended, end: null }, today)).toBe(true);
  });
  it('never stops editing or archiving one that is already active, even over the limit', () => {
    const six = [...five, mk('a6')];
    expect(passesActiveLimit(six, { ...six[0], name: 'Renamed' }, today)).toBe(false);
    expect(passesActiveLimit(six, { ...six[0], archived: true }, today)).toBe(false);
  });
  it('lets an archived or ended activity be saved as it is', () => {
    const archived = mk('old', { archived: true });
    expect(passesActiveLimit([...five, archived], { ...archived, name: 'Renamed' }, today)).toBe(false);
  });
});

describe('Pro on iOS v1', () => {
  it('hides the Pro card on iOS', () => {
    expect(showsPro('ios')).toBe(false);
  });
  it('keeps the Pro card on Android, as live on Google Play', () => {
    expect(showsPro('android')).toBe(true);
    expect(showsPro('web')).toBe(true);
  });
  it('states the limit on iOS with no Pro button, and leads to the activities', () => {
    expect(freeLimitPrompt('ios')).toEqual({
      title: 'settings.activeLimitTitle',
      body: 'settings.activeLimitBody',
      buttons: [
        { label: 'editor.cancel', goTo: null },
        { label: 'settings.activeLimitSee', goTo: '/(tabs)/month' },
      ],
    });
  });
  it('keeps the Android alert as it was: free-plan copy, See archived and About Pro', () => {
    expect(freeLimitPrompt('android')).toEqual({
      title: 'settings.freeLimitTitle',
      body: 'settings.freeLimitBody',
      buttons: [
        { label: 'editor.cancel', goTo: null },
        { label: 'settings.freeLimitArchive', goTo: '/(tabs)/settings' },
        { label: 'settings.freeLimitPro', goTo: '/(tabs)/settings' },
      ],
    });
  });
  it('words the whole iOS alert, buttons included, without upsell or "when it is ready", in both languages', () => {
    const { title, body, buttons } = freeLimitPrompt('ios');
    for (const lang of LANGS) {
      const text = [t(title, { limit: FREE_ACTIVE_LIMIT }, lang), t(body, undefined, lang), ...buttons.map((b) => t(b.label, undefined, lang))].join(' ');
      expect(text).not.toMatch(/\b[a-z]+\.[a-zA-Z]+\b/); // every key resolved to a text
      expect(text).toContain(String(FREE_ACTIVE_LIMIT));
      expect(text).not.toMatch(PURCHASE_WORDS);
    }
    expect(t(title, { limit: 5 }, 'en')).toBe('You have 5 active activities');
    expect(t(title, { limit: 5 }, 'es')).toBe('Tienes 5 actividades activas');
  });
  it('tells iOS users where archiving is, since the alert can no longer send them to the archived list', () => {
    expect(t('settings.activeLimitBody', undefined, 'en')).toContain(t('editor.archive', undefined, 'en'));
    expect(t('settings.activeLimitBody', undefined, 'es')).toContain(t('editor.archive', undefined, 'es'));
  });
  it('the Android copy it replaces does carry the upsell, so the check above means something', () => {
    const { body } = freeLimitPrompt('android');
    for (const lang of LANGS) expect(t(body, undefined, lang)).toMatch(PURCHASE_WORDS);
  });
  it('drops "never a paid feature" from the editor on iOS only', () => {
    expect(frequencyHelp('ios')).toBeNull();
    expect(frequencyHelp('android')).toBe('freq.neverPaid');
  });
});

describe('purchase copy across the whole app', () => {
  it('no text outside the Pro-only list reads like an upsell, in either language', () => {
    const offenders = stringKeys().filter((key) => !proOnly(key) && !(key in NOT_AN_UPSELL) && readsAsUpsell(key));
    expect(offenders).toEqual([]);
  });
  it('the Pro-only list holds real keys that are purchase copy', () => {
    const keys = stringKeys();
    for (const key of PRO_ONLY_KEYS) {
      expect(keys).toContain(key);
      expect(readsAsUpsell(key)).toBe(true);
    }
  });
  it('the everyday-word exceptions are still needed', () => {
    for (const key of Object.keys(NOT_AN_UPSELL)) expect(readsAsUpsell(key)).toBe(true);
  });
  it('nothing the iOS models pick is on the Pro-only list', () => {
    const { title, body, buttons } = freeLimitPrompt('ios');
    for (const key of [title, body, ...buttons.map((b) => b.label)]) expect(proOnly(key)).toBe(false);
    expect(frequencyHelp('ios')).toBeNull();
  });
});
