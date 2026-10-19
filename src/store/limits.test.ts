/**
 * TR-68 / TR-69 on the first iOS release (owner decision, 2026-10-19): iOS sells nothing yet, so it shows
 * no Pro card and, at the limit of 5 active activities, a neutral message with no upsell. Android keeps
 * the Pro section and the "About Pro" way out that are live on Google Play.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, t } from '../i18n';
import { FREE_ACTIVE_LIMIT, freeLimitPrompt, showsPro } from './limits';

/** Words that would turn the iOS message into an upsell or a "coming soon", in either language. */
const PURCHASE_WORDS = /\bpro\b|free|gratis|ready|listo|soon|pronto|paid|pago|upgrade|plan|premium|price|precio|buy|compra/i;

describe('free limit', () => {
  it('stays at 5 active activities on every platform', () => {
    expect(FREE_ACTIVE_LIMIT).toBe(5);
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
  it('states the limit on iOS with no Pro button', () => {
    expect(freeLimitPrompt('ios')).toEqual({ title: 'settings.activeLimitTitle', body: 'settings.activeLimitBody', offersPro: false });
  });
  it('keeps the Android alert as it was: free-plan copy and the About Pro button', () => {
    expect(freeLimitPrompt('android')).toEqual({ title: 'settings.freeLimitTitle', body: 'settings.freeLimitBody', offersPro: true });
  });
  it('words the iOS message without upsell or "when it is ready", in both languages', () => {
    const { title, body } = freeLimitPrompt('ios');
    for (const lang of LANGS) {
      const text = `${t(title, { limit: FREE_ACTIVE_LIMIT }, lang)} ${t(body, undefined, lang)}`;
      expect(text).not.toBe(`${title} ${body}`);
      expect(text).toContain(String(FREE_ACTIVE_LIMIT));
      expect(text).not.toMatch(PURCHASE_WORDS);
    }
    expect(t(title, { limit: 5 }, 'en')).toBe('You have 5 active activities');
    expect(t(title, { limit: 5 }, 'es')).toBe('Tienes 5 actividades activas');
  });
  it('the Android copy it replaces does carry the upsell, so the check above means something', () => {
    const { body } = freeLimitPrompt('android');
    for (const lang of LANGS) expect(t(body, undefined, lang)).toMatch(PURCHASE_WORDS);
  });
});
