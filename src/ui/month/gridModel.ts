/**
 * Pure model of the month grid (TR-48 … TR-53), in the design canvas's orientation:
 * one row per activity, one column per day of the month. Cell states come from the
 * engine; relative rules are projected into the future.
 */
import { addDays, aggregate, cellState, consistency, cycleLetters, cycleStep, daysInMonth, futureState, isBefore, isEditable, makeKey, monthRange, projectedLookup, weekday, type Activity, type CellState, type Consistency, type DateKey, type LogLookup } from '../../engine';

export interface GridCell { date: DateKey; day: number; state: CellState; letter: string; editable: boolean; isToday: boolean }
export interface GridRow { activity: Activity; consistency: Consistency; cells: GridCell[] }
/** One entry per day, for the header strip above the rows. */
export interface GridDay { day: number; weekday: number; isToday: boolean; isWeekEnd: boolean; label: string }
export interface MonthGrid { rows: GridRow[]; days: GridDay[]; overall: Consistency; todayIndex: number }

/** The design labels day 1, every fifth day and today; the rest stay blank. */
function dayLabel(day: number, isToday: boolean, n: number): string {
  return day === 1 || day % 5 === 0 || isToday || day === n ? String(day) : '';
}

export function buildMonthGrid(activities: Activity[], y: number, m: number, today: DateKey, L: LogLookup): MonthGrid {
  const active = activities.filter((a) => !a.archived);
  const { first, last } = monthRange(y, m);
  const n = daysInMonth(y, m);

  let todayIndex = -1;
  const days: GridDay[] = [];
  for (let d = 1; d <= n; d++) {
    const date = makeKey(y, m, d);
    const wd = weekday(date);
    const isToday = date === today;
    if (isToday) todayIndex = d - 1;
    // Sunday closes the week, so the extra gap sits after it.
    days.push({ day: d, weekday: wd, isToday, isWeekEnd: wd === 0, label: dayLabel(d, isToday, n) });
  }

  const rows: GridRow[] = active.map((a) => {
    const PL = a.freq.type !== 'perWeek' ? projectedLookup(a, today, last, L) : null;
    const letters = a.freq.type === 'cycle' ? cycleLetters(a.freq.steps ?? []) : null;
    const cells: GridCell[] = [];
    for (let d = 1; d <= n; d++) {
      const date = makeKey(y, m, d);
      const isFuture = isBefore(today, date);
      const state = isFuture && PL ? futureState(a, date, PL) : cellState(a, date, today, L);
      let letter = '';
      if (letters && state !== 'none') {
        const steps = a.freq.steps ?? [];
        const step = cycleStep(a, date, isFuture && PL ? PL : L);
        letter = step && !step.rest ? (letters[steps.indexOf(step)] ?? '') : '';
      }
      cells.push({ date, day: d, state, letter, editable: isEditable(a, date, today, L), isToday: date === today });
    }
    return { activity: a, consistency: consistency(a, first, last, today, L), cells };
  });

  return { rows, days, overall: aggregate(rows.map((r) => r.consistency)), todayIndex };
}

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

export { addDays };
