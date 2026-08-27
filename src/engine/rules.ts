/**
 * Frequency rules: is an activity due on a given day, what comes next,
 * and how the future looks if you keep up.
 *
 * Every function takes the logs as a `LogLookup` and never reads a clock:
 * "today" is always passed in explicitly.
 */
import { addDays, daysBetween, isBefore, isSameOrBefore, startOfWeek, weekday } from './dates';
import { isHit, type Activity, type CycleStep, type DateKey, type LogLookup } from './types';

/** True when `date` is between the activity's start and (optional) end. */
export function inWindow(a: Activity, date: DateKey): boolean {
  if (isBefore(date, a.start)) return false;
  if (a.end && isBefore(a.end, date)) return false;
  return true;
}

/** Last day before `date` with a done/minimum log, or null. */
export function lastDoneBefore(a: Activity, date: DateKey, L: LogLookup): DateKey | null {
  for (let x = addDays(date, -1); isSameOrBefore(a.start, x); x = addDays(x, -1)) {
    if (isHit(L(a.id, x))) return x;
  }
  return null;
}

/** Done/minimum logs in the same Monday–Sunday week, strictly before `date`. */
export function doneInWeekBefore(a: Activity, date: DateKey, L: LogLookup): number {
  let c = 0;
  for (let x = startOfWeek(date); isBefore(x, date); x = addDays(x, 1)) {
    if (isHit(L(a.id, x))) c++;
  }
  return c;
}

/** Done/minimum logs in the week of `date`, including `date` itself. */
export function doneThisWeek(a: Activity, date: DateKey, L: LogLookup): number {
  return doneInWeekBefore(a, addDays(date, 1), L);
}

/**
 * Step of a rotating cycle on `date`.
 * - calendar: every day advances one step, done or not.
 * - relative ("waits until you do it"): the pointer advances only when a log
 *   exists (done, minimum or skipped); a rest step is consumed as the day passes.
 */
export function cycleStep(a: Activity, date: DateKey, L: LogLookup): CycleStep | null {
  const steps = a.freq.steps ?? [];
  const n = steps.length;
  if (!n || isBefore(date, a.start)) return null;
  if (a.freq.anchor !== 'relative') return steps[daysBetween(a.start, date) % n];
  let p = 0;
  for (let x = a.start; isBefore(x, date); x = addDays(x, 1)) {
    const st = steps[p % n];
    if (st.rest) {
      p++;
      continue;
    }
    if (L(a.id, x)) p++;
  }
  return steps[p % n];
}

/** Is the activity due on `date`? (Archived activities are filtered by the UI, not here.) */
export function isDue(a: Activity, date: DateKey, L: LogLookup): boolean {
  if (!inWindow(a, date)) return false;
  const f = a.freq;
  switch (f.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return (f.days ?? []).includes(weekday(date));
    case 'everyN': {
      const n = Math.max(1, f.n ?? 1);
      if (f.anchor === 'relative') {
        const last = lastDoneBefore(a, date, L);
        return last ? daysBetween(last, date) >= n : true;
      }
      return daysBetween(a.start, date) % n === 0;
    }
    case 'perWeek':
      return doneInWeekBefore(a, date, L) < Math.max(1, f.times ?? 1);
    case 'cycle': {
      const st = cycleStep(a, date, L);
      return !!st && !st.rest;
    }
    default:
      return false;
  }
}

/** First day after `from` that is due, searching up to `limit` days. */
export function nextDue(a: Activity, from: DateKey, L: LogLookup, limit = 120): DateKey | null {
  for (let i = 1; i <= limit; i++) {
    const d = addDays(from, i);
    if (isDue(a, d, L)) return d;
  }
  return null;
}

export function isRelative(a: Activity): boolean {
  return (a.freq.type === 'everyN' || a.freq.type === 'cycle') && a.freq.anchor === 'relative';
}

/**
 * Real logs up to today plus simulated completion from today on.
 * Lets the grid show a plan for relative rules instead of "due every day".
 */
export function projectedLookup(a: Activity, today: DateKey, until: DateKey, L: LogLookup): LogLookup {
  const sim = new Map<DateKey, 'done'>();
  const PL: LogLookup = (id, k) => L(id, k) ?? (id === a.id ? (sim.get(k) ?? null) : null);
  for (let d = today; isSameOrBefore(d, until); d = addDays(d, 1)) {
    if (!L(a.id, d) && isDue(a, d, PL)) sim.set(d, 'done');
  }
  return PL;
}

/** Perfect completion from the start date: the editor preview ("this is how the month looks"). */
export function simulatePerfect(a: Activity, until: DateKey): LogLookup {
  const sim = new Map<DateKey, 'done'>();
  const PL: LogLookup = (id, k) => (id === a.id ? (sim.get(k) ?? null) : null);
  for (let d = a.start; isSameOrBefore(d, until); d = addDays(d, 1)) {
    if (isDue(a, d, PL)) sim.set(d, 'done');
  }
  return PL;
}

/** For relative rules: since when has the activity been pending? Null if not pending or pending only today. */
export function pendingSince(a: Activity, today: DateKey, L: LogLookup): DateKey | null {
  if (!isRelative(a) || !isDue(a, today, L) || L(a.id, today)) return null;
  let d = today;
  for (;;) {
    const p = addDays(d, -1);
    if (!inWindow(a, p) || !isDue(a, p, L) || L(a.id, p)) break;
    d = p;
  }
  return d === today ? null : d;
}

/** Activities due today, excluding archived ones. */
export function dueToday(activities: Activity[], today: DateKey, L: LogLookup): Activity[] {
  return activities.filter((a) => !a.archived && isDue(a, today, L));
}
