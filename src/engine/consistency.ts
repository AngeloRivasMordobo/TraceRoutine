/**
 * Consistency over scheduled days (Pillar 4), cell states and edit rules.
 */
import { addDays, isBefore, isSameOrBefore, startOfWeek } from './dates';
import { inWindow, isDue, isRelative } from './rules';
import {
  isHit,
  type Activity,
  type CellState,
  type Consistency,
  type DateKey,
  type LogLookup,
  type LogState,
} from './types';

/**
 * hits / expected inside [from, to], never counting beyond today.
 * - Calendar-anchored rules: every due day is expected; done and minimum are hits.
 * - Relative rules: a run of consecutive pending days is a single opportunity.
 * - Flexible (perWeek): per week, min(hits, times) / times; the current week does not penalize yet.
 * - Today pending never counts as expected.
 */
export function consistency(
  a: Activity,
  from: DateKey,
  to: DateKey,
  today: DateKey,
  L: LogLookup,
): Consistency {
  const start = isBefore(from, a.start) ? a.start : from;
  let last = isBefore(today, to) ? today : to;
  if (a.end && isBefore(a.end, last)) last = a.end;
  if (isBefore(last, start)) return { hits: 0, expected: 0, pct: null };

  const f = a.freq;
  let hits = 0;
  let expected = 0;

  if (f.type === 'perWeek') {
    const times = Math.max(1, f.times ?? 1);
    for (let w = startOfWeek(start); isSameOrBefore(w, last); w = addDays(w, 7)) {
      const wEnd = addDays(w, 6);
      const a0 = isBefore(w, start) ? start : w;
      const b0 = isBefore(last, wEnd) ? last : wEnd;
      let done = 0;
      for (let d = a0; isSameOrBefore(d, b0); d = addDays(d, 1)) if (isHit(L(a.id, d))) done++;
      const weekClosed = isSameOrBefore(wEnd, last);
      if (weekClosed) {
        expected += times;
        hits += Math.min(done, times);
      } else {
        const c = Math.min(done, times);
        expected += c;
        hits += c;
      }
    }
  } else {
    const relative = isRelative(a);
    let inRun = false;
    for (let d = start; isSameOrBefore(d, last); d = addDays(d, 1)) {
      if (!isDue(a, d, L)) {
        inRun = false;
        continue;
      }
      const st = L(a.id, d);
      const hit = isHit(st);
      const pendingToday = d === today && !st;
      if (relative) {
        if (!inRun) {
          inRun = true;
          if (!pendingToday) expected++;
        }
        if (hit) {
          hits++;
          inRun = false;
        } else if (st === 'skip') {
          inRun = false;
        }
      } else {
        if (!pendingToday) expected++;
        if (hit) hits++;
      }
    }
  }
  return { hits, expected, pct: expected ? Math.round((hits / expected) * 100) : null };
}

/** Sum several results (e.g. the whole month across activities). */
export function aggregate(list: Consistency[]): Consistency {
  const hits = list.reduce((s, c) => s + c.hits, 0);
  const expected = list.reduce((s, c) => s + c.expected, 0);
  return { hits, expected, pct: expected ? Math.round((hits / expected) * 100) : null };
}

/** Visual state of one grid cell for a day up to today (use `futureState` for later days). */
export function cellState(a: Activity, date: DateKey, today: DateKey, L: LogLookup): CellState {
  const st = L(a.id, date);
  if (st) return st;
  if (!inWindow(a, date)) return 'none';
  if (!isDue(a, date, L)) return 'none';
  const future = isBefore(today, date);
  if (a.freq.type === 'perWeek') return future ? 'flex-future' : 'flex';
  if (future) return 'future';
  if (date === today) return 'pending';
  return 'missed';
}

/** Cell state for a future day, using a projected lookup (see `projectedLookup`). */
export function futureState(a: Activity, date: DateKey, PL: LogLookup): CellState {
  if (!inWindow(a, date) || !isDue(a, date, PL)) return 'none';
  return a.freq.type === 'perWeek' ? 'flex-future' : 'future';
}

/** The future is never editable; flexible days and already-logged days always are. */
export function isEditable(a: Activity, date: DateKey, today: DateKey, L: LogLookup): boolean {
  if (isBefore(today, date) || !inWindow(a, date)) return false;
  return a.freq.type === 'perWeek' || isDue(a, date, L) || !!L(a.id, date);
}

/** Tap order on a cell: empty → done → minimum → skipped → empty. */
export function nextLogState(current: LogState | null): LogState | null {
  switch (current) {
    case null:
      return 'done';
    case 'done':
      return 'min';
    case 'min':
      return 'skip';
    case 'skip':
      return null;
  }
}
