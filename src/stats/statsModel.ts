/**
 * Pure statistics (TR-55 … TR-57): month consistency, best month, weekday pattern, 12-week trend.
 * Every number comes from the engine's definition of expected/hit, so Stats and the grid always agree.
 */
import { addDays, aggregate, consistency, isBefore, isDue, isHit, monthRange, parseKey, startOfWeek, weekday, type Activity, type Consistency, type DateKey, type LogLookup } from '../engine';
import { shiftMonth } from '../ui/month/gridModel';

export const MIN_DAYS_FOR_PATTERNS = 14;
export const MIN_WEEKS_FOR_TREND = 2;

export interface MonthRow { activity: Activity; consistency: Consistency }

export function monthStats(activities: Activity[], y: number, m: number, today: DateKey, L: LogLookup): { rows: MonthRow[]; overall: Consistency } {
  const { first, last } = monthRange(y, m);
  const rows = activities
    .map((activity) => ({ activity, consistency: consistency(activity, first, last, today, L) }))
    .filter((r) => r.consistency.expected > 0 || !r.activity.archived);
  return { rows, overall: aggregate(rows.map((r) => r.consistency)) };
}

export interface MonthPoint { y: number; m: number; pct: number; expected: number }

/** Best month over the last `monthsBack` months (only months with something expected). */
export function bestMonth(activities: Activity[], today: DateKey, L: LogLookup, monthsBack = 12): MonthPoint | null {
  const { y, m } = parseKey(today);
  let best: MonthPoint | null = null;
  for (let i = 0; i < monthsBack; i++) {
    const ym = shiftMonth(y, m, -i);
    const { first, last } = monthRange(ym.y, ym.m);
    const c = aggregate(activities.map((a) => consistency(a, first, last, today, L)));
    if (c.pct === null || c.expected < 5) continue;
    if (!best || c.pct > best.pct) best = { y: ym.y, m: ym.m, pct: c.pct, expected: c.expected };
  }
  return best;
}

export interface WeekdayPattern {
  /** index 0 = Sunday … 6 = Saturday */
  perDay: { expected: number; hits: number; pct: number | null }[];
  best: number | null;
  worst: number | null;
  enough: boolean;
  dueDays: number;
}

/** Best/worst weekday over the last `days` days, counting only days that were due (calendar rules and hits/misses per day). */
export function weekdayPattern(activities: Activity[], today: DateKey, L: LogLookup, days = 90): WeekdayPattern {
  const perDay = Array.from({ length: 7 }, () => ({ expected: 0, hits: 0, pct: null as number | null }));
  let dueDays = 0;
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    for (const a of activities) {
      if (isBefore(d, a.start) || (a.end && isBefore(a.end, d)) || !isDue(a, d, L)) continue;
      const wd = weekday(d);
      perDay[wd].expected++;
      dueDays++;
      if (isHit(L(a.id, d))) perDay[wd].hits++;
    }
  }
  for (const p of perDay) p.pct = p.expected ? Math.round((p.hits / p.expected) * 100) : null;
  const enough = dueDays >= MIN_DAYS_FOR_PATTERNS;
  const ranked = perDay.map((p, i) => ({ i, p })).filter((x) => x.p.expected >= 3 && x.p.pct !== null).sort((x, y) => (y.p.pct ?? 0) - (x.p.pct ?? 0));
  return { perDay, best: enough && ranked.length ? ranked[0].i : null, worst: enough && ranked.length > 1 ? ranked[ranked.length - 1].i : null, enough, dueDays };
}

export interface WeekPoint { weekStart: DateKey; pct: number | null; partial: boolean; expected: number }

/** Overall consistency per week for the last `weeks` weeks (oldest first); the current week is marked partial. */
export function weeklyTrend(activities: Activity[], today: DateKey, L: LogLookup, weeks = 12): { points: WeekPoint[]; enough: boolean; first: number | null; last: number | null; bestWeek: DateKey | null } {
  const thisMonday = startOfWeek(today);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const w = addDays(thisMonday, -7 * i);
    const c = aggregate(activities.map((a) => consistency(a, w, addDays(w, 6), today, L)));
    points.push({ weekStart: w, pct: c.pct, partial: i === 0, expected: c.expected });
  }
  const withData = points.filter((p) => p.pct !== null);
  const enough = withData.length >= MIN_WEEKS_FOR_TREND;
  const best = withData.reduce<WeekPoint | null>((acc, p) => (!acc || (p.pct ?? 0) > (acc.pct ?? 0) ? p : acc), null);
  return { points, enough, first: withData[0]?.pct ?? null, last: withData[withData.length - 1]?.pct ?? null, bestWeek: best?.weekStart ?? null };
}
