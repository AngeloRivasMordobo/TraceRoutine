/**
 * Tiny i18n layer: dictionaries in JSON, `{param}` interpolation, no runtime deps.
 * Dates are formatted here on purpose (never with the device's Intl) so
 * "jueves 27 de agosto" reads the same on every phone.
 */
import { daysBetween, parseKey, weekday } from '../engine/dates';
import { describeFrequency } from '../engine/presets';
import type { CycleStep, DateKey, FrequencyRule } from '../engine/types';
import en from './en.json';
import es from './es.json';

export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];

type Dict = typeof es;
const dicts: Record<Lang, Dict> = { es, en: en as unknown as Dict };

let current: Lang = 'es';
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return current;
}
export function setLang(lang: Lang): void {
  current = lang;
  listeners.forEach((fn) => fn(lang));
}
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Picks the device language once at startup ("es-DO" → es, anything else → en). */
export function detectLang(locale: string | undefined): Lang {
  return (locale ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

type Params = Record<string, string | number>;

function lookup(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);
}

export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Translate a dotted key, e.g. t('today.freeDay'). Falls back to English, then to the key itself. */
export function t(key: string, params?: Params, lang: Lang = current): string {
  const value = lookup(dicts[lang], key) ?? lookup(dicts.en, key);
  return typeof value === 'string' ? interpolate(value, params) : key;
}

function list(key: string, lang: Lang): string[] {
  const value = lookup(dicts[lang], key);
  return Array.isArray(value) ? (value as string[]) : [];
}

export const weekdayNames = (lang: Lang = current) => list('dates.weekdays', lang);
export const weekdayShort = (lang: Lang = current) => list('dates.weekdaysShort', lang);
export const weekdayLetters = (lang: Lang = current) => list('dates.weekdayLetters', lang);
export const monthNames = (lang: Lang = current) => list('dates.months', lang);
export const monthShort = (lang: Lang = current) => list('dates.monthsShort', lang);

/** "jueves 27 de agosto" · "Thursday, August 27" */
export function formatLongDate(key: DateKey, lang: Lang = current): string {
  const { m, d } = parseKey(key);
  return t('dates.longDate', { weekday: weekdayNames(lang)[weekday(key)], day: d, month: monthNames(lang)[m - 1] }, lang);
}

/** "agosto 2026" · "August 2026" */
export function formatMonthYear(y: number, m: number, lang: Lang = current): string {
  return t('dates.monthYear', { month: monthNames(lang)[m - 1], year: y }, lang);
}

/** "27 ago" · "Aug 27" */
export function formatShortDate(key: DateKey, lang: Lang = current): string {
  const { m, d } = parseKey(key);
  return t('dates.shortDate', { day: d, monthShort: monthShort(lang)[m - 1] }, lang);
}

/** "hoy" / "mañana" / "jueves 27" (within a week) / "5 sep" */
export function formatRelativeDay(key: DateKey, today: DateKey, lang: Lang = current): string {
  const n = daysBetween(today, key);
  if (n === 0) return t('dates.today', undefined, lang);
  if (n === 1) return t('dates.tomorrow', undefined, lang);
  if (n === -1) return t('dates.yesterday', undefined, lang);
  if (n > 1 && n < 7) return t('dates.weekdayDay', { weekday: weekdayNames(lang)[weekday(key)], day: parseKey(key).d }, lang);
  return formatShortDate(key, lang);
}

/** Localized default cycle steps for the Push/Pull/Legs preset. */
export function localizedCycleSteps(lang: Lang = current): CycleStep[] {
  return [
    { label: t('cycleSteps.push', undefined, lang) },
    { label: t('cycleSteps.pull', undefined, lang) },
    { label: t('cycleSteps.legs', undefined, lang) },
    { label: t('cycleSteps.rest', undefined, lang), rest: true },
  ];
}

/** One readable phrase for any rule: "Día por medio desde la última vez", "Lun · Mié · Vie", "Ciclo: Empuje › Jalón › Pierna › descanso". */
export function freqLabel(rule: FrequencyRule, lang: Lang = current): string {
  const desc = describeFrequency(rule);
  switch (desc.kind) {
    case 'daily':
      return t('freq.daily', undefined, lang);
    case 'everyN': {
      const base = desc.n === 2 ? t('freq.everyOtherDay', undefined, lang) : t('freq.everyN', { n: desc.n }, lang);
      return desc.relative ? `${base} ${t('freq.sinceLast', undefined, lang)}` : base;
    }
    case 'weekdays': {
      const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => desc.days.includes(d));
      if (!order.length) return t('freq.noDays', undefined, lang);
      const short = weekdayShort(lang);
      return order.map((d) => short[d].charAt(0).toUpperCase() + short[d].slice(1)).join(' · ');
    }
    case 'perWeek':
      return desc.times === 1 ? t('freq.perWeekOne', undefined, lang) : t('freq.perWeek', { times: desc.times }, lang);
    case 'cycle':
      return t('freq.cycle', { steps: desc.steps.map((s) => (s.rest ? t('freq.rest', undefined, lang) : s.label)).join(' › ') }, lang);
  }
}

/** Every key present in `es` must exist in `en` and vice versa (tested). */
export function missingKeys(): { es: string[]; en: string[] } {
  const flat = (o: unknown, prefix = ''): string[] =>
    o && typeof o === 'object' && !Array.isArray(o)
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k))
      : [prefix];
  const esKeys = new Set(flat(es));
  const enKeys = new Set(flat(en));
  return { es: [...enKeys].filter((k) => !esKeys.has(k)), en: [...esKeys].filter((k) => !enKeys.has(k)) };
}
