/**
 * Date utilities over `YYYY-MM-DD` keys.
 * Arithmetic goes through UTC day numbers so daylight-saving changes never
 * shift a date. Only `todayKey` touches the device's local clock.
 */
import type { DateKey } from './types';

const MS_DAY = 86_400_000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function makeKey(y: number, m: number, d: number): DateKey {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseKey(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** Days since 1970-01-01 (UTC), integer. */
export function toDayNumber(key: DateKey): number {
  const { y, m, d } = parseKey(key);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

export function fromDayNumber(n: number): DateKey {
  const dt = new Date(n * MS_DAY);
  return makeKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && fromDayNumber(toDayNumber(key)) === key;
}

export function addDays(key: DateKey, n: number): DateKey {
  return fromDayNumber(toDayNumber(key) + n);
}

/** `b - a` in whole days. */
export function daysBetween(a: DateKey, b: DateKey): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** a < b */
export const isBefore = (a: DateKey, b: DateKey): boolean => daysBetween(a, b) > 0;
/** a <= b */
export const isSameOrBefore = (a: DateKey, b: DateKey): boolean => daysBetween(a, b) >= 0;

/** JS weekday: Sunday = 0 … Saturday = 6. */
export function weekday(key: DateKey): number {
  return new Date(toDayNumber(key) * MS_DAY).getUTCDay();
}

/** Monday of the week that contains `key`. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}

/** m is 1–12. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthRange(y: number, m: number): { first: DateKey; last: DateKey } {
  return { first: makeKey(y, m, 1), last: makeKey(y, m, daysInMonth(y, m)) };
}

/** Today's local calendar day. Inject `now` in tests. */
export function todayKey(now: Date = new Date()): DateKey {
  return makeKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Inclusive list of keys from `a` to `b`. */
export function eachDay(a: DateKey, b: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let d = a; isSameOrBefore(d, b); d = addDays(d, 1)) out.push(d);
  return out;
}
