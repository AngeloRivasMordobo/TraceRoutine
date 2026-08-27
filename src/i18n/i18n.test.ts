import { describe, expect, it } from 'vitest';
import { applyPreset, defaultRule } from '../engine/presets';
import { detectLang, formatLongDate, formatMonthYear, formatRelativeDay, formatShortDate, freqLabel, interpolate, localizedCycleSteps, missingKeys, t } from './index';

describe('i18n dictionaries', () => {
  it('has no missing keys in either language', () => {
    expect(missingKeys()).toEqual({ es: [], en: [] });
  });
  it('interpolates and falls back to the key', () => {
    expect(interpolate('{done} de {total}', { done: 2, total: 4 })).toBe('2 de 4');
    expect(t('today.dueCount', { n: 3 }, 'es')).toBe('tocan 3');
    expect(t('today.dueCount', { n: 3 }, 'en')).toBe('3 due');
    expect(t('nope.missing')).toBe('nope.missing');
  });
  it('detects Spanish locales', () => {
    expect(detectLang('es-DO')).toBe('es');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });
});

describe('date formatting without Intl', () => {
  it('formats long dates in both languages', () => {
    expect(formatLongDate('2026-08-27', 'es')).toBe('jueves 27 de agosto');
    expect(formatLongDate('2026-08-27', 'en')).toBe('Thursday, August 27');
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
    expect(formatLongDate('2027-01-01', 'es')).toBe('viernes 1 de enero');
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
