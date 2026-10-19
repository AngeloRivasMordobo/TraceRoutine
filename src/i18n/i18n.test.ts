import { describe, expect, it } from 'vitest';
import { applyPreset, defaultRule } from '../engine/presets';
import { detectLang, formatDayMonth, formatMonthYear, formatRelativeDay, formatShortDate, freqLabel, interpolate, langFromLocales, localizedCycleSteps, missingKeys, resolveLang, t, tCount } from './index';

describe('i18n dictionaries', () => {
  it('has no missing keys in either language', () => {
    expect(missingKeys()).toEqual({ es: [], en: [] });
  });
  it('interpolates and falls back to the key', () => {
    expect(interpolate('{done} de {total}', { done: 2, total: 4 })).toBe('2 de 4');
    expect(t('today.doneOf', { done: 2, total: 4 }, 'es')).toBe('2 de 4 hechas');
    expect(t('today.doneOf', { done: 2, total: 4 }, 'en')).toBe('2 of 4 done');
    expect(t('nope.missing')).toBe('nope.missing');
  });
  it('detects Spanish locales', () => {
    expect(detectLang('es-DO')).toBe('es');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });
  it('picks the first device language the app speaks, in the user order', () => {
    expect(langFromLocales(['es-419'])).toBe('es');
    expect(langFromLocales(['es_ES'])).toBe('es');
    expect(langFromLocales(['fr-FR', 'es-MX', 'en-US'])).toBe('es');
    expect(langFromLocales(['de-DE', 'en-GB', 'es-ES'])).toBe('en');
    expect(langFromLocales(['pt-BR'])).toBe('en');
    expect(langFromLocales(['et-EE'])).toBe('en');
    expect(langFromLocales([])).toBe('en');
    expect(langFromLocales([null, undefined, 'ES-us'])).toBe('es');
  });
  it('starts in the saved language, else in the device language', () => {
    expect(resolveLang(undefined, ['es-CO'])).toBe('es');
    expect(resolveLang('en', ['es-CO'])).toBe('en');
    expect(resolveLang('es', ['en-US'])).toBe('es');
    expect(resolveLang('fr', ['es-CO'])).toBe('es');
    expect(resolveLang('', ['en-US'])).toBe('en');
  });
  it('on iOS, lets a language changed in iOS Settings after the in-app pick win', () => {
    const ios = (pickedOn?: string) => ({ followSystem: true, pickedOn });
    // Picked English in the app on an English phone, then Settings → TraceRoutine → Language → Español.
    expect(resolveLang('en', ['es-ES'], ios('en'))).toBe('es');
    // Picked English in the app on a Spanish phone, nothing changed in iOS since: the pick still wins.
    expect(resolveLang('en', ['es-MX'], ios('es'))).toBe('en');
    // A region change inside the same language is not a new language choice.
    expect(resolveLang('en', ['es-MX'], ios('es'))).toBe(resolveLang('en', ['es-ES'], ios('es')));
    // A pick saved before the device language was recorded keeps winning; nothing saved follows the device.
    expect(resolveLang('en', ['es-ES'], ios(undefined))).toBe('en');
    expect(resolveLang(undefined, ['es-ES'], ios('en'))).toBe('es');
  });
  it('elsewhere, keeps the in-app pick whatever the device does, as before', () => {
    expect(resolveLang('en', ['es-ES'], { pickedOn: 'en' })).toBe('en');
    expect(resolveLang('en', ['es-ES'], { followSystem: false, pickedOn: 'en' })).toBe('en');
  });
});

describe('counts', () => {
  it('says "1 time" / "1 vez", not "1 times" / "1 veces", in Stats', () => {
    expect(tCount('stats.times', 1, {}, 'en')).toBe('1 time');
    expect(tCount('stats.times', 1, {}, 'es')).toBe('1 vez');
    expect(tCount('stats.sessions', 1, {}, 'en')).toBe('1 session');
    expect(tCount('stats.sessions', 1, {}, 'es')).toBe('1 sesión');
    expect(tCount('stats.times', 2, {}, 'en')).toBe('2 times');
    expect(tCount('stats.sessions', 0, {}, 'es')).toBe('0 sesiones');
  });
  it('words the editor preview in the singular for one day or one session', () => {
    expect(tCount('editor.previewDue', 1, { month: 'October' }, 'en')).toBe('Due 1 day in October');
    expect(tCount('editor.previewDue', 3, { month: 'octubre' }, 'es')).toBe('Toca 3 días en octubre');
    expect(tCount('editor.previewFlex', 1, { month: 'October' }, 'en')).toBe('About once in October, you pick the day.');
    expect(tCount('editor.previewFlex', 6, { month: 'octubre' }, 'es')).toBe('Unas 6 veces en octubre, tú eliges los días.');
  });
  it('falls back to the plural text where there is no singular one', () => {
    expect(tCount('today.doneOf', 1, { done: 1, total: 1 }, 'en')).toBe('1 of 1 done');
  });
});

describe('date formatting without Intl', () => {
  it('formats long dates in both languages', () => {
    expect(formatDayMonth('2026-08-27', 'es')).toBe('27 de agosto');
    expect(formatDayMonth('2026-08-27', 'en')).toBe('August 27');
    expect(formatMonthYear(2026, 8, 'es')).toBe('agosto 2026');
    expect(formatShortDate('2026-09-05', 'en')).toBe('Sep 5');
  });
  it('formats relative days', () => {
    const today = '2026-08-27';
    expect(formatRelativeDay(today, today, 'es')).toBe('hoy');
    expect(formatRelativeDay('2026-08-28', today, 'es')).toBe('mañana');
    expect(formatRelativeDay('2026-08-30', today, 'es')).toBe('domingo 30');
    expect(formatRelativeDay('2026-09-05', today, 'es')).toBe('5 sep');
    expect(formatRelativeDay('2026-08-30', today, 'en')).toBe('Sunday 30');
  });
  it('crosses month and year boundaries', () => {
    expect(formatDayMonth('2027-01-01', 'es')).toBe('1 de enero');
    expect(formatRelativeDay('2027-01-01', '2026-12-31', 'en')).toBe('tomorrow');
  });
});

describe('freqLabel', () => {
  it('describes every rule type in both languages', () => {
    expect(freqLabel({ type: 'daily' }, 'es')).toBe('Todos los días');
    expect(freqLabel({ type: 'everyN', n: 2, anchor: 'relative' }, 'es')).toBe('Día por medio desde la última vez');
    expect(freqLabel({ type: 'everyN', n: 3 }, 'en')).toBe('Every 3 days');
    expect(freqLabel({ type: 'weekdays', days: [1, 3, 5] }, 'es')).toBe('Lun · Mié · Vie');
    expect(freqLabel({ type: 'weekdays', days: [] }, 'en')).toBe('No days');
    expect(freqLabel({ type: 'perWeek', times: 3 }, 'en')).toBe('3 times a week');
    expect(freqLabel({ type: 'perWeek', times: 1 }, 'es')).toBe('1 vez por semana');
    const es = applyPreset(defaultRule(), 'pushPullLegs', { cycleSteps: localizedCycleSteps('es') });
    expect(freqLabel(es, 'es')).toBe('Ciclo: Empuje › Jalón › Pierna › descanso');
  });
});
