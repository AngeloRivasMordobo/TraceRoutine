import { describe, expect, it } from 'vitest';
import { LANGS, t } from '../i18n';
import { prePromptButtons } from './prePrompt';

describe('notification pre-prompt (TR-58)', () => {
  it('on iOS has one button, and it leads to the system alert', () => {
    expect(prePromptButtons('ios')).toEqual([{ label: 'reminders.prePromptContinue', asks: true }]);
  });
  it('on iOS words that button as a step, not as the system "Allow", in both languages', () => {
    const [{ label }] = prePromptButtons('ios');
    expect(t(label, undefined, 'en')).toBe('Continue');
    expect(t(label, undefined, 'es')).toBe('Continuar');
    for (const lang of LANGS) expect(t(label, undefined, lang)).not.toMatch(/allow|permit|activar|turn on/i);
  });
  it('on Android keeps "Not now" and "Turn on reminders", as live on Google Play', () => {
    expect(prePromptButtons('android')).toEqual([
      { label: 'reminders.prePromptLater', asks: false },
      { label: 'reminders.prePromptOk', asks: true },
    ]);
  });
});
